'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, Button, Alert, Spinner, Badge } from '@/components/ui'
import PDFViewer from '@/components/PDFViewer'
import PowerPointViewer from '@/components/PowerPointViewer'
import CodeBlockWithCopy from '@/components/CodeBlockWithCopy'

// Helper functions for video embedding
function extractYouTubeId(url: string): string {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[7].length === 11 ? match[7] : ''
}

function extractVimeoId(url: string): string {
  const regExp = /vimeo\.com\/(?:video\/)?(\d+)/
  const match = url.match(regExp)
  return match ? match[1] : ''
}

function hasContent(html: string | null | undefined): boolean {
  if (!html || html.trim() === '') return false
  // Remove common empty HTML patterns
  const stripped = html
    .replace(/<p><\/p>/g, '')
    .replace(/<p><br><\/p>/g, '')
    .replace(/<p><br\/><\/p>/g, '')
    .replace(/<br\s*\/?>/g, '')
    .replace(/\s+/g, '')
  return stripped.length > 0
}

interface ModuleQuiz {
  id: string
  title: string
  isRequired: boolean
  questionCount: number
  passed: boolean
}

interface Lesson {
  id: string
  title: string
  type: string
  content: string | null
  description: string | null
  videoUrl: string | null
  duration: number | null
  completed: boolean
  completedAt: string | null
  timeSpent: number
  module: { id: string; title: string }
  course: { id: string; title: string }
  navigation: {
    prev: { id: string; title: string } | null
    next: { id: string; title: string } | null
    isLastLessonInModule: boolean
    moduleQuiz: ModuleQuiz | null
    nextModule: { id: string; title: string } | null
  }
}

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    fetchLesson()
  }, [params.lessonId])

  const fetchLesson = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lessons/${params.lessonId}`)
      if (res.ok) {
        const data = await res.json()
        setLesson(data)
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (error) {
      setError('Fehler beim Laden der Lektion')
    } finally {
      setLoading(false)
    }
  }

  const markAsCompleted = async () => {
    if (!lesson) return

    setCompleting(true)
    try {
      const res = await fetch(`/api/lessons/${params.lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })

      if (res.ok) {
        const data = await res.json()
        setLesson((prev) => prev ? { ...prev, completed: true, completedAt: new Date().toISOString() } : null)

        // Auto-navigate after completion
        if (lesson.navigation.next) {
          // There's a next lesson - go to it
          router.push(`/dashboard/courses/${params.id}/lessons/${lesson.navigation.next.id}`)
        } else if (lesson.navigation.isLastLessonInModule && lesson.navigation.moduleQuiz) {
          // Last lesson in module and there's a quiz (required or optional) - go to quiz
          router.push(`/dashboard/courses/${params.id}/modules/${lesson.module.id}/quiz`)
        } else if (lesson.navigation.nextModule) {
          // No next lesson in current module, but there's a next module - go to first lesson of next module
          // Need to fetch first lesson of next module
          fetch(`/api/modules/${lesson.navigation.nextModule.id}/lessons`)
            .then(res => res.json())
            .then(lessons => {
              if (lessons.length > 0) {
                router.push(`/dashboard/courses/${params.id}/lessons/${lessons[0].id}`)
              } else {
                // Next module has no lessons, go to course page
                router.push(`/dashboard/courses/${params.id}`)
              }
            })
            .catch(() => {
              // On error, go to course page
              router.push(`/dashboard/courses/${params.id}`)
            })
        } else if (data.courseCompleted) {
          // Course is completely finished - all lessons and quizzes done
          setShowSuccess(true)
          setTimeout(() => {
            router.push(`/dashboard/courses/${params.id}`)
          }, 1500)
        } else {
          // No next action, show success
          setShowSuccess(true)
        }
      }
    } catch (error) {
      setError('Fehler beim Speichern des Fortschritts')
    } finally {
      setCompleting(false)
    }
  }

  const navigateToLesson = (lessonId: string) => {
    router.push(`/dashboard/courses/${params.id}/lessons/${lessonId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <Alert variant="danger">
        {error || 'Lektion nicht gefunden'}
      </Alert>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-secondary-500">
        <Link href="/dashboard/courses" className="hover:text-primary-600">
          Kurse
        </Link>
        <span>/</span>
        <Link href={`/dashboard/courses/${lesson.course.id}`} className="hover:text-primary-600">
          {lesson.course.title}
        </Link>
        <span>/</span>
        <span className="text-secondary-900">{lesson.module.title}</span>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <Alert variant="success" onClose={() => setShowSuccess(false)}>
          Lektion als abgeschlossen markiert!
        </Alert>
      )}

      {/* Lesson Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Badge variant="secondary" className="mb-2">{lesson.module.title}</Badge>
          <h1 className="text-2xl font-bold text-primary-900">{lesson.title}</h1>
          {lesson.duration && (
            <div className="flex items-center gap-1 mt-2 text-sm text-secondary-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{lesson.duration} Minuten</span>
            </div>
          )}
        </div>
        {lesson.completed && (
          <Badge variant="success" size="lg">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Abgeschlossen
          </Badge>
        )}
      </div>

      {/* Lesson Description */}
      {hasContent(lesson.description) && (
        <Card className="bg-secondary-50 border-secondary-200">
          <CardContent className="px-4 pt-0 pb-2">
            <h3 className="text-sm font-medium text-secondary-900 mb-2">Beschreibung</h3>
            <div className="lesson-content text-secondary-700">
              <div dangerouslySetInnerHTML={{ __html: lesson.description }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lesson Content */}
      <Card>
        <CardContent>

          {lesson.type === 'VIDEO' && lesson.videoUrl ? (
            <div className="aspect-video bg-black rounded-lg mb-6 overflow-hidden">
              {lesson.videoUrl.startsWith('/uploads') ? (
                // Local uploaded video
                <video
                  className="w-full h-full"
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                >
                  <source src={lesson.videoUrl} type="video/mp4" />
                  <source src={lesson.videoUrl} type="video/webm" />
                  <source src={lesson.videoUrl} type="video/ogg" />
                  Ihr Browser unterstützt das Video-Element nicht.
                </video>
              ) : lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be') ? (
                // YouTube embed
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${extractYouTubeId(lesson.videoUrl)}`}
                  title={lesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : lesson.videoUrl.includes('vimeo.com') ? (
                // Vimeo embed
                <iframe
                  className="w-full h-full"
                  src={`https://player.vimeo.com/video/${extractVimeoId(lesson.videoUrl)}`}
                  title={lesson.title}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                // Generic video URL
                <video
                  className="w-full h-full"
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  src={lesson.videoUrl}
                >
                  Ihr Browser unterstützt das Video-Element nicht.
                </video>
              )}
            </div>
          ) : null}

          {lesson.type === 'AUDIO' && lesson.content && (
            <div className="p-8 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg mb-6">
              <div className="flex flex-col items-center">
                <svg className="w-16 h-16 text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <audio
                  className="w-full max-w-lg"
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                >
                  <source src={lesson.content} type="audio/mpeg" />
                  <source src={lesson.content} type="audio/ogg" />
                  <source src={lesson.content} type="audio/wav" />
                  Ihr Browser unterstützt das Audio-Element nicht.
                </audio>
              </div>
            </div>
          )}

          {lesson.type === 'TEXT' && lesson.content ? (
            <div className="lesson-content">
              <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
            </div>
          ) : null}

          {lesson.type === 'INTERACTIVE' && (
            <div className="space-y-6">
              {lesson.content && (
                <div className="lesson-content">
                  <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                </div>
              )}
              <div className="p-6 bg-accent-50 rounded-lg border border-accent-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent-100 rounded-lg">
                    <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-accent-900">Praktische Aufgabe</h4>
                    <p className="text-sm text-accent-700 mt-1">
                      Führen Sie die oben beschriebene Aufgabe selbstständig durch.
                      Wenn Sie fertig sind, markieren Sie diese Lektion als abgeschlossen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {lesson.type === 'PDF' && lesson.content && (
            <div className="rounded-lg overflow-hidden border border-secondary-200" style={{ height: '80vh' }}>
              <PDFViewer src={lesson.content} title={lesson.title} />
            </div>
          )}

          {lesson.type === 'POWERPOINT' && lesson.content && (
            <div className="rounded-lg overflow-hidden" style={{ height: '80vh' }}>
              <PowerPointViewer lessonId={lesson.id} title={lesson.title} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {lesson.navigation.prev && (
            <Button
              variant="ghost"
              onClick={() => navigateToLesson(lesson.navigation.prev!.id)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Vorherige Lektion
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!lesson.completed && (
            <Button
              variant="primary"
              onClick={markAsCompleted}
              isLoading={completing}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Als abgeschlossen markieren
            </Button>
          )}

          {lesson.navigation.next ? (
            <Button
              variant={lesson.completed ? 'primary' : 'outline'}
              onClick={() => navigateToLesson(lesson.navigation.next!.id)}
            >
              Nachste Lektion
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={() => router.push(`/dashboard/courses/${lesson.course.id}`)}
            >
              Zur Kursubersicht
            </Button>
          )}
        </div>
      </div>

      {/* Module End Navigation */}
      {lesson.navigation.isLastLessonInModule && lesson.completed && (
        <Card className="bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
          <CardContent className="py-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary-900 mb-2">
                Modul &quot;{lesson.module.title}&quot; abgeschlossen!
              </h3>

              {/* Test Section */}
              {lesson.navigation.moduleQuiz && (
                <div className="mb-4">
                  {lesson.navigation.moduleQuiz.passed ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-100 text-success-700 rounded-full">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Test bestanden
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-secondary-600">
                        {lesson.navigation.moduleQuiz.isRequired
                          ? 'Bitte absolvieren Sie die Test, um mit dem nachsten Modul fortzufahren.'
                          : 'Optional: Testen Sie Ihr Wissen mit der Test.'}
                      </p>
                      <Button
                        variant="accent"
                        onClick={() => router.push(`/dashboard/courses/${params.id}/modules/${lesson.module.id}/quiz`)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        {lesson.navigation.moduleQuiz.title} ({lesson.navigation.moduleQuiz.questionCount} Fragen)
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Next Module Navigation */}
              {lesson.navigation.nextModule && (
                <div className="mt-4">
                  {(!lesson.navigation.moduleQuiz || lesson.navigation.moduleQuiz.passed || !lesson.navigation.moduleQuiz.isRequired) ? (
                    <Button
                      variant="primary"
                      onClick={() => {
                        // Navigate to first lesson of next module
                        router.push(`/dashboard/courses/${lesson.course.id}`)
                      }}
                    >
                      Weiter zu Modul: {lesson.navigation.nextModule.title}
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  ) : (
                    <p className="text-sm text-secondary-500">
                      Absolvieren Sie zuerst die Test, um fortzufahren.
                    </p>
                  )}
                </div>
              )}

              {/* Course Completion */}
              {!lesson.navigation.nextModule && (
                <div className="mt-4">
                  {(!lesson.navigation.moduleQuiz || lesson.navigation.moduleQuiz.passed) ? (
                    <>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-100 text-success-700 rounded-full mb-4">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Kurs abgeschlossen!
                      </div>
                      <Button
                        variant="accent"
                        onClick={() => router.push(`/dashboard/courses/${lesson.course.id}`)}
                      >
                        Zur Kursubersicht
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add copy buttons to code blocks */}
      <CodeBlockWithCopy />
    </div>
  )
}
