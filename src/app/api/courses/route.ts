import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const enrolled = searchParams.get('enrolled') === 'true'
    const category = searchParams.get('category')
    const includeOwn = searchParams.get('includeOwn') === 'true'

    const isInstructor = session.user.role === 'INSTRUCTOR'
    const isAdmin = session.user.role === 'ADMIN'

    // Get user's group IDs for access check
    const userGroupMemberships = await db.userGroupMember.findMany({
      where: { userId: session.user.id },
      select: { groupId: true },
    })
    const userGroupIds = userGroupMemberships.map((m) => m.groupId)

    // Build the where clause
    let where: any = {}
    const now = new Date()

    // Helper function to add date filtering for non-admin users
    const getDateFilter = (isEnrolled: boolean) => {
      if (isEnrolled) {
        // Enrolled users can see expired courses (endDate passed)
        // but not courses that haven't started yet
        return {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        }
      }
      // Non-enrolled users: only see courses that are active (started and not ended)
      return {
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } },
            ],
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      }
    }

    if (isAdmin) {
      // Admins see all courses (no date filtering)
      if (includeOwn) {
        // Show all statuses for admins in course management
        where.status = { in: ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'] }
      } else {
        where.status = 'APPROVED'
      }
    } else if (isInstructor && includeOwn) {
      // Instructors see approved courses they have access to + their own courses
      where.OR = [
        {
          AND: [
            { status: 'APPROVED' },
            getDateFilter(enrolled),
            {
              OR: [
                { accessRules: { some: { type: 'ALL' } } },
                { accessRules: { some: { type: 'USER', userId: session.user.id } } },
                ...(userGroupIds.length > 0
                  ? [{ accessRules: { some: { type: 'GROUP', groupId: { in: userGroupIds } } } }]
                  : []),
              ],
            },
          ],
        },
        { instructorId: session.user.id },
      ]
    } else {
      // Regular users: only approved courses they have access to with date filtering
      where.AND = [
        { status: 'APPROVED' },
        getDateFilter(enrolled),
        {
          OR: [
            { accessRules: { some: { type: 'ALL' } } },
            { accessRules: { some: { type: 'USER', userId: session.user.id } } },
            ...(userGroupIds.length > 0
              ? [{ accessRules: { some: { type: 'GROUP', groupId: { in: userGroupIds } } } }]
              : []),
          ],
        },
      ]
    }

    if (category) {
      where.categories = { some: { name: category } }
    }

    if (enrolled) {
      where.enrollments = { some: { userId: session.user.id } }
    }

    const courses = await db.course.findMany({
      where,
      include: {
        instructor: { select: { name: true } },
        categories: true,
        modules: {
          include: {
            lessons: { select: { id: true, duration: true } },
          },
        },
        enrollments: {
          where: { userId: session.user.id },
          select: { id: true, enrolledAt: true, completedAt: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
    })

    // Calculate progress for each course
    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
        const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id))
        const totalLessons = lessonIds.length

        const completedLessons = await db.lessonProgress.count({
          where: {
            userId: session.user.id,
            lessonId: { in: lessonIds },
            completed: true,
          },
        })

        const totalDuration = course.modules.reduce(
          (acc, m) => acc + m.lessons.reduce((a, l) => a + (l.duration || 0), 0),
          0
        )

        // Check if course is expired (past endDate)
        const isExpired = course.endDate ? new Date(course.endDate) < now : false
        // Check if course hasn't started yet
        const isNotStarted = course.startDate ? new Date(course.startDate) > now : false

        return {
          id: course.id,
          title: course.title,
          courseNumber: course.courseNumber,
          description: course.description,
          thumbnail: course.thumbnail,
          status: course.status,
          instructor: course.instructor.name,
          instructorId: course.instructorId,
          categories: course.categories.map((c) => c.name),
          totalModules: course.modules.length,
          totalLessons,
          totalDuration,
          enrolledCount: course._count.enrollments,
          isEnrolled: course.enrollments.length > 0,
          progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          completedAt: course.enrollments[0]?.completedAt,
          startDate: course.startDate,
          endDate: course.endDate,
          isExpired,
          isNotStarted,
          creditCost: course.creditCost,
        }
      })
    )

    return NextResponse.json(coursesWithProgress)
  } catch (error) {
    console.error('Courses API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kurse' }, { status: 500 })
  }
}
