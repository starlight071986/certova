import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { SignJWT } from 'jose'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const lessonId = params.id

    // Check if user is enrolled in the course containing this lesson
    const enrollment = await db.enrollment.findFirst({
      where: {
        userId: session.user.id,
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
      },
      include: {
        course: {
          select: {
            modules: {
              where: {
                lessons: {
                  some: {
                    id: lessonId
                  }
                }
              },
              select: {
                lessons: {
                  where: {
                    id: lessonId
                  },
                  select: {
                    id: true,
                    type: true
                  }
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

    // Verify lesson is PowerPoint type
    const lesson = enrollment.course.modules[0]?.lessons[0]
    if (!lesson || lesson.type !== 'POWERPOINT') {
      return NextResponse.json({ error: 'Diese Lektion ist keine PowerPoint-Präsentation' }, { status: 400 })
    }

    // Generate JWT token valid for 12 hours
    const expiryTime = Date.now() + (12 * 60 * 60 * 1000)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

    const token = await new SignJWT({
      lessonId,
      userId: session.user.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(expiryTime / 1000))
      .sign(secret)

    return NextResponse.json({
      token,
      expiresAt: expiryTime
    })

  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Token-Generierung' },
      { status: 500 }
    )
  }
}
