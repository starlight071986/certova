import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id: userId } = await params

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Get all certificates for this user
    const certificates = await db.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    })

    const now = new Date()

    const certificatesWithStatus = certificates.map((cert) => ({
      id: cert.id,
      number: cert.number,
      courseTitle: cert.courseTitle,
      courseId: cert.courseId,
      courseStatus: cert.course?.status,
      instructorName: cert.instructorName,
      issuedAt: cert.issuedAt,
      completedAt: cert.completedAt,
      expiresAt: cert.expiresAt,
      isExpired: cert.expiresAt ? new Date(cert.expiresAt) < now : false,
      isExpiringSoon:
        cert.expiresAt &&
        new Date(cert.expiresAt) > now &&
        new Date(cert.expiresAt) <=
          new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      hasPdf: !!cert.pdfData,
    }))

    return NextResponse.json(certificatesWithStatus)
  } catch (error) {
    console.error('Error fetching user certificates:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Zertifikate' },
      { status: 500 }
    )
  }
}

// Delete a certificate
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id: userId } = await params
    const { searchParams } = new URL(request.url)
    const certificateId = searchParams.get('certificateId')

    if (!certificateId) {
      return NextResponse.json(
        { error: 'Zertifikat-ID erforderlich' },
        { status: 400 }
      )
    }

    // Verify certificate exists and belongs to this user
    const certificate = await db.certificate.findFirst({
      where: {
        id: certificateId,
        userId,
      },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Zertifikat nicht gefunden' },
        { status: 404 }
      )
    }

    // Delete the certificate
    await db.certificate.delete({
      where: { id: certificateId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting certificate:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Zertifikats' },
      { status: 500 }
    )
  }
}
