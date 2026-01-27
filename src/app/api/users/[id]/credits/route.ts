import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Get credit history for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id: userId } = await params

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Get credit history
    const history = await db.creditHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to last 100 entries
    })

    return NextResponse.json({
      currentBalance: user.credits,
      history,
    })
  } catch (error) {
    console.error('Error fetching credit history:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Kredit-Verlaufs' },
      { status: 500 }
    )
  }
}

// Add/adjust credits for a user (admin only)
const adjustCreditsSchema = z.object({
  amount: z.number().int(),
  type: z.enum(['PURCHASE', 'REFUND', 'ADMIN_ADJUST', 'BONUS']),
  description: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id: userId } = await params

    const body = await request.json()
    const result = adjustCreditsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { amount, type, description } = result.data

    // Get current user balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const newBalance = user.credits + amount

    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Kredit-Guthaben kann nicht negativ werden' },
        { status: 400 }
      )
    }

    // Update user credits and create history entry in transaction
    const [updatedUser, historyEntry] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { credits: newBalance },
        select: { id: true, credits: true },
      }),
      db.creditHistory.create({
        data: {
          userId,
          amount,
          balance: newBalance,
          type,
          description: description || getDefaultDescription(type, amount),
        },
      }),
    ])

    return NextResponse.json({
      currentBalance: updatedUser.credits,
      transaction: historyEntry,
    })
  } catch (error) {
    console.error('Error adjusting credits:', error)
    return NextResponse.json(
      { error: 'Fehler beim Anpassen der Kredits' },
      { status: 500 }
    )
  }
}

function getDefaultDescription(type: string, amount: number): string {
  switch (type) {
    case 'PURCHASE':
      return `${amount} Kredits hinzugefügt`
    case 'REFUND':
      return `${Math.abs(amount)} Kredits erstattet`
    case 'ADMIN_ADJUST':
      return amount >= 0 ? `Admin: ${amount} Kredits hinzugefügt` : `Admin: ${Math.abs(amount)} Kredits abgezogen`
    case 'BONUS':
      return `Bonus: ${amount} Kredits`
    default:
      return ''
  }
}
