import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get courses pending review (for admins)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const courses = await db.course.findMany({
      where: {
        status: { in: ['DRAFT', 'SUBMITTED', 'IN_REVIEW'] },
      },
      include: {
        instructor: { select: { name: true, email: true } },
        _count: {
          select: { modules: true, enrollments: true },
        },
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            _count: { select: { lessons: true } },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // SUBMITTED first
        { updatedAt: 'desc' },
      ],
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Review courses API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kurse' }, { status: 500 })
  }
}
