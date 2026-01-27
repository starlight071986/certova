import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Start new quiz attempt
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const quiz = await db.moduleQuiz.findUnique({
      where: { moduleId: params.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        attempts: {
          where: { userId: session.user.id },
          orderBy: { startedAt: 'desc' },
        },
        module: {
          include: {
            course: {
              include: {
                enrollments: {
                  where: { userId: session.user.id },
                },
              },
            },
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz nicht gefunden' }, { status: 404 })
    }

    // Check enrollment
    if (quiz.module.course.enrollments.length === 0) {
      return NextResponse.json({ error: 'Nicht eingeschrieben' }, { status: 403 })
    }

    // Check max attempts
    const completedAttempts = quiz.attempts.filter((a) => a.completedAt !== null)
    if (quiz.maxAttempts > 0 && completedAttempts.length >= quiz.maxAttempts) {
      return NextResponse.json(
        { error: 'Maximale Anzahl an Versuchen erreicht' },
        { status: 400 }
      )
    }

    // Check for uncompleted attempt
    const uncompletedAttempt = quiz.attempts.find((a) => a.completedAt === null)
    if (uncompletedAttempt) {
      // Return existing uncompleted attempt
      const questions = quiz.shuffleQuestions
        ? shuffleArray([...quiz.questions])
        : quiz.questions

      return NextResponse.json({
        attempt: { id: uncompletedAttempt.id },
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          options: q.options ? (q.options as any[]).map((o) => ({ id: o.id, text: o.text })) : null,
          points: q.points,
        })),
        remainingAttempts: quiz.maxAttempts > 0 ? quiz.maxAttempts - completedAttempts.length : null,
      })
    }

    // Create new attempt
    const attempt = await db.quizAttempt.create({
      data: {
        userId: session.user.id,
        quizId: quiz.id,
      },
    })

    const questions = quiz.shuffleQuestions
      ? shuffleArray([...quiz.questions])
      : quiz.questions

    return NextResponse.json({
      attempt: { id: attempt.id },
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options ? (q.options as any[]).map((o) => ({ id: o.id, text: o.text })) : null,
        points: q.points,
      })),
      remainingAttempts: quiz.maxAttempts > 0 ? quiz.maxAttempts - completedAttempts.length - 1 : null,
    }, { status: 201 })
  } catch (error) {
    console.error('Start quiz attempt error:', error)
    return NextResponse.json({ error: 'Fehler beim Starten des Quiz' }, { status: 500 })
  }
}

// Get user's quiz status and attempts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const quiz = await db.moduleQuiz.findUnique({
      where: { moduleId: params.id },
      include: {
        questions: true,
        attempts: {
          where: { userId: session.user.id },
          orderBy: { startedAt: 'desc' },
          include: {
            answers: true,
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ quiz: null })
    }

    const completedAttempts = quiz.attempts.filter((a) => a.completedAt !== null)
    const bestAttempt = completedAttempts
      .filter((a) => a.percentage !== null)
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0]
    const hasPassed = completedAttempts.some((a) => a.passed)
    const hasUncompletedAttempt = quiz.attempts.some((a) => a.completedAt === null)

    // canAttempt: maxAttempts === 0 means unlimited
    const canAttempt = quiz.maxAttempts === 0 || completedAttempts.length < quiz.maxAttempts

    return NextResponse.json({
      quizId: quiz.id,
      title: quiz.title,
      isRequired: quiz.isRequired,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      questionCount: quiz.questions.length,
      attemptsUsed: completedAttempts.length,
      canAttempt,
      passed: hasPassed,
      currentAttempt: hasUncompletedAttempt ? quiz.attempts.find((a) => a.completedAt === null) : null,
      bestScore: bestAttempt?.percentage || null,
      attempts: completedAttempts.map((a) => ({
        id: a.id,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        completedAt: a.completedAt,
      })),
    })
  } catch (error) {
    console.error('Get quiz status error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Quiz-Status' }, { status: 500 })
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
