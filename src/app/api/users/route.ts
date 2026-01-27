import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role')

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { customerNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) {
      where.role = role
    }

    const users = await db.user.findMany({
      where,
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
        organization: { select: { name: true } },
        userGroups: {
          select: {
            group: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            enrollments: true,
            certificates: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        company: user.company,
        customerNumber: user.customerNumber,
        credits: user.credits,
        isActive: user.isActive,
        createdAt: user.createdAt,
        organization: user.organization?.name,
        userGroups: user.userGroups.map((ug) => ug.group),
        enrollmentsCount: user._count.enrollments,
        certificatesCount: user._count.certificates,
      }))
    )
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzer' }, { status: 500 })
  }
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['LEARNER', 'INSTRUCTOR', 'REVIEWER', 'ADMIN']),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = createUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password, role } = result.data

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Benutzer mit dieser E-Mail existiert bereits' },
        { status: 409 }
      )
    }

    const passwordHash = await hash(password, 12)

    const user = await db.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Benutzers' }, { status: 500 })
  }
}
