import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Get all categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const categories = await db.courseCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kategorien' }, { status: 500 })
  }
}

// Create new category (admin only)
const createCategorySchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = createCategorySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Check if category already exists
    const existing = await db.courseCategory.findFirst({
      where: { name: { equals: result.data.name, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Kategorie existiert bereits' },
        { status: 400 }
      )
    }

    const category = await db.courseCategory.create({
      data: { name: result.data.name },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Kategorie' }, { status: 500 })
  }
}
