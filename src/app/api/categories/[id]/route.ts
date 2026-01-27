import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const updateCategorySchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
})

// Update category
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
    const result = updateCategorySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Check if category exists
    const existing = await db.courseCategory.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }

    // Check if new name already exists
    const duplicate = await db.courseCategory.findFirst({
      where: {
        name: { equals: result.data.name, mode: 'insensitive' },
        NOT: { id: params.id },
      },
    })

    if (duplicate) {
      return NextResponse.json(
        { error: 'Kategorie existiert bereits' },
        { status: 400 }
      )
    }

    const category = await db.courseCategory.update({
      where: { id: params.id },
      data: { name: result.data.name },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Kategorie' }, { status: 500 })
  }
}

// Delete category
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Check if category exists
    const existing = await db.courseCategory.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }

    await db.courseCategory.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Kategorie gelöscht' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Kategorie' }, { status: 500 })
  }
}
