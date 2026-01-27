import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/certification-levels
 * Get all certification levels with their courses and access rules
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const levels = await db.certificationLevel.findMany({
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },
        accessRules: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            userLevels: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    })

    return NextResponse.json(levels)
  } catch (error) {
    console.error('Error fetching certification levels:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Zertifizierungsstufen' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/certification-levels
 * Create a new certification level
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      description,
      order,
      isActive,
      logoUrl,
      startDate,
      endDate,
      certificateExpiryType,
      certificateExpiryValue,
      certificateExpiryDate,
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    // Create certification level
    const level = await db.certificationLevel.create({
      data: {
        name,
        description,
        order: order ?? 0,
        isActive: isActive ?? true,
        logoUrl,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        certificateExpiryType: certificateExpiryType ?? 'NEVER',
        certificateExpiryValue,
        certificateExpiryDate: certificateExpiryDate ? new Date(certificateExpiryDate) : null,
      },
      include: {
        courses: true,
        accessRules: true,
        _count: {
          select: {
            userLevels: true,
          },
        },
      },
    })

    return NextResponse.json(level, { status: 201 })
  } catch (error: any) {
    console.error('Error creating certification level:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Eine Zertifizierungsstufe mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Zertifizierungsstufe' },
      { status: 500 }
    )
  }
}
