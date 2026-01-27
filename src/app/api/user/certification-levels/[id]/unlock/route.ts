import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateLevelCertificatePDF } from '@/lib/pdf-generator'

export const dynamic = 'force-dynamic'

/**
 * POST /api/user/certification-levels/[id]/unlock
 * Manually unlock a certification level after completing all required courses
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = session.user.id
    const levelId = params.id

    // Get the certification level with all details
    const level = await db.certificationLevel.findUnique({
      where: { id: levelId },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        accessRules: true,
        userLevels: {
          where: {
            userId,
          },
        },
      },
    })

    if (!level) {
      return NextResponse.json(
        { error: 'Zertifizierungsstufe nicht gefunden' },
        { status: 404 }
      )
    }

    // Check if level is active
    if (!level.isActive) {
      return NextResponse.json(
        { error: 'Diese Zertifizierungsstufe ist nicht aktiv' },
        { status: 400 }
      )
    }

    // Check availability dates
    const now = new Date()
    if (level.startDate && new Date(level.startDate) > now) {
      return NextResponse.json(
        { error: 'Diese Zertifizierungsstufe ist noch nicht verfügbar' },
        { status: 400 }
      )
    }

    if (level.endDate && new Date(level.endDate) < now) {
      return NextResponse.json(
        { error: 'Diese Zertifizierungsstufe ist nicht mehr verfügbar' },
        { status: 400 }
      )
    }

    // Check if user already has this level
    if (level.userLevels.length > 0) {
      return NextResponse.json(
        { error: 'Sie haben diese Zertifizierungsstufe bereits erreicht' },
        { status: 400 }
      )
    }

    // Check access rules
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        userGroups: {
          include: {
            group: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const userGroupIds = user.userGroups.map((ug) => ug.groupId)

    const hasAccess = level.accessRules.some((rule) => {
      if (rule.type === 'ALL') return true
      if (rule.type === 'USER' && rule.userId === userId) return true
      if (rule.type === 'GROUP' && rule.groupId && userGroupIds.includes(rule.groupId))
        return true
      return false
    })

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Sie haben keinen Zugriff auf diese Zertifizierungsstufe' },
        { status: 403 }
      )
    }

    // Check if all required courses are completed
    if (level.courses.length === 0) {
      return NextResponse.json(
        { error: 'Diese Zertifizierungsstufe hat keine zugeordneten Kurse' },
        { status: 400 }
      )
    }

    const requiredCourseIds = level.courses.map((lc) => lc.courseId)

    // Get user's certificates for these courses
    const certificates = await db.certificate.findMany({
      where: {
        userId,
        courseId: {
          in: requiredCourseIds,
        },
      },
    })

    // Check which courses have valid (non-expired) certificates
    const validCertificateCourseIds = certificates
      .filter((cert) => !cert.expiresAt || cert.expiresAt > now)
      .map((cert) => cert.courseId)

    // Check if all required courses are completed
    const allCoursesCompleted = requiredCourseIds.every((courseId) =>
      validCertificateCourseIds.includes(courseId)
    )

    if (!allCoursesCompleted) {
      const missingCourses = level.courses
        .filter((lc) => !validCertificateCourseIds.includes(lc.courseId))
        .map((lc) => lc.course.title)

      return NextResponse.json(
        {
          error: 'Sie haben noch nicht alle erforderlichen Kurse abgeschlossen',
          missingCourses,
        },
        { status: 400 }
      )
    }

    // Calculate expiry date based on level's certificate expiry settings
    let expiresAt: Date | null = null

    switch (level.certificateExpiryType) {
      case 'NEVER':
        expiresAt = null
        break
      case 'FIXED_DATE':
        expiresAt = level.certificateExpiryDate
        break
      case 'PERIOD_DAYS':
        if (level.certificateExpiryValue) {
          expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + level.certificateExpiryValue)
        }
        break
      case 'PERIOD_MONTHS':
        if (level.certificateExpiryValue) {
          expiresAt = new Date()
          expiresAt.setMonth(expiresAt.getMonth() + level.certificateExpiryValue)
        }
        break
      case 'PERIOD_YEARS':
        if (level.certificateExpiryValue) {
          expiresAt = new Date()
          expiresAt.setFullYear(expiresAt.getFullYear() + level.certificateExpiryValue)
        }
        break
    }

    // Generate certificate number
    const settings = await db.appSettings.findUnique({
      where: { id: 'default' },
    })
    const prefix = settings?.courseNumberPrefix || 'CV'
    const year = new Date().getFullYear()

    const lastLevel = await db.userCertificationLevel.findFirst({
      where: {
        certificateNumber: {
          startsWith: `${prefix}-LEVEL-${year}`,
        },
      },
      orderBy: {
        certificateNumber: 'desc',
      },
    })

    let nextNumber = 1
    if (lastLevel?.certificateNumber) {
      const match = lastLevel.certificateNumber.match(/-(\d+)$/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    const certificateNumber = `${prefix}-LEVEL-${year}-${String(nextNumber).padStart(5, '0')}`

    // Generate PDF certificate
    const pdfData = await generateLevelCertificatePDF({
      userName: user.name || user.email,
      userEmail: user.email,
      levelName: level.name,
      levelDescription: level.description,
      courses: level.courses.map((lc) => ({
        title: lc.course.title,
      })),
      achievedAt: new Date(),
      expiresAt,
      certificateNumber,
      logoUrl: level.logoUrl,
      siteTitle: settings?.siteTitle,
    })

    // Create the user certification level record
    const userLevel = await db.userCertificationLevel.create({
      data: {
        userId,
        levelId: level.id,
        expiresAt,
        isValid: true,
        certificateNumber,
        pdfData,
      },
      include: {
        level: true,
      },
    })

    console.log(
      `User ${userId} (${user.name || user.email}) manually unlocked certification level "${level.name}"`
    )

    return NextResponse.json(
      {
        message: 'Zertifizierungsstufe erfolgreich freigeschaltet',
        userLevel: {
          id: userLevel.id,
          achievedAt: userLevel.achievedAt,
          expiresAt: userLevel.expiresAt,
          isValid: userLevel.isValid,
          certificateNumber: userLevel.certificateNumber,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error unlocking certification level:', error)
    return NextResponse.json(
      { error: 'Fehler beim Freischalten der Zertifizierungsstufe' },
      { status: 500 }
    )
  }
}
