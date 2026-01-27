'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Spinner } from '@/components/ui'

interface CreditHistoryEntry {
  id: string
  amount: number
  balance: number
  type: string
  description: string | null
  createdAt: string
}

interface DashboardData {
  user: {
    name: string | null
    role: string
    credits: number
  }
  creditHistory: CreditHistoryEntry[]
  stats: {
    activeCourses: number
    completedCourses: number
    totalCertificates: number
    expiringCertificates: number
    totalLearningTimeMinutes: number
    completionRate: number
  }
  courses: Array<{
    id: string
    title: string
    progress: number
    isCompleted: boolean
    endDate: string | null
    isExpired: boolean
  }>
  completedCourses: Array<{
    id: string
    title: string
    completedAt: string
  }>
  recentActivity: Array<{
    type: string
    courseTitle: string
    completedAt: string
  }>
  certificates: Array<{
    id: string
    courseTitle: string
    issuedAt: string
    expiresAt: string | null
    isExpiringSoon: boolean
  }>
  certificationLevels: Array<{
    id: string
    levelId: string
    levelName: string
    levelDescription: string | null
    logoUrl: string | null
    achievedAt: string
    expiresAt: string | null
    isValid: boolean
    certificateNumber: string | null
  }>
  adminStats: {
    totalUsers: number
    totalCourses: number
    pendingReviews: number
    totalEnrollments: number
  } | null
}

// Statistik-Karte
function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variantClasses = {
    default: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-secondary-500">{title}</p>
            <p className="text-3xl font-bold text-primary-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-secondary-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${variantClasses[variant]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Kurs-Karte
function CourseCard({
  id,
  title,
  progress,
  isExpired,
}: {
  id: string
  title: string
  progress: number
  isExpired: boolean
}) {
  return (
    <Link href={`/dashboard/courses/${id}`}>
      <Card hover className={`cursor-pointer h-full ${isExpired ? 'opacity-60' : ''}`}>
        <CardContent>
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-medium text-secondary-900 line-clamp-2">{title}</h3>
            {isExpired ? (
              <Badge variant="danger" size="sm">Abgelaufen</Badge>
            ) : progress === 100 ? (
              <Badge variant="success" size="sm">Fertig</Badge>
            ) : progress > 0 ? (
              <Badge variant="primary" size="sm">In Bearbeitung</Badge>
            ) : (
              <Badge variant="secondary" size="sm">Neu</Badge>
            )}
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-secondary-500 mb-1">
              <span>Fortschritt</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isExpired ? 'bg-secondary-400' : 'bg-primary-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function formatLearningTime(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) return `Vor ${diffMins} Minuten`
  if (diffHours < 24) return `Vor ${diffHours} Stunden`
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return `Vor ${diffDays} Tagen`
  if (diffDays < 30) return `Vor ${Math.floor(diffDays / 7)} Wochen`
  return date.toLocaleDateString('de-DE')
}

function getCreditTypeLabel(type: string): string {
  switch (type) {
    case 'PURCHASE':
      return 'Kauf'
    case 'REFUND':
      return 'Erstattung'
    case 'ADMIN_ADJUST':
      return 'Admin-Anpassung'
    case 'BONUS':
      return 'Bonus'
    case 'ENROLLMENT':
      return 'Kurs-Buchung'
    default:
      return type
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">Fehler beim Laden der Dashboard-Daten.</p>
      </div>
    )
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Dashboard</h1>
          <p className="text-secondary-600">
            Willkommen zurück, {data.user.name || 'Benutzer'}! Hier ist Ihre Übersicht.
          </p>
        </div>
        <Link href="/dashboard/courses">
          <Button variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Kurse entdecken
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Aktive Kurse"
          value={data.stats.activeCourses}
          subtitle={data.stats.activeCourses === 1 ? '1 Kurs in Bearbeitung' : `${data.stats.activeCourses} Kurse in Bearbeitung`}
          variant="default"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <StatCard
          title="Abgeschlossen"
          value={data.stats.completedCourses}
          subtitle={`${data.stats.completionRate}% Abschlussrate`}
          variant="success"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatCard
          title="Zertifikate"
          value={data.stats.totalCertificates}
          subtitle={data.stats.expiringCertificates > 0 ? `${data.stats.expiringCertificates} laufen bald ab` : 'Alle gültig'}
          variant={data.stats.expiringCertificates > 0 ? 'warning' : 'success'}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />
        <StatCard
          title="Lernzeit"
          value={formatLearningTime(data.stats.totalLearningTimeMinutes)}
          subtitle="Gesamte Lernzeit"
          variant="default"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Kredits"
          value={data.user.credits}
          subtitle="Verfügbares Guthaben"
          variant="default"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Admin Stats */}
      {isAdmin && data.adminStats && (
        <Card className="bg-primary-50 border-primary-200">
          <CardHeader>
            <CardTitle className="text-primary-900">Administrator-Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-900">{data.adminStats.totalUsers}</p>
                <p className="text-sm text-primary-700">Benutzer</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-900">{data.adminStats.totalCourses}</p>
                <p className="text-sm text-primary-700">Kurse</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-900">{data.adminStats.totalEnrollments}</p>
                <p className="text-sm text-primary-700">Buchungen</p>
              </div>
              <div className="text-center">
                {data.adminStats.pendingReviews > 0 ? (
                  <Link href="/dashboard/review" className="block hover:opacity-80">
                    <p className="text-3xl font-bold text-warning-600">{data.adminStats.pendingReviews}</p>
                    <p className="text-sm text-warning-700">Ausstehende Prüfungen</p>
                  </Link>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-success-600">0</p>
                    <p className="text-sm text-success-700">Ausstehende Prüfungen</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Courses */}
      {data.courses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Aktuelle Kurse</CardTitle>
              <Link href="/dashboard/courses?filter=enrolled">
                <Button variant="ghost" size="sm">
                  Alle anzeigen
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.courses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  progress={course.progress}
                  isExpired={course.isExpired}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for new users */}
      {data.courses.length === 0 && data.completedCourses.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-secondary-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-secondary-900 mb-2">Noch keine Kurse</h3>
            <p className="text-secondary-500 mb-4">
              Entdecken Sie unsere Kurse und starten Sie Ihre Weiterbildung.
            </p>
            <Link href="/dashboard/courses">
              <Button variant="primary">Kurse entdecken</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Certification Levels */}
      {data.certificationLevels.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Erreichte Zertifizierungsstufen</CardTitle>
              <Link href="/dashboard/certification-levels">
                <Button variant="ghost" size="sm">
                  Alle anzeigen
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.certificationLevels.map((level) => (
                <Card key={level.id} className="border-success-200 bg-success-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-secondary-900 mb-1">{level.levelName}</h4>
                        {level.levelDescription && (
                          <p className="text-sm text-secondary-600 line-clamp-2">{level.levelDescription}</p>
                        )}
                      </div>
                      <Badge variant="success" size="sm">
                        Erreicht
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {level.certificateNumber && (
                        <div className="flex justify-between">
                          <span className="text-secondary-600">Zertifikat-Nr.:</span>
                          <span className="font-medium text-secondary-900">{level.certificateNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Erreicht am:</span>
                        <span className="font-medium text-secondary-900">
                          {new Date(level.achievedAt).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      {level.expiresAt && (
                        <div className="flex justify-between">
                          <span className="text-secondary-600">Gültig bis:</span>
                          <span className="font-medium text-secondary-900">
                            {new Date(level.expiresAt).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      )}
                      {!level.isValid && (
                        <div className="mt-2 pt-2 border-t border-warning-200">
                          <Badge variant="warning" size="sm">Nicht mehr gültig</Badge>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <Link href={`/dashboard/certification-levels`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Details anzeigen
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity, Certificates & Credit History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-secondary-500 text-center py-4">
                Keine Aktivitäten vorhanden
              </p>
            ) : (
              <div className="space-y-4">
                {data.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 pb-3 border-b border-secondary-100 last:border-0 last:pb-0"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'certificate_earned' ? 'bg-success-500' : 'bg-primary-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-secondary-900">
                        {activity.type === 'certificate_earned'
                          ? `Zertifikat für "${activity.courseTitle}" erhalten`
                          : `Lektion in "${activity.courseTitle}" abgeschlossen`}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {formatRelativeTime(activity.completedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Zertifikate</CardTitle>
              <Link href="/dashboard/certificates">
                <Button variant="ghost" size="sm">
                  Alle anzeigen
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.certificates.length === 0 ? (
              <p className="text-sm text-secondary-500 text-center py-4">
                Noch keine Zertifikate erhalten
              </p>
            ) : (
              <div className="space-y-4">
                {data.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between pb-3 border-b border-secondary-100 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm text-secondary-900">{cert.courseTitle}</p>
                      <p className="text-xs text-secondary-500">
                        Ausgestellt: {new Date(cert.issuedAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    {cert.isExpiringSoon && (
                      <Badge variant="warning" size="sm">
                        Läuft bald ab
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit History */}
        <Card>
          <CardHeader>
            <CardTitle>Kredit-Verlauf</CardTitle>
          </CardHeader>
          <CardContent>
            {data.creditHistory.length === 0 ? (
              <p className="text-sm text-secondary-500 text-center py-4">
                Keine Kredit-Transaktionen vorhanden
              </p>
            ) : (
              <div className="space-y-4">
                {data.creditHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between pb-3 border-b border-secondary-100 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm text-secondary-900">
                        {entry.description || getCreditTypeLabel(entry.type)}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {new Date(entry.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${entry.amount >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {entry.amount >= 0 ? '+' : ''}{entry.amount}
                      </p>
                      <p className="text-xs text-secondary-500">
                        Saldo: {entry.balance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
