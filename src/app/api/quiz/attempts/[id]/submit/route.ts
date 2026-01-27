import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkCourseCompletionAndCreateCertificate } from '@/lib/course-completion'

const submitAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.union([
      z.boolean(),
      z.array(z.string()),
      z.string(),
      z.record(z.string(), z.string()), // For MATCHING: { leftId: rightId }
      z.null(),
    ]),
  })),
})

// Submit quiz answers
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const attempt = await db.quizAttempt.findUnique({
      where: { id: params.id },
      include: {
        quiz: {
          include: {
            questions: true,
            module: {
              include: {
                course: { select: { id: true } },
              },
            },
          },
        },
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Versuch nicht gefunden' }, { status: 404 })
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    if (attempt.completedAt) {
      return NextResponse.json({ error: 'Versuch wurde bereits abgeschlossen' }, { status: 400 })
    }

    const body = await request.json()
    const result = submitAnswersSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { answers } = result.data
    let totalScore = 0
    let maxScore = 0

    // Process each answer
    const answerRecords: Array<{
      attemptId: string
      questionId: string
      answer: any
      correct: boolean
      points: number
    }> = []
    for (const question of attempt.quiz.questions) {
      maxScore += question.points
      const userAnswer = answers.find((a) => a.questionId === question.id)

      if (!userAnswer) {
        answerRecords.push({
          attemptId: attempt.id,
          questionId: question.id,
          answer: null,
          correct: false,
          points: 0,
        })
        continue
      }

      let isCorrect = false

      if (question.type === 'YES_NO') {
        isCorrect = userAnswer.answer === question.correctAnswer
      } else if (question.type === 'SINGLE_CHOICE') {
        const options = question.options as { id: string; text: string; isCorrect: boolean }[]
        const correctOption = options.find((o) => o.isCorrect)
        isCorrect = userAnswer.answer === correctOption?.id
      } else if (question.type === 'MULTIPLE_CHOICE') {
        const options = question.options as { id: string; text: string; isCorrect: boolean }[]
        const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id).sort()
        const answerIds = Array.isArray(userAnswer.answer)
          ? [...userAnswer.answer].sort()
          : []
        isCorrect = JSON.stringify(correctIds) === JSON.stringify(answerIds)
      } else if (question.type === 'MATCHING') {
        // MATCHING: options contains pairs like { id, left, right }
        // User answer is { leftId: rightId } mapping
        // Correct when leftId === rightId (each pair matches itself)
        const pairs = question.options as { id: string; left: string; right: string }[]
        const userMatching = userAnswer.answer as Record<string, string> | null

        if (userMatching && typeof userMatching === 'object' && !Array.isArray(userMatching)) {
          let correctMatches = 0
          for (const pair of pairs) {
            if (userMatching[pair.id] === pair.id) {
              correctMatches++
            }
          }
          // All pairs must match correctly
          isCorrect = correctMatches === pairs.length
        }
      }

      const pointsEarned = isCorrect ? question.points : 0
      totalScore += pointsEarned

      answerRecords.push({
        attemptId: attempt.id,
        questionId: question.id,
        answer: userAnswer.answer,
        correct: isCorrect,
        points: pointsEarned,
      })
    }

    // Save answers
    await db.quizAnswer.createMany({
      data: answerRecords,
    })

    // Calculate percentage and update attempt
    const percentage = Math.round((totalScore / maxScore) * 100)
    const passed = percentage >= attempt.quiz.passingScore

    const updatedAttempt = await db.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        score: totalScore,
        maxScore,
        percentage,
        passed,
        completedAt: new Date(),
      },
    })

    // Update module progress if passed
    if (passed) {
      await db.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId: session.user.id,
            moduleId: attempt.quiz.moduleId,
          },
        },
        create: {
          userId: session.user.id,
          moduleId: attempt.quiz.moduleId,
          status: 'COMPLETED',
          quizPassed: true,
          completedAt: new Date(),
        },
        update: {
          status: 'COMPLETED',
          quizPassed: true,
          completedAt: new Date(),
        },
      })

      // Check if course is fully completed and create certificate
      await checkCourseCompletionAndCreateCertificate(
        session.user.id,
        attempt.quiz.module.course.id
      )
    }

    // Get correct answers for review
    const questionsWithAnswers = attempt.quiz.questions.map((q) => {
      const userAnswer = answerRecords.find((a) => a.questionId === q.id)
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        correctAnswer: q.type === 'YES_NO' ? q.correctAnswer : undefined,
        userAnswer: userAnswer?.answer,
        isCorrect: userAnswer?.correct,
        points: userAnswer?.points,
        maxPoints: q.points,
      }
    })

    return NextResponse.json({
      score: totalScore,
      maxScore,
      percentage,
      passed,
      passingScore: attempt.quiz.passingScore,
      questions: questionsWithAnswers,
    })
  } catch (error) {
    console.error('Submit quiz error:', error)
    return NextResponse.json({ error: 'Fehler beim Abgeben des Quiz' }, { status: 500 })
  }
}
