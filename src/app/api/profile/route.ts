import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Get current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        image: true,
        role: true,
        createdAt: true,
        userGroups: {
          include: {
            group: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Profils' }, { status: 500 })
  }
}

// Update current user profile
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100).optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  company: z.string().max(200).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben').optional(),
})

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = updateProfileSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, company, currentPassword, newPassword } = result.data

    // If changing email, check if it's already in use
    if (email) {
      const existingUser = await db.user.findFirst({
        where: {
          email,
          NOT: { id: session.user.id },
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse wird bereits verwendet' },
          { status: 400 }
        )
      }
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Aktuelles Passwort ist erforderlich' },
          { status: 400 }
        )
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { passwordHash: true },
      })

      if (!user?.passwordHash) {
        return NextResponse.json(
          { error: 'Passwort kann nicht geändert werden' },
          { status: 400 }
        )
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Aktuelles Passwort ist falsch' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: { name?: string; email?: string; company?: string | null; passwordHash?: string } = {}

    if (name !== undefined) {
      updateData.name = name
    }

    if (email !== undefined) {
      updateData.email = email
    }

    if (company !== undefined) {
      updateData.company = company
    }

    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 12)
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Fehler beim Speichern des Profils' }, { status: 500 })
  }
}
