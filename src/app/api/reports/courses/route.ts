import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    // Get all courses with enrollment stats
    const courses = await db.course.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        creditCost: true,
        createdAt: true,
        publishedAt: true,
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
        enrollments: {
          select: {
            id: true,
            enrolledAt: true,
            completedAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        modules: {
          select: {
            id: true,
            lessons: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate statistics for each course
    const courseStats = courses.map((course) => {
      const totalEnrollments = course.enrollments.length
      const completedEnrollments = course.enrollments.filter((e) => e.completedAt).length
      const activeEnrollments = totalEnrollments - completedEnrollments
      const completionRate =
        totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0
      const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0)
      const revenue = course.creditCost * totalEnrollments

      return {
        id: course.id,
        title: course.title,
        status: course.status,
        creditCost: course.creditCost,
        instructor: course.instructor.name || 'Unbekannt',
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completionRate,
        totalLessons,
        revenue,
        createdAt: course.createdAt,
        publishedAt: course.publishedAt,
      }
    })

    // Calculate enrollment trends over time (last 12 months)
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const enrollmentsByMonth = await db.enrollment.groupBy({
      by: ['enrolledAt'],
      where: {
        enrolledAt: {
          gte: twelveMonthsAgo,
        },
      },
      _count: true,
    })

    // Group by month
    const monthlyEnrollments = new Array(12).fill(0).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const monthStr = date.toISOString().slice(0, 7) // YYYY-MM
      const count = enrollmentsByMonth.filter((e) => {
        const enrollMonth = new Date(e.enrolledAt).toISOString().slice(0, 7)
        return enrollMonth === monthStr
      }).length

      return {
        month: date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }),
        enrollments: count,
      }
    })

    // Get completion trends (last 12 months)
    const completionsByMonth = await db.enrollment.groupBy({
      by: ['completedAt'],
      where: {
        completedAt: {
          gte: twelveMonthsAgo,
          not: null,
        },
      },
      _count: true,
    })

    const monthlyCompletions = new Array(12).fill(0).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const monthStr = date.toISOString().slice(0, 7)
      const count = completionsByMonth.filter((e) => {
        if (!e.completedAt) return false
        const completeMonth = new Date(e.completedAt).toISOString().slice(0, 7)
        return completeMonth === monthStr
      }).length

      return {
        month: date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }),
        completions: count,
      }
    })

    // Overall statistics
    const totalCourses = courses.length
    const publishedCourses = courses.filter((c) => c.status === 'APPROVED').length
    const draftCourses = courses.filter((c) => c.status === 'DRAFT').length
    const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollments.length, 0)
    const totalCompletions = courses.reduce(
      (sum, c) => sum + c.enrollments.filter((e) => e.completedAt).length,
      0
    )
    const avgCompletionRate =
      totalEnrollments > 0 ? Math.round((totalCompletions / totalEnrollments) * 100) : 0

    return NextResponse.json({
      overview: {
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        totalCompletions,
        avgCompletionRate,
      },
      courses: courseStats,
      trends: {
        enrollments: monthlyEnrollments,
        completions: monthlyCompletions,
      },
    })
  } catch (error) {
    console.error('Course report error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Berichts' }, { status: 500 })
  }
}
