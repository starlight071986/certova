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

const updateQuestionSchema = z.object({
  type: z.enum(['YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']).optional(),
  text: z.string().min(1).optional(),
  options: z.union([
    z.array(choiceOptionSchema),
    z.array(matchingOptionSchema),
  ]).optional().nullable(),
  correctAnswer: z.boolean().optional().nullable(),
  points: z.number().min(1).optional(),
  order: z.number().int().positive().optional(),
})

// Update question
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify question ownership
    const question = await db.quizQuestion.findUnique({
      where: { id: params.id },
      include: {
        quiz: {
          include: {
            module: {
              include: {
                course: { select: { instructorId: true } },
              },
            },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json({ error: 'Frage nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && question.quiz.module.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const result = updateQuestionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { type, text, options, correctAnswer, points, order } = result.data
    const finalType = type || question.type

    // Validate based on type
    if (finalType === 'YES_NO' && correctAnswer === undefined && type) {
      return NextResponse.json(
        { error: 'Ja/Nein-Fragen benötigen eine korrekte Antwort' },
        { status: 400 }
      )
    }

    if ((finalType === 'SINGLE_CHOICE' || finalType === 'MULTIPLE_CHOICE') && options !== undefined) {
      if (!options || options.length < 2) {
        return NextResponse.json(
          { error: 'Multiple-Choice-Fragen benötigen mindestens 2 Optionen' },
          { status: 400 }
        )
      }

      const choiceOptions = options as { isCorrect: boolean }[]

      if (finalType === 'SINGLE_CHOICE') {
        const correctCount = choiceOptions.filter((o) => o.isCorrect).length
        if (correctCount !== 1) {
          return NextResponse.json(
            { error: 'Single-Choice-Fragen müssen genau eine richtige Antwort haben' },
            { status: 400 }
          )
        }
      }

      if (finalType === 'MULTIPLE_CHOICE') {
        const correctCount = choiceOptions.filter((o) => o.isCorrect).length
        if (correctCount < 1) {
          return NextResponse.json(
            { error: 'Multiple-Choice-Fragen müssen mindestens eine richtige Antwort haben' },
            { status: 400 }
          )
        }
      }
    }

    if (finalType === 'MATCHING' && options !== undefined) {
      const matchingOptions = options as { id: string; left: string; right: string }[] | null
      if (!matchingOptions || matchingOptions.length < 2) {
        return NextResponse.json(
          { error: 'Zuordnungsfragen benötigen mindestens 2 Paare' },
          { status: 400 }
        )
      }
      if (matchingOptions.some((p) => !p.left.trim() || !p.right.trim())) {
        return NextResponse.json(
          { error: 'Alle Zuordnungspaare müssen ausgefüllt sein' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (type) updateData.type = type
    if (text) updateData.text = text
    if (options !== undefined) updateData.options = options
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer
    if (points) updateData.points = points
    if (order) updateData.order = order

    const updatedQuestion = await db.quizQuestion.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updatedQuestion)
  } catch (error) {
    console.error('Update question error:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Frage' }, { status: 500 })
  }
}

// Delete question
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Verify question ownership
    const question = await db.quizQuestion.findUnique({
      where: { id: params.id },
      include: {
        quiz: {
          include: {
            module: {
              include: {
                course: { select: { instructorId: true } },
              },
            },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json({ error: 'Frage nicht gefunden' }, { status: 404 })
    }

    if (session.user.role === 'INSTRUCTOR' && question.quiz.module.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    await db.quizQuestion.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Frage gelöscht' })
  } catch (error) {
    console.error('Delete question error:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Frage' }, { status: 500 })
  }
}
