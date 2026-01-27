import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateCourseNumber } from '@/lib/course-number-generator'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

/**
 * Copy a file and return the new file path
 */
async function copyFile(originalPath: string): Promise<string> {
  if (!originalPath) return originalPath

  // Check if it's a relative path to /uploads/
  if (!originalPath.startsWith('/uploads/')) {
    return originalPath // External URL or different path
  }

  const publicDir = path.join(process.cwd(), 'public')
  const originalFullPath = path.join(publicDir, originalPath)

  try {
    // Check if file exists
    await fs.access(originalFullPath)

    // Generate new filename with timestamp to ensure uniqueness
    const ext = path.extname(originalPath)
    const basename = path.basename(originalPath, ext)
    const dirname = path.dirname(originalPath)
    const timestamp = Date.now()
    const newFilename = `${basename}_copy_${timestamp}${ext}`
    const newPath = path.join(dirname, newFilename)
    const newFullPath = path.join(publicDir, newPath)

    // Copy the file
    await fs.copyFile(originalFullPath, newFullPath)

    return newPath
  } catch (error) {
    console.error('Error copying file:', originalPath, error)
    return originalPath // Return original if copy fails
  }
}

/**
 * Extract file paths from content (for PDF viewer URLs, etc.)
 */
function extractFilePaths(content: string | null): string[] {
  if (!content) return []
  const regex = /\/uploads\/[^\s"'<>]+/g
  return content.match(regex) || []
}

/**
 * Replace file paths in content with new copied paths
 */
async function replaceFilePathsInContent(
  content: string | null,
  fileMapping: Map<string, string>
): Promise<string | null> {
  if (!content) return content

  let newContent = content
  fileMapping.forEach((newPath, oldPath) => {
    newContent = newContent.replace(new RegExp(oldPath, 'g'), newPath)
  })

  return newContent
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Load the original course with all related data
    const originalCourse = await db.course.findUnique({
      where: { id: params.id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
            quiz: {
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        accessRules: true,
        categories: true,
      },
    })

    if (!originalCourse) {
      return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })
    }

    // Check permissions - only admin or course owner can duplicate
    if (
      session.user.role !== 'ADMIN' &&
      originalCourse.instructorId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    // Map to track file copies (oldPath -> newPath)
    const fileMapping = new Map<string, string>()

    // Copy thumbnail if exists
    let newThumbnail = originalCourse.thumbnail
    if (originalCourse.thumbnail) {
      newThumbnail = await copyFile(originalCourse.thumbnail)
      if (newThumbnail !== originalCourse.thumbnail) {
        fileMapping.set(originalCourse.thumbnail, newThumbnail)
      }
    }

    // Generate course number for the new course
    const courseNumber = await generateCourseNumber()

    // Create the new course
    const newCourse = await db.course.create({
      data: {
        title: `${originalCourse.title} (Kopie)`,
        courseNumber,
        description: originalCourse.description,
        thumbnail: newThumbnail,
        status: 'DRAFT', // Always start as draft
        version: 1,
        creditCost: originalCourse.creditCost,
        certificateExpiryType: originalCourse.certificateExpiryType,
        certificateExpiryValue: originalCourse.certificateExpiryValue,
        certificateExpiryDate: originalCourse.certificateExpiryDate,
        startDate: originalCourse.startDate,
        endDate: originalCourse.endDate,
        instructorId: session.user.id, // Assign to current user
        organizationId: originalCourse.organizationId,
        categories: {
          connect: originalCourse.categories.map((cat) => ({ id: cat.id })),
        },
      },
    })

    // Duplicate modules
    for (const originalModule of originalCourse.modules) {
      const newModule = await db.module.create({
        data: {
          title: originalModule.title,
          description: originalModule.description,
          order: originalModule.order,
          courseId: newCourse.id,
        },
      })

      // Duplicate lessons
      for (const originalLesson of originalModule.lessons) {
        let newVideoUrl = originalLesson.videoUrl
        let newContent = originalLesson.content

        // Copy video file if exists
        if (originalLesson.videoUrl) {
          const copiedVideoUrl = await copyFile(originalLesson.videoUrl)
          if (copiedVideoUrl !== originalLesson.videoUrl) {
            fileMapping.set(originalLesson.videoUrl, copiedVideoUrl)
            newVideoUrl = copiedVideoUrl
          }
        }

        // Extract and copy files referenced in content
        if (originalLesson.content) {
          const filePaths = extractFilePaths(originalLesson.content)
          for (const filePath of filePaths) {
            if (!fileMapping.has(filePath)) {
              const copiedPath = await copyFile(filePath)
              if (copiedPath !== filePath) {
                fileMapping.set(filePath, copiedPath)
              }
            }
          }
          newContent = await replaceFilePathsInContent(
            originalLesson.content,
            fileMapping
          )
        }

        await db.lesson.create({
          data: {
            title: originalLesson.title,
            type: originalLesson.type,
            content: newContent,
            videoUrl: newVideoUrl,
            duration: originalLesson.duration,
            order: originalLesson.order,
            moduleId: newModule.id,
          },
        })
      }

      // Duplicate quiz if exists
      if (originalModule.quiz) {
        const newQuiz = await db.moduleQuiz.create({
          data: {
            title: originalModule.quiz.title,
            description: originalModule.quiz.description,
            isRequired: originalModule.quiz.isRequired,
            passingScore: originalModule.quiz.passingScore,
            maxAttempts: originalModule.quiz.maxAttempts,
            shuffleQuestions: originalModule.quiz.shuffleQuestions,
            moduleId: newModule.id,
          },
        })

        // Duplicate quiz questions
        for (const originalQuestion of originalModule.quiz.questions) {
          await db.quizQuestion.create({
            data: {
              type: originalQuestion.type,
              text: originalQuestion.text,
              options: originalQuestion.options as any,
              correctAnswer: originalQuestion.correctAnswer,
              order: originalQuestion.order,
              points: originalQuestion.points,
              quizId: newQuiz.id,
            },
          })
        }
      }
    }

    // Duplicate course access rules
    for (const accessRule of originalCourse.accessRules) {
      await db.courseAccess.create({
        data: {
          type: accessRule.type,
          courseId: newCourse.id,
          groupId: accessRule.groupId,
          userId: accessRule.userId,
        },
      })
    }

    return NextResponse.json(
      {
        id: newCourse.id,
        title: newCourse.title,
        message: 'Kurs erfolgreich dupliziert',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Course duplication error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Duplizieren des Kurses' },
      { status: 500 }
    )
  }
}
