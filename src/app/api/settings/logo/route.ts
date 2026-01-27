import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'settings')

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei angegeben' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Ungültiger Dateityp. Erlaubt sind: PNG, JPEG, SVG, WebP' },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Datei zu groß. Maximal 2MB erlaubt.' },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Get current settings to check for existing logo
    const settings = await db.appSettings.findFirst()
    if (settings?.logoUrl) {
      // Delete old logo file if it exists
      const oldPath = join(process.cwd(), 'public', settings.logoUrl)
      if (existsSync(oldPath)) {
        try {
          await unlink(oldPath)
        } catch (e) {
          // Ignore errors deleting old file
        }
      }
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png'
    const filename = `logo-${Date.now()}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Update settings with new logo URL
    const logoUrl = `/uploads/settings/${filename}`

    // Ensure settings exist
    let currentSettings = settings
    if (!currentSettings) {
      currentSettings = await db.appSettings.create({
        data: { id: 'default' },
      })
    }

    await db.appSettings.update({
      where: { id: currentSettings.id },
      data: { logoUrl },
    })

    return NextResponse.json({ logoUrl })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Hochladen des Logos' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Get current settings
    const settings = await db.appSettings.findFirst()
    if (settings?.logoUrl) {
      // Delete logo file
      const logoPath = join(process.cwd(), 'public', settings.logoUrl)
      if (existsSync(logoPath)) {
        await unlink(logoPath)
      }

      // Update settings
      await db.appSettings.update({
        where: { id: settings.id },
        data: { logoUrl: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logo delete error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Logos' },
      { status: 500 }
    )
  }
}
