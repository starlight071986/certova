import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateAndStoreLogo } from '@/lib/logo-generator'

export const dynamic = 'force-dynamic'

/**
 * POST /api/certification-levels/preview-logo
 * Generate a preview of a certification level logo with test settings
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await req.json()
    const {
      baseLogoUrl,
      testText,
      textPositionX,
      textPositionY,
      textMarginTop,
      textMarginBottom,
      textMarginLeft,
      textMarginRight,
      fontSize,
      fontColor,
      fontFamily,
      textAlign,
    } = body

    // Validate required fields
    if (!baseLogoUrl) {
      return NextResponse.json({ error: 'Basis-Logo URL ist erforderlich' }, { status: 400 })
    }

    if (!testText) {
      return NextResponse.json({ error: 'Testtext ist erforderlich' }, { status: 400 })
    }

    // Generate preview logo
    const logoBuffer = await generateAndStoreLogo(baseLogoUrl, testText, {
      textPositionX: textPositionX ?? 0,
      textPositionY: textPositionY ?? 0,
      textMarginTop: textMarginTop ?? 10,
      textMarginBottom: textMarginBottom ?? 10,
      textMarginLeft: textMarginLeft ?? 10,
      textMarginRight: textMarginRight ?? 10,
      fontSize: fontSize ?? 24,
      fontColor: fontColor ?? '#000000',
      fontFamily: fontFamily ?? 'Arial',
      textAlign: textAlign ?? 'left',
    })

    if (!logoBuffer) {
      return NextResponse.json(
        { error: 'Fehler bei der Logo-Generierung' },
        { status: 500 }
      )
    }

    // Return the logo as PNG
    return new NextResponse(new Uint8Array(logoBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error generating preview logo:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Vorschau' },
      { status: 500 }
    )
  }
}
