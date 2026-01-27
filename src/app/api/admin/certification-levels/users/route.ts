import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/certification-levels/users
 * Get all user certification levels for admin overview
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

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
            description: true,
          },
        },
      },
      orderBy: [{ level: { name: 'asc' } }, { achievedAt: 'desc' }],
    })

    return NextResponse.json(userLevels)
  } catch (error) {
    console.error('Error fetching user certification levels:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Daten' },
      { status: 500 }
    )
  }
}
