import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/certification-levels/[id]/courses
 * Add a course to a certification level
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await req.json()
    const { courseId } = body

    if (!courseId) {
      return NextResponse.json({ error: 'Kurs-ID ist erforderlich' }, { status: 400 })
    }

    // Check if level exists
    const level = await db.certificationLevel.findUnique({
      where: { id: params.id },
    })

    if (!level) {
      return NextResponse.json({ error: 'Zertifizierungsstufe nicht gefunden' }, { status: 404 })
    }

    // Check if course exists
    const course = await db.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })
    }

    // Add course to level
    const levelCourse = await db.certificationLevelCourse.create({
      data: {
        levelId: params.id,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
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
    })

    return NextResponse.json(levelCourse, { status: 201 })
  } catch (error: any) {
    console.error('Error adding course to certification level:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Dieser Kurs ist bereits dieser Stufe zugeordnet' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Fehler beim Hinzufügen des Kurses zur Zertifizierungsstufe' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/certification-levels/[id]/courses?courseId=xxx
 * Remove a course from a certification level
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({ error: 'Kurs-ID ist erforderlich' }, { status: 400 })
    }

    // Find the assignment
    const assignment = await db.certificationLevelCourse.findUnique({
      where: {
        levelId_courseId: {
          levelId: params.id,
          courseId,
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Kurszuordnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Remove the assignment
    await db.certificationLevelCourse.delete({
      where: {
        levelId_courseId: {
          levelId: params.id,
          courseId,
        },
      },
    })

    return NextResponse.json({ message: 'Kurs von Zertifizierungsstufe entfernt' })
  } catch (error) {
    console.error('Error removing course from certification level:', error)
    return NextResponse.json(
      { error: 'Fehler beim Entfernen des Kurses von der Zertifizierungsstufe' },
      { status: 500 }
    )
  }
}
