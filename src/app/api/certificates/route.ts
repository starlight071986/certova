import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkCourseCompletionAndCreateCertificate } from '@/lib/course-completion'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const certificates = await db.certificate.findMany({
      where: { userId: session.user.id },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        number: true,
        issuedAt: true,
        expiresAt: true,
        courseTitle: true,
        courseDescription: true,
        instructorName: true,
        completedAt: true,
        courseId: true,
      },
    })

    return NextResponse.json(certificates)
  } catch (error) {
    console.error('Certificates API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Zertifikate' }, { status: 500 })
  }
}

// Generate certificate for completed course
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json({ error: 'Kurs-ID fehlt' }, { status: 400 })
    }

    // Check if course exists and is completed
    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    })

    if (!enrollment?.completedAt) {
      return NextResponse.json(
        { error: 'Kurs muss erst abgeschlossen werden' },
        { status: 400 }
      )
    }

    // Check if certificate already exists
    const existing = await db.certificate.findFirst({
      where: {
        userId: session.user.id,
        courseId,
      },
    })

    if (existing) {
      return NextResponse.json(existing)
    }

    // Use the course-completion function to create certificate with PDF
    const result = await checkCourseCompletionAndCreateCertificate(session.user.id, courseId)

    if (!result.completed) {
      return NextResponse.json(
        { error: 'Kurs ist noch nicht vollständig abgeschlossen' },
        { status: 400 }
      )
    }

    if (!result.certificateCreated) {
      // Certificate already exists, fetch it
      const certificate = await db.certificate.findFirst({
        where: {
          userId: session.user.id,
          courseId,
        },
      })
      return NextResponse.json(certificate)
    }

    // Fetch the newly created certificate
    const certificate = await db.certificate.findUnique({
      where: { id: result.certificateId },
      select: {
        id: true,
        number: true,
        issuedAt: true,
        expiresAt: true,
        courseTitle: true,
        courseDescription: true,
        instructorName: true,
        completedAt: true,
        courseId: true,
      },
    })

    return NextResponse.json(certificate, { status: 201 })
  } catch (error) {
    console.error('Certificate creation error:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Zertifikats' }, { status: 500 })
  }
}
