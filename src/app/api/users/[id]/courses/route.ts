import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id: userId } = await params

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Get all enrollments with course details and progress
    const enrollments = await db.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })

    // Get lesson progress for all courses
    const lessonProgress = await db.lessonProgress.findMany({
      where: { userId },
      select: {
        lessonId: true,
        completed: true,
      },
    })

    const completedLessonIds = new Set(
      lessonProgress.filter((lp) => lp.completed).map((lp) => lp.lessonId)
    )

    // Calculate progress for each enrollment
    const coursesWithProgress = enrollments.map((enrollment) => {
      const lessonIds = enrollment.course.modules.flatMap((m) =>
        m.lessons.map((l) => l.id)
      )
      const totalLessons = lessonIds.length
      const completedLessons = lessonIds.filter((id) =>
        completedLessonIds.has(id)
      ).length
      const progress =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0

      return {
        id: enrollment.id,
        courseId: enrollment.course.id,
        courseTitle: enrollment.course.title,
        courseStatus: enrollment.course.status,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        lastAccessAt: enrollment.lastAccessAt,
        progress,
        totalLessons,
        completedLessons,
        isCompleted: !!enrollment.completedAt,
      }
    })

    return NextResponse.json(coursesWithProgress)
  } catch (error) {
    console.error('Error fetching user courses:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kurse' },
      { status: 500 }
    )
  }
}

// Reset course progress for a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id: userId } = await params
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Kurs-ID erforderlich' },
        { status: 400 }
      )
    }

    // Verify enrollment exists and is not completed
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: { select: { id: true } },
                quiz: { select: { id: true } },
              },
            },
          },
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Einschreibung nicht gefunden' },
        { status: 404 }
      )
    }

    if (enrollment.completedAt) {
      return NextResponse.json(
        { error: 'Abgeschlossene Kurse können nicht zurückgesetzt werden' },
        { status: 400 }
      )
    }

    // Get all lesson IDs and quiz IDs for this course
    const lessonIds = enrollment.course.modules.flatMap((m) =>
      m.lessons.map((l) => l.id)
    )
    const moduleIds = enrollment.course.modules.map((m) => m.id)
    const quizIds = enrollment.course.modules
      .filter((m) => m.quiz)
      .map((m) => m.quiz!.id)

    // Delete all progress in a transaction
    await db.$transaction([
      // Delete lesson progress
      db.lessonProgress.deleteMany({
        where: {
          userId,
          lessonId: { in: lessonIds },
        },
      }),
      // Delete module progress
      db.moduleProgress.deleteMany({
        where: {
          userId,
          moduleId: { in: moduleIds },
        },
      }),
      // Delete quiz attempts and answers
      ...(quizIds.length > 0
        ? [
            db.quizAnswer.deleteMany({
              where: {
                attempt: {
                  userId,
                  quizId: { in: quizIds },
                },
              },
            }),
            db.quizAttempt.deleteMany({
              where: {
                userId,
                quizId: { in: quizIds },
              },
            }),
          ]
        : []),
      // Reset enrollment lastAccessAt
      db.enrollment.update({
        where: { id: enrollment.id },
        data: { lastAccessAt: null },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting course progress:', error)
    return NextResponse.json(
      { error: 'Fehler beim Zurücksetzen des Fortschritts' },
      { status: 500 }
    )
  }
}
