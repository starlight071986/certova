import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Check if admin exists
export async function GET() {
  try {
    const adminCount = await db.user.count({
      where: { role: 'ADMIN' },
    })

    return NextResponse.json({ adminExists: adminCount > 0 })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    )
  }
}

// Create initial admin user
export async function POST(request: Request) {
  try {
    // Check if admin already exists
    const adminCount = await db.user.count({
      where: { role: 'ADMIN' },
    })

    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Admin user already exists' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, password } = body

    // Validate input
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, Name und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    // Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create organization if it doesn't exist
    let organization = await db.organization.findFirst()
    if (!organization) {
      organization = await db.organization.create({
        data: {
          name: 'Hauptorganisation',
          licenses: 99999, // Community Edition - praktisch unbegrenzt
        },
      })
    }

    // Create admin user
    const admin = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'ADMIN',
        organizationId: organization.id,
        credits: 0,
        isActive: true,
      },
    })

    // Create default app settings if they don't exist
    const existingSettings = await db.appSettings.findUnique({
      where: { id: 'default' },
    })

    if (!existingSettings) {
      await db.appSettings.create({
        data: {
          id: 'default',
          siteTitle: 'Certova',
          courseNumberPrefix: 'CT',
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Administrator erfolgreich erstellt',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Administrators' },
      { status: 500 }
    )
  }
}
