import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const course = await db.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: { select: { id: true, name: true, image: true } },
        categories: true,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                progress: {
                  where: { userId: session.user.id },
                  select: { completed: true, completedAt: true, timeSpent: true },
                },
              },
            },
            quiz: {
              select: {
                id: true,
                title: true,
                isRequired: true,
                passingScore: true,
                maxAttempts: true,
                questions: {
                  select: { id: true },
                },
              },
            },
            progress: {
              where: { userId: session.user.id },
              select: { status: true, quizPassed: true, completedAt: true },
            },
          },
        },
        enrollments: {
          where: { userId: session.user.id },
          select: { id: true, enrolledAt: true, completedAt: true },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })
    }

    // Format response
    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    const completedLessons = course.modules.reduce(
      (acc, m) => acc + m.lessons.filter((l) => l.progress[0]?.completed).length,
      0
    )
    const totalDuration = course.modules.reduce(
      (acc, m) => acc + m.lessons.reduce((a, l) => a + (l.duration || 0), 0),
      0
    )

    return NextResponse.json({
      id: course.id,
      title: course.title,
      courseNumber: course.courseNumber,
      description: course.description,
      thumbnail: course.thumbnail,
      status: course.status,
      instructor: course.instructor,
      instructorId: course.instructorId,
      categories: course.categories.map((c) => c.name),
      startDate: course.startDate,
      endDate: course.endDate,
      creditCost: course.creditCost,
      certificateExpiryType: course.certificateExpiryType,
      certificateExpiryValue: course.certificateExpiryValue,
      certificateExpiryDate: course.certificateExpiryDate,
      isEnrolled: course.enrollments.length > 0,
      enrolledAt: course.enrollments[0]?.enrolledAt,
      completedAt: course.enrollments[0]?.completedAt,
      totalLessons,
      completedLessons,
      totalDuration,
      progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      modules: course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        order: module.order,
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          content: lesson.content,
          description: lesson.description,
          videoUrl: lesson.videoUrl,
          duration: lesson.duration,
          order: lesson.order,
          completed: lesson.progress[0]?.completed || false,
          completedAt: lesson.progress[0]?.completedAt,
        })),
        quiz: module.quiz ? {
          id: module.quiz.id,
          title: module.quiz.title,
          isRequired: module.quiz.isRequired,
          passingScore: module.quiz.passingScore,
          maxAttempts: module.quiz.maxAttempts,
          questions: module.quiz.questions,
        } : null,
        moduleProgress: module.progress[0] || null,
      })),
    })
  } catch (error) {
    console.error('Course detail API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Kurses' }, { status: 500 })
  }
}

// Enroll in course
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const existing = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: params.id,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Bereits eingeschrieben' }, { status: 400 })
    }

    // Get course to check credit cost
    const course = await db.course.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, creditCost: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })
    }

    // Get user's current credit balance
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, credits: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Check if user has enough credits
    if (course.creditCost > 0 && user.credits < course.creditCost) {
      const missing = course.creditCost - user.credits
      return NextResponse.json(
        {
          error: `Sie haben nicht genügend Credits für diese Buchung.`,
          details: {
            required: course.creditCost,
            available: user.credits,
            missing: missing,
            message: `Ihnen fehlen noch ${missing} Credits. Bitte wenden Sie sich an einen Administrator, um Credits aufzuladen.`
          }
        },
        { status: 400 }
      )
    }

    // Create enrollment and deduct credits in a transaction
    const newBalance = user.credits - course.creditCost

    if (course.creditCost > 0) {
      // With credit deduction
      const [enrollment] = await db.$transaction([
        db.enrollment.create({
          data: {
            userId: session.user.id,
            courseId: params.id,
          },
        }),
        db.user.update({
          where: { id: session.user.id },
          data: { credits: newBalance },
        }),
        db.creditHistory.create({
          data: {
            userId: session.user.id,
            amount: -course.creditCost,
            balance: newBalance,
            type: 'ENROLLMENT',
            description: `Einschreibung: ${course.title}`,
            courseId: course.id,
            courseTitle: course.title,
          },
        }),
      ])

      return NextResponse.json({
        message: 'Erfolgreich eingeschrieben',
        enrollment,
        creditsUsed: course.creditCost,
        newBalance,
      })
    } else {
      // Free course, no credit deduction
      const enrollment = await db.enrollment.create({
        data: {
          userId: session.user.id,
          courseId: params.id,
        },
      })

      return NextResponse.json({
        message: 'Erfolgreich eingeschrieben',
        enrollment,
        creditsUsed: 0,
      })
    }
  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json({ error: 'Fehler bei der Einschreibung' }, { status: 500 })
  }
}

// Update course (status, title, description, certificate settings, availability, credits)
const updateCourseSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  creditCost: z.number().int().min(0).optional(),
  certificateExpiryType: z.enum(['NEVER', 'FIXED_DATE', 'PERIOD_DAYS', 'PERIOD_MONTHS', 'PERIOD_YEARS']).optional(),
  certificateExpiryValue: z.number().int().positive().nullable().optional(),
  certificateExpiryDate: z.string().datetime().nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify course ownership
    const course = await db.course.findUnique({
      where: { id: params.id },
      select: { instructorId: true, status: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })
    }

    // Instructors can only edit their own courses
    if (session.user.role === 'INSTRUCTOR' && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const result = updateCourseSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { title, description, status, startDate, endDate, creditCost, certificateExpiryType, certificateExpiryValue, certificateExpiryDate } = result.data

    // Validate status transitions
    if (status) {
      const allowedTransitions: Record<string, string[]> = {
        DRAFT: ['SUBMITTED'],
        SUBMITTED: ['IN_REVIEW', 'DRAFT'],
        IN_REVIEW: ['APPROVED', 'REJECTED'],
        APPROVED: ['ARCHIVED'],
        REJECTED: ['DRAFT'],
        ARCHIVED: ['DRAFT'],
      }

      // Admins can make any transition, instructors are limited
      if (session.user.role === 'INSTRUCTOR') {
        if (!allowedTransitions[course.status]?.includes(status)) {
          return NextResponse.json(
            { error: 'Ungültiger Statusübergang' },
            { status: 400 }
          )
        }
        // Instructors can only submit for review
        if (status !== 'SUBMITTED' && status !== 'DRAFT') {
          return NextResponse.json(
            { error: 'Nur Admins können diesen Status setzen' },
            { status: 403 }
          )
        }
      }
    }

    const updatedCourse = await db.course.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(status === 'APPROVED' && { publishedAt: new Date() }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(creditCost !== undefined && { creditCost }),
        ...(certificateExpiryType && { certificateExpiryType }),
        ...(certificateExpiryValue !== undefined && { certificateExpiryValue }),
        ...(certificateExpiryDate !== undefined && { certificateExpiryDate: certificateExpiryDate ? new Date(certificateExpiryDate) : null }),
      },
      include: {
        categories: true,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: { orderBy: { order: 'asc' } },
          },
        },
      },
    })

    return NextResponse.json({
      id: updatedCourse.id,
      title: updatedCourse.title,
      description: updatedCourse.description,
      status: updatedCourse.status,
      categories: updatedCourse.categories.map((c) => c.name),
      modules: updatedCourse.modules,
    })
  } catch (error) {
    console.error('Update course error:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Kurses' }, { status: 500 })
  }
}
