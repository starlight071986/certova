import { db } from './db'

/**
 * Generates a unique course number in the format: PREFIX-YEAR-NUMBER
 * Example: CT-2026-00001
 */
export async function generateCourseNumber(): Promise<string> {
  // Get the course number prefix from app settings
  const settings = await db.appSettings.findUnique({
    where: { id: 'default' },
    select: { courseNumberPrefix: true },
  })

  const prefix = settings?.courseNumberPrefix || 'CT'
  const year = new Date().getFullYear()

  // Find the highest course number for this year
  const yearPrefix = `${prefix}-${year}-`
  const lastCourse = await db.course.findFirst({
    where: {
      courseNumber: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      courseNumber: 'desc',
    },
    select: {
      courseNumber: true,
    },
  })

  let nextNumber = 1

  if (lastCourse?.courseNumber) {
    // Extract the number part from the last course number
    const parts = lastCourse.courseNumber.split('-')
    if (parts.length === 3) {
      const lastNumber = parseInt(parts[2], 10)
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }
  }

  // Format the number with leading zeros (5 digits)
  const formattedNumber = nextNumber.toString().padStart(5, '0')

  return `${prefix}-${year}-${formattedNumber}`
}
