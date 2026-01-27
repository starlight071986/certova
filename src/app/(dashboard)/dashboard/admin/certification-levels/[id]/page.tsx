'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
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
  logoUrl: string | null
  startDate: string | null
  endDate: string | null
  certificateExpiryType: 'NEVER' | 'FIXED_DATE' | 'PERIOD_DAYS' | 'PERIOD_MONTHS' | 'PERIOD_YEARS'
  certificateExpiryValue: number | null
  certificateExpiryDate: string | null
  courses: Array<{
    id: string
    courseId: string
    course: {
      id: string
      title: string
      courseNumber: string | null
      thumbnail: string | null
    }
  }>
  accessRules: Array<{
    id: string
    type: string
    groupId: string | null
    userId: string | null
    group: {
      id: string
      name: string
    } | null
  }>
}

interface Course {
  id: string
  title: string
  courseNumber: string | null
  thumbnail: string | null
  status: string
}

interface UserGroup {
  id: string
  name: string
}

export default function CertificationLevelEditPage() {
  const router = useRouter()
  const params = useParams()
  const levelId = params.id as string
  const isNew = levelId === 'new'

  const [level, setLevel] = useState<Partial<CertificationLevel>>({
    name: '',
    description: '',
    order: 0,
    isActive: true,
    logoUrl: null,
    startDate: null,
    endDate: null,
    certificateExpiryType: 'NEVER',
    certificateExpiryValue: null,
    certificateExpiryDate: null,
  })

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Course management
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [courseSearchTerm, setSearchTerm] = useState('')
  const [addCourseModal, setAddCourseModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)

  // Access management
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([])
  const [addAccessModal, setAddAccessModal] = useState(false)
  const [accessType, setAccessType] = useState<'ALL' | 'GROUP' | 'USER'>('ALL')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [addingAccess, setAddingAccess] = useState(false)

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    if (!isNew) {
      fetchLevel()
    }
    fetchAvailableCourses()
    fetchUserGroups()
  }, [levelId])

  const fetchLevel = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/certification-levels/${levelId}`)
      if (res.ok) {
        const data = await res.json()
        setLevel(data)
      } else {
        setError('Fehler beim Laden der Zertifizierungsstufe')
      }
    } catch (error) {
      setError('Fehler beim Laden der Zertifizierungsstufe')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableCourses = async () => {
    try {
      const res = await fetch('/api/courses')
      if (res.ok) {
        const data = await res.json()
        setAvailableCourses(data.filter((c: Course) => c.status === 'APPROVED'))
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchUserGroups = async () => {
    try {
      const res = await fetch('/api/user-groups')
      if (res.ok) {
        const data = await res.json()
        setAvailableGroups(data)
      }
    } catch (error) {
      console.error('Error fetching user groups:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      if (!level.name) {
        setError('Name ist erforderlich')
        return
      }

      const url = isNew
        ? '/api/certification-levels'
        : `/api/certification-levels/${levelId}`

      const method = isNew ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(level),
      })

      if (res.ok) {
        const data = await res.json()
        if (isNew) {
          router.push(`/dashboard/admin/certification-levels/${data.id}`)
        } else {
          fetchLevel()
        }
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (error) {
      setError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCourse = async () => {
    if (!selectedCourseId) return

    try {
      setAddingCourse(true)
      const res = await fetch(`/api/certification-levels/${levelId}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId: selectedCourseId }),
      })

      if (res.ok) {
        setAddCourseModal(false)
        setSelectedCourseId('')
        fetchLevel()
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Hinzufügen des Kurses')
      }
    } catch (error) {
      alert('Fehler beim Hinzufügen des Kurses')
    } finally {
      setAddingCourse(false)
    }
  }

  const handleRemoveCourse = async (courseId: string) => {
    if (!confirm('Möchten Sie diesen Kurs wirklich entfernen?')) return

    try {
      const res = await fetch(
        `/api/certification-levels/${levelId}/courses?courseId=${courseId}`,
        {
          method: 'DELETE',
        }
      )

      if (res.ok) {
        fetchLevel()
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Entfernen des Kurses')
      }
    } catch (error) {
      alert('Fehler beim Entfernen des Kurses')
    }
  }

  const handleAddAccess = async () => {
    if (accessType === 'GROUP' && !selectedGroupId) {
      alert('Bitte wählen Sie eine Gruppe aus')
      return
    }

    try {
      setAddingAccess(true)
      const res = await fetch(`/api/certification-levels/${levelId}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: accessType,
          groupId: accessType === 'GROUP' ? selectedGroupId : null,
        }),
      })

      if (res.ok) {
        setAddAccessModal(false)
        setAccessType('ALL')
        setSelectedGroupId('')
        fetchLevel()
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Hinzufügen der Zugriffsregel')
      }
    } catch (error) {
      alert('Fehler beim Hinzufügen der Zugriffsregel')
    } finally {
      setAddingAccess(false)
    }
  }

  const handleRemoveAccess = async (accessId: string) => {
    if (!confirm('Möchten Sie diese Zugriffsregel wirklich entfernen?')) return

    try {
      const res = await fetch(
        `/api/certification-levels/${levelId}/access?accessId=${accessId}`,
        {
          method: 'DELETE',
        }
      )

      if (res.ok) {
        fetchLevel()
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Entfernen der Zugriffsregel')
      }
    } catch (error) {
      alert('Fehler beim Entfernen der Zugriffsregel')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/certification-levels/${levelId}/logo-upload`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setLevel({ ...level, logoUrl: data.logoUrl })
        alert('Logo erfolgreich hochgeladen')
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Hochladen')
      }
    } catch (error) {
      alert('Fehler beim Hochladen des Logos')
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const filteredCourses = availableCourses.filter((course) => {
    const alreadyAdded = level.courses?.some((lc) => lc.courseId === course.id)
    if (alreadyAdded) return false
    if (courseSearchTerm) {
      return course.title.toLowerCase().includes(courseSearchTerm.toLowerCase())
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            {isNew ? 'Neue Zertifizierungsstufe' : level.name}
          </h1>
          <p className="text-secondary-600 mt-1">
            {isNew
              ? 'Erstellen Sie eine neue Zertifizierungsstufe'
              : 'Bearbeiten Sie die Zertifizierungsstufe'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/dashboard/admin/certification-levels')}
            variant="outline"
          >
            Zurück
          </Button>
          <Button onClick={handleSave} variant="primary" disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Speichern'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
          <p className="text-danger-800 text-sm">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Name <span className="text-danger-600">*</span>
            </label>
            <Input
              value={level.name || ''}
              onChange={(e) => setLevel({ ...level, name: e.target.value })}
              placeholder="z.B. Partner Level Silber"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Beschreibung
            </label>
            <textarea
              value={level.description || ''}
              onChange={(e) => setLevel({ ...level, description: e.target.value })}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Beschreibung der Zertifizierungsstufe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Sortierreihenfolge
            </label>
            <Input
              type="number"
              value={level.order || 0}
              onChange={(e) => setLevel({ ...level, order: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={level.isActive || false}
              onChange={(e) => setLevel({ ...level, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-secondary-700">
              Aktiv
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Logo hochladen
            </label>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Input
                  value={level.logoUrl || ''}
                  onChange={(e) => setLevel({ ...level, logoUrl: e.target.value })}
                  placeholder="/uploads/certification-levels/logo.png"
                  className="flex-1"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo || isNew}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="logo-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo || isNew}
                    onClick={(e) => e.preventDefault()}
                  >
                    {uploadingLogo ? <Spinner size="sm" /> : 'Hochladen'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-secondary-500">
                {isNew
                  ? 'Speichern Sie zuerst die Stufe, um ein Logo hochzuladen'
                  : 'Laden Sie ein Logo hoch (PNG, JPG, WebP, max. 5MB). Dieses Logo kann nach Erreichen der Stufe heruntergeladen werden.'}
              </p>
              {level.logoUrl && (
                <div className="border border-secondary-200 rounded-lg p-3 bg-secondary-50">
                  <p className="text-xs text-secondary-600 mb-2">Aktuelles Logo:</p>
                  <img
                    src={level.logoUrl}
                    alt="Logo"
                    className="max-w-xs max-h-32 object-contain border border-secondary-300 rounded bg-white p-2"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Period */}
      <Card>
        <CardHeader>
          <CardTitle>Verfügbarkeitszeitraum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Startdatum (optional)
              </label>
              <Input
                type="datetime-local"
                value={level.startDate ? new Date(level.startDate).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setLevel({ ...level, startDate: e.target.value || null })
                }
              />
              <p className="text-xs text-secondary-500 mt-1">
                Stufe wird erst ab diesem Datum angezeigt
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Enddatum (optional)
              </label>
              <Input
                type="datetime-local"
                value={level.endDate ? new Date(level.endDate).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setLevel({ ...level, endDate: e.target.value || null })
                }
              />
              <p className="text-xs text-secondary-500 mt-1">
                Stufe wird nach diesem Datum ausgeblendet
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Expiry */}
      <Card>
        <CardHeader>
          <CardTitle>Zertifikat-Gültigkeit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Gültigkeitsende
            </label>
            <select
              value={level.certificateExpiryType || 'NEVER'}
              onChange={(e) =>
                setLevel({
                  ...level,
                  certificateExpiryType: e.target.value as any,
                  certificateExpiryValue: null,
                  certificateExpiryDate: null,
                })
              }
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="NEVER">Unbegrenzt</option>
              <option value="FIXED_DATE">Festes Datum</option>
              <option value="PERIOD_DAYS">Tage nach Freischaltung</option>
              <option value="PERIOD_MONTHS">Monate nach Freischaltung</option>
              <option value="PERIOD_YEARS">Jahre nach Freischaltung</option>
            </select>
          </div>

          {level.certificateExpiryType === 'FIXED_DATE' && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Ablaufdatum
              </label>
              <Input
                type="date"
                value={
                  level.certificateExpiryDate
                    ? new Date(level.certificateExpiryDate).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setLevel({ ...level, certificateExpiryDate: e.target.value || null })
                }
              />
            </div>
          )}

          {(level.certificateExpiryType === 'PERIOD_DAYS' ||
            level.certificateExpiryType === 'PERIOD_MONTHS' ||
            level.certificateExpiryType === 'PERIOD_YEARS') && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Anzahl{' '}
                {level.certificateExpiryType === 'PERIOD_DAYS'
                  ? 'Tage'
                  : level.certificateExpiryType === 'PERIOD_MONTHS'
                  ? 'Monate'
                  : 'Jahre'}
              </label>
              <Input
                type="number"
                min="1"
                value={level.certificateExpiryValue || ''}
                onChange={(e) =>
                  setLevel({
                    ...level,
                    certificateExpiryValue: parseInt(e.target.value) || null,
                  })
                }
                placeholder="z.B. 12"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Courses */}
      {!isNew && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Zugeordnete Kurse</CardTitle>
              <Button onClick={() => setAddCourseModal(true)} variant="primary" size="sm">
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Kurs hinzufügen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {level.courses && level.courses.length > 0 ? (
              <div className="space-y-2">
                {level.courses.map((lc) => (
                  <div
                    key={lc.id}
                    className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {lc.course.thumbnail && (
                        <img
                          src={lc.course.thumbnail}
                          alt={lc.course.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-secondary-900">{lc.course.title}</span>
                        {lc.course.courseNumber && (
                          <span className="text-xs text-secondary-500">
                            Kursnummer: {lc.course.courseNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveCourse(lc.courseId)}
                      variant="danger"
                      size="sm"
                    >
                      Entfernen
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary-500 text-center py-8">
                Keine Kurse zugeordnet. Fügen Sie Kurse hinzu, die für diese Stufe erforderlich
                sind.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Access Rules */}
      {!isNew && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Zugriffsregeln</CardTitle>
              <Button onClick={() => setAddAccessModal(true)} variant="primary" size="sm">
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Regel hinzufügen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {level.accessRules && level.accessRules.length > 0 ? (
              <div className="space-y-2">
                {level.accessRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          rule.type === 'ALL'
                            ? 'success'
                            : rule.type === 'GROUP'
                            ? 'primary'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {rule.type === 'ALL'
                          ? 'Alle Benutzer'
                          : rule.type === 'GROUP'
                          ? `Gruppe: ${rule.group?.name}`
                          : 'Einzelbenutzer'}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleRemoveAccess(rule.id)}
                      variant="danger"
                      size="sm"
                    >
                      Entfernen
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary-500 text-center py-8">
                Keine Zugriffsregeln definiert. Fügen Sie Regeln hinzu, um festzulegen, wer diese
                Stufe sehen kann.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Course Modal */}
      <Modal
        isOpen={addCourseModal}
        onClose={() => setAddCourseModal(false)}
        title="Kurs hinzufügen"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Kurs suchen
            </label>
            <Input
              value={courseSearchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kursname eingeben..."
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedCourseId === course.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-secondary-200 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {course.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-secondary-900">{course.title}</span>
                    {course.courseNumber && (
                      <span className="text-xs text-secondary-500">
                        Kursnummer: {course.courseNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredCourses.length === 0 && (
              <p className="text-secondary-500 text-center py-4">Keine Kurse gefunden</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={() => setAddCourseModal(false)} variant="outline" disabled={addingCourse}>
              Abbrechen
            </Button>
            <Button onClick={handleAddCourse} variant="primary" disabled={!selectedCourseId || addingCourse}>
              {addingCourse ? <Spinner size="sm" /> : 'Hinzufügen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Access Modal */}
      <Modal
        isOpen={addAccessModal}
        onClose={() => setAddAccessModal(false)}
        title="Zugriffsregel hinzufügen"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Zugriffstyp
            </label>
            <select
              value={accessType}
              onChange={(e) => setAccessType(e.target.value as any)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="ALL">Alle Benutzer</option>
              <option value="GROUP">Benutzergruppe</option>
            </select>
          </div>

          {accessType === 'GROUP' && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Gruppe</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Gruppe auswählen...</option>
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={() => setAddAccessModal(false)} variant="outline" disabled={addingAccess}>
              Abbrechen
            </Button>
            <Button onClick={handleAddAccess} variant="primary" disabled={addingAccess}>
              {addingAccess ? <Spinner size="sm" /> : 'Hinzufügen'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
