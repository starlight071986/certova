import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'

export const maxDuration = 300 // 5 minutes for large files
export const dynamic = 'force-dynamic'

interface TokenPayload {
  lessonId: string
  userId: string
  exp: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token fehlt' }, { status: 400 })
    }

    // Validate JWT token
    let lessonId: string
    let userId: string
    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
      const { payload } = await jwtVerify(token, secret)

      if (!payload.lessonId || !payload.userId) {
        throw new Error('Invalid token payload')
      }

      lessonId = payload.lessonId as string
      userId = payload.userId as string
    } catch (err) {
      return NextResponse.json({ error: 'Ungültiger oder abgelaufener Token' }, { status: 401 })
    }

    // Check enrollment
    const enrollment = await db.enrollment.findFirst({
      where: {
        userId: userId,
        course: {
          modules: {
            some: {
              lessons: {
                some: {
                  id: lessonId
                }
              }
            }
          }
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Nicht für diesen Kurs eingeschrieben' }, { status: 403 })
    }

    // Get lesson and filename
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { content: true, type: true }
    })

    if (!lesson || lesson.type !== 'POWERPOINT' || !lesson.content) {
      return NextResponse.json({ error: 'Präsentation nicht gefunden' }, { status: 404 })
    }

    // Read file from disk
    const filepath = path.join(process.cwd(), 'public', 'uploads', 'powerpoint', lesson.content)

    try {
      const file = await readFile(filepath)

      // Send file with correct headers
      return new NextResponse(file, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': 'inline', // Prevents download prompt
          'Cache-Control': 'private, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        }
      })
    } catch (fileErr) {
      console.error('File read error:', fileErr)
      return NextResponse.json({ error: 'Datei konnte nicht gelesen werden' }, { status: 500 })
    }

  } catch (error) {
    console.error('Presentation serve error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Präsentation' },
      { status: 500 }
    )
  }
}
