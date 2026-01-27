'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner } from '@/components/ui'
import Link from 'next/link'

const statusLabels: Record<string, string> = {
  DRAFT: 'Entwurf',
  SUBMITTED: 'Eingereicht',
  IN_REVIEW: 'In Prüfung',
  APPROVED: 'Veröffentlicht',
  REJECTED: 'Abgelehnt',
  ARCHIVED: 'Archiviert',
}

const statusVariants: Record<string, 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'secondary',
  SUBMITTED: 'warning',
  IN_REVIEW: 'accent',
  APPROVED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function CourseCard({ course, session }: { course: Course; session: ReturnType<typeof useSession>['data'] }) {
  const isOwnCourse = session?.user?.id === course.instructorId
  const isAdmin = session?.user?.role === 'ADMIN'
  const canEdit = isOwnCourse || isAdmin
  const isNotApproved = course.status !== 'APPROVED'
  const linkHref = canEdit && isNotApproved
    ? `/dashboard/courses/${course.id}/edit`
    : `/dashboard/courses/${course.id}`

  return (
    <Link href={linkHref}>
      <Card hover className={`h-full flex flex-col overflow-hidden ${course.isExpired ? 'opacity-75' : ''}`}>
        {/* Dünne Akzentleiste oben */}
        <div className="h-1 bg-gradient-to-r from-primary-500 to-primary-600" />

        <CardContent className="flex-1 flex flex-col py-3 px-4">
          {/* Header mit Badges und Kategorien */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {/* Kategorien */}
              {course.categories.slice(0, 1).map((cat) => {
                const getCategoryIcon = (category: string) => {
                  const lowerCat = category.toLowerCase()
                  if (lowerCat.includes('compliance') || lowerCat.includes('recht')) {
                    return (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )
                  } else if (lowerCat.includes('it') || lowerCat.includes('sicherheit') || lowerCat.includes('security')) {
                    return (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )
                  } else if (lowerCat.includes('arbeit') || lowerCat.includes('safety')) {
                    return (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )
                  } else {
                    return (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    )
                  }
                }

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
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${getCategoryColor(cat)}`}
                  >
                    {getCategoryIcon(cat)}
                    <span>{cat}</span>
                  </div>
                )
              })}
              {course.categories.length > 1 && (
                <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary-50 text-secondary-600 border border-secondary-200">
                  +{course.categories.length - 1}
                </div>
              )}
            </div>

            {/* Status Badges rechts */}
            <div className="flex flex-col gap-1">
              {course.isExpired && (
                <Badge variant="danger" size="sm">Abgelaufen</Badge>
              )}
              {!course.isExpired && course.isNotStarted && (
                <Badge variant="warning" size="sm">Bald</Badge>
              )}
              {isNotApproved && !course.isExpired && !course.isNotStarted && (
                <Badge variant={statusVariants[course.status]} size="sm">
                  {statusLabels[course.status]}
                </Badge>
              )}
              {isOwnCourse && (
                <Badge variant="primary" size="sm">Mein Kurs</Badge>
              )}
              {!isOwnCourse && isAdmin && isNotApproved && (
                <Badge variant="accent" size="sm">Admin</Badge>
              )}
            </div>
          </div>
          {/* Title & Description */}
          <h3 className="font-semibold text-primary-900 text-sm leading-tight mb-1 line-clamp-2">{course.title}</h3>
          <p className="text-xs text-secondary-500 line-clamp-2 mb-2">
            {course.description || 'Keine Beschreibung'}
          </p>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-secondary-400 mb-2">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {course.totalModules}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {course.totalLessons}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(course.totalDuration)}
            </span>
          </div>

          {/* Progress or Status */}
          <div className="mt-auto">
            {canEdit && isNotApproved ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-400">Bearbeiten</span>
                <svg className="w-3.5 h-3.5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            ) : course.isEnrolled ? (
              course.completedAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-success-600 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Abgeschlossen
                  </span>
                  <span className="text-xs text-secondary-400">
                    {new Date(course.completedAt).toLocaleDateString('de-DE')}
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-xs text-secondary-500 mb-1">
                    <span>{course.progress}% abgeschlossen</span>
                  </div>
                  <div className="h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-400">{course.enrolledCount} Teilnehmer</span>
                <div className="flex items-center gap-2">
                  {course.creditCost > 0 ? (
                    <span className="text-warning-600 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {course.creditCost}
                    </span>
                  ) : (
                    <span className="text-success-600 font-medium">Kostenlos</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

interface Course {
  id: string
  title: string
  courseNumber: string | null
  description: string | null
  thumbnail: string | null
  status: string
  instructor: string | null
  instructorId: string
  categories: string[]
  totalModules: number
  totalLessons: number
  totalDuration: number
  enrolledCount: number
  isEnrolled: boolean
  progress: number
  completedAt: string | null
  startDate: string | null
  endDate: string | null
  isExpired: boolean
  isNotStarted: boolean
  creditCost: number
  completed: boolean
}

interface UserLevel {
  id: string
  achievedAt: Date
  expiresAt: Date | null
  isValid: boolean
  certificateNumber: string
}

interface CertificationLevel {
  id: string
  name: string
  description: string | null
  order: number
  logoUrl: string | null
  startDate: string | null
  endDate: string | null
  certificateExpiryType: 'NEVER' | 'FIXED_DATE' | 'PERIOD_DAYS' | 'PERIOD_MONTHS' | 'PERIOD_YEARS'
  certificateExpiryValue: number | null
  certificateExpiryDate: string | null
  courses: Course[]
  totalCourses: number
  completedCourses: number
  allCoursesCompleted: boolean
  canUnlock: boolean
  userLevel: UserLevel | null
}

export default function CertificationLevelsPage() {
  const { data: session } = useSession()
  const [levels, setLevels] = useState<CertificationLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)

  useEffect(() => {
    fetchLevels()
  }, [])

  const fetchLevels = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/user/certification-levels')
      if (res.ok) {
        const data = await res.json()
        setLevels(data)
      } else {
        setError('Fehler beim Laden der Zertifizierungsstufen')
      }
    } catch (error) {
      setError('Fehler beim Laden der Zertifizierungsstufen')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCertificate = async (levelId: string) => {
    try {
      const res = await fetch(`/api/user/certification-levels/${levelId}/certificate`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Zertifikat_Stufe_${levelId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Fehler beim Herunterladen des Zertifikats')
      }
    } catch (error) {
      alert('Fehler beim Herunterladen des Zertifikats')
    }
  }

  const handleUnlockLevel = async (levelId: string) => {
    try {
      setUnlocking(levelId)
      const res = await fetch(`/api/user/certification-levels/${levelId}/unlock`, {
        method: 'POST',
      })
      if (res.ok) {
        alert('Zertifizierungsstufe erfolgreich freigeschaltet!')
        await fetchLevels() // Refresh the data
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Freischalten der Zertifizierungsstufe')
      }
    } catch (error) {
      alert('Fehler beim Freischalten der Zertifizierungsstufe')
    } finally {
      setUnlocking(null)
    }
  }

  const toggleExpand = (levelId: string) => {
    setExpandedLevel(expandedLevel === levelId ? null : levelId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-danger-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (levels.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-secondary-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-secondary-600 mb-2">
            Keine Zertifizierungsstufen verfügbar
          </p>
          <p className="text-secondary-500">
            Es sind derzeit keine Zertifizierungsstufen für Sie freigeschaltet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Zertifizierungsstufen</h1>
        <p className="text-secondary-600 mt-1">
          Erreichen Sie höhere Stufen durch den Abschluss mehrerer Kurse
        </p>
      </div>

      {/* Levels Grid */}
      <div className="grid gap-6">
        {levels.map((level) => {
          const progressPercentage = level.totalCourses > 0
            ? Math.round((level.completedCourses / level.totalCourses) * 100)
            : 0
          const isExpanded = expandedLevel === level.id
          const isAchieved = level.userLevel !== null

          return (
            <Card key={level.id} className={isAchieved ? 'border-success-300 bg-success-50' : ''}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-secondary-900">{level.name}</h3>
                        {isAchieved ? (
                          <Badge variant="success" size="sm">
                            Erreicht
                          </Badge>
                        ) : level.canUnlock ? (
                          <Badge variant="accent" size="sm">
                            Bereit zum Freischalten
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            In Bearbeitung
                          </Badge>
                        )}
                      </div>
                      {level.description && (
                        <p className="text-sm text-secondary-600 mb-3">{level.description}</p>
                      )}

                      {/* Achievement Info */}
                      {isAchieved && level.userLevel && (
                        <div className="bg-white rounded-lg p-3 mb-3 border border-success-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-secondary-600">Zertifikatsnummer:</span>
                              <p className="font-medium text-secondary-900">
                                {level.userLevel.certificateNumber}
                              </p>
                            </div>
                            <div>
                              <span className="text-secondary-600">Erreicht am:</span>
                              <p className="font-medium text-secondary-900">
                                {new Date(level.userLevel.achievedAt).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                            {level.userLevel.expiresAt && (
                              <div>
                                <span className="text-secondary-600">Gültig bis:</span>
                                <p className="font-medium text-secondary-900">
                                  {new Date(level.userLevel.expiresAt).toLocaleDateString('de-DE')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-secondary-700">
                            {level.completedCourses} von {level.totalCourses} Kursen abgeschlossen
                          </span>
                          <span className="font-medium text-secondary-900">{progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-secondary-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              isAchieved
                                ? 'bg-success-600'
                                : progressPercentage === 100
                                ? 'bg-accent-600'
                                : 'bg-primary-600'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => toggleExpand(level.id)}
                      variant="outline"
                      size="sm"
                    >
                      <svg
                        className={`w-4 h-4 mr-1 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      {isExpanded ? 'Kurse ausblenden' : 'Kurse anzeigen'}
                    </Button>

                    {level.canUnlock && !isAchieved && (
                      <Button
                        onClick={() => handleUnlockLevel(level.id)}
                        variant="accent"
                        size="sm"
                        disabled={unlocking === level.id}
                      >
                        {unlocking === level.id ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Wird freigeschaltet...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                              />
                            </svg>
                            Stufe freischalten
                          </>
                        )}
                      </Button>
                    )}

                    {isAchieved && (
                      <Button
                        onClick={() => handleDownloadCertificate(level.id)}
                        variant="primary"
                        size="sm"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Zertifikat herunterladen
                      </Button>
                    )}
                  </div>

                  {/* Expanded Course List */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-secondary-200">
                      <h4 className="text-sm font-semibold text-secondary-900 mb-3">
                        Benötigte Kurse:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {level.courses.map((course) => (
                          <CourseCard key={course.id} course={course} session={session} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
