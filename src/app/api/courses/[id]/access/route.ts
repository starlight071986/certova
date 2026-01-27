import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Get course access rules
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const accessRules = await db.courseAccess.findMany({
      where: { courseId: params.id },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    })

    // Get user details for USER type rules
    const userIds = accessRules
      .filter((r) => r.type === 'USER' && r.userId)
      .map((r) => r.userId as string)

    const users = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []

    const rulesWithUsers = accessRules.map((rule) => ({
      ...rule,
      user: rule.type === 'USER' && rule.userId
        ? users.find((u) => u.id === rule.userId) || null
        : null,
    }))

    return NextResponse.json(rulesWithUsers)
  } catch (error) {
    console.error('Get course access error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Zugriffsregeln' }, { status: 500 })
  }
}

// Set course access rules
const setAccessSchema = z.object({
  type: z.enum(['ALL', 'GROUP', 'USER']),
  groupId: z.string().optional(),
  userId: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = setAccessSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { type, groupId, userId } = result.data

    // Validate requirements
    if (type === 'GROUP' && !groupId) {
      return NextResponse.json(
        { error: 'Benutzergruppe erforderlich' },
        { status: 400 }
      )
    }

    if (type === 'USER' && !userId) {
      return NextResponse.json(
        { error: 'Benutzer erforderlich' },
        { status: 400 }
      )
    }

    // If setting to ALL, remove all other rules first
    if (type === 'ALL') {
      await db.courseAccess.deleteMany({
        where: { courseId: params.id },
      })
    }

    // Check if rule already exists
    const existing = await db.courseAccess.findFirst({
      where: {
        courseId: params.id,
        type,
        groupId: type === 'GROUP' ? groupId : null,
        userId: type === 'USER' ? userId : null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Diese Zugriffsregel existiert bereits' },
        { status: 400 }
      )
    }

    // Create the access rule
    const accessRule = await db.courseAccess.create({
      data: {
        courseId: params.id,
        type,
        groupId: type === 'GROUP' ? groupId : null,
        userId: type === 'USER' ? userId : null,
      },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    })

    // Get user details if USER type
    let user = null
    if (type === 'USER' && userId) {
      user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      })
    }

    return NextResponse.json({ ...accessRule, user })
  } catch (error) {
    console.error('Set course access error:', error)
    return NextResponse.json({ error: 'Fehler beim Setzen der Zugriffsregel' }, { status: 500 })
  }
}

// Remove course access rule
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('ruleId')

    if (!ruleId) {
      return NextResponse.json({ error: 'Regel-ID erforderlich' }, { status: 400 })
    }

    await db.courseAccess.delete({
      where: { id: ruleId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete course access error:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Zugriffsregel' }, { status: 500 })
  }
}
