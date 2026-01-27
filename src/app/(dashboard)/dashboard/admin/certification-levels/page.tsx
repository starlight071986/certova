'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Spinner,
  Badge,
  Modal,
} from '@/components/ui'

interface CertificationLevel {
  id: string
  name: string
  description: string | null
  order: number
  isActive: boolean
  baseLogoUrl: string | null
  logoType: string
  courses: Array<{
    id: string
    courseId: string
    course: {
      id: string
      title: string
      thumbnail: string | null
    }
  }>
  accessRules: Array<{
    id: string
    type: string
    groupId: string | null
    group: {
      id: string
      name: string
    } | null
  }>
  _count: {
    userLevels: number
  }
}

export default function CertificationLevelsPage() {
  const router = useRouter()
  const [levels, setLevels] = useState<CertificationLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; level: CertificationLevel | null }>({
    open: false,
    level: null,
  })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchLevels()
  }, [])

  const fetchLevels = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/certification-levels')
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

  const handleDelete = async (level: CertificationLevel) => {
    setDeleteModal({ open: true, level })
  }

  const confirmDelete = async () => {
    if (!deleteModal.level) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/certification-levels/${deleteModal.level.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setDeleteModal({ open: false, level: null })
        fetchLevels()
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Löschen')
      }
    } catch (error) {
      alert('Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  const toggleActive = async (level: CertificationLevel) => {
    try {
      const res = await fetch(`/api/certification-levels/${level.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !level.isActive }),
      })

      if (res.ok) {
        fetchLevels()
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Aktualisieren')
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren')
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Zertifizierungsstufen</h1>
          <p className="text-secondary-600 mt-1">
            Verwalten Sie Zertifizierungsstufen für mehrere Kursabschlüsse
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/dashboard/admin/certification-levels/users')}
            variant="outline"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Benutzer-Übersicht
          </Button>
          <Button
            onClick={() => router.push('/dashboard/admin/certification-levels/new')}
            variant="primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Neue Stufe erstellen
          </Button>
        </div>
      </div>

      {/* Levels List */}
      {levels.length === 0 ? (
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
              Keine Zertifizierungsstufen vorhanden
            </p>
            <p className="text-secondary-500 mb-6">
              Erstellen Sie eine neue Zertifizierungsstufe für mehrere Kursabschlüsse
            </p>
            <Button
              onClick={() => router.push('/dashboard/admin/certification-levels/new')}
              variant="primary"
            >
              Erste Stufe erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {levels.map((level) => (
            <Card key={level.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-secondary-900">{level.name}</h3>
                      <Badge variant={level.isActive ? 'success' : 'secondary'} size="sm">
                        {level.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                      <Badge variant="accent" size="sm">
                        {level.logoType === 'COMPANY' ? 'Unternehmenslogo' : 'Persönliches Logo'}
                      </Badge>
                    </div>
                    {level.description && (
                      <p className="text-secondary-600 text-sm mb-4">{level.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <svg
                          className="w-5 h-5 text-primary-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span className="text-secondary-700">
                          {level.courses.length} {level.courses.length === 1 ? 'Kurs' : 'Kurse'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg
                          className="w-5 h-5 text-success-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        <span className="text-secondary-700">
                          {level._count.userLevels} erreicht
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg
                          className="w-5 h-5 text-accent-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <span className="text-secondary-700">
                          {level.accessRules.length}{' '}
                          {level.accessRules.length === 1 ? 'Zugriffsregel' : 'Zugriffsregeln'}
                        </span>
                      </div>
                    </div>

                    {level.baseLogoUrl && (
                      <div className="flex items-center gap-2 text-sm text-secondary-600 mb-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Basis-Logo konfiguriert</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        router.push(`/dashboard/admin/certification-levels/${level.id}`)
                      }
                      variant="outline"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Bearbeiten
                    </Button>
                    <Button
                      onClick={() => toggleActive(level)}
                      variant={level.isActive ? 'secondary' : 'primary'}
                      size="sm"
                    >
                      {level.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </Button>
                    <Button onClick={() => handleDelete(level)} variant="danger" size="sm">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, level: null })}
        title="Zertifizierungsstufe löschen"
      >
        <div className="space-y-4">
          <p className="text-secondary-700">
            Möchten Sie die Zertifizierungsstufe <strong>{deleteModal.level?.name}</strong> wirklich
            löschen?
          </p>

          {deleteModal.level && deleteModal.level._count.userLevels > 0 && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <p className="text-warning-800 text-sm">
                <strong>Warnung:</strong> Diese Stufe wurde bereits von{' '}
                {deleteModal.level._count.userLevels} Benutzer(n) erreicht. Beim Löschen werden auch
                alle Benutzer-Achievements entfernt.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setDeleteModal({ open: false, level: null })}
              variant="outline"
              disabled={deleting}
            >
              Abbrechen
            </Button>
            <Button onClick={confirmDelete} variant="danger" disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : 'Löschen'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
