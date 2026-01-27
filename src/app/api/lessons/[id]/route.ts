import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['TEXT', 'VIDEO', 'AUDIO', 'PDF', 'INTERACTIVE', 'POWERPOINT']).optional(),
  content: z.string().optional().nullable(),
  videoUrl: z.string().refine(
    (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'Ungültige URL' }
  ).optional().nullable(),
  duration: z.number().positive().optional().nullable(),
  order: z.number().int().positive().optional(),
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

    const lesson = await db.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: { userId: session.user.id },
                },
                modules: {
                  orderBy: { order: 'asc' },
                  select: { id: true, title: true, order: true },
                },
              },
            },
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, order: true },
            },
            quiz: {
              select: {
                id: true,
                title: true,
                isRequired: true,
                questions: { select: { id: true } },
              },
            },
            progress: {
              where: { userId: session.user.id },
              select: { quizPassed: true },
            },
          },
        },
        progress: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lektion nicht gefunden' }, { status: 404 })
    }

    // Check enrollment
    if (lesson.module.course.enrollments.length === 0) {
      return NextResponse.json({ error: 'Nicht eingeschrieben' }, { status: 403 })
    }

    // Find next/previous lessons
    const currentIndex = lesson.module.lessons.findIndex((l) => l.id === lesson.id)
    const prevLesson = currentIndex > 0 ? lesson.module.lessons[currentIndex - 1] : null
    const nextLesson =
      currentIndex < lesson.module.lessons.length - 1
        ? lesson.module.lessons[currentIndex + 1]
        : null

    // Check if this is the last lesson in the module
    const isLastLessonInModule = currentIndex === lesson.module.lessons.length - 1

    // Find next module
    const courseModules = lesson.module.course.modules
    const currentModuleIndex = courseModules.findIndex((m) => m.id === lesson.module.id)
    const nextModule = currentModuleIndex < courseModules.length - 1
      ? courseModules[currentModuleIndex + 1]
      : null

    // Check if module has quiz
    const moduleQuiz = lesson.module.quiz
    const quizPassed = lesson.module.progress[0]?.quizPassed || false

    return NextResponse.json({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration,
      completed: lesson.progress[0]?.completed || false,
      completedAt: lesson.progress[0]?.completedAt,
      timeSpent: lesson.progress[0]?.timeSpent || 0,
      module: {
        id: lesson.module.id,
        title: lesson.module.title,
      },
      course: {
        id: lesson.module.course.id,
        title: lesson.module.course.title,
      },
      navigation: {
        prev: prevLesson,
        next: nextLesson,
        isLastLessonInModule,
        moduleQuiz: moduleQuiz ? {
          id: moduleQuiz.id,
          title: moduleQuiz.title,
          isRequired: moduleQuiz.isRequired,
          questionCount: moduleQuiz.questions.length,
          passed: quizPassed,
        } : null,
        nextModule,
      },
    })
  } catch (error) {
    console.error('Lesson API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Lektion' }, { status: 500 })
  }
}

// Update lesson
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify lesson ownership through course
    const lesson = await db.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: { select: { instructorId: true } },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lektion nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && lesson.module.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const result = updateLessonSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { title, type, content, videoUrl, duration, order } = result.data

    const updatedLesson = await db.lesson.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(type && { type }),
        ...(content !== undefined && { content }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(duration !== undefined && { duration }),
        ...(order && { order }),
      },
    })

    return NextResponse.json(updatedLesson)
  } catch (error) {
    console.error('Update lesson error:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Lektion' }, { status: 500 })
  }
}

// Delete lesson
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify lesson ownership through course
    const lesson = await db.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: { select: { instructorId: true } },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lektion nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && lesson.module.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    await db.lesson.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Lektion gelöscht' })
  } catch (error) {
    console.error('Delete lesson error:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Lektion' }, { status: 500 })
  }
}
