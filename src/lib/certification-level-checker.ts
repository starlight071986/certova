import { db } from './db'

/**
 * Check if a user has achieved any certification levels
 * Should be called after a user receives a new certificate
 */
export async function checkAndAwardCertificationLevels(userId: string): Promise<void> {
  try {
    // Get user with their groups
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        userGroups: {
          include: {
            group: true,
          },
        },
      },
    })

    if (!user) {
      console.error('User not found:', userId)
      return
    }

    const userGroupIds = user.userGroups.map((ug) => ug.groupId)

    // Get all active certification levels with access rules
    const levels = await db.certificationLevel.findMany({
      where: {
        isActive: true,
      },
      include: {
        courses: {
          include: {
            course: true,
          },
        },
        accessRules: true,
        userLevels: {
          where: {
            userId,
          },
        },
      },
    })

    // Filter levels the user has access to
    const accessibleLevels = levels.filter((level) => {
      if (level.accessRules.length === 0) return false

      return level.accessRules.some((rule) => {
        if (rule.type === 'ALL') return true
        if (rule.type === 'USER' && rule.userId === userId) return true
        if (rule.type === 'GROUP' && rule.groupId && userGroupIds.includes(rule.groupId))
          return true
        return false
      })
    })

    // Check each accessible level
    for (const level of accessibleLevels) {
      // Skip if user already has this level
      if (level.userLevels.length > 0) {
        continue
      }

      // Skip if no courses assigned
      if (level.courses.length === 0) {
        continue
      }

      const requiredCourseIds = level.courses.map((lc) => lc.courseId)

      // Get user's certificates for these courses
      const certificates = await db.certificate.findMany({
        where: {
          userId,
          courseId: {
            in: requiredCourseIds,
          },
        },
      })

      // Check which courses have valid (non-expired) certificates
      const now = new Date()
      const validCertificateCourseIds = certificates
        .filter((cert) => !cert.expiresAt || cert.expiresAt > now)
        .map((cert) => cert.courseId)

      // Check if all required courses are completed
      const allCoursesCompleted = requiredCourseIds.every((courseId) =>
        validCertificateCourseIds.includes(courseId)
      )

      if (allCoursesCompleted) {
        // DISABLED: Automatic awarding removed - users must manually unlock levels
        console.log(
          `User ${userId} eligible for level "${level.name}", but automatic awarding is disabled`
        )
      }
    }
  } catch (error) {
    console.error('Error checking certification levels:', error)
  }
}

/**
 * Update validity status of all user certification levels
 * Checks expiry and re-validates based on current course certificates
 */
export async function updateUserCertificationLevelValidity(userId: string): Promise<void> {
  try {
    const userLevels = await db.userCertificationLevel.findMany({
      where: {
        userId,
      },
      include: {
        level: {
          include: {
            courses: true,
          },
        },
      },
    })

    const now = new Date()

    for (const userLevel of userLevels) {
      let isValid = true

      // Check expiry
      if (userLevel.expiresAt && userLevel.expiresAt < now) {
        isValid = false
      }

      // Check if all required courses still have valid certificates
      const requiredCourseIds = userLevel.level.courses.map((lc) => lc.courseId)

      const certificates = await db.certificate.findMany({
        where: {
          userId,
          courseId: {
            in: requiredCourseIds,
          },
        },
      })

      const validCertificateCourseIds = certificates
        .filter((cert) => !cert.expiresAt || cert.expiresAt > now)
        .map((cert) => cert.courseId)

      const allCoursesValid = requiredCourseIds.every((courseId) =>
        validCertificateCourseIds.includes(courseId)
      )

      if (!allCoursesValid) {
        isValid = false
      }

      // Update if status changed
      if (userLevel.isValid !== isValid) {
        await db.userCertificationLevel.update({
          where: {
            id: userLevel.id,
          },
          data: {
            isValid,
          },
        })

        console.log(
          `Updated certification level "${userLevel.level.name}" validity for user ${userId}: ${isValid}`
        )
      }
    }
  } catch (error) {
    console.error('Error updating certification level validity:', error)
  }
}
