import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/certification-levels
 * Get all certification levels accessible to the current user
 * and their achievement status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user with their groups
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        userGroups: {
          include: {
            group: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const userGroupIds = user.userGroups.map((ug) => ug.groupId)

    // Get all active certification levels with their access rules
    const allLevels = await db.certificationLevel.findMany({
      where: {
        isActive: true,
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                courseNumber: true,
                thumbnail: true,
                description: true,
                status: true,
                instructorId: true,
                startDate: true,
                endDate: true,
                creditCost: true,
                instructor: {
                  select: {
                    name: true,
                  },
                },
                categories: {
                  select: {
                    name: true,
                  },
                },
                modules: {
                  select: {
                    id: true,
                    lessons: {
                      select: {
                        id: true,
                        duration: true,
                      },
                    },
                  },
                },
                _count: {
                  select: {
                    enrollments: true,
                  },
                },
              },
            },
          },
        },
        accessRules: true,
        userLevels: {
          where: {
            userId,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    })

    // Filter levels based on access rules and availability dates
    const now = new Date()
    const accessibleLevels = allLevels.filter((level) => {
      // If no access rules, it's not accessible
      if (level.accessRules.length === 0) {
        return false
      }

      // Check if user has access through any rule
      const hasAccess = level.accessRules.some((rule) => {
        if (rule.type === 'ALL') return true
        if (rule.type === 'USER' && rule.userId === userId) return true
        if (rule.type === 'GROUP' && rule.groupId && userGroupIds.includes(rule.groupId))
          return true
        return false
      })

      if (!hasAccess) return false

      // Check availability dates
      if (level.startDate && new Date(level.startDate) > now) {
        return false // Not yet started
      }

      if (level.endDate && new Date(level.endDate) < now) {
        return false // Already ended
      }

      return true
    })

    // For each accessible level, check course completion status
    const levelsWithStatus = await Promise.all(
      accessibleLevels.map(async (level) => {
        const requiredCourseIds = level.courses.map((lc) => lc.courseId)

        // Get user's certificates for these courses
        const certificates = await db.certificate.findMany({
          where: {
            userId,
            courseId: {
              in: requiredCourseIds,
            },
          },
        })

        // Check which required courses are completed and have valid certificates
        const now = new Date()
        const completedCourseIds = certificates
          .filter((cert) => !cert.expiresAt || cert.expiresAt > now)
          .map((cert) => cert.courseId)

        const allCoursesCompleted = requiredCourseIds.every((courseId) =>
          completedCourseIds.includes(courseId)
        )

        // Calculate expiry date (earliest expiring certificate)
        let expiresAt: Date | null = null
        if (allCoursesCompleted && certificates.length > 0) {
          const expiringCerts = certificates.filter((cert) => cert.expiresAt)
          if (expiringCerts.length > 0) {
            expiresAt = new Date(
              Math.min(...expiringCerts.map((cert) => cert.expiresAt!.getTime()))
            )
          }
        }

        // Check if user has achieved this level
        const userLevel = level.userLevels[0] || null

        // Get enrollments and progress for user
        const enrollments = await db.enrollment.findMany({
          where: {
            userId,
            courseId: {
              in: requiredCourseIds,
            },
          },
          include: {
            course: {
              include: {
                modules: {
                  include: {
                    lessons: true,
                  },
                },
              },
            },
          },
        })

        // Get lesson progress for user
        const lessonProgress = await db.lessonProgress.findMany({
          where: {
            userId,
            lesson: {
              module: {
                courseId: {
                  in: requiredCourseIds,
                },
              },
            },
          },
        })

        // Map courses with full details
        const coursesWithDetails = await Promise.all(
          level.courses.map(async (lc) => {
            const course = lc.course
            const enrollment = enrollments.find((e) => e.courseId === course.id)

            // Calculate totals
            const totalModules = course.modules.length
            const totalLessons = course.modules.reduce(
              (sum, m) => sum + m.lessons.length,
              0
            )
            const totalDuration = course.modules.reduce(
              (sum, m) =>
                sum +
                m.lessons.reduce((lessonSum, l) => lessonSum + (l.duration || 0), 0),
              0
            )

            // Calculate progress
            let progress = 0
            if (enrollment) {
              const allLessonIds = course.modules.flatMap((m) =>
                m.lessons.map((l) => l.id)
              )
              const completedLessons = lessonProgress.filter(
                (lp) => allLessonIds.includes(lp.lessonId) && lp.completed
              )
              progress =
                allLessonIds.length > 0
                  ? Math.round((completedLessons.length / allLessonIds.length) * 100)
                  : 0
            }

            // Check if expired or not started
            const now = new Date()
            const isExpired = course.endDate ? new Date(course.endDate) < now : false
            const isNotStarted = course.startDate
              ? new Date(course.startDate) > now
              : false

            // Get certificate for completedAt
            const certificate = certificates.find((cert) => cert.courseId === course.id)

            return {
              id: course.id,
              title: course.title,
              courseNumber: course.courseNumber,
              description: course.description,
              thumbnail: course.thumbnail,
              status: course.status,
              instructor: course.instructor?.name || null,
              instructorId: course.instructorId,
              categories: course.categories.map((c) => c.name),
              totalModules,
              totalLessons,
              totalDuration,
              enrolledCount: course._count.enrollments,
              isEnrolled: !!enrollment,
              progress,
              completedAt: certificate?.completedAt ? new Date(certificate.completedAt).toISOString() : null,
              startDate: course.startDate ? new Date(course.startDate).toISOString() : null,
              endDate: course.endDate ? new Date(course.endDate).toISOString() : null,
              isExpired,
              isNotStarted,
              creditCost: course.creditCost || 0,
              completed: completedCourseIds.includes(course.id),
            }
          })
        )

        return {
          id: level.id,
          name: level.name,
          description: level.description,
          order: level.order,
          logoUrl: level.logoUrl,
          startDate: level.startDate ? level.startDate.toISOString() : null,
          endDate: level.endDate ? level.endDate.toISOString() : null,
          certificateExpiryType: level.certificateExpiryType,
          certificateExpiryValue: level.certificateExpiryValue,
          certificateExpiryDate: level.certificateExpiryDate ? level.certificateExpiryDate.toISOString() : null,
          courses: coursesWithDetails,
          totalCourses: requiredCourseIds.length,
          completedCourses: completedCourseIds.length,
          allCoursesCompleted,
          canUnlock: allCoursesCompleted && !userLevel, // Neu: kann freigeschaltet werden
          userLevel: userLevel
            ? {
                id: userLevel.id,
                achievedAt: userLevel.achievedAt,
                expiresAt: userLevel.expiresAt,
                isValid: userLevel.isValid,
                certificateNumber: userLevel.certificateNumber,
              }
            : null,
        }
      })
    )

    return NextResponse.json(levelsWithStatus)
  } catch (error) {
    console.error('Error fetching user certification levels:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Zertifizierungsstufen' },
      { status: 500 }
    )
  }
}
