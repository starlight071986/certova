import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkCourseCompletionAndCreateCertificate } from '@/lib/course-completion'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { completed, timeSpent } = body

    // Check if lesson exists and user is enrolled
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
                  include: {
                    lessons: {
                      include: {
                        progress: {
                          where: { userId: session.user.id },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lektion nicht gefunden' }, { status: 404 })
    }

    if (lesson.module.course.enrollments.length === 0) {
      return NextResponse.json({ error: 'Nicht eingeschrieben' }, { status: 403 })
    }

    // Update or create progress
    const progress = await db.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId: params.id,
        },
      },
      update: {
        completed: completed ?? undefined,
        completedAt: completed ? new Date() : undefined,
        timeSpent: timeSpent ? { increment: timeSpent } : undefined,
      },
      create: {
        userId: session.user.id,
        lessonId: params.id,
        completed: completed || false,
        completedAt: completed ? new Date() : null,
        timeSpent: timeSpent || 0,
      },
    })

    // Update module progress if lesson is completed
    if (completed) {
      // Get current module with its quiz
      const moduleWithQuiz = await db.module.findUnique({
        where: { id: lesson.module.id },
        include: {
          lessons: {
            include: {
              progress: {
                where: { userId: session.user.id },
              },
            },
          },
          quiz: true,
        },
      })

      if (moduleWithQuiz) {
        // Check if all lessons in module are completed
        const moduleLessonsCompleted = moduleWithQuiz.lessons.every(
          (l) => l.progress[0]?.completed || l.id === params.id
        )

        if (moduleLessonsCompleted) {
          // Check if module has required quiz
          const hasRequiredQuiz = moduleWithQuiz.quiz?.isRequired

          // Get existing module progress
          const existingModuleProgress = await db.moduleProgress.findUnique({
            where: {
              userId_moduleId: {
                userId: session.user.id,
                moduleId: lesson.module.id,
              },
            },
          })

          // Determine new status
          let newStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS'
          if (moduleLessonsCompleted) {
            if (hasRequiredQuiz) {
              // If quiz is required and passed, complete. Otherwise stay in progress
              if (existingModuleProgress?.quizPassed) {
                newStatus = 'COMPLETED'
              }
            } else {
              // No required quiz, mark as completed
              newStatus = 'COMPLETED'
            }
          }

          await db.moduleProgress.upsert({
            where: {
              userId_moduleId: {
                userId: session.user.id,
                moduleId: lesson.module.id,
              },
            },
            update: {
              status: newStatus,
              completedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
            },
            create: {
              userId: session.user.id,
              moduleId: lesson.module.id,
              status: newStatus,
              completedAt: newStatus === 'COMPLETED' ? new Date() : null,
            },
          })
        } else {
          // Not all lessons completed, set to in_progress
          await db.moduleProgress.upsert({
            where: {
              userId_moduleId: {
                userId: session.user.id,
                moduleId: lesson.module.id,
              },
            },
            update: {
              status: 'IN_PROGRESS',
            },
            create: {
              userId: session.user.id,
              moduleId: lesson.module.id,
              status: 'IN_PROGRESS',
            },
          })
        }
      }
    }

    // Check if all lessons in course are completed
    const allLessons = lesson.module.course.modules.flatMap((m) => m.lessons)
    const completedCount = allLessons.filter(
      (l) => l.progress[0]?.completed || (l.id === params.id && completed)
    ).length

    // If all lessons completed, check for full course completion and create certificate
    if (completedCount === allLessons.length) {
      await checkCourseCompletionAndCreateCertificate(
        session.user.id,
        lesson.module.course.id
      )
    }

    // Update last access
    await db.enrollment.update({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: lesson.module.course.id,
        },
      },
      data: {
        lastAccessAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Fortschritt gespeichert',
      progress,
      courseCompleted: completedCount === allLessons.length,
    })
  } catch (error) {
    console.error('Progress API error:', error)
    return NextResponse.json({ error: 'Fehler beim Speichern des Fortschritts' }, { status: 500 })
  }
}
