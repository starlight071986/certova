import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        company: true,
        customerNumber: true,
        credits: true,
        isActive: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
        enrollments: {
          include: {
            course: { select: { title: true } },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        certificates: {
          include: {
            course: { select: { title: true } },
          },
          orderBy: { issuedAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('User detail API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Benutzers' }, { status: 500 })
  }
}

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  company: z.string().max(200).optional().nullable(),
  customerNumber: z.string().max(50).optional().nullable(),
  role: z.enum(['LEARNER', 'INSTRUCTOR', 'REVIEWER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = updateUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, ...otherData } = result.data

    // If changing email, check if it's already in use
    if (email) {
      const existingUser = await db.user.findFirst({
        where: {
          email,
          NOT: { id: params.id },
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse wird bereits verwendet' },
          { status: 400 }
        )
      }
    }

    // If changing customerNumber, check if it's already in use
    const { customerNumber, ...restData } = otherData
    if (customerNumber) {
      const existingCustomer = await db.user.findFirst({
        where: {
          customerNumber,
          NOT: { id: params.id },
        },
      })

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Diese Kundennummer wird bereits verwendet' },
          { status: 400 }
        )
      }
    }

    const user = await db.user.update({
      where: { id: params.id },
      data: {
        ...restData,
        ...(email && { email }),
        ...(customerNumber !== undefined && { customerNumber }),
      },
      select: { id: true, name: true, email: true, role: true, company: true, customerNumber: true, credits: true, isActive: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Benutzers' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Prevent self-deletion
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Sie können sich nicht selbst löschen' },
        { status: 400 }
      )
    }

    await db.user.delete({ where: { id: params.id } })

    return NextResponse.json({ message: 'Benutzer gelöscht' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen des Benutzers' }, { status: 500 })
  }
}
