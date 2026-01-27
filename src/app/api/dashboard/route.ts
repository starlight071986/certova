import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = session.user.id
    const isAdmin = session.user.role === 'ADMIN'

    // Get user's enrollments with course details
    const enrollments = await db.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  select: { id: true, duration: true },
                },
              },
            },
          },
        },
      },
    })

    // Get lesson progress
    const lessonProgress = await db.lessonProgress.findMany({
      where: { userId },
      select: {
        lessonId: true,
        completed: true,
        timeSpent: true,
        completedAt: true,
        lesson: {
          select: {
            module: {
              select: {
                course: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Get user's certificates
    const certificates = await db.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: { title: true },
        },
      },
      orderBy: { issuedAt: 'desc' },
    })

    // Get user's credits and credit history
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    const creditHistory = await db.creditHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Calculate stats
    const activeCourses = enrollments.filter((e) => !e.completedAt)
    const completedCourses = enrollments.filter((e) => e.completedAt)

    // Calculate total learning time from lesson progress
    const totalLearningTime = lessonProgress.reduce(
      (acc, lp) => acc + (lp.timeSpent || 0),
      0
    )

    // Calculate certificates expiring soon (within 30 days)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringCertificates = certificates.filter(
      (c) => c.expiresAt && new Date(c.expiresAt) <= thirtyDaysFromNow && new Date(c.expiresAt) > now
    )

    // Calculate course progress for each enrollment
    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const lessonIds = enrollment.course.modules.flatMap((m) =>
          m.lessons.map((l) => l.id)
        )
        const totalLessons = lessonIds.length

        const completedLessons = await db.lessonProgress.count({
          where: {
            userId,
            lessonId: { in: lessonIds },
            completed: true,
          },
        })

        const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

        return {
          id: enrollment.course.id,
          title: enrollment.course.title,
          progress,
          isCompleted: !!enrollment.completedAt,
          completedAt: enrollment.completedAt,
          enrolledAt: enrollment.enrolledAt,
          endDate: enrollment.course.endDate,
          isExpired: enrollment.course.endDate ? new Date(enrollment.course.endDate) < now : false,
        }
      })
    )

    // Recent activity - last 10 completed lessons
    const recentActivity = lessonProgress
      .filter((lp) => lp.completed && lp.completedAt)
      .slice(0, 10)
      .map((lp) => ({
        type: 'lesson_completed',
        courseTitle: lp.lesson.module.course.title,
        completedAt: lp.completedAt,
      }))

    // Add certificate achievements to recent activity
    const recentCertificates = certificates
      .slice(0, 5)
      .filter((c) => c.course !== null)
      .map((c) => ({
        type: 'certificate_earned',
        courseTitle: c.course!.title,
        completedAt: c.issuedAt,
      }))

    // Combine and sort activity
    const allActivity = [...recentActivity, ...recentCertificates]
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5)

    // Get user's certification levels
    const userCertificationLevels = await db.userCertificationLevel.findMany({
      where: { userId },
      include: {
        level: {
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { achievedAt: 'desc' },
      take: 5,
    })

    // Admin stats
    let adminStats = null
    if (isAdmin) {
      const [totalUsers, totalCourses, pendingReviews, totalEnrollments] = await Promise.all([
        db.user.count(),
        db.course.count({ where: { status: 'APPROVED' } }),
        db.course.count({ where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } } }),
        db.enrollment.count(),
      ])

      adminStats = {
        totalUsers,
        totalCourses,
        pendingReviews,
        totalEnrollments,
      }
    }

    return NextResponse.json({
      user: {
        name: session.user.name,
        role: session.user.role,
        credits: user?.credits || 0,
      },
      creditHistory: creditHistory.map((ch) => ({
        id: ch.id,
        amount: ch.amount,
        balance: ch.balance,
        type: ch.type,
        description: ch.description,
        createdAt: ch.createdAt,
      })),
      stats: {
        activeCourses: activeCourses.length,
        completedCourses: completedCourses.length,
        totalCertificates: certificates.length,
        expiringCertificates: expiringCertificates.length,
        totalLearningTimeMinutes: totalLearningTime,
        completionRate:
          enrollments.length > 0
            ? Math.round((completedCourses.length / enrollments.length) * 100)
            : 0,
      },
      courses: coursesWithProgress
        .filter((c) => !c.isCompleted)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 6),
      completedCourses: coursesWithProgress
        .filter((c) => c.isCompleted)
        .slice(0, 3),
      recentActivity: allActivity,
      certificates: certificates
        .slice(0, 5)
        .filter((c) => c.course !== null)
        .map((c) => ({
          id: c.id,
          courseTitle: c.course!.title,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
          isExpiringSoon:
            c.expiresAt &&
            new Date(c.expiresAt) <= thirtyDaysFromNow &&
            new Date(c.expiresAt) > now,
        })),
      certificationLevels: userCertificationLevels.map((ucl) => ({
        id: ucl.id,
        levelId: ucl.levelId,
        levelName: ucl.level.name,
        levelDescription: ucl.level.description,
        logoUrl: ucl.level.logoUrl,
        achievedAt: ucl.achievedAt,
        expiresAt: ucl.expiresAt,
        isValid: ucl.isValid,
        certificateNumber: ucl.certificateNumber,
      })),
      adminStats,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Dashboard-Daten' },
      { status: 500 }
    )
  }
}
