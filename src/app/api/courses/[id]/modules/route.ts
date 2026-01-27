import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const createModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify course ownership
    const course = await db.course.findUnique({
      where: { id: params.id },
      select: { instructorId: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const result = createModuleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Get max order
    const maxOrder = await db.module.findFirst({
      where: { courseId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const newModule = await db.module.create({
      data: {
        title: result.data.title,
        description: result.data.description,
        courseId: params.id,
        order: (maxOrder?.order || 0) + 1,
      },
    })

    return NextResponse.json(newModule, { status: 201 })
  } catch (error) {
    console.error('Create module error:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Moduls' }, { status: 500 })
  }
}
