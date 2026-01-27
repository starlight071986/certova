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

    // Get all certificates with details
    const certificates = await db.certificate.findMany({
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
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    })

    // Calculate certificate statistics
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const certificateStats = certificates.map((cert) => {
      const isExpired = cert.expiresAt ? cert.expiresAt < now : false
      const expiresIn30Days = cert.expiresAt
        ? cert.expiresAt > now && cert.expiresAt <= thirtyDaysFromNow
        : false
      const expiresIn90Days = cert.expiresAt
        ? cert.expiresAt > now && cert.expiresAt <= ninetyDaysFromNow
        : false

      return {
        id: cert.id,
        number: cert.number,
        user: cert.user.name || cert.user.email,
        userEmail: cert.user.email,
        courseTitle: cert.courseTitle,
        instructor: cert.instructorName,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        completedAt: cert.completedAt,
        isExpired,
        expiresIn30Days,
        expiresIn90Days,
      }
    })

    // Issuance trends (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const monthlyIssuance = new Array(12).fill(0).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const monthStr = date.toISOString().slice(0, 7)

      const count = certificates.filter((c) => {
        const issueMonth = new Date(c.issuedAt).toISOString().slice(0, 7)
        return issueMonth === monthStr
      }).length

      return {
        month: date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }),
        issued: count,
      }
    })

    // Certificates by course
    const certificatesByCourse = certificates.reduce((acc, cert) => {
      const courseTitle = cert.courseTitle

      if (!acc[courseTitle]) {
        acc[courseTitle] = {
          courseTitle,
          instructor: cert.instructorName,
          count: 0,
        }
      }

      acc[courseTitle].count += 1

      return acc
    }, {} as Record<string, any>)

    const certsByCourse = Object.values(certificatesByCourse).sort(
      (a: any, b: any) => b.count - a.count
    )

    // Expiry status distribution
    const validCertificates = certificates.filter(
      (c) => !c.expiresAt || c.expiresAt > now
    ).length
    const expiredCertificates = certificates.filter(
      (c) => c.expiresAt && c.expiresAt < now
    ).length
    const expiringIn30Days = certificateStats.filter((c) => c.expiresIn30Days).length
    const expiringIn90Days = certificateStats.filter((c) => c.expiresIn90Days).length
    const neverExpire = certificates.filter((c) => !c.expiresAt).length

    // Overall statistics
    const totalCertificates = certificates.length
    const avgCertificatesPerMonth =
      monthlyIssuance.length > 0
        ? Math.round(
            monthlyIssuance.reduce((sum, m) => sum + m.issued, 0) / monthlyIssuance.length
          )
        : 0

    // Recent certificates
    const recentCertificates = certificateStats.slice(0, 20)

    // Expiring soon (next 30 days)
    const expiringSoon = certificateStats
      .filter((c) => c.expiresIn30Days)
      .sort((a, b) => {
        if (!a.expiresAt || !b.expiresAt) return 0
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
      })

    return NextResponse.json({
      overview: {
        totalCertificates,
        validCertificates,
        expiredCertificates,
        expiringIn30Days,
        expiringIn90Days,
        neverExpire,
        avgCertificatesPerMonth,
      },
      certificates: certificateStats,
      trends: {
        issuance: monthlyIssuance,
      },
      byCourse: certsByCourse,
      expiringSoon,
      recent: recentCertificates,
    })
  } catch (error) {
    console.error('Certificate report error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Berichts' }, { status: 500 })
  }
}
