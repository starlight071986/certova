import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reports/certification-levels
 * Get certification level statistics for admin reports
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    // Get all user certification levels
    const userLevels = await db.userCertificationLevel.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        level: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { achievedAt: 'desc' },
    })

    // Get total unique users with certification levels
    const totalUsers = new Set(userLevels.map((ul) => ul.userId)).size

    // Group by level and calculate stats
    const levelMap = new Map<
      string,
      {
        levelId: string
        levelName: string
        totalAchieved: number
        validCount: number
        invalidCount: number
        recentAchievements: Array<{
          userName: string
          userEmail: string
          achievedAt: string
        }>
      }
    >()

    userLevels.forEach((ul) => {
      const existing = levelMap.get(ul.levelId) || {
        levelId: ul.levelId,
        levelName: ul.level.name,
        totalAchieved: 0,
        validCount: 0,
        invalidCount: 0,
        recentAchievements: [],
      }

      existing.totalAchieved++
      if (ul.isValid) {
        existing.validCount++
      } else {
        existing.invalidCount++
      }

      // Keep only the 5 most recent achievements per level
      if (existing.recentAchievements.length < 5) {
        existing.recentAchievements.push({
          userName: ul.user.name || '',
          userEmail: ul.user.email,
          achievedAt: ul.achievedAt.toISOString(),
        })
      }

      levelMap.set(ul.levelId, existing)
    })

    const levelStats = Array.from(levelMap.values()).sort(
      (a, b) => b.totalAchieved - a.totalAchieved
    )

    return NextResponse.json({
      totalUsers,
      totalLevelsAchieved: userLevels.length,
      levelStats,
    })
  } catch (error) {
    console.error('Error fetching certification level reports:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Berichte' },
      { status: 500 }
    )
  }
}
