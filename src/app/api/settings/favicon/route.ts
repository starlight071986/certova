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

    // Validate file type - favicons are typically ICO, PNG, or SVG
    const allowedTypes = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml', 'image/ico']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      return NextResponse.json(
        { error: 'Ungültiger Dateityp. Erlaubt sind: ICO, PNG, SVG' },
        { status: 400 }
      )
    }

    // Validate file size (max 1MB for favicon)
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Datei zu groß. Maximal 1MB erlaubt.' },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Get current settings to check for existing favicon
    const settings = await db.appSettings.findFirst()
    if (settings?.faviconUrl) {
      // Delete old favicon file if it exists
      const oldPath = join(process.cwd(), 'public', settings.faviconUrl)
      if (existsSync(oldPath)) {
        try {
          await unlink(oldPath)
        } catch (e) {
          // Ignore errors deleting old file
        }
      }
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'ico'
    const filename = `favicon-${Date.now()}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Update settings with new favicon URL
    const faviconUrl = `/uploads/settings/${filename}`

    // Ensure settings exist
    let currentSettings = settings
    if (!currentSettings) {
      currentSettings = await db.appSettings.create({
        data: { id: 'default' },
      })
    }

    await db.appSettings.update({
      where: { id: currentSettings.id },
      data: { faviconUrl },
    })

    return NextResponse.json({ faviconUrl })
  } catch (error) {
    console.error('Favicon upload error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Hochladen des Favicons' },
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
    if (settings?.faviconUrl) {
      // Delete favicon file
      const faviconPath = join(process.cwd(), 'public', settings.faviconUrl)
      if (existsSync(faviconPath)) {
        await unlink(faviconPath)
      }

      // Update settings
      await db.appSettings.update({
        where: { id: settings.id },
        data: { faviconUrl: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Favicon delete error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Favicons' },
      { status: 500 }
    )
  }
}
