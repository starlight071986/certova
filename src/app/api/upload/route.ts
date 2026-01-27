import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Configure route to handle large file uploads with extended timeout
export const maxDuration = 300 // 5 minutes timeout for large video uploads
export const dynamic = 'force-dynamic' // Disable static optimization for upload routes

// Allowed file types per category
const ALLOWED_TYPES = {
  video: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    extensions: ['.mp4', '.webm', '.ogv'],
    maxSize: 500 * 1024 * 1024, // 500MB
    label: 'Video (MP4, WebM, OGG)',
  },
  audio: {
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm'],
    extensions: ['.mp3', '.ogg', '.wav', '.webm'],
    maxSize: 100 * 1024 * 1024, // 100MB
    label: 'Audio (MP3, OGG, WAV)',
  },
  pdf: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    maxSize: 50 * 1024 * 1024, // 50MB
    label: 'PDF',
  },
  powerpoint: {
    mimeTypes: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    extensions: ['.ppt', '.pptx'],
    maxSize: 100 * 1024 * 1024, // 100MB
    label: 'PowerPoint (PPT, PPTX)',
  },
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Only instructors and admins can upload
    if (!['INSTRUCTOR', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    if (!type || !ALLOWED_TYPES[type as keyof typeof ALLOWED_TYPES]) {
      return NextResponse.json({ error: 'Ungültiger Dateityp' }, { status: 400 })
    }

    const typeConfig = ALLOWED_TYPES[type as keyof typeof ALLOWED_TYPES]

    // Validate mime type
    if (!typeConfig.mimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Ungültiges Dateiformat. Erlaubt: ${typeConfig.label}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > typeConfig.maxSize) {
      const maxSizeMB = typeConfig.maxSize / (1024 * 1024)
      return NextResponse.json(
        { error: `Datei zu groß. Maximum: ${maxSizeMB}MB` },
        { status: 400 }
      )
    }

    // Validate extension
    const ext = path.extname(file.name).toLowerCase()
    if (!typeConfig.extensions.includes(ext)) {
      return NextResponse.json(
        { error: `Ungültige Dateiendung. Erlaubt: ${typeConfig.extensions.join(', ')}` },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', type)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 10)
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${randomId}-${safeFilename}`
    const filepath = path.join(uploadDir, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return public URL
    const url = `/uploads/${type}/${filename}`

    return NextResponse.json({
      url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Hochladen der Datei' },
      { status: 500 }
    )
  }
}

// Get allowed file types info
export async function GET() {
  return NextResponse.json({
    video: {
      accept: ALLOWED_TYPES.video.mimeTypes.join(','),
      extensions: ALLOWED_TYPES.video.extensions,
      maxSize: ALLOWED_TYPES.video.maxSize,
      label: ALLOWED_TYPES.video.label,
    },
    audio: {
      accept: ALLOWED_TYPES.audio.mimeTypes.join(','),
      extensions: ALLOWED_TYPES.audio.extensions,
      maxSize: ALLOWED_TYPES.audio.maxSize,
      label: ALLOWED_TYPES.audio.label,
    },
    pdf: {
      accept: ALLOWED_TYPES.pdf.mimeTypes.join(','),
      extensions: ALLOWED_TYPES.pdf.extensions,
      maxSize: ALLOWED_TYPES.pdf.maxSize,
      label: ALLOWED_TYPES.pdf.label,
    },
    powerpoint: {
      accept: ALLOWED_TYPES.powerpoint.mimeTypes.join(','),
      extensions: ALLOWED_TYPES.powerpoint.extensions,
      maxSize: ALLOWED_TYPES.powerpoint.maxSize,
      label: ALLOWED_TYPES.powerpoint.label,
    },
  })
}
