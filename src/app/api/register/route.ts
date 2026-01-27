import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'

const registerSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z
    .string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const result = registerSchema.safeParse(body)
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message)
      return NextResponse.json(
        { error: errors[0] },
        { status: 400 }
      )
    }

    const { name, email, password } = result.data

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'LEARNER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json(
      { message: 'Registrierung erfolgreich', user },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
}
