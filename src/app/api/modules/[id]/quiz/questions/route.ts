import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const choiceOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
})

const matchingOptionSchema = z.object({
  id: z.string(),
  left: z.string(),
  right: z.string(),
})

const questionSchema = z.object({
  type: z.enum(['YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']),
  text: z.string().min(1),
  options: z.union([
    z.array(choiceOptionSchema),
    z.array(matchingOptionSchema),
  ]).optional().nullable(),
  correctAnswer: z.boolean().optional().nullable(),
  points: z.number().min(1).optional(),
})

// Add question to quiz
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify quiz exists and ownership
    const quiz = await db.moduleQuiz.findUnique({
      where: { moduleId: params.id },
      include: {
        module: {
          include: {
            course: { select: { instructorId: true } },
          },
        },
        questions: {
          orderBy: { order: 'desc' },
          take: 1,
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && quiz.module.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const result = questionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { type, text, options, correctAnswer, points } = result.data

    // Validate based on type
    if (type === 'YES_NO' && correctAnswer === undefined) {
      return NextResponse.json(
        { error: 'Ja/Nein-Fragen benötigen eine korrekte Antwort' },
        { status: 400 }
      )
    }

    if ((type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') && (!options || options.length < 2)) {
      return NextResponse.json(
        { error: 'Multiple-Choice-Fragen benötigen mindestens 2 Optionen' },
        { status: 400 }
      )
    }

    if (type === 'SINGLE_CHOICE' && options) {
      const choiceOptions = options as { isCorrect: boolean }[]
      const correctCount = choiceOptions.filter((o) => o.isCorrect).length
      if (correctCount !== 1) {
        return NextResponse.json(
          { error: 'Single-Choice-Fragen müssen genau eine richtige Antwort haben' },
          { status: 400 }
        )
      }
    }

    if (type === 'MULTIPLE_CHOICE' && options) {
      const choiceOptions = options as { isCorrect: boolean }[]
      const correctCount = choiceOptions.filter((o) => o.isCorrect).length
      if (correctCount < 1) {
        return NextResponse.json(
          { error: 'Multiple-Choice-Fragen müssen mindestens eine richtige Antwort haben' },
          { status: 400 }
        )
      }
    }

    if (type === 'MATCHING') {
      const matchingOptions = options as { id: string; left: string; right: string }[] | null | undefined
      if (!matchingOptions || matchingOptions.length < 2) {
        return NextResponse.json(
          { error: 'Zuordnungsfragen benötigen mindestens 2 Paare' },
          { status: 400 }
        )
      }
      // Validate that all pairs have content
      if (matchingOptions.some((p) => !p.left.trim() || !p.right.trim())) {
        return NextResponse.json(
          { error: 'Alle Zuordnungspaare müssen ausgefüllt sein' },
          { status: 400 }
        )
      }
    }

    const maxOrder = quiz.questions[0]?.order || 0

    const question = await db.quizQuestion.create({
      data: {
        quizId: quiz.id,
        type,
        text,
        options: options || undefined,
        correctAnswer: correctAnswer ?? undefined,
        points: points || 1,
        order: maxOrder + 1,
      },
    })

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    console.error('Create question error:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen der Frage' }, { status: 500 })
  }
}
