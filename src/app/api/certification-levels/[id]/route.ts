import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/certification-levels/[id]
 * Get a single certification level with all details
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const level = await db.certificationLevel.findUnique({
      where: { id: params.id },
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
                instructor: {
                  select: {
                    name: true,
                  },
                },
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
        userLevels: {
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
            achievedAt: 'desc',
          },
        },
        _count: {
          select: {
            userLevels: true,
          },
        },
      },
    })

    if (!level) {
      return NextResponse.json({ error: 'Zertifizierungsstufe nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(level)
  } catch (error) {
    console.error('Error fetching certification level:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Zertifizierungsstufe' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/certification-levels/[id]
 * Update a certification level
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

    // Check if level exists
    const existingLevel = await db.certificationLevel.findUnique({
      where: { id: params.id },
    })

    if (!existingLevel) {
      return NextResponse.json({ error: 'Zertifizierungsstufe nicht gefunden' }, { status: 404 })
    }

    // Update certification level
    const level = await db.certificationLevel.update({
      where: { id: params.id },
      data: {
        name,
        description,
        order,
        isActive,
        logoUrl,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        certificateExpiryType,
        certificateExpiryValue,
        certificateExpiryDate: certificateExpiryDate ? new Date(certificateExpiryDate) : null,
      },
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
    })

    return NextResponse.json(level)
  } catch (error: any) {
    console.error('Error updating certification level:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Eine Zertifizierungsstufe mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Zertifizierungsstufe' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/certification-levels/[id]
 * Delete a certification level (will cascade delete all related records)
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    // Check if level exists
    const existingLevel = await db.certificationLevel.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            userLevels: true,
          },
        },
      },
    })

    if (!existingLevel) {
      return NextResponse.json({ error: 'Zertifizierungsstufe nicht gefunden' }, { status: 404 })
    }

    // Warning if users have achieved this level
    if (existingLevel._count.userLevels > 0) {
      // Still allow deletion, but it will cascade delete user achievements
      console.warn(
        `Deleting certification level ${params.id} with ${existingLevel._count.userLevels} user achievements`
      )
    }

    // Delete the level (cascades to courses, access rules, and user levels)
    await db.certificationLevel.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Zertifizierungsstufe gelöscht' })
  } catch (error) {
    console.error('Error deleting certification level:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Zertifizierungsstufe' },
      { status: 500 }
    )
  }
}
