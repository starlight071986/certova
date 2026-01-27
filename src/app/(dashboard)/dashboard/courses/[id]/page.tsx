'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Alert, Spinner, Modal } from '@/components/ui'
import CourseProgressBar from '@/components/CourseProgressBar'

interface Lesson {
  id: string
  title: string
  type: string
  duration: number | null
  order: number
  completed: boolean
  completedAt: string | null
}

interface ModuleQuiz {
  id: string
  title: string
  isRequired: boolean
  passingScore: number
  maxAttempts: number
  questions: { id: string }[]
}

interface ModuleProgress {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  quizPassed: boolean | null
  completedAt: string | null
}

interface Module {
  id: string
  title: string
  description: string | null
  order: number
  lessons: Lesson[]
  quiz: ModuleQuiz | null
  moduleProgress: ModuleProgress | null
}

interface Course {
  id: string
  title: string
  courseNumber: string | null
  description: string | null
  thumbnail: string | null
  status: string
  instructor: { id: string; name: string | null; image: string | null }
  instructorId: string
  categories: string[]
  creditCost: number
  isEnrolled: boolean
  enrolledAt: string | null
  completedAt: string | null
  totalLessons: number
  completedLessons: number
  totalDuration: number
  progress: number
  modules: Module[]
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const lessonTypeIcons: Record<string, JSX.Element> = {
  TEXT: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  VIDEO: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  PDF: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  AUDIO: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  INTERACTIVE: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
}

interface Certificate {
  id: string
  number: string
  issuedAt: string
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [showBookingConfirm, setShowBookingConfirm] = useState(false)
  const [error, setError] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [creatingCertificate, setCreatingCertificate] = useState(false)
  const [downloadingCertificate, setDownloadingCertificate] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'
  const isOwner = session?.user?.id === course?.instructorId
  const canEdit = isAdmin || isOwner

  useEffect(() => {
    fetchCourse()
  }, [params.id])

  useEffect(() => {
    if (course?.completedAt && course?.id) {
      fetchCertificate()
    }
  }, [course?.completedAt, course?.id])

  const fetchCertificate = async () => {
    try {
      const res = await fetch('/api/certificates')
      if (res.ok) {
        const certs = await res.json()
        const courseCert = certs.find((c: any) => c.courseId === course?.id)
        if (courseCert) {
          setCertificate(courseCert)
        }
      }
    } catch (error) {
      console.error('Error fetching certificate:', error)
    }
  }

  const createCertificate = async () => {
    setCreatingCertificate(true)
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course?.id }),
      })
      if (res.ok) {
        const cert = await res.json()
        setCertificate(cert)
      }
    } catch (error) {
      console.error('Error creating certificate:', error)
    } finally {
      setCreatingCertificate(false)
    }
  }

  const downloadCertificate = async () => {
    if (!certificate) return
    setDownloadingCertificate(true)
    try {
      const res = await fetch(`/api/certificates/${certificate.id}/download`)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Zertifikat-${certificate.number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setDownloadingCertificate(false)
    }
  }

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/courses/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setCourse(data)
      } else {
        setError('Kurs nicht gefunden')
      }
    } catch (error) {
      setError('Fehler beim Laden des Kurses')
    } finally {
      setLoading(false)
    }
  }

  const handleBookCourse = () => {
    setBookingError('') // Clear any previous errors
    if (course && course.creditCost > 0) {
      setShowBookingConfirm(true)
    } else {
      confirmBooking()
    }
  }

  const confirmBooking = async () => {
    setShowBookingConfirm(false)
    setBooking(true)
    setBookingError('')
    try {
      const res = await fetch(`/api/courses/${params.id}`, { method: 'POST' })
      if (res.ok) {
        fetchCourse()
        setBookingError('')
      } else {
        const data = await res.json()
        // Display more detailed error message if available
        if (data.details && data.details.message) {
          setBookingError(data.details.message)
        } else {
          setBookingError(data.error || 'Fehler beim Buchen des Kurses')
        }
      }
    } catch (error) {
      setBookingError('Fehler beim Buchen des Kurses')
    } finally {
      setBooking(false)
    }
  }

  const getFirstLesson = (): string | null => {
    if (!course?.modules.length) return null
    const firstModule = course.modules[0]
    if (!firstModule.lessons.length) return null
    return firstModule.lessons[0].id
  }

  // Returns the next lesson or quiz to continue with
  // Returns: { type: 'lesson' | 'quiz', id: string, moduleId?: string } | null
  const getNextContent = (): { type: 'lesson' | 'quiz'; id: string; moduleId?: string } | null => {
    if (!course) return null

    for (const courseModule of course.modules) {
      // Check for incomplete lessons in this module
      for (const lesson of courseModule.lessons) {
        if (!lesson.completed) {
          return { type: 'lesson', id: lesson.id }
        }
      }

      // All lessons in this module are complete - check if there's an unfinished required quiz
      if (courseModule.quiz && courseModule.quiz.isRequired && !courseModule.moduleProgress?.quizPassed) {
        return { type: 'quiz', id: courseModule.quiz.id, moduleId: courseModule.id }
      }
    }

    // All content complete - return first lesson
    const firstLesson = getFirstLesson()
    return firstLesson ? { type: 'lesson', id: firstLesson } : null
  }

  const getNextLesson = (): string | null => {
    const next = getNextContent()
    if (!next) return null
    if (next.type === 'lesson') return next.id
    // If it's a quiz, return null (handled separately)
    return null
  }

  const handleContinueCourse = () => {
    if (!course) return

    const next = getNextContent()
    if (!next) return

    if (next.type === 'quiz' && next.moduleId) {
      router.push(`/dashboard/courses/${course.id}/modules/${next.moduleId}/quiz`)
    } else if (next.type === 'lesson') {
      router.push(`/dashboard/courses/${course.id}/lessons/${next.id}`)
    }
  }

  const handleDuplicateCourse = async () => {
    if (!course || !canEdit) return

    if (!confirm(`Möchten Sie den Kurs "${course.title}" wirklich duplizieren?`)) {
      return
    }

    setDuplicating(true)
    try {
      const res = await fetch(`/api/courses/${course.id}/duplicate`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/dashboard/courses/${data.id}`)
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Duplizieren des Kurses')
      }
    } catch (error) {
      alert('Fehler beim Duplizieren des Kurses')
    } finally {
      setDuplicating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <Alert variant="danger">
        {error || 'Kurs nicht gefunden'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Booking Error Alert */}
      {bookingError && (
        <Alert variant="danger" onClose={() => setBookingError('')}>
          {bookingError}
        </Alert>
      )}

      {/* Back Link & Edit Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center text-sm text-secondary-600 hover:text-primary-600"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zum Katalog
        </Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicateCourse}
              isLoading={duplicating}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplizieren
            </Button>
            <Link href={`/dashboard/courses/${course.id}/edit`}>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Bearbeiten
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Course Header - Vereinfacht */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            {/* Farbige Akzent-Leiste oben */}
            <div className="h-1.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-t-lg" />

            <CardContent className="pt-6">
              {/* Kategorien */}
              {course.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {course.categories.map((cat) => {
                    // Icon basierend auf Kategorie
                    const getCategoryIcon = (category: string) => {
                      const lowerCat = category.toLowerCase()
                      if (lowerCat.includes('compliance') || lowerCat.includes('recht')) {
                        return (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        )
                      } else if (lowerCat.includes('it') || lowerCat.includes('sicherheit') || lowerCat.includes('security')) {
                        return (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )
                      } else if (lowerCat.includes('arbeit') || lowerCat.includes('safety')) {
                        return (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        )
                      } else {
                        return (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        )
                      }
                    }

                    // Farbe basierend auf Kategorie
                    const getCategoryColor = (category: string) => {
                      const lowerCat = category.toLowerCase()
                      if (lowerCat.includes('compliance') || lowerCat.includes('recht')) {
                        return 'bg-blue-50 text-blue-700 border-blue-200'
                      } else if (lowerCat.includes('it') || lowerCat.includes('sicherheit') || lowerCat.includes('security')) {
                        return 'bg-purple-50 text-purple-700 border-purple-200'
                      } else if (lowerCat.includes('arbeit') || lowerCat.includes('safety')) {
                        return 'bg-orange-50 text-orange-700 border-orange-200'
                      } else {
                        return 'bg-secondary-50 text-secondary-700 border-secondary-200'
                      }
                    }

                    return (
                      <div
                        key={cat}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getCategoryColor(cat)}`}
                      >
                        {getCategoryIcon(cat)}
                        <span>{cat}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Titel und Beschreibung */}
              <div className="mb-3">
                <h1 className="text-3xl font-bold text-primary-900">{course.title}</h1>
                {course.courseNumber && (
                  <p className="text-sm text-secondary-500 mt-1">Kursnummer: {course.courseNumber}</p>
                )}
              </div>
              {course.description && (
                <p className="text-secondary-600 leading-relaxed mb-6">{course.description}</p>
              )}

              {/* Kurs-Statistiken */}
              <div className="flex items-center gap-6 pt-4 border-t border-secondary-100">
                <div className="flex items-center gap-2 text-secondary-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-sm font-medium">{course.modules.length} Module</span>
                </div>
                <div className="flex items-center gap-2 text-secondary-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-sm font-medium">{course.totalLessons} Lektionen</span>
                </div>
                <div className="flex items-center gap-2 text-secondary-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{formatDuration(course.totalDuration)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrollment Card */}
        <div>
          <Card className="sticky top-20">
            <CardContent>
              {course.isEnrolled ? (
                <>
                  {course.completedAt ? (
                    <div className="text-center mb-4">
                      <Badge variant="success" size="lg">Abgeschlossen</Badge>
                      <p className="text-sm text-secondary-500 mt-2">
                        Abgeschlossen am {new Date(course.completedAt).toLocaleDateString('de-DE')}
                      </p>
                      {certificate ? (
                        <Button
                          variant="accent"
                          className="w-full mt-4"
                          onClick={downloadCertificate}
                          isLoading={downloadingCertificate}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Zertifikat herunterladen
                        </Button>
                      ) : (
                        <Button
                          variant="accent"
                          className="w-full mt-4"
                          onClick={createCertificate}
                          isLoading={creatingCertificate}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          Zertifikat erstellen
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-secondary-600">Fortschritt</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <div className="h-3 bg-secondary-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-secondary-500 mt-1">
                          {course.completedLessons} von {course.totalLessons} Lektionen abgeschlossen
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleContinueCourse}
                      >
                        {course.progress > 0 ? 'Fortsetzen' : 'Kurs starten'}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {course.creditCost > 0 && (
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-primary-900">
                        {course.creditCost}
                      </div>
                      <div className="text-sm text-secondary-500">Credits</div>
                    </div>
                  )}
                  <p className="text-center text-secondary-600 mb-4">
                    {course.creditCost > 0
                      ? 'Buchen Sie diesen Kurs, um zu beginnen.'
                      : 'Buchen Sie diesen kostenlosen Kurs, um zu beginnen.'
                    }
                  </p>
                  <Button
                    variant="accent"
                    className="w-full"
                    onClick={handleBookCourse}
                    isLoading={booking}
                  >
                    {course.creditCost > 0 ? `Für ${course.creditCost} Credits buchen` : 'Jetzt buchen'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Module Progress Bar */}
      {course.isEnrolled && course.modules.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <CourseProgressBar
              courseId={course.id}
              modules={course.modules.map((m) => ({
                id: m.id,
                title: m.title,
                order: m.order,
                status: m.moduleProgress?.status || null,
                hasQuiz: !!m.quiz,
                quizPassed: m.moduleProgress?.quizPassed ?? null,
              }))}
              isCompleted={!!course.completedAt}
            />
          </CardContent>
        </Card>
      )}

      {/* Course Content */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-primary-900">Kursinhalt</h2>
        {course.modules.map((module, moduleIndex) => (
          <Card key={module.id} id={`module-${module.id}`} className="scroll-mt-20">
            {/* Module Header */}
            <div className="px-6 py-4 bg-secondary-50 rounded-t-lg border-b border-secondary-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Module Status Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      module.moduleProgress?.status === 'COMPLETED'
                        ? 'bg-success-100 text-success-600'
                        : module.moduleProgress?.status === 'IN_PROGRESS'
                        ? 'bg-primary-100 text-primary-600'
                        : module.moduleProgress?.status === 'FAILED'
                        ? 'bg-danger-100 text-danger-600'
                        : 'bg-secondary-200 text-secondary-500'
                    }`}>
                      {module.moduleProgress?.status === 'COMPLETED' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : module.moduleProgress?.status === 'IN_PROGRESS' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : module.moduleProgress?.status === 'FAILED' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">{moduleIndex + 1}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-secondary-900">
                          Modul {moduleIndex + 1}: {module.title}
                        </h3>
                        {module.moduleProgress?.status === 'COMPLETED' && (
                          <Badge variant="success" size="sm">Abgeschlossen</Badge>
                        )}
                        {module.moduleProgress?.status === 'IN_PROGRESS' && (
                          <Badge variant="primary" size="sm">In Bearbeitung</Badge>
                        )}
                        {module.moduleProgress?.status === 'FAILED' && (
                          <Badge variant="danger" size="sm">Nicht bestanden</Badge>
                        )}
                      </div>
                      {module.description && (
                        <p className="text-sm text-secondary-600 mt-1">{module.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-secondary-500">
                      {module.lessons.filter((l) => l.completed).length}/{module.lessons.length} Lektionen
                    </span>
                    {module.quiz && (
                      <p className="text-xs text-secondary-400 mt-0.5">
                        Quiz: {module.moduleProgress?.quizPassed ? 'Bestanden' : 'Offen'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Module Progress Bar */}
                {course.isEnrolled && module.lessons.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const completedCount = module.lessons.filter((l) => l.completed).length
                        const progress = Math.round((completedCount / module.lessons.length) * 100)
                        return (
                          <div
                            key={lesson.id}
                            className="group relative flex-1"
                          >
                            <div
                              className={`h-2 rounded-full transition-all ${
                                lesson.completed
                                  ? 'bg-success-500'
                                  : lessonIndex === completedCount
                                  ? 'bg-primary-300'
                                  : 'bg-secondary-200'
                              }`}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-secondary-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              {lesson.title}
                              {lesson.completed && ' ✓'}
                            </div>
                          </div>
                        )
                      })}
                      {module.quiz && (
                        <div className="group relative w-8">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              module.moduleProgress?.quizPassed
                                ? 'bg-success-500'
                                : 'bg-accent-200'
                            }`}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-secondary-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Quiz {module.moduleProgress?.quizPassed ? '✓' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-secondary-400">
                        {Math.round((module.lessons.filter((l) => l.completed).length / module.lessons.length) * 100)}% abgeschlossen
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Lessons */}
              <div className="divide-y divide-secondary-100">
                {module.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className={`px-6 py-3 flex items-center gap-4 ${
                      course.isEnrolled ? 'hover:bg-secondary-50 cursor-pointer' : ''
                    }`}
                    onClick={() => {
                      if (course.isEnrolled) {
                        router.push(`/dashboard/courses/${course.id}/lessons/${lesson.id}`)
                      }
                    }}
                  >
                    {/* Completion Status */}
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      lesson.completed
                        ? 'bg-success-100 text-success-600'
                        : 'bg-secondary-100 text-secondary-400'
                    }`}>
                      {lesson.completed ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs">{lesson.order}</span>
                      )}
                    </div>

                    {/* Lesson Type Icon */}
                    <div className="text-secondary-400">
                      {lessonTypeIcons[lesson.type] || lessonTypeIcons.TEXT}
                    </div>

                    {/* Lesson Title */}
                    <div className="flex-1">
                      <span className={lesson.completed ? 'text-secondary-500' : 'text-secondary-900'}>
                        {lesson.title}
                      </span>
                    </div>

                    {/* Duration */}
                    {lesson.duration && (
                      <span className="text-sm text-secondary-400">
                        {lesson.duration} Min.
                      </span>
                    )}

                    {/* Arrow */}
                    {course.isEnrolled && (
                      <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}

                {/* Quiz Section */}
                {module.quiz && (
                  <div
                    className={`px-6 py-3 flex items-center gap-4 bg-accent-50 ${
                      course.isEnrolled ? 'hover:bg-accent-100 cursor-pointer' : ''
                    }`}
                    onClick={() => {
                      if (course.isEnrolled) {
                        router.push(`/dashboard/courses/${course.id}/modules/${module.id}/quiz`)
                      }
                    }}
                  >
                    {/* Quiz Status */}
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      module.moduleProgress?.quizPassed
                        ? 'bg-success-100 text-success-600'
                        : 'bg-accent-100 text-accent-600'
                    }`}>
                      {module.moduleProgress?.quizPassed ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      )}
                    </div>

                    {/* Quiz Icon */}
                    <div className="text-accent-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    {/* Quiz Title */}
                    <div className="flex-1">
                      <span className={`font-medium ${module.moduleProgress?.quizPassed ? 'text-secondary-500' : 'text-accent-700'}`}>
                        {module.quiz.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {module.quiz.isRequired && (
                          <Badge variant="warning" size="sm">Pflicht</Badge>
                        )}
                        <span className="text-xs text-secondary-500">
                          {module.quiz.questions.length} Fragen · {module.quiz.passingScore}% zum Bestehen
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {module.moduleProgress?.quizPassed && (
                      <Badge variant="success" size="sm">Bestanden</Badge>
                    )}

                    {/* Arrow */}
                    {course.isEnrolled && (
                      <svg className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
          </Card>
        ))}
      </div>

      {/* Booking Confirmation Modal */}
      {course && course.creditCost > 0 && (
        <Modal
          isOpen={showBookingConfirm}
          onClose={() => setShowBookingConfirm(false)}
          title="Kurs buchen"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setShowBookingConfirm(false)}
                disabled={booking}
              >
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onClick={confirmBooking}
                isLoading={booking}
              >
                Buchen
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-secondary-700">
              Sie sind dabei, folgenden Kurs zu buchen:
            </p>
            <div className="p-4 bg-secondary-50 rounded-lg">
              <h3 className="font-semibold text-primary-900 mb-1">{course.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Preis:</span>
                <span className="text-xl font-bold text-primary-900">
                  {course.creditCost} Credits
                </span>
              </div>
            </div>
            <p className="text-sm text-secondary-600">
              Nach der Buchung werden <strong>{course.creditCost} Credits</strong> von Ihrem Konto abgebucht und Sie erhalten sofort Zugriff auf den Kurs.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
