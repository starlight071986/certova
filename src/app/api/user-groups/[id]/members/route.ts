import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Add members to group
const addMembersSchema = z.object({
  userIds: z.array(z.string()).min(1, 'Mindestens ein Benutzer erforderlich'),
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
    const result = addMembersSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Create member entries (ignore if already exists)
    await db.userGroupMember.createMany({
      data: result.data.userIds.map((userId) => ({
        userId,
        groupId: params.id,
      })),
      skipDuplicates: true,
    })

    // Return updated group
    const group = await db.userGroup.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, company: true },
            },
          },
        },
        _count: {
          select: { members: true, courseAccess: true },
        },
      },
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('Add members error:', error)
    return NextResponse.json({ error: 'Fehler beim Hinzufügen der Mitglieder' }, { status: 500 })
  }
}

// Remove member from group
const removeMemberSchema = z.object({
  userId: z.string().min(1, 'Benutzer-ID erforderlich'),
})

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = removeMemberSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    await db.userGroupMember.deleteMany({
      where: {
        groupId: params.id,
        userId: result.data.userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Fehler beim Entfernen des Mitglieds' }, { status: 500 })
  }
}
