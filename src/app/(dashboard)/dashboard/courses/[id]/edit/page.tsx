'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Spinner,
  Alert,
} from '@/components/ui'
import QuizEditor from '@/components/QuizEditor'
import FileUpload from '@/components/FileUpload'
import CourseAccessManager from '@/components/CourseAccessManager'

interface Lesson {
  id: string
  title: string
  type: string
  content?: string | null
  videoUrl?: string | null
  duration: number | null
  order: number
}

interface ModuleQuiz {
  id: string
  title: string
  isRequired: boolean
  passingScore: number
  maxAttempts: number
  questions: { id: string }[]
}

interface Module {
  id: string
  title: string
  description: string | null
  order: number
  lessons: Lesson[]
  quiz?: ModuleQuiz | null
}

interface Course {
  id: string
  title: string
  description: string | null
  status: string
  modules: Module[]
  startDate: string | null
  endDate: string | null
  creditCost: number
  certificateExpiryType: 'NEVER' | 'FIXED_DATE' | 'PERIOD_DAYS' | 'PERIOD_MONTHS' | 'PERIOD_YEARS'
  certificateExpiryValue: number | null
  certificateExpiryDate: string | null
}

const lessonTypes = [
  { value: 'TEXT', label: 'Text', icon: '📄' },
  { value: 'VIDEO', label: 'Video', icon: '🎬' },
  { value: 'PDF', label: 'PDF', icon: '📑' },
  { value: 'AUDIO', label: 'Audio', icon: '🎧' },
  { value: 'POWERPOINT', label: 'PowerPoint', icon: '📊' },
  { value: 'INTERACTIVE', label: 'Interaktiv', icon: '🎮' },
]

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
  POWERPOINT: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6" />
    </svg>
  ),
  INTERACTIVE: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
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

export default function CourseEditorPage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Inline editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Modals
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [showEditLessonModal, setShowEditLessonModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)

  // Module editing states
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editModuleTitle, setEditModuleTitle] = useState('')
  const [editModuleDescription, setEditModuleDescription] = useState('')

  // Lesson editing states
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null)

  // Quiz editor state
  const [showQuizEditor, setShowQuizEditor] = useState(false)
  const [quizModuleId, setQuizModuleId] = useState<string | null>(null)
  const [quizModuleName, setQuizModuleName] = useState('')

  // Certificate expiry settings
  const [certExpiryType, setCertExpiryType] = useState<string>('PERIOD_YEARS')
  const [certExpiryValue, setCertExpiryValue] = useState<string>('1')
  const [certExpiryDate, setCertExpiryDate] = useState<string>('')
  const [savingCertSettings, setSavingCertSettings] = useState(false)

  // Course availability dates
  const [courseStartDate, setCourseStartDate] = useState<string>('')
  const [courseEndDate, setCourseEndDate] = useState<string>('')
  const [savingDateSettings, setSavingDateSettings] = useState(false)

  // Settings tab
  const [settingsTab, setSettingsTab] = useState<'availability' | 'pricing' | 'certificate' | 'access'>('availability')

  // Pricing settings
  const [creditCost, setCreditCost] = useState<string>('0')
  const [savingPricing, setSavingPricing] = useState(false)

  // Form states
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleDescription, setModuleDescription] = useState('')
  const [newLesson, setNewLesson] = useState({
    title: '',
    type: 'TEXT',
    content: '',
    videoUrl: '',
    duration: '',
  })
  const [editLessonForm, setEditLessonForm] = useState({
    title: '',
    type: 'TEXT',
    content: '',
    videoUrl: '',
    duration: '',
  })

  useEffect(() => {
    fetchCourse()
  }, [params.id])

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/courses/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setCourse(data)
        // Initialize certificate settings
        setCertExpiryType(data.certificateExpiryType || 'PERIOD_YEARS')
        setCertExpiryValue(data.certificateExpiryValue?.toString() || '1')
        if (data.certificateExpiryDate) {
          setCertExpiryDate(new Date(data.certificateExpiryDate).toISOString().split('T')[0])
        }
        // Initialize course dates
        if (data.startDate) {
          setCourseStartDate(new Date(data.startDate).toISOString().split('T')[0])
        }
        if (data.endDate) {
          setCourseEndDate(new Date(data.endDate).toISOString().split('T')[0])
        }
        // Initialize pricing
        setCreditCost(data.creditCost?.toString() || '0')
      } else {
        setError('Kurs nicht gefunden')
      }
    } catch (error) {
      setError('Fehler beim Laden des Kurses')
    } finally {
      setLoading(false)
    }
  }

  const handleAddModule = async () => {
    if (!moduleTitle.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${params.id}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleTitle,
          description: moduleDescription || undefined,
        }),
      })

      if (res.ok) {
        setModuleTitle('')
        setModuleDescription('')
        setShowModuleModal(false)
        fetchCourse()
        setSuccess('Modul hinzugefügt')
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (error) {
      setError('Fehler beim Erstellen des Moduls')
    } finally {
      setSaving(false)
    }
  }

  const handleAddLesson = async () => {
    if (!newLesson.title.trim() || !selectedModuleId) return

    setSaving(true)
    try {
      const res = await fetch(`/api/modules/${selectedModuleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLesson.title,
          type: newLesson.type,
          content: newLesson.content || undefined,
          videoUrl: newLesson.videoUrl || undefined,
          duration: newLesson.duration ? parseInt(newLesson.duration) : undefined,
        }),
      })

      if (res.ok) {
        setNewLesson({ title: '', type: 'TEXT', content: '', videoUrl: '', duration: '' })
        setShowLessonModal(false)
        setSelectedModuleId(null)
        fetchCourse()
        setSuccess('Lektion hinzugefügt')
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (error) {
      setError('Fehler beim Erstellen der Lektion')
    } finally {
      setSaving(false)
    }
  }

  const openLessonModal = (moduleId: string) => {
    setSelectedModuleId(moduleId)
    setShowLessonModal(true)
  }

  const openQuizEditor = (module: Module) => {
    setQuizModuleId(module.id)
    setQuizModuleName(module.title)
    setShowQuizEditor(true)
  }

  const openEditLessonModal = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setEditLessonForm({
      title: lesson.title,
      type: lesson.type,
      content: lesson.content || '',
      videoUrl: lesson.videoUrl || '',
      duration: lesson.duration?.toString() || '',
    })
    setShowEditLessonModal(true)
  }

  const handleUpdateLesson = async () => {
    if (!editingLesson || !editLessonForm.title.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/lessons/${editingLesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editLessonForm.title,
          type: editLessonForm.type,
          content: editLessonForm.content || null,
          videoUrl: editLessonForm.videoUrl || null,
          duration: editLessonForm.duration ? parseInt(editLessonForm.duration) : null,
        }),
      })

      if (res.ok) {
        setShowEditLessonModal(false)
        setEditingLesson(null)
        fetchCourse()
        setSuccess('Lektion aktualisiert')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Aktualisieren')
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren der Lektion')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLesson = async () => {
    if (!deletingLessonId) return

    setSaving(true)
    try {
      const res = await fetch(`/api/lessons/${deletingLessonId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setShowDeleteConfirm(false)
        setDeletingLessonId(null)
        fetchCourse()
        setSuccess('Lektion gelöscht')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Löschen')
      }
    } catch (err) {
      setError('Fehler beim Löschen der Lektion')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteConfirm = (lessonId: string) => {
    setDeletingLessonId(lessonId)
    setShowDeleteConfirm(true)
  }

  const startEditingModule = (module: Module) => {
    setEditingModuleId(module.id)
    setEditModuleTitle(module.title)
    setEditModuleDescription(module.description || '')
  }

  const cancelEditingModule = () => {
    setEditingModuleId(null)
    setEditModuleTitle('')
    setEditModuleDescription('')
  }

  const handleSaveModule = async (moduleId: string) => {
    if (!editModuleTitle.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editModuleTitle.trim(),
          description: editModuleDescription || null,
        }),
      })

      if (res.ok) {
        fetchCourse()
        cancelEditingModule()
        setSuccess('Modul gespeichert')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern des Moduls')
    } finally {
      setSaving(false)
    }
  }

  const startEditingTitle = () => {
    if (course) {
      setEditTitle(course.title)
      setIsEditingTitle(true)
    }
  }

  const startEditingDescription = () => {
    if (course) {
      setEditDescription(course.description || '')
      setIsEditingDescription(true)
    }
  }

  const handleSaveTitle = async () => {
    if (!course || !editTitle.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      })

      if (res.ok) {
        setCourse({ ...course, title: editTitle.trim() })
        setIsEditingTitle(false)
        setSuccess('Titel gespeichert')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern des Titels')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDescription = async () => {
    if (!course) return

    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription }),
      })

      if (res.ok) {
        setCourse({ ...course, description: editDescription || null })
        setIsEditingDescription(false)
        setSuccess('Beschreibung gespeichert')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern der Beschreibung')
    } finally {
      setSaving(false)
    }
  }

  const cancelEditingTitle = () => {
    setIsEditingTitle(false)
    setEditTitle('')
  }

  const cancelEditingDescription = () => {
    setIsEditingDescription(false)
    setEditDescription('')
  }

  const handleSubmitForReview = async () => {
    if (!course) return

    // Check if course has at least one module with one lesson
    const hasContent = course.modules.some((m) => m.lessons.length > 0)
    if (!hasContent) {
      setError('Der Kurs muss mindestens ein Modul mit einer Lektion enthalten')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SUBMITTED' }),
      })

      if (res.ok) {
        const data = await res.json()
        setCourse({ ...course, status: data.status })
        setSuccess('Kurs wurde zur Prüfung eingereicht')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Einreichen')
      }
    } catch (err) {
      setError('Fehler beim Einreichen des Kurses')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCertificateSettings = async () => {
    if (!course) return

    setSavingCertSettings(true)
    try {
      const res = await fetch(`/api/courses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateExpiryType: certExpiryType,
          certificateExpiryValue: ['PERIOD_DAYS', 'PERIOD_MONTHS', 'PERIOD_YEARS'].includes(certExpiryType)
            ? parseInt(certExpiryValue) || null
            : null,
          certificateExpiryDate: certExpiryType === 'FIXED_DATE' && certExpiryDate
            ? new Date(certExpiryDate).toISOString()
            : null,
        }),
      })

      if (res.ok) {
        setSuccess('Zertifikat-Einstellungen gespeichert')
        fetchCourse()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern der Zertifikat-Einstellungen')
    } finally {
      setSavingCertSettings(false)
    }
  }

  const handleSaveDateSettings = async () => {
    if (!course) return

    setSavingDateSettings(true)
    try {
      const res = await fetch(`/api/courses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: courseStartDate ? new Date(courseStartDate).toISOString() : null,
          endDate: courseEndDate ? new Date(courseEndDate).toISOString() : null,
        }),
      })

      if (res.ok) {
        setSuccess('Verfügbarkeits-Einstellungen gespeichert')
        fetchCourse()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern der Verfügbarkeits-Einstellungen')
    } finally {
      setSavingDateSettings(false)
    }
  }

  const handleSavePricing = async () => {
    if (!course) return

    setSavingPricing(true)
    try {
      const res = await fetch(`/api/courses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditCost: parseInt(creditCost) || 0,
        }),
      })

      if (res.ok) {
        setSuccess('Preis-Einstellungen gespeichert')
        fetchCourse()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern der Preis-Einstellungen')
    } finally {
      setSavingPricing(false)
    }
  }

  // Calculate stats
  const totalLessons = course?.modules.reduce((acc, m) => acc + m.lessons.length, 0) || 0
  const totalDuration = course?.modules.reduce(
    (acc, m) => acc + m.lessons.reduce((a, l) => a + (l.duration || 0), 0),
    0
  ) || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!course) {
    return <Alert variant="danger">{error || 'Kurs nicht gefunden'}</Alert>
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/courses"
        className="inline-flex items-center text-sm text-secondary-600 hover:text-primary-600"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurück
      </Link>

      {/* Alerts */}
      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Course Header */}
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={statusVariants[course.status]} size="lg">
                  {statusLabels[course.status]}
                </Badge>
                <div className="flex items-center gap-4 text-sm text-secondary-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {course.modules.length} Module
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {totalLessons} Lektionen
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {totalDuration} Min.
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {course.status === 'DRAFT' && (
                  <Button variant="accent" onClick={handleSubmitForReview} isLoading={saving}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Zur Prüfung einreichen
                  </Button>
                )}
                {course.status === 'SUBMITTED' && (
                  <span className="text-sm text-secondary-500 flex items-center">
                    <svg className="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Warten auf Prüfung...
                  </span>
                )}
                {course.status === 'REJECTED' && (
                  <Button variant="outline" onClick={() => {
                    fetch(`/api/courses/${params.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'DRAFT' }),
                    }).then(() => fetchCourse())
                  }}>
                    Zurück zu Entwurf
                  </Button>
                )}
              </div>
            </div>

            {/* Editable Title */}
            <div className="group">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-2xl font-bold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle()
                      if (e.key === 'Escape') cancelEditingTitle()
                    }}
                  />
                  <Button variant="primary" size="sm" onClick={handleSaveTitle} disabled={saving}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditingTitle}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-secondary-50 rounded-lg p-2 -m-2 transition-colors"
                  onClick={startEditingTitle}
                >
                  <h1 className="text-2xl font-bold text-primary-900">{course.title}</h1>
                  <svg className="w-4 h-4 text-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Editable Description */}
            <div className="group">
              {isEditingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="Kursbeschreibung eingeben..."
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEditingDescription()
                    }}
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={handleSaveDescription} disabled={saving}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Speichern
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEditingDescription}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-start gap-2 cursor-pointer hover:bg-secondary-50 rounded-lg p-2 -m-2 transition-colors"
                  onClick={startEditingDescription}
                >
                  <p className="text-secondary-600 flex-1">
                    {course.description || 'Keine Beschreibung - Klicken zum Hinzufügen'}
                  </p>
                  <svg className="w-4 h-4 text-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules & Lessons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-900">Kursinhalt</h2>
        <Button variant="primary" onClick={() => setShowModuleModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Modul hinzufügen
        </Button>
      </div>

      {course.modules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-secondary-500 mb-4">Noch keine Module vorhanden.</p>
            <Button variant="primary" onClick={() => setShowModuleModal(true)}>
              Erstes Modul erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {course.modules.map((module, moduleIndex) => (
            <Card key={module.id} className="overflow-hidden">
              {/* Module Header */}
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border-b border-secondary-200">
                {editingModuleId === module.id ? (
                  <div className="p-4 space-y-3">
                    <Input
                      value={editModuleTitle}
                      onChange={(e) => setEditModuleTitle(e.target.value)}
                      placeholder="Modultitel"
                      autoFocus
                    />
                    <Textarea
                      value={editModuleDescription}
                      onChange={(e) => setEditModuleDescription(e.target.value)}
                      placeholder="Modulbeschreibung (optional)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => handleSaveModule(module.id)} disabled={saving}>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Speichern
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEditingModule}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 group cursor-pointer" onClick={() => startEditingModule(module)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm">
                          {moduleIndex + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-primary-900">{module.title}</h3>
                            <svg className="w-4 h-4 text-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </div>
                          {module.description ? (
                            <p className="text-sm text-secondary-600 mt-0.5">{module.description}</p>
                          ) : (
                            <p className="text-sm text-secondary-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              Klicken um Beschreibung hinzuzufügen
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-secondary-500">
                        {module.lessons.length} {module.lessons.length === 1 ? 'Lektion' : 'Lektionen'}
                      </span>
                      {module.quiz && (
                        <Badge variant={module.quiz.isRequired ? 'warning' : 'secondary'} size="sm">
                          {module.quiz.isRequired ? 'Quiz (Pflicht)' : 'Quiz'}
                          {module.quiz.questions.length > 0 && ` · ${module.quiz.questions.length} Fragen`}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openQuizEditor(module)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        {module.quiz ? 'Quiz bearbeiten' : 'Quiz hinzufügen'}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openLessonModal(module.id)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Lektion
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lessons */}
              <div className="divide-y divide-secondary-100">
                {module.lessons.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-secondary-500 mb-3">Noch keine Lektionen in diesem Modul.</p>
                    <Button variant="outline" size="sm" onClick={() => openLessonModal(module.id)}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Erste Lektion hinzufügen
                    </Button>
                  </div>
                ) : (
                  module.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="px-4 py-3 flex items-center gap-4 hover:bg-secondary-50 transition-colors group"
                    >
                      {/* Order Number */}
                      <div className="w-6 h-6 rounded-full bg-secondary-100 text-secondary-500 flex items-center justify-center text-xs font-medium">
                        {lesson.order}
                      </div>

                      {/* Type Icon */}
                      <div className="w-8 h-8 rounded-lg bg-secondary-100 text-secondary-600 flex items-center justify-center">
                        {lessonTypeIcons[lesson.type] || lessonTypeIcons.TEXT}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-secondary-900 truncate">{lesson.title}</span>
                          <Badge variant="secondary" size="sm">
                            {lessonTypes.find((t) => t.value === lesson.type)?.label || lesson.type}
                          </Badge>
                        </div>
                      </div>

                      {/* Duration */}
                      {lesson.duration && (
                        <span className="text-sm text-secondary-500 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {lesson.duration} Min.
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditLessonModal(lesson)}
                          className="text-secondary-500 hover:text-primary-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteConfirm(lesson.id)}
                          className="text-secondary-500 hover:text-danger-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Course Settings with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Kurseinstellungen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tabs */}
          <div className="border-b border-secondary-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setSettingsTab('availability')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  settingsTab === 'availability'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Verfügbarkeit
              </button>
              <button
                onClick={() => setSettingsTab('pricing')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  settingsTab === 'pricing'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Preis
              </button>
              <button
                onClick={() => setSettingsTab('certificate')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  settingsTab === 'certificate'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Zertifikat
              </button>
              <button
                onClick={() => setSettingsTab('access')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  settingsTab === 'access'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Zugriff
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Availability Tab */}
            {settingsTab === 'availability' && (
              <div className="space-y-4">
                <p className="text-sm text-secondary-600">
                  Legen Sie fest, wann der Kurs für Lernende sichtbar und bearbeitbar ist.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Startdatum (optional)
                    </label>
                    <Input
                      type="date"
                      value={courseStartDate}
                      onChange={(e) => setCourseStartDate(e.target.value)}
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      Vor diesem Datum ist der Kurs nur für Administratoren sichtbar.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Enddatum (optional)
                    </label>
                    <Input
                      type="date"
                      value={courseEndDate}
                      onChange={(e) => setCourseEndDate(e.target.value)}
                      min={courseStartDate || undefined}
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      Nach diesem Datum wird der Kurs ausgeblendet. Bereits eingeschriebene Lernende sehen ihn als &quot;abgelaufen&quot;.
                    </p>
                  </div>
                </div>

                {courseStartDate && courseEndDate && new Date(courseStartDate) > new Date(courseEndDate) && (
                  <Alert variant="warning">
                    Das Startdatum liegt nach dem Enddatum. Bitte korrigieren Sie die Daten.
                  </Alert>
                )}

                <div className="flex items-center gap-2">
                  {courseStartDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCourseStartDate('')}
                    >
                      Startdatum entfernen
                    </Button>
                  )}
                  {courseEndDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCourseEndDate('')}
                    >
                      Enddatum entfernen
                    </Button>
                  )}
                </div>

                <Button
                  variant="primary"
                  onClick={handleSaveDateSettings}
                  isLoading={savingDateSettings}
                >
                  Einstellungen speichern
                </Button>
              </div>
            )}

            {/* Pricing Tab */}
            {settingsTab === 'pricing' && (
              <div className="space-y-4">
                <p className="text-sm text-secondary-600">
                  Legen Sie fest, ob der Kurs kostenlos ist oder Credits für die Einschreibung benötigt.
                </p>

                <div className="p-4 bg-secondary-50 rounded-lg border border-secondary-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-sm">
                      <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Kreditkosten für Einschreibung
                      </label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          value={creditCost}
                          onChange={(e) => setCreditCost(e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-secondary-600">Credits</span>
                      </div>
                      <p className="text-xs text-secondary-500 mt-2">
                        0 Credits = Kostenloser Kurs. Benutzer benötigen ausreichend Credits, um sich einzuschreiben.
                      </p>
                    </div>
                  </div>
                </div>

                {parseInt(creditCost) === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-success-50 text-success-700 rounded-lg border border-success-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">Dieser Kurs ist kostenlos</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-accent-50 text-accent-700 rounded-lg border border-accent-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">
                      Benutzer benötigen {creditCost} Credits zur Einschreibung
                    </span>
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={handleSavePricing}
                  isLoading={savingPricing}
                >
                  Einstellungen speichern
                </Button>
              </div>
            )}

            {/* Certificate Tab */}
            {settingsTab === 'certificate' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Gültigkeit des Zertifikats
                  </label>
                  <Select
                    value={certExpiryType}
                    onChange={(e) => setCertExpiryType(e.target.value)}
                    options={[
                      { value: 'NEVER', label: 'Unbegrenzt gültig' },
                      { value: 'FIXED_DATE', label: 'Festes Ablaufdatum' },
                      { value: 'PERIOD_DAYS', label: 'Gültigkeitsdauer in Tagen' },
                      { value: 'PERIOD_MONTHS', label: 'Gültigkeitsdauer in Monaten' },
                      { value: 'PERIOD_YEARS', label: 'Gültigkeitsdauer in Jahren' },
                    ]}
                  />
                </div>

                {certExpiryType === 'FIXED_DATE' && (
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Ablaufdatum
                    </label>
                    <Input
                      type="date"
                      value={certExpiryDate}
                      onChange={(e) => setCertExpiryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}

                {['PERIOD_DAYS', 'PERIOD_MONTHS', 'PERIOD_YEARS'].includes(certExpiryType) && (
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      {certExpiryType === 'PERIOD_DAYS' && 'Anzahl Tage'}
                      {certExpiryType === 'PERIOD_MONTHS' && 'Anzahl Monate'}
                      {certExpiryType === 'PERIOD_YEARS' && 'Anzahl Jahre'}
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={certExpiryValue}
                      onChange={(e) => setCertExpiryValue(e.target.value)}
                      placeholder={certExpiryType === 'PERIOD_YEARS' ? '1' : ''}
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      Das Zertifikat ist ab Abschluss des Kurses gültig.
                    </p>
                  </div>
                )}

                {certExpiryType === 'NEVER' && (
                  <p className="text-sm text-secondary-500">
                    Das Zertifikat hat kein Ablaufdatum und ist dauerhaft gültig.
                  </p>
                )}

                <Button
                  variant="primary"
                  onClick={handleSaveCertificateSettings}
                  isLoading={savingCertSettings}
                >
                  Einstellungen speichern
                </Button>
              </div>
            )}

            {/* Access Tab */}
            {settingsTab === 'access' && (
              <CourseAccessManager courseId={course.id} embedded />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Module Modal */}
      <Modal
        isOpen={showModuleModal}
        onClose={() => {
          setShowModuleModal(false)
          setModuleTitle('')
          setModuleDescription('')
        }}
        title="Neues Modul"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModuleModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleAddModule} isLoading={saving}>
              Hinzufügen
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Modultitel"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="z.B. Einführung"
          />
          <Textarea
            label="Beschreibung (optional)"
            value={moduleDescription}
            onChange={(e) => setModuleDescription(e.target.value)}
            placeholder="Was lernen Teilnehmer in diesem Modul?"
            rows={3}
          />
        </div>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal
        isOpen={showLessonModal}
        onClose={() => {
          setShowLessonModal(false)
          setSelectedModuleId(null)
          setNewLesson({ title: '', type: 'TEXT', content: '', videoUrl: '', duration: '' })
        }}
        title="Neue Lektion"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowLessonModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleAddLesson} isLoading={saving}>
              Hinzufügen
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Titel"
            value={newLesson.title}
            onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
            placeholder="z.B. Was ist die DSGVO?"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Typ"
              options={lessonTypes.map((t) => ({ value: t.value, label: `${t.icon} ${t.label}` }))}
              value={newLesson.type}
              onChange={(e) => setNewLesson({ ...newLesson, type: e.target.value })}
            />
            <Input
              label="Dauer (Minuten)"
              type="number"
              value={newLesson.duration}
              onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
              placeholder="10"
            />
          </div>
          {newLesson.type === 'TEXT' && (
            <Textarea
              label="Inhalt"
              value={newLesson.content}
              onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
              rows={6}
              placeholder="Lektionsinhalt eingeben..."
            />
          )}
          {newLesson.type === 'VIDEO' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary-700">
                Video hochladen oder URL eingeben
              </label>
              <FileUpload
                type="video"
                value={newLesson.videoUrl}
                onChange={(url, duration) => setNewLesson({
                  ...newLesson,
                  videoUrl: url,
                  duration: duration?.toString() || newLesson.duration,
                })}
                onError={(err) => setError(err)}
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-secondary-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-secondary-500">oder</span>
                </div>
              </div>
              <Input
                label="Video-URL (YouTube, Vimeo, etc.)"
                value={newLesson.videoUrl?.startsWith('/uploads') ? '' : newLesson.videoUrl}
                onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-secondary-500">
                Unterstützte Formate: MP4, WebM, OGG (max. 500MB) oder externe URLs
              </p>
            </div>
          )}
          {newLesson.type === 'PDF' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">
                PDF-Dokument
              </label>
              <FileUpload
                type="pdf"
                value={newLesson.content}
                onChange={(url) => setNewLesson({ ...newLesson, content: url })}
                onError={(err) => setError(err)}
              />
              <p className="text-xs text-secondary-500">
                Unterstützte Formate: PDF (max. 50MB)
              </p>
            </div>
          )}
          {newLesson.type === 'POWERPOINT' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">
                PowerPoint-Präsentation
              </label>
              <FileUpload
                type="powerpoint"
                value={newLesson.content}
                onChange={(url) => setNewLesson({ ...newLesson, content: url })}
                onError={(err) => setError(err)}
              />
              <p className="text-xs text-secondary-500">
                Unterstützte Formate: PPT, PPTX (max. 100MB)
                <br />
                Animationen und Übergänge bleiben erhalten.
              </p>
            </div>
          )}
          {newLesson.type === 'AUDIO' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">
                Audio-Datei
              </label>
              <FileUpload
                type="audio"
                value={newLesson.content}
                onChange={(url, duration) => setNewLesson({
                  ...newLesson,
                  content: url,
                  duration: duration?.toString() || newLesson.duration,
                })}
                onError={(err) => setError(err)}
              />
              <p className="text-xs text-secondary-500">
                Unterstützte Formate: MP3, OGG, WAV (max. 100MB)
              </p>
            </div>
          )}
          {newLesson.type === 'INTERACTIVE' && (
            <div className="space-y-4">
              <Textarea
                label="Anweisungen / Einleitung"
                value={newLesson.content}
                onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
                rows={3}
                placeholder="Beschreiben Sie die interaktive Aufgabe..."
              />
              <div className="p-4 bg-accent-50 rounded-lg border border-accent-200">
                <h4 className="font-medium text-accent-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Interaktive Lektion
                </h4>
                <p className="text-sm text-accent-700 mb-3">
                  Interaktive Lektionen enthalten eine praktische Aufgabe, die der Lernende
                  selbstständig bearbeiten muss. Nach Abschluss bestätigt der Lernende,
                  dass die Aufgabe erledigt wurde.
                </p>
                <ul className="text-xs text-accent-600 space-y-1">
                  <li>• Beschreiben Sie die Aufgabe klar und verständlich</li>
                  <li>• Geben Sie konkrete Schritte oder Ziele an</li>
                  <li>• Der Lernende markiert die Lektion als abgeschlossen</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal
        isOpen={showEditLessonModal}
        onClose={() => {
          setShowEditLessonModal(false)
          setEditingLesson(null)
        }}
        title="Lektion bearbeiten"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditLessonModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleUpdateLesson} isLoading={saving}>
              Speichern
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Titel"
            value={editLessonForm.title}
            onChange={(e) => setEditLessonForm({ ...editLessonForm, title: e.target.value })}
            placeholder="z.B. Was ist die DSGVO?"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Typ"
              options={lessonTypes.map((t) => ({ value: t.value, label: `${t.icon} ${t.label}` }))}
              value={editLessonForm.type}
              onChange={(e) => setEditLessonForm({ ...editLessonForm, type: e.target.value })}
            />
            <Input
              label="Dauer (Minuten)"
              type="number"
              value={editLessonForm.duration}
              onChange={(e) => setEditLessonForm({ ...editLessonForm, duration: e.target.value })}
              placeholder="10"
            />
          </div>
          {editLessonForm.type === 'TEXT' && (
            <Textarea
              label="Inhalt"
              value={editLessonForm.content}
              onChange={(e) => setEditLessonForm({ ...editLessonForm, content: e.target.value })}
              rows={6}
              placeholder="Lektionsinhalt eingeben..."
            />
          )}
          {editLessonForm.type === 'VIDEO' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary-700">
                Video hochladen oder URL eingeben
              </label>
              <FileUpload
                type="video"
                value={editLessonForm.videoUrl}
                onChange={(url, duration) => setEditLessonForm({
                  ...editLessonForm,
                  videoUrl: url,
                  duration: duration?.toString() || editLessonForm.duration,
                })}
                onError={(err) => setError(err)}
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-secondary-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-secondary-500">oder</span>
                </div>
              </div>
              <Input
                label="Video-URL (YouTube, Vimeo, etc.)"
                value={editLessonForm.videoUrl?.startsWith('/uploads') ? '' : editLessonForm.videoUrl}
                onChange={(e) => setEditLessonForm({ ...editLessonForm, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-secondary-500">
                Unterstützte Formate: MP4, WebM, OGG (max. 500MB) oder externe URLs
              </p>
            </div>
          )}
          {editLessonForm.type === 'PDF' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">
                PDF-Dokument
              </label>
              <FileUpload
                type="pdf"
                value={editLessonForm.content}
                onChange={(url) => setEditLessonForm({ ...editLessonForm, content: url })}
                onError={(err) => setError(err)}
              />
              <p className="text-xs text-secondary-500">
                Unterstützte Formate: PDF (max. 50MB)
              </p>
            </div>
          )}
          {editLessonForm.type === 'POWERPOINT' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">
                PowerPoint-Präsentation
              </label>
              <FileUpload
                type="powerpoint"
                value={editLessonForm.content}
                onChange={(url) => setEditLessonForm({ ...editLessonForm, content: url })}
                onError={(err) => setError(err)}
              />
              <p className="text-xs text-secondary-500">
                Unterstützte Formate: PPT, PPTX (max. 100MB)
                <br />
                Animationen und Übergänge bleiben erhalten.
              </p>
            </div>
          )}
          {editLessonForm.type === 'AUDIO' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">
                Audio-Datei
              </label>
              <FileUpload
                type="audio"
                value={editLessonForm.content}
                onChange={(url, duration) => setEditLessonForm({
                  ...editLessonForm,
                  content: url,
                  duration: duration?.toString() || editLessonForm.duration,
                })}
                onError={(err) => setError(err)}
              />
              <p className="text-xs text-secondary-500">
                Unterstützte Formate: MP3, OGG, WAV (max. 100MB)
              </p>
            </div>
          )}
          {editLessonForm.type === 'INTERACTIVE' && (
            <div className="space-y-4">
              <Textarea
                label="Anweisungen / Einleitung"
                value={editLessonForm.content}
                onChange={(e) => setEditLessonForm({ ...editLessonForm, content: e.target.value })}
                rows={3}
                placeholder="Beschreiben Sie die interaktive Aufgabe..."
              />
              <div className="p-4 bg-accent-50 rounded-lg border border-accent-200">
                <h4 className="font-medium text-accent-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Interaktive Lektion
                </h4>
                <p className="text-sm text-accent-700 mb-3">
                  Interaktive Lektionen enthalten eine praktische Aufgabe, die der Lernende
                  selbstständig bearbeiten muss. Nach Abschluss bestätigt der Lernende,
                  dass die Aufgabe erledigt wurde.
                </p>
                <ul className="text-xs text-accent-600 space-y-1">
                  <li>• Beschreiben Sie die Aufgabe klar und verständlich</li>
                  <li>• Geben Sie konkrete Schritte oder Ziele an</li>
                  <li>• Der Lernende markiert die Lektion als abgeschlossen</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeletingLessonId(null)
        }}
        title="Lektion löschen"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Abbrechen
            </Button>
            <Button variant="danger" onClick={handleDeleteLesson} isLoading={saving}>
              Löschen
            </Button>
          </>
        }
      >
        <p className="text-secondary-600">
          Sind Sie sicher, dass Sie diese Lektion löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
      </Modal>

      {/* Quiz Editor */}
      {showQuizEditor && quizModuleId && (
        <QuizEditor
          moduleId={quizModuleId}
          moduleName={quizModuleName}
          onClose={() => {
            setShowQuizEditor(false)
            setQuizModuleId(null)
            setQuizModuleName('')
            fetchCourse()
          }}
          onSave={() => {
            setShowQuizEditor(false)
            setQuizModuleId(null)
            setQuizModuleName('')
            fetchCourse()
          }}
        />
      )}
    </div>
  )
}
