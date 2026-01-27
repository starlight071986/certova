import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { CourseAccessType } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/certification-levels/[id]/access
 * Get all access rules for a certification level
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const accessRules = await db.certificationLevelAccess.findMany({
      where: { levelId: params.id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(accessRules)
  } catch (error) {
    console.error('Error fetching access rules:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Zugriffsregeln' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/certification-levels/[id]/access
 * Add an access rule to a certification level
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await req.json()
    const { type, groupId, userId } = body

    // Validate type
    if (!type || !Object.values(CourseAccessType).includes(type)) {
      return NextResponse.json({ error: 'Ungültiger Zugriffstyp' }, { status: 400 })
    }

    // Validate based on type
    if (type === 'GROUP' && !groupId) {
      return NextResponse.json(
        { error: 'Gruppen-ID ist für GROUP-Zugriff erforderlich' },
        { status: 400 }
      )
    }

    if (type === 'USER' && !userId) {
      return NextResponse.json(
        { error: 'Benutzer-ID ist für USER-Zugriff erforderlich' },
        { status: 400 }
      )
    }

    // Check if level exists
    const level = await db.certificationLevel.findUnique({
      where: { id: params.id },
    })

    if (!level) {
      return NextResponse.json({ error: 'Zertifizierungsstufe nicht gefunden' }, { status: 404 })
    }

    // If GROUP type, verify group exists
    if (type === 'GROUP' && groupId) {
      const group = await db.userGroup.findUnique({
        where: { id: groupId },
      })

      if (!group) {
        return NextResponse.json({ error: 'Benutzergruppe nicht gefunden' }, { status: 404 })
      }
    }

    // If USER type, verify user exists
    if (type === 'USER' && userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
      }
    }

    // Create access rule
    const accessRule = await db.certificationLevelAccess.create({
      data: {
        levelId: params.id,
        type,
        groupId: type === 'GROUP' ? groupId : null,
        userId: type === 'USER' ? userId : null,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(accessRule, { status: 201 })
  } catch (error: any) {
    console.error('Error creating access rule:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Diese Zugriffsregel existiert bereits' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Zugriffsregel' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/certification-levels/[id]/access?accessId=xxx
 * Remove an access rule from a certification level
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const accessId = searchParams.get('accessId')

    if (!accessId) {
      return NextResponse.json({ error: 'Zugriffsregel-ID ist erforderlich' }, { status: 400 })
    }

    // Find the access rule
    const accessRule = await db.certificationLevelAccess.findUnique({
      where: { id: accessId },
    })

    if (!accessRule) {
      return NextResponse.json({ error: 'Zugriffsregel nicht gefunden' }, { status: 404 })
    }

    // Verify it belongs to this level
    if (accessRule.levelId !== params.id) {
      return NextResponse.json(
        { error: 'Zugriffsregel gehört nicht zu dieser Stufe' },
        { status: 400 }
      )
    }

    // Delete the access rule
    await db.certificationLevelAccess.delete({
      where: { id: accessId },
    })

    return NextResponse.json({ message: 'Zugriffsregel gelöscht' })
  } catch (error) {
    console.error('Error deleting access rule:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Zugriffsregel' },
      { status: 500 }
    )
  }
}
