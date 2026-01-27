'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Modal,
  Textarea,
  Spinner,
  Alert,
} from '@/components/ui'

interface Course {
  id: string
  title: string
  description: string | null
  status: string
  instructor: { name: string }
  createdAt: string
  updatedAt: string
  _count: {
    modules: number
    enrollments: number
  }
  modules: {
    id: string
    title: string
    description: string | null
    _count: { lessons: number }
  }[]
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

export default function CourseReviewPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState<'all' | 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW'>('all')

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingCourseId, setRejectingCourseId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchCourses()
    }
  }, [session])

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses/review')
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
      } else {
        setError('Fehler beim Laden der Kurse')
      }
    } catch (err) {
      setError('Fehler beim Laden der Kurse')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (courseId: string, newStatus: string, reason?: string) => {
    setProcessing(true)
    setError('')

    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(reason && { rejectionReason: reason }),
        }),
      })

      if (res.ok) {
        setSuccess(
          newStatus === 'APPROVED'
            ? 'Kurs wurde freigegeben'
            : newStatus === 'REJECTED'
            ? 'Kurs wurde abgelehnt'
            : 'Status wurde aktualisiert'
        )
        fetchCourses()
        setShowRejectModal(false)
        setRejectingCourseId(null)
        setRejectionReason('')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Aktualisieren')
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren des Status')
    } finally {
      setProcessing(false)
    }
  }

  const openRejectModal = (courseId: string) => {
    setRejectingCourseId(courseId)
    setShowRejectModal(true)
  }

  const filteredCourses = courses.filter((course) => {
    if (filter === 'all') return ['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(course.status)
    return course.status === filter
  })

  if (session?.user?.role !== 'ADMIN') {
    return (
      <Alert variant="danger">
        Sie haben keine Berechtigung, diese Seite anzuzeigen.
      </Alert>
    )
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
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Kursprüfung</h1>
        <p className="text-secondary-600">
          Prüfen und genehmigen Sie eingereichte Kurse.
        </p>
      </div>

      {/* Alerts */}
      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Alle ({courses.length})
        </Button>
        <Button
          variant={filter === 'DRAFT' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('DRAFT')}
        >
          Entwürfe ({courses.filter((c) => c.status === 'DRAFT').length})
        </Button>
        <Button
          variant={filter === 'SUBMITTED' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('SUBMITTED')}
        >
          Eingereicht ({courses.filter((c) => c.status === 'SUBMITTED').length})
        </Button>
        <Button
          variant={filter === 'IN_REVIEW' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('IN_REVIEW')}
        >
          In Prüfung ({courses.filter((c) => c.status === 'IN_REVIEW').length})
        </Button>
      </div>

      {/* Course List */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-secondary-500">Keine Kurse zur Prüfung vorhanden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusVariants[course.status]}>
                        {statusLabels[course.status]}
                      </Badge>
                    </div>
                    <CardTitle>{course.title}</CardTitle>
                    <p className="text-sm text-secondary-500 mt-1">
                      Erstellt am {new Date(course.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <Link href={`/dashboard/courses/${course.id}`}>
                    <Button variant="outline" size="sm">
                      Vorschau
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-secondary-600 mb-4">
                  {course.description || 'Keine Beschreibung'}
                </p>

                {/* Course Stats */}
                <div className="flex items-center gap-6 text-sm text-secondary-500 mb-4">
                  <span>{course._count.modules} Module</span>
                  <span>
                    {course.modules.reduce((acc, m) => acc + m._count.lessons, 0)} Lektionen
                  </span>
                </div>

                {/* Module Overview */}
                {course.modules.length > 0 && (
                  <div className="bg-secondary-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-secondary-500 uppercase mb-2">Modulübersicht</p>
                    <div className="space-y-2">
                      {course.modules.slice(0, 5).map((module, idx) => (
                        <div key={module.id}>
                          <div className="text-sm text-secondary-700">
                            {idx + 1}. {module.title} ({module._count.lessons} Lektionen)
                          </div>
                          {module.description && (
                            <p className="text-xs text-secondary-500 ml-4 mt-0.5">{module.description}</p>
                          )}
                        </div>
                      ))}
                      {course.modules.length > 5 && (
                        <div className="text-sm text-secondary-500 italic">
                          ... und {course.modules.length - 5} weitere Module
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-secondary-200">
                  {course.status === 'DRAFT' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusChange(course.id, 'APPROVED')}
                        disabled={processing}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Direkt freigeben
                      </Button>
                      <Link href={`/dashboard/courses/${course.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Bearbeiten
                        </Button>
                      </Link>
                    </>
                  )}
                  {course.status === 'SUBMITTED' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(course.id, 'IN_REVIEW')}
                        disabled={processing}
                      >
                        Prüfung starten
                      </Button>
                    </>
                  )}
                  {(course.status === 'SUBMITTED' || course.status === 'IN_REVIEW') && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusChange(course.id, 'APPROVED')}
                        disabled={processing}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Freigeben
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                        onClick={() => openRejectModal(course.id)}
                        disabled={processing}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Ablehnen
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setRejectingCourseId(null)
          setRejectionReason('')
        }}
        title="Kurs ablehnen"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={() => rejectingCourseId && handleStatusChange(rejectingCourseId, 'REJECTED', rejectionReason)}
              isLoading={processing}
            >
              Ablehnen
            </Button>
          </>
        }
      >
        <Textarea
          label="Begründung (optional)"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Geben Sie einen Grund für die Ablehnung an..."
          rows={4}
        />
      </Modal>
    </div>
  )
}
