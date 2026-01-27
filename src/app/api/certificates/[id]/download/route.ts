import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateCertificatePDF } from '@/lib/pdf-generator'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const certificate = await db.certificate.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Zertifikat nicht gefunden' },
        { status: 404 }
      )
    }

    // Check if user owns this certificate or is admin
    if (certificate.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    // PDF muss beim Erstellen des Zertifikats generiert worden sein
    // Nach dem Erstellen ist das PDF unveränderlich
    if (!certificate.pdfData) {
      return NextResponse.json(
        { error: 'PDF-Daten nicht verfügbar. Bitte kontaktieren Sie den Administrator.' },
        { status: 500 }
      )
    }

    return new NextResponse(new Uint8Array(certificate.pdfData), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Zertifikat-${certificate.number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Certificate download error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Zertifikats' },
      { status: 500 }
    )
  }
}
