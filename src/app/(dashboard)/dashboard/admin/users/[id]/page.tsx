'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  Spinner,
  Avatar,
  Modal,
} from '@/components/ui'

interface User {
  id: string
  name: string | null
  email: string
  company: string | null
  customerNumber: string | null
  credits: number
  role: string
  isActive: boolean
  createdAt: string
}

interface CreditHistoryEntry {
  id: string
  amount: number
  balance: number
  type: string
  description: string | null
  courseTitle: string | null
  createdAt: string
}

interface UserCourse {
  id: string
  courseId: string
  courseTitle: string
  courseStatus: string
  enrolledAt: string
  completedAt: string | null
  lastAccessAt: string | null
  progress: number
  totalLessons: number
  completedLessons: number
  isCompleted: boolean
}

interface UserCertificate {
  id: string
  number: string
  courseTitle: string
  courseId: string | null
  courseStatus: string | null
  instructorName: string
  issuedAt: string
  completedAt: string
  expiresAt: string | null
  isExpired: boolean
  isExpiringSoon: boolean
  hasPdf: boolean
}

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
)

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const CertificateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const CreditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params.id as string
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<UserCourse[]>([])
  const [certificates, setCertificates] = useState<UserCertificate[]>([])
  const [creditHistory, setCreditHistory] = useState<CreditHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates' | 'credits'>('courses')

  // Credit adjustment modal
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditAdjustment, setCreditAdjustment] = useState({ amount: 0, description: '' })
  const [adjustingCredits, setAdjustingCredits] = useState(false)

  const [confirmReset, setConfirmReset] = useState<UserCourse | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserCertificate | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [userId])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError('')

      const [userRes, coursesRes, certsRes, creditsRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/users/${userId}/courses`),
        fetch(`/api/users/${userId}/certificates`),
        fetch(`/api/users/${userId}/credits`),
      ])

      if (!userRes.ok) {
        throw new Error('Benutzer nicht gefunden')
      }

      const userData = await userRes.json()
      setUser(userData)

      if (coursesRes.ok) {
        setCourses(await coursesRes.json())
      }

      if (certsRes.ok) {
        setCertificates(await certsRes.json())
      }

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        setCreditHistory(creditsData.history || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  const handleAdjustCredits = async () => {
    if (creditAdjustment.amount === 0) {
      setError('Bitte geben Sie einen Betrag ein')
      return
    }

    try {
      setAdjustingCredits(true)
      const res = await fetch(`/api/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: creditAdjustment.amount,
          type: 'ADMIN_ADJUST',
          description: creditAdjustment.description || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setUser((prev) => prev ? { ...prev, credits: data.currentBalance } : null)
        setCreditHistory((prev) => [data.transaction, ...prev])
        setShowCreditModal(false)
        setCreditAdjustment({ amount: 0, description: '' })
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Anpassen der Kredits')
      }
    } catch (err) {
      setError('Fehler beim Anpassen der Kredits')
    } finally {
      setAdjustingCredits(false)
    }
  }

  const getCreditTypeBadge = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <Badge variant="success">Kauf</Badge>
      case 'ENROLLMENT':
        return <Badge variant="primary">Buchung</Badge>
      case 'REFUND':
        return <Badge variant="warning">Rückerstattung</Badge>
      case 'ADMIN_ADJUST':
        return <Badge variant="accent">Admin</Badge>
      case 'BONUS':
        return <Badge variant="success">Bonus</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const handleResetProgress = async () => {
    if (!confirmReset) return

    try {
      setProcessing(true)
      const res = await fetch(
        `/api/users/${userId}/courses?courseId=${confirmReset.courseId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        // Refresh courses
        const coursesRes = await fetch(`/api/users/${userId}/courses`)
        if (coursesRes.ok) {
          setCourses(await coursesRes.json())
        }
        setConfirmReset(null)
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Zurücksetzen')
      }
    } catch (err) {
      setError('Fehler beim Zurücksetzen des Fortschritts')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteCertificate = async () => {
    if (!confirmDelete) return

    try {
      setProcessing(true)
      const res = await fetch(
        `/api/users/${userId}/certificates?certificateId=${confirmDelete.id}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        setCertificates(certificates.filter((c) => c.id !== confirmDelete.id))
        setConfirmDelete(null)
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Löschen')
      }
    } catch (err) {
      setError('Fehler beim Löschen des Zertifikats')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="danger">Administrator</Badge>
      case 'INSTRUCTOR':
        return <Badge variant="primary">Kursersteller</Badge>
      case 'REVIEWER':
        return <Badge variant="warning">Prüfer</Badge>
      default:
        return <Badge variant="secondary">Lernender</Badge>
    }
  }

  const getCourseStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">Freigegeben</Badge>
      case 'DRAFT':
        return <Badge variant="secondary">Entwurf</Badge>
      case 'SUBMITTED':
        return <Badge variant="warning">Eingereicht</Badge>
      case 'IN_REVIEW':
        return <Badge variant="primary">In Prüfung</Badge>
      case 'REJECTED':
        return <Badge variant="danger">Abgelehnt</Badge>
      case 'ARCHIVED':
        return <Badge variant="secondary">Archiviert</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Alert variant="danger">Benutzer nicht gefunden</Alert>
        <Button variant="secondary" onClick={() => router.push('/dashboard/users')}>
          <BackIcon />
          <span className="ml-2">Zurück zur Übersicht</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/dashboard/users')}
        >
          <BackIcon />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Benutzerdetails</h1>
          <p className="text-secondary-600">Kurse und Zertifikate verwalten</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* User Info Card */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-6">
            <Avatar name={user.name || user.email} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-primary-900">
                  {user.name || 'Ohne Namen'}
                </h2>
                {getRoleBadge(user.role)}
                {!user.isActive && <Badge variant="danger">Deaktiviert</Badge>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-secondary-600">
                <div>
                  <span className="font-medium">E-Mail:</span> {user.email}
                </div>
                {user.customerNumber && (
                  <div>
                    <span className="font-medium">Kundennummer:</span>{' '}
                    <span className="font-mono">{user.customerNumber}</span>
                  </div>
                )}
                {user.company && (
                  <div>
                    <span className="font-medium">Unternehmen:</span> {user.company}
                  </div>
                )}
                <div>
                  <span className="font-medium">Registriert:</span>{' '}
                  {formatDate(user.createdAt)}
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div>
                <div className="text-2xl font-bold text-success-600">
                  {user.credits}
                </div>
                <div className="text-sm text-secondary-500">Kredits</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xl font-bold text-primary-900">
                    {courses.length}
                  </div>
                  <div className="text-xs text-secondary-500">
                    {courses.length === 1 ? 'Kurs' : 'Kurse'}
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-primary-900">
                    {certificates.length}
                  </div>
                  <div className="text-xs text-secondary-500">
                    {certificates.length === 1 ? 'Zertifikat' : 'Zertifikate'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'courses'
                ? 'border-primary-500 text-primary-700'
                : 'border-transparent text-secondary-500 hover:text-secondary-700'
            }`}
          >
            <BookIcon />
            <span>Kurse ({courses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'certificates'
                ? 'border-primary-500 text-primary-700'
                : 'border-transparent text-secondary-500 hover:text-secondary-700'
            }`}
          >
            <CertificateIcon />
            <span>Zertifikate ({certificates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'credits'
                ? 'border-primary-500 text-primary-700'
                : 'border-transparent text-secondary-500 hover:text-secondary-700'
            }`}
          >
            <CreditIcon />
            <span>Kredit-Verlauf ({creditHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <Card>
          <CardHeader>
            <CardTitle>Gebuchte Kurse</CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-secondary-500 py-4 text-center">
                Keine Kursbuchungen vorhanden
              </p>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/dashboard/courses/${course.courseId}`}
                          className="font-medium text-primary-900 hover:text-primary-700"
                        >
                          {course.courseTitle}
                        </Link>
                        {getCourseStatusBadge(course.courseStatus)}
                        {course.isCompleted && (
                          <Badge variant="success">Abgeschlossen</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-secondary-500">
                        <span>
                          Gebucht: {formatDate(course.enrolledAt)}
                        </span>
                        {course.completedAt && (
                          <span>
                            Abgeschlossen: {formatDate(course.completedAt)}
                          </span>
                        )}
                        <span>
                          {course.completedLessons}/{course.totalLessons} Lektionen
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-2 bg-secondary-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            course.isCompleted
                              ? 'bg-success-500'
                              : 'bg-primary-500'
                          }`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4">
                      {!course.isCompleted && course.progress > 0 && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmReset(course)}
                        >
                          <RefreshIcon />
                          <span className="ml-1">Zurücksetzen</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certificates Tab */}
      {activeTab === 'certificates' && (
        <Card>
          <CardHeader>
            <CardTitle>Ausgestellte Zertifikate</CardTitle>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <p className="text-secondary-500 py-4 text-center">
                Keine Zertifikate vorhanden
              </p>
            ) : (
              <div className="space-y-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-primary-900">
                          {cert.courseTitle}
                        </span>
                        {cert.isExpired && (
                          <Badge variant="danger">Abgelaufen</Badge>
                        )}
                        {cert.isExpiringSoon && !cert.isExpired && (
                          <Badge variant="warning">Läuft bald ab</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-secondary-500">
                        <span>Nr.: {cert.number}</span>
                        <span>Ausgestellt: {formatDate(cert.issuedAt)}</span>
                        {cert.expiresAt && (
                          <span>
                            Gültig bis: {formatDate(cert.expiresAt)}
                          </span>
                        )}
                        <span>Kursleiter: {cert.instructorName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {cert.hasPdf && (
                        <Link
                          href={`/api/certificates/${cert.id}/download`}
                          target="_blank"
                        >
                          <Button variant="secondary" size="sm">
                            <DownloadIcon />
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmDelete(cert)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reset Progress Confirmation Modal */}
      <Modal
        isOpen={!!confirmReset}
        onClose={() => setConfirmReset(null)}
        title="Fortschritt zurücksetzen"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmReset(null)}
              disabled={processing}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={handleResetProgress}
              isLoading={processing}
            >
              Zurücksetzen
            </Button>
          </>
        }
      >
        <p>
          Möchten Sie den Fortschritt für den Kurs{' '}
          <strong>{confirmReset?.courseTitle}</strong> wirklich zurücksetzen?
        </p>
        <p className="text-sm text-secondary-500 mt-2">
          Alle Lektions- und Quiz-Fortschritte werden gelöscht. Der Benutzer
          muss den Kurs von Anfang an wiederholen.
        </p>
      </Modal>

      {/* Credits Tab */}
      {activeTab === 'credits' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kredit-Verlauf</CardTitle>
            <Button variant="primary" size="sm" onClick={() => setShowCreditModal(true)}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Kredits anpassen
            </Button>
          </CardHeader>
          <CardContent>
            {creditHistory.length === 0 ? (
              <p className="text-secondary-500 py-4 text-center">
                Noch keine Kredit-Transaktionen vorhanden
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50 border-b border-secondary-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">
                        Datum
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">
                        Typ
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">
                        Beschreibung
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase">
                        Betrag
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {creditHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-secondary-50">
                        <td className="px-4 py-3 text-sm text-secondary-600">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {getCreditTypeBadge(entry.type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-600">
                          {entry.description || entry.courseTitle || '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium text-right ${
                          entry.amount > 0 ? 'text-success-600' : 'text-danger-600'
                        }`}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-right text-secondary-900">
                          {entry.balance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Credit Adjustment Modal */}
      <Modal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        title="Kredits anpassen"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreditModal(false)
                setCreditAdjustment({ amount: 0, description: '' })
              }}
              disabled={adjustingCredits}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleAdjustCredits}
              isLoading={adjustingCredits}
              disabled={creditAdjustment.amount === 0}
            >
              {creditAdjustment.amount > 0 ? 'Gutschreiben' : 'Abbuchen'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-secondary-600 mb-2">
              Aktueller Kontostand: <span className="font-bold text-primary-900">{user?.credits || 0} Kredits</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Betrag (positiv = Gutschrift, negativ = Abbuchung) <span className="text-danger-500">*</span>
            </label>
            <input
              type="number"
              value={creditAdjustment.amount || ''}
              onChange={(e) =>
                setCreditAdjustment({
                  ...creditAdjustment,
                  amount: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="z.B. 10 oder -5"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Beschreibung (optional)
            </label>
            <input
              type="text"
              value={creditAdjustment.description}
              onChange={(e) =>
                setCreditAdjustment({
                  ...creditAdjustment,
                  description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="z.B. Bonus für Schulungsteilnahme"
            />
          </div>
          {creditAdjustment.amount !== 0 && (
            <p className="text-sm text-secondary-600">
              Neuer Kontostand:{' '}
              <span className="font-bold text-primary-900">
                {(user?.credits || 0) + creditAdjustment.amount} Kredits
              </span>
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Certificate Confirmation Modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Zertifikat löschen"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(null)}
              disabled={processing}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteCertificate}
              isLoading={processing}
            >
              Löschen
            </Button>
          </>
        }
      >
        <p>
          Möchten Sie das Zertifikat{' '}
          <strong>{confirmDelete?.number}</strong> für den Kurs{' '}
          <strong>{confirmDelete?.courseTitle}</strong> wirklich löschen?
        </p>
        <p className="text-sm text-danger-600 mt-2">
          Diese Aktion kann nicht rückgängig gemacht werden. Das Zertifikat
          wird dauerhaft gelöscht.
        </p>
      </Modal>
    </div>
  )
}
