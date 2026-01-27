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

    // Get all credit transactions
    const creditHistory = await db.creditHistory.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get all enrollments with course costs
    const enrollments = await db.enrollment.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            creditCost: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    })

    // Calculate revenue by course
    const courseRevenue = enrollments.reduce((acc, enrollment) => {
      const courseId = enrollment.course.id
      const revenue = enrollment.course.creditCost || 0

      if (!acc[courseId]) {
        acc[courseId] = {
          courseId,
          courseTitle: enrollment.course.title,
          instructor: enrollment.course.instructor.name || 'Unbekannt',
          creditCost: enrollment.course.creditCost || 0,
          enrollments: 0,
          revenue: 0,
        }
      }

      acc[courseId].enrollments += 1
      acc[courseId].revenue += revenue

      return acc
    }, {} as Record<string, any>)

    const revenueByCourse = Object.values(courseRevenue).sort((a: any, b: any) => b.revenue - a.revenue)

    // Revenue and credit trends (last 12 months)
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const monthlyData = new Array(12).fill(0).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const monthStr = date.toISOString().slice(0, 7)

      // Revenue from enrollments
      const monthEnrollments = enrollments.filter((e) => {
        const enrollMonth = new Date(e.enrolledAt).toISOString().slice(0, 7)
        return enrollMonth === monthStr
      })
      const revenue = monthEnrollments.reduce((sum, e) => sum + (e.course.creditCost || 0), 0)

      // Credit transactions
      const monthTransactions = creditHistory.filter((t) => {
        const transMonth = new Date(t.createdAt).toISOString().slice(0, 7)
        return transMonth === monthStr
      })

      const creditsAdded = monthTransactions
        .filter((t) => ['PURCHASE', 'ADMIN_ADJUST', 'BONUS', 'REFUND'].includes(t.type) && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)

      const creditsSpent = monthTransactions
        .filter((t) => t.type === 'ENROLLMENT' || t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      return {
        month: date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }),
        revenue,
        creditsAdded,
        creditsSpent,
        enrollments: monthEnrollments.length,
      }
    })

    // Transaction type breakdown
    const transactionTypes = [
      {
        type: 'Käufe/Hinzufügungen',
        count: creditHistory.filter((t) => t.type === 'PURCHASE').length,
        amount: creditHistory.filter((t) => t.type === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0),
      },
      {
        type: 'Einschreibungen',
        count: creditHistory.filter((t) => t.type === 'ENROLLMENT').length,
        amount: Math.abs(
          creditHistory.filter((t) => t.type === 'ENROLLMENT').reduce((sum, t) => sum + t.amount, 0)
        ),
      },
      {
        type: 'Rückerstattungen',
        count: creditHistory.filter((t) => t.type === 'REFUND').length,
        amount: creditHistory.filter((t) => t.type === 'REFUND').reduce((sum, t) => sum + t.amount, 0),
      },
      {
        type: 'Admin-Anpassungen',
        count: creditHistory.filter((t) => t.type === 'ADMIN_ADJUST').length,
        amount: creditHistory
          .filter((t) => t.type === 'ADMIN_ADJUST')
          .reduce((sum, t) => sum + t.amount, 0),
      },
      {
        type: 'Boni',
        count: creditHistory.filter((t) => t.type === 'BONUS').length,
        amount: creditHistory.filter((t) => t.type === 'BONUS').reduce((sum, t) => sum + t.amount, 0),
      },
    ]

    // Overall statistics
    const totalRevenue = enrollments.reduce((sum, e) => sum + (e.course.creditCost || 0), 0)
    const totalCreditsIssued = creditHistory
      .filter((t) => ['PURCHASE', 'ADMIN_ADJUST', 'BONUS', 'REFUND'].includes(t.type) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    const totalCreditsSpent = Math.abs(
      creditHistory
        .filter((t) => t.type === 'ENROLLMENT' || t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    )
    const totalTransactions = creditHistory.length
    const avgRevenuePerEnrollment =
      enrollments.length > 0 ? Math.round(totalRevenue / enrollments.length) : 0

    // Get current total credits in circulation
    const users = await db.user.findMany({
      select: {
        credits: true,
      },
    })
    const creditsInCirculation = users.reduce((sum, u) => sum + u.credits, 0)

    return NextResponse.json({
      overview: {
        totalRevenue,
        totalCreditsIssued,
        totalCreditsSpent,
        creditsInCirculation,
        totalTransactions,
        avgRevenuePerEnrollment,
      },
      revenueByCourse,
      trends: {
        monthly: monthlyData,
      },
      transactions: {
        byType: transactionTypes,
        recent: creditHistory.slice(0, 50).map((t) => ({
          id: t.id,
          user: t.user.name || t.user.email,
          type: t.type,
          amount: t.amount,
          description: t.description,
          courseTitle: t.courseTitle,
          createdAt: t.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Finance report error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Berichts' }, { status: 500 })
  }
}
