'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Badge, Button, Spinner, Alert, CardHeader, CardTitle } from '@/components/ui'

interface Certificate {
  id: string
  number: string
  issuedAt: string
  expiresAt: string | null
  courseTitle: string
  courseDescription: string | null
  instructorName: string
  completedAt: string
  courseId: string | null
}

interface CertificationLevel {
  id: string
  name: string
  description: string | null
  order: number
  baseLogoUrl: string | null
  logoType: string
  courses: Array<{
    id: string
    title: string
    completed: boolean
  }>
  totalCourses: number
  completedCourses: number
  allCoursesCompleted: boolean
  calculatedExpiresAt: Date | null
  userLevel: {
    id: string
    achievedAt: Date
    expiresAt: Date | null
    isValid: boolean
    certificateNumber: string | null
    customText: string | null
  } | null
}

function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isExpired(date: string | Date | null): boolean {
  if (!date) return false
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj < new Date()
}

function isExpiringSoon(date: string | Date | null): boolean {
  if (!date) return false
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const expiryDate = new Date(dateObj)
  const warningDate = new Date()
  warningDate.setDate(warningDate.getDate() + 30)
  return expiryDate <= warningDate && expiryDate > new Date()
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [certificationLevels, setCertificationLevels] = useState<CertificationLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchCertificates(), fetchCertificationLevels()]).finally(() =>
      setLoading(false)
    )
  }, [])

  const downloadCertificate = async (certId: string, certNumber: string) => {
    setDownloading(certId)
    try {
      const res = await fetch(`/api/certificates/${certId}/download`)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Zertifikat-${certNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Fehler beim Herunterladen des Zertifikats')
    } finally {
      setDownloading(null)
    }
  }

  const downloadLevelCertificate = async (levelId: string, levelName: string) => {
    setDownloading(`level-cert-${levelId}`)
    try {
      const res = await fetch(`/api/user/certification-levels/${levelId}/certificate`)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Zertifikat-${levelName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Fehler beim Herunterladen des Zertifikats')
    } finally {
      setDownloading(null)
    }
  }

  const downloadLevelLogo = async (levelId: string, levelName: string) => {
    setDownloading(`level-logo-${levelId}`)
    try {
      const res = await fetch(`/api/user/certification-levels/${levelId}/logo`)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${levelName.replace(/[^a-zA-Z0-9]/g, '_')}_Logo.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Fehler beim Herunterladen des Logos')
    } finally {
      setDownloading(null)
    }
  }

  const fetchCertificates = async () => {
    try {
      const res = await fetch('/api/certificates')
      if (res.ok) {
        const data = await res.json()
        setCertificates(data)
      }
    } catch (error) {
      console.error('Error fetching certificates:', error)
    }
  }

  const fetchCertificationLevels = async () => {
    try {
      const res = await fetch('/api/user/certification-levels')
      if (res.ok) {
        const data = await res.json()
        setCertificationLevels(data)
      }
    } catch (error) {
      console.error('Error fetching certification levels:', error)
    }
  }

  const achievedLevels = certificationLevels.filter((level) => level.userLevel !== null)
  const validCertificates = certificates.filter((c) => !isExpired(c.expiresAt))
  const expiredCertificates = certificates.filter((c) => isExpired(c.expiresAt))
  const expiringSoonCount =
    certificates.filter((c) => isExpiringSoon(c.expiresAt)).length +
    achievedLevels.filter((l) => isExpiringSoon(l.userLevel?.expiresAt || null)).length

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
        <h1 className="text-2xl font-bold text-primary-900">Meine Zertifikate</h1>
        <p className="text-secondary-600">
          Übersicht Ihrer erworbenen Zertifikate, Nachweise und Zertifizierungsstufen.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success-500"></span>
          <span className="text-secondary-600">Kurszertifikate:</span>
          <span className="font-semibold text-primary-900">{validCertificates.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-500"></span>
          <span className="text-secondary-600">Zertifizierungsstufen:</span>
          <span className="font-semibold text-primary-900">{achievedLevels.length}</span>
        </div>
        {expiringSoonCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning-500"></span>
            <span className="text-secondary-600">Bald ablaufend:</span>
            <span className="font-semibold text-warning-600">{expiringSoonCount}</span>
          </div>
        )}
      </div>

      {/* Expiring Soon Warning */}
      {expiringSoonCount > 0 && (
        <Alert variant="warning" title="Zertifikate laufen bald ab">
          {expiringSoonCount} Zertifikat(e) laufen in den nächsten 30 Tagen ab. Bitte erneuern Sie
          diese rechtzeitig.
        </Alert>
      )}

      {/* Certification Levels */}
      {achievedLevels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zertifizierungsstufen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {achievedLevels.map((level) => {
                const expired = isExpired(level.userLevel?.expiresAt || null)
                const expiringSoon = isExpiringSoon(level.userLevel?.expiresAt || null)

                return (
                  <div
                    key={level.id}
                    className={`p-4 border rounded-lg ${
                      expired
                        ? 'border-danger-200 bg-danger-50'
                        : 'border-accent-200 bg-accent-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-secondary-900">{level.name}</h3>
                          {expired ? (
                            <Badge variant="danger" size="sm">
                              Abgelaufen
                            </Badge>
                          ) : expiringSoon ? (
                            <Badge variant="warning" size="sm">
                              Bald ablaufend
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              Gültig
                            </Badge>
                          )}
                        </div>
                        {level.description && (
                          <p className="text-sm text-secondary-600 mb-3">{level.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-secondary-500">
                          <span className="font-mono">{level.userLevel?.certificateNumber}</span>
                          <span>·</span>
                          <span>
                            Erreicht:{' '}
                            {level.userLevel?.achievedAt &&
                              formatDate(level.userLevel.achievedAt)}
                          </span>
                          {level.userLevel?.expiresAt && (
                            <>
                              <span>·</span>
                              <span
                                className={
                                  expired
                                    ? 'text-danger-600'
                                    : expiringSoon
                                    ? 'text-warning-600'
                                    : ''
                                }
                              >
                                Gültig bis: {formatDate(level.userLevel.expiresAt)}
                              </span>
                            </>
                          )}
                        </div>
                        {level.userLevel?.customText && (
                          <div className="mt-2 text-sm text-accent-700 font-medium italic">
                            {level.userLevel.customText}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadLevelCertificate(level.id, level.name)}
                          disabled={downloading === `level-cert-${level.id}`}
                        >
                          {downloading === `level-cert-${level.id}` ? (
                            <Spinner size="sm" />
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
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              PDF
                            </>
                          )}
                        </Button>
                        {level.baseLogoUrl && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => downloadLevelLogo(level.id, level.name)}
                            disabled={downloading === `level-logo-${level.id}`}
                          >
                            {downloading === `level-logo-${level.id}` ? (
                              <Spinner size="sm" />
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
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                Logo
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Certificates */}
      <Card>
        <CardHeader>
          <CardTitle>Kurszertifikate</CardTitle>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-secondary-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <h3 className="font-medium text-secondary-900 mb-1">Noch keine Zertifikate</h3>
              <p className="text-sm text-secondary-500 mb-3">
                Schließen Sie Kurse ab, um Zertifikate zu erhalten.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => (window.location.href = '/dashboard/courses')}
              >
                Kurse entdecken
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {certificates.map((cert) => {
                const expired = isExpired(cert.expiresAt)
                const expiringSoon = isExpiringSoon(cert.expiresAt)

                return (
                  <div
                    key={cert.id}
                    className={`flex items-center gap-4 p-3 bg-white rounded-lg border border-secondary-200 hover:border-secondary-300 transition-colors ${
                      expired ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
                        expired ? 'bg-secondary-100' : 'bg-accent-100'
                      }`}
                    >
                      <svg
                        className={`w-5 h-5 ${expired ? 'text-secondary-400' : 'text-accent-600'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-primary-900 truncate">{cert.courseTitle}</h3>
                        {expired ? (
                          <Badge variant="danger" size="sm">
                            Abgelaufen
                          </Badge>
                        ) : expiringSoon ? (
                          <Badge variant="warning" size="sm">
                            Bald ablaufend
                          </Badge>
                        ) : cert.expiresAt ? (
                          <Badge variant="success" size="sm">
                            Gültig
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            Unbegrenzt
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-secondary-500 mt-0.5">
                        <span className="font-mono">{cert.number}</span>
                        <span>·</span>
                        <span>Ausgestellt: {formatDate(cert.issuedAt)}</span>
                        {cert.expiresAt && (
                          <>
                            <span>·</span>
                            <span
                              className={
                                expired
                                  ? 'text-danger-600'
                                  : expiringSoon
                                  ? 'text-warning-600'
                                  : ''
                              }
                            >
                              Gültig bis: {formatDate(cert.expiresAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadCertificate(cert.id, cert.number)}
                      disabled={downloading === cert.id}
                      className="flex-shrink-0"
                    >
                      {downloading === cert.id ? (
                        <Spinner size="sm" />
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
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          PDF
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
