import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const createLessonSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['TEXT', 'VIDEO', 'AUDIO', 'PDF', 'INTERACTIVE', 'POWERPOINT']),
  content: z.string().optional(),
  videoUrl: z.string().refine(
    (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'Ungültige URL' }
  ).optional(),
  duration: z.number().positive().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const lessons = await db.lesson.findMany({
      where: { moduleId: params.id },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        order: true,
      },
    })

    return NextResponse.json(lessons)
  } catch (error) {
    console.error('Get lessons error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Lektionen' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify module ownership through course
    const moduleRecord = await db.module.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { instructorId: true } },
      },
    })

    if (!moduleRecord) {
      return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && moduleRecord.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const result = createLessonSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Get max order
    const maxOrder = await db.lesson.findFirst({
      where: { moduleId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const lesson = await db.lesson.create({
      data: {
        ...result.data,
        moduleId: params.id,
        order: (maxOrder?.order || 0) + 1,
      },
    })

    return NextResponse.json(lesson, { status: 201 })
  } catch (error) {
    console.error('Create lesson error:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Lektion' }, { status: 500 })
  }
}
