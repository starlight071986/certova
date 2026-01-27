import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Get user group by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

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
        courseAccess: {
          include: {
            course: {
              select: { id: true, title: true },
            },
          },
        },
        _count: {
          select: { members: true, courseAccess: true },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Benutzergruppe nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error('Get user group error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzergruppe' }, { status: 500 })
  }
}

// Update user group
const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = updateGroupSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Check if name is being changed and already exists
    if (result.data.name) {
      const existing = await db.userGroup.findFirst({
        where: {
          name: result.data.name,
          NOT: { id: params.id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Eine Benutzergruppe mit diesem Namen existiert bereits' },
          { status: 400 }
        )
      }
    }

    const group = await db.userGroup.update({
      where: { id: params.id },
      data: result.data,
      include: {
        _count: {
          select: { members: true, courseAccess: true },
        },
      },
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('Update user group error:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Benutzergruppe' }, { status: 500 })
  }
}

// Delete user group
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    await db.userGroup.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user group error:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Benutzergruppe' }, { status: 500 })
  }
}
