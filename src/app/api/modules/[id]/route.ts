import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  order: z.number().int().positive().optional(),
})

// Get single module
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const moduleRecord = await db.module.findUnique({
      where: { id: params.id },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
        },
        course: {
          select: { instructorId: true },
        },
      },
    })

    if (!moduleRecord) {
      return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(moduleRecord)
  } catch (error) {
    console.error('Get module error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Moduls' }, { status: 500 })
  }
}

// Update module
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify module ownership
    const moduleRecord = await db.module.findUnique({
      where: { id: params.id },
      include: {
        course: {
          select: { instructorId: true },
        },
      },
    })

    if (!moduleRecord) {
      return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && moduleRecord.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const result = updateModuleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { title, description, order } = result.data

    const updatedModule = await db.module.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(order && { order }),
      },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(updatedModule)
  } catch (error) {
    console.error('Update module error:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Moduls' }, { status: 500 })
  }
}

// Delete module
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify module ownership
    const moduleRecord = await db.module.findUnique({
      where: { id: params.id },
      include: {
        course: {
          select: { instructorId: true },
        },
      },
    })

    if (!moduleRecord) {
      return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && moduleRecord.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    await db.module.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Modul gelöscht' })
  } catch (error) {
    console.error('Delete module error:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen des Moduls' }, { status: 500 })
  }
}
