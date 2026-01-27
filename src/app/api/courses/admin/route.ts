import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateCourseNumber } from '@/lib/course-number-generator'

const createCourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = createCourseSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { title, description, categories } = result.data

    // Generate course number
    const courseNumber = await generateCourseNumber()

    const course = await db.course.create({
      data: {
        title,
        courseNumber,
        description,
        instructorId: session.user.id,
        status: 'DRAFT',
        categories: categories?.length
          ? {
              connectOrCreate: categories.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: {
        categories: true,
        instructor: { select: { name: true } },
      },
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error('Create course error:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Kurses' }, { status: 500 })
  }
}

// Get all courses for admin (including drafts)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const where: any = {}

    // Instructors only see their own courses
    if (session.user.role === 'INSTRUCTOR') {
      where.instructorId = session.user.id
    }

    const courses = await db.course.findMany({
      where,
      include: {
        instructor: { select: { name: true } },
        categories: true,
        _count: {
          select: { modules: true, enrollments: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(
      courses.map((course) => ({
        id: course.id,
        title: course.title,
        courseNumber: course.courseNumber,
        description: course.description,
        status: course.status,
        instructor: course.instructor.name,
        categories: course.categories.map((c) => c.name),
        modulesCount: course._count.modules,
        enrollmentsCount: course._count.enrollments,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        publishedAt: course.publishedAt,
      }))
    )
  } catch (error) {
    console.error('Admin courses API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kurse' }, { status: 500 })
  }
}
