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

    // Get all users with activity stats
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credits: true,
        isActive: true,
        createdAt: true,
        company: true,
        enrollments: {
          select: {
            id: true,
            enrolledAt: true,
            completedAt: true,
            lastAccessAt: true,
            course: {
              select: {
                title: true,
                creditCost: true,
              },
            },
          },
        },
        certificates: {
          select: {
            id: true,
            issuedAt: true,
          },
        },
        creditHistory: {
          select: {
            amount: true,
            type: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate statistics for each user
    const userStats = users.map((user) => {
      const totalEnrollments = user.enrollments.length
      const completedCourses = user.enrollments.filter((e) => e.completedAt).length
      const activeCourses = totalEnrollments - completedCourses
      const totalCertificates = user.certificates.length
      const totalCreditsSpent = user.enrollments.reduce(
        (sum, e) => sum + (e.course.creditCost || 0),
        0
      )
      const lastActivity = user.enrollments.reduce((latest, e) => {
        const accessDate = e.lastAccessAt || e.enrolledAt
        return accessDate > latest ? accessDate : latest
      }, user.createdAt)

      return {
        id: user.id,
        name: user.name || 'Unbekannt',
        email: user.email,
        role: user.role,
        company: user.company,
        credits: user.credits,
        isActive: user.isActive,
        totalEnrollments,
        activeCourses,
        completedCourses,
        totalCertificates,
        totalCreditsSpent,
        lastActivity,
        createdAt: user.createdAt,
      }
    })

    // User registration trends (last 12 months)
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const usersByMonth = users.filter((u) => u.createdAt >= twelveMonthsAgo)

    const monthlyRegistrations = new Array(12).fill(0).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const monthStr = date.toISOString().slice(0, 7)
      const count = usersByMonth.filter((u) => {
        const userMonth = new Date(u.createdAt).toISOString().slice(0, 7)
        return userMonth === monthStr
      }).length

      return {
        month: date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }),
        registrations: count,
      }
    })

    // Role distribution
    const roleDistribution = [
      { role: 'Lernende', count: users.filter((u) => u.role === 'LEARNER').length },
      { role: 'Instruktoren', count: users.filter((u) => u.role === 'INSTRUCTOR').length },
      { role: 'Reviewer', count: users.filter((u) => u.role === 'REVIEWER').length },
      { role: 'Admins', count: users.filter((u) => u.role === 'ADMIN').length },
    ]

    // Activity distribution (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const activeUsersLast30Days = users.filter((u) => {
      const hasRecentEnrollment = u.enrollments.some(
        (e) => (e.lastAccessAt || e.enrolledAt) > thirtyDaysAgo
      )
      return hasRecentEnrollment
    }).length

    // Overall statistics
    const totalUsers = users.length
    const activeUsers = users.filter((u) => u.isActive).length
    const inactiveUsers = totalUsers - activeUsers
    const totalEnrollments = users.reduce((sum, u) => sum + u.enrollments.length, 0)
    const totalCertificates = users.reduce((sum, u) => sum + u.certificates.length, 0)
    const avgEnrollmentsPerUser = totalUsers > 0 ? (totalEnrollments / totalUsers).toFixed(1) : 0

    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        activeUsersLast30Days,
        totalEnrollments,
        totalCertificates,
        avgEnrollmentsPerUser,
      },
      users: userStats,
      trends: {
        registrations: monthlyRegistrations,
      },
      distribution: {
        roles: roleDistribution,
      },
    })
  } catch (error) {
    console.error('User report error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Berichts' }, { status: 500 })
  }
}
