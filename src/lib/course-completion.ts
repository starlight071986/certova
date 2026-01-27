import { db } from './db'
import { generateCertificatePDF } from './pdf-generator'
import { checkAndAwardCertificationLevels } from './certification-level-checker'

/**
 * Calculate certificate expiry date based on course settings
 */
function calculateCertificateExpiryDate(
  course: {
    certificateExpiryType: string
    certificateExpiryValue: number | null
    certificateExpiryDate: Date | null
  },
  completedAt: Date
): Date | null {
  switch (course.certificateExpiryType) {
    case 'NEVER':
      return null
    case 'FIXED_DATE':
      return course.certificateExpiryDate
    case 'PERIOD_DAYS':
      if (!course.certificateExpiryValue) return null
      return new Date(completedAt.getTime() + course.certificateExpiryValue * 24 * 60 * 60 * 1000)
    case 'PERIOD_MONTHS': {
      if (!course.certificateExpiryValue) return null
      const date = new Date(completedAt)
      date.setMonth(date.getMonth() + course.certificateExpiryValue)
      return date
    }
    case 'PERIOD_YEARS': {
      if (!course.certificateExpiryValue) return null
      const date = new Date(completedAt)
      date.setFullYear(date.getFullYear() + course.certificateExpiryValue)
      return date
    }
    default:
      // Default to 1 year
      return new Date(completedAt.getTime() + 365 * 24 * 60 * 60 * 1000)
  }
}

/**
 * Get or create app settings
 */
async function getAppSettings() {
  let settings = await db.appSettings.findFirst()
  if (!settings) {
    settings = await db.appSettings.create({
      data: { id: 'default' },
    })
  }
  return settings
}

/**
 * Checks if a course is fully completed by a user and creates a certificate if not exists.
 * A course is complete when:
 * 1. All lessons are completed
 * 2. All required quizzes are passed
 */
export async function checkCourseCompletionAndCreateCertificate(
  userId: string,
  courseId: string
): Promise<{ completed: boolean; certificateCreated: boolean; certificateId?: string }> {
  // Get course with all modules, lessons, quizzes, and user progress
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { name: true } },
      organization: { select: { name: true } },
      modules: {
        include: {
          lessons: {
            include: {
              progress: {
                where: { userId },
              },
            },
          },
          quiz: {
            include: {
              attempts: {
                where: { userId },
              },
            },
          },
        },
      },
      enrollments: {
        where: { userId },
      },
    },
  })

  if (!course || course.enrollments.length === 0) {
    return { completed: false, certificateCreated: false }
  }

  // Check if all lessons are completed
  const allLessons = course.modules.flatMap((m) => m.lessons)
  const allLessonsCompleted = allLessons.every((l) => l.progress[0]?.completed)

  if (!allLessonsCompleted) {
    return { completed: false, certificateCreated: false }
  }

  // Check if all required quizzes are passed
  const modulesWithRequiredQuizzes = course.modules.filter((m) => m.quiz?.isRequired)
  const allRequiredQuizzesPassed = modulesWithRequiredQuizzes.every((m) => {
    const passedAttempt = m.quiz?.attempts.find((a) => a.passed && a.completedAt)
    return !!passedAttempt
  })

  if (!allRequiredQuizzesPassed) {
    return { completed: false, certificateCreated: false }
  }

  // Course is completed! Update enrollment if not already
  const enrollment = course.enrollments[0]
  const completedAt = enrollment.completedAt || new Date()
  if (!enrollment.completedAt) {
    await db.enrollment.update({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      data: {
        completedAt,
      },
    })
  }

  // Check if certificate already exists
  const existingCertificate = await db.certificate.findFirst({
    where: {
      userId,
      courseId,
    },
  })

  if (existingCertificate) {
    return { completed: true, certificateCreated: false, certificateId: existingCertificate.id }
  }

  // Get user data for certificate
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get app settings for certificate number prefix and branding
  const settings = await getAppSettings()

  // Generate certificate number
  const year = new Date().getFullYear()
  const count = await db.certificate.count({
    where: {
      issuedAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  })
  const certNumber = `${settings.courseNumberPrefix}-${year}-${String(count + 1).padStart(5, '0')}`

  // Calculate expiry date based on course settings
  const expiresAt = calculateCertificateExpiryDate(course, completedAt)

  // Generate PDF certificate with Puppeteer
  // PDF-Generierung ist zwingend erforderlich für Unveränderlichkeit
  const pdfData = await generateCertificatePDF({
    userName: user.name || user.email,
    userEmail: user.email,
    courseTitle: course.title,
    courseDescription: course.description,
    instructorName: course.instructor.name || 'Unbekannt',
    completedAt,
    certificateNumber: certNumber,
    organizationName: course.organization?.name,
    logoUrl: settings.logoUrl,
    siteTitle: settings.siteTitle,
  })

  // Create certificate
  const certificate = await db.certificate.create({
    data: {
      number: certNumber,
      userId,
      courseId,
      courseTitle: course.title,
      courseDescription: course.description,
      instructorName: course.instructor.name || 'Unbekannt',
      completedAt,
      expiresAt,
      pdfData,
    },
  })

  // Check and award certification levels
  // This runs asynchronously and doesn't block certificate creation
  checkAndAwardCertificationLevels(userId).catch((error) => {
    console.error('Error checking certification levels:', error)
  })

  return { completed: true, certificateCreated: true, certificateId: certificate.id }
}
