import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Get all user groups (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const groups = await db.userGroup.findMany({
      include: {
        _count: {
          select: { members: true, courseAccess: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('User groups API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzergruppen' }, { status: 500 })
  }
}

// Create user group (admin only)
const createGroupSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  description: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = createGroupSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Check if group name already exists
    const existing = await db.userGroup.findUnique({
      where: { name: result.data.name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Eine Benutzergruppe mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    const group = await db.userGroup.create({
      data: {
        name: result.data.name,
        description: result.data.description,
      },
      include: {
        _count: {
          select: { members: true, courseAccess: true },
        },
      },
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('Create user group error:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Benutzergruppe' }, { status: 500 })
  }
}
