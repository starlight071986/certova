import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const userId = session.user.id
    const isAdmin = session.user.role === 'ADMIN'
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Get user's group IDs for access check
    const userGroupMemberships = await db.userGroupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    const userGroupIds = userGroupMemberships.map((m) => m.groupId)

    // Get user's enrolled course IDs
    const enrolledCourseIds = await db.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    })
    const enrolledIds = enrolledCourseIds.map((e) => e.courseId)

    // Count available courses (not enrolled, approved, within date range, and user has access)
    let availableCoursesCount = 0

    if (isAdmin) {
      // Admins can see all approved courses
      availableCoursesCount = await db.course.count({
        where: {
          status: 'APPROVED',
          id: { notIn: enrolledIds },
        },
      })
    } else {
      // Regular users: only courses they have access to
      availableCoursesCount = await db.course.count({
        where: {
          status: 'APPROVED',
          id: { notIn: enrolledIds },
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { endDate: null },
                { endDate: { gte: now } },
              ],
            },
          ],
          accessRules: {
            some: {
              OR: [
                { type: 'ALL' },
                { type: 'USER', userId },
                ...(userGroupIds.length > 0
                  ? [{ type: 'GROUP' as const, groupId: { in: userGroupIds } }]
                  : []),
              ],
            },
          },
        },
      })
    }

    // Count pending reviews (for admins)
    let pendingReviews = 0
    if (isAdmin) {
      pendingReviews = await db.course.count({
        where: {
          status: { in: ['SUBMITTED', 'IN_REVIEW'] },
        },
      })
    }

    // Count expiring certificates
    const expiringCertificates = await db.certificate.count({
      where: {
        userId,
        expiresAt: {
          lte: thirtyDaysFromNow,
          gt: now,
        },
      },
    })

    return NextResponse.json({
      availableCourses: availableCoursesCount,
      pendingReviews,
      expiringCertificates,
    })
  } catch (error) {
    console.error('Header stats API error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Header-Statistiken' },
      { status: 500 }
    )
  }
}
