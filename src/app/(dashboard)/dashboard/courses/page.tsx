'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent, Badge, Button, Input, Modal, Textarea, Spinner, Alert } from '@/components/ui'

interface Course {
  id: string
  title: string
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
}

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

export default function CoursesPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'available'>('all')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Create course modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
  })

  const canCreateCourse = session?.user?.role === 'ADMIN' || session?.user?.role === 'INSTRUCTOR'

  useEffect(() => {
    if (session !== undefined) {
      fetchCourses()
    }
  }, [session, canCreateCourse])

  const fetchCourses = async () => {
    try {
      // Include own courses for instructors and admins
      const url = canCreateCourse ? '/api/courses?includeOwn=true' : '/api/courses'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter((course) => {
    // Filter by enrollment status
    if (filter === 'enrolled' && !course.isEnrolled) return false
    if (filter === 'available' && course.isEnrolled) return false

    // Filter by search
    if (search && !course.title.toLowerCase().includes(search.toLowerCase())) return false

    // Filter by category
    if (selectedCategory && !course.categories.includes(selectedCategory)) return false

    return true
  })

  const categories = Array.from(new Set(courses.flatMap((c) => c.categories)))

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) {
      setError('Bitte geben Sie einen Kurstitel ein')
      return
    }

    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/courses/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse),
      })

      const data = await res.json()

      if (res.ok) {
        setShowCreateModal(false)
        setNewCourse({ title: '', description: '' })
        // Navigate to edit page
        window.location.href = `/dashboard/courses/${data.id}/edit`
      } else {
        setError(data.error || 'Fehler beim Erstellen des Kurses')
      }
    } catch (err) {
      setError('Fehler beim Erstellen des Kurses')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Kurskatalog</h1>
          <p className="text-secondary-600">
            Entdecken Sie unsere Schulungen und starten Sie Ihre Weiterbildung.
          </p>
        </div>
        {canCreateCourse && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Kurs
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

      {/* Filters - Redesigned */}
      <Card className="bg-secondary-50/50">
        <CardContent className="py-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Kurse durchsuchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white"
                leftIcon={
                  <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-secondary-200">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
                }`}
                onClick={() => setFilter('all')}
              >
                Alle
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === 'enrolled'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
                }`}
                onClick={() => setFilter('enrolled')}
              >
                Meine Kurse
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === 'available'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
                }`}
                onClick={() => setFilter('available')}
              >
                Verfügbar
              </button>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary-500 font-medium">Kategorie:</span>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="text-sm border border-secondary-200 rounded-md px-2 py-1.5 bg-white text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Alle Kategorien</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Course Grid - Grouped by Status (Order: In Progress > Not Started > Completed > Available) */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-secondary-500">Keine Kurse gefunden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* 1. In Bearbeitung - Currently Active Courses (highest priority) */}
          {(() => {
            const inProgressCourses = filteredCourses.filter(
              (c) => c.isEnrolled && !c.completedAt && c.progress > 0
            )
            if (inProgressCourses.length === 0) return null
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-primary-900">In Bearbeitung</h2>
                  <span className="text-xs text-secondary-400">({inProgressCourses.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {inProgressCourses.map((course) => (
                    <CourseCard key={course.id} course={course} session={session} />
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 2. Noch nicht begonnen - Enrolled but not started */}
          {(() => {
            const notStartedCourses = filteredCourses.filter(
              (c) => c.isEnrolled && !c.completedAt && c.progress === 0
            )
            if (notStartedCourses.length === 0) return null
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-warning-100 text-warning-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-primary-900">Noch nicht begonnen</h2>
                  <span className="text-xs text-secondary-400">({notStartedCourses.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {notStartedCourses.map((course) => (
                    <CourseCard key={course.id} course={course} session={session} />
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 3. Abgeschlossen - Completed Courses */}
          {(() => {
            const completedCourses = filteredCourses.filter(
              (c) => c.isEnrolled && c.completedAt && !c.isExpired
            )
            if (completedCourses.length === 0) return null
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-success-100 text-success-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-primary-900">Abgeschlossen</h2>
                  <span className="text-xs text-secondary-400">({completedCourses.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {completedCourses.map((course) => (
                    <CourseCard key={course.id} course={course} session={session} />
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 3b. Abgelaufene Kurse - Expired but enrolled courses */}
          {(() => {
            const expiredCourses = filteredCourses.filter(
              (c) => c.isEnrolled && c.isExpired
            )
            if (expiredCourses.length === 0) return null
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-danger-100 text-danger-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-primary-900">Abgelaufene Kurse</h2>
                  <span className="text-xs text-secondary-400">({expiredCourses.length})</span>
                </div>
                <p className="text-sm text-secondary-500">
                  Diese Kurse sind nicht mehr verfügbar und können nicht mehr bearbeitet werden.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {expiredCourses.map((course) => (
                    <CourseCard key={course.id} course={course} session={session} />
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 4. Verfügbare Kurse - Not enrolled */}
          {(() => {
            const availableCourses = filteredCourses.filter((c) => !c.isEnrolled)
            if (availableCourses.length === 0) return null
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-primary-900">Verfügbare Kurse</h2>
                  <span className="text-xs text-secondary-400">({availableCourses.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {availableCourses.map((course) => (
                    <CourseCard key={course.id} course={course} session={session} />
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Create Course Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Neuen Kurs erstellen"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleCreateCourse} isLoading={creating}>
              Kurs erstellen
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Kurstitel"
            value={newCourse.title}
            onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
            placeholder="z.B. Datenschutz Grundlagen"
            required
          />
          <Textarea
            label="Beschreibung"
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
            placeholder="Kurzbeschreibung des Kurses..."
            rows={4}
          />
        </div>
      </Modal>
    </div>
  )
}
