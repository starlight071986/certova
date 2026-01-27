import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const createQuizSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  passingScore: z.number().min(1).max(100).optional(),
  maxAttempts: z.number().min(0).optional(),
  shuffleQuestions: z.boolean().optional(),
})

const questionSchema = z.object({
  type: z.enum(['YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']),
  text: z.string().min(1),
  options: z.union([
    // For SINGLE_CHOICE, MULTIPLE_CHOICE
    z.array(z.object({
      id: z.string(),
      text: z.string(),
      isCorrect: z.boolean(),
    })),
    // For MATCHING
    z.array(z.object({
      id: z.string(),
      left: z.string(),
      right: z.string(),
    })),
  ]).optional(),
  correctAnswer: z.boolean().optional(),
  points: z.number().min(1).optional(),
})

// Get quiz for module
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
        questions: {
          orderBy: { order: 'asc' },
        },
        module: {
          select: {
            title: true,
            course: {
              select: { instructorId: true },
            },
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ quiz: null })
    }

    // For learners, don't expose correct answers
    const isInstructor = session.user.role === 'ADMIN' ||
      session.user.role === 'INSTRUCTOR' && quiz.module.course.instructorId === session.user.id

    if (!isInstructor) {
      const sanitizedQuestions = quiz.questions.map((q) => {
        let sanitizedOptions = null
        if (q.options) {
          if (q.type === 'MATCHING') {
            // For MATCHING, keep pairs but shuffle order on client
            sanitizedOptions = (q.options as { id: string; left: string; right: string }[]).map((p) => ({
              id: p.id,
              left: p.left,
              right: p.right,
            }))
          } else {
            // For choice questions, remove isCorrect flag
            sanitizedOptions = (q.options as { id: string; text: string; isCorrect: boolean }[]).map((o) => ({
              id: o.id,
              text: o.text,
            }))
          }
        }
        return {
          id: q.id,
          type: q.type,
          text: q.text,
          options: sanitizedOptions,
          order: q.order,
          points: q.points,
        }
      })

      return NextResponse.json({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        isRequired: quiz.isRequired,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.maxAttempts,
        shuffleQuestions: quiz.shuffleQuestions,
        questions: sanitizedQuestions,
      })
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Get quiz error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Quiz' }, { status: 500 })
  }
}

// Create or update quiz for module
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify module ownership
    const moduleRecord = await db.module.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { instructorId: true } },
        quiz: true,
      },
    })

    if (!moduleRecord) {
      return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && moduleRecord.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const result = createQuizSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Create or update quiz
    const quiz = await db.moduleQuiz.upsert({
      where: { moduleId: params.id },
      create: {
        moduleId: params.id,
        title: result.data.title || 'Lernerfolgskontrolle',
        description: result.data.description,
        isRequired: result.data.isRequired ?? false,
        passingScore: result.data.passingScore ?? 80,
        maxAttempts: result.data.maxAttempts ?? 3,
        shuffleQuestions: result.data.shuffleQuestions ?? false,
      },
      update: {
        title: result.data.title,
        description: result.data.description,
        isRequired: result.data.isRequired,
        passingScore: result.data.passingScore,
        maxAttempts: result.data.maxAttempts,
        shuffleQuestions: result.data.shuffleQuestions,
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Create/update quiz error:', error)
    return NextResponse.json({ error: 'Fehler beim Speichern des Quiz' }, { status: 500 })
  }
}

// Delete quiz
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify module ownership
    const moduleRecord = await db.module.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { instructorId: true } },
      },
    })

    if (!moduleRecord) {
      return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && moduleRecord.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    await db.moduleQuiz.delete({
      where: { moduleId: params.id },
    })

    return NextResponse.json({ message: 'Quiz gelöscht' })
  } catch (error) {
    console.error('Delete quiz error:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen des Quiz' }, { status: 500 })
  }
}
