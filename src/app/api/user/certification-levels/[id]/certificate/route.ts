import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateLevelCertificatePDF } from '@/lib/pdf-generator'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/certification-levels/[id]/certificate
 * Download the PDF certificate for a user's certification level
 * Generates it if not already generated
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = session.user.id
    const levelId = params.id

    // Get the user's certification level achievement with full details
    const userLevel = await db.userCertificationLevel.findUnique({
      where: {
        userId_levelId: {
          userId,
          levelId,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        level: {
          include: {
            courses: {
              include: {
                course: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!userLevel) {
      return NextResponse.json(
        { error: 'Sie haben diese Zertifizierungsstufe nicht erreicht' },
        { status: 404 }
      )
    }

    // Check if certificate PDF already exists
    if (userLevel.pdfData) {
      // Return cached PDF
      return new NextResponse(new Uint8Array(userLevel.pdfData), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Zertifikat_${userLevel.level.name.replace(/[^a-zA-Z0-9]/g, '_')}_${userLevel.certificateNumber}.pdf"`,
        },
      })
    }

    // Generate PDF if not cached
    const settings = await db.appSettings.findUnique({
      where: { id: 'default' },
    })

    const pdfData = await generateLevelCertificatePDF({
      userName: userLevel.user.name || userLevel.user.email,
      userEmail: userLevel.user.email,
      levelName: userLevel.level.name,
      levelDescription: userLevel.level.description,
      courses: userLevel.level.courses.map((lc) => ({
        title: lc.course.title,
      })),
      achievedAt: userLevel.achievedAt,
      expiresAt: userLevel.expiresAt,
      certificateNumber: userLevel.certificateNumber || 'N/A',
      logoUrl: userLevel.level.logoUrl,
      siteTitle: settings?.siteTitle,
    })

    // Cache the PDF in database
    await db.userCertificationLevel.update({
      where: {
        userId_levelId: {
          userId,
          levelId,
        },
      },
      data: {
        pdfData,
      },
    })

    // Return the PDF
    return new NextResponse(new Uint8Array(pdfData), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Zertifikat_${userLevel.level.name.replace(/[^a-zA-Z0-9]/g, '_')}_${userLevel.certificateNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating level certificate:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Zertifikats' },
      { status: 500 }
    )
  }
}
