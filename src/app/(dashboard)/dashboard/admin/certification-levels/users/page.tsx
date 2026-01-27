'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Input } from '@/components/ui'
import Link from 'next/link'

interface UserCertificationLevel {
  id: string
  achievedAt: string
  expiresAt: string | null
  isValid: boolean
  certificateNumber: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
  level: {
    id: string
    name: string
    description: string | null
  }
}

export default function CertificationLevelsUsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [userLevels, setUserLevels] = useState<UserCertificationLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [validityFilter, setValidityFilter] = useState<string>('all')

  // Get unique levels for filter
  const uniqueLevels = Array.from(
    new Set(userLevels.map((ul) => ul.level.name))
  ).sort()

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    fetchUserLevels()
  }, [session, router])

  const fetchUserLevels = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/certification-levels/users')
      if (res.ok) {
        const data = await res.json()
        setUserLevels(data)
      } else {
        setError('Fehler beim Laden der Daten')
      }
    } catch (error) {
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  // Filter logic
  const filteredUserLevels = userLevels.filter((ul) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === '' ||
      ul.user.name?.toLowerCase().includes(searchLower) ||
      ul.user.email.toLowerCase().includes(searchLower) ||
      ul.level.name.toLowerCase().includes(searchLower) ||
      ul.certificateNumber?.toLowerCase().includes(searchLower)

    // Level filter
    const matchesLevel = levelFilter === 'all' || ul.level.name === levelFilter

    // Validity filter
    const matchesValidity =
      validityFilter === 'all' ||
      (validityFilter === 'valid' && ul.isValid) ||
      (validityFilter === 'invalid' && !ul.isValid)

    return matchesSearch && matchesLevel && matchesValidity
  })

  // Group by level
  const groupedByLevel = filteredUserLevels.reduce((acc, ul) => {
    if (!acc[ul.level.name]) {
      acc[ul.level.name] = []
    }
    acc[ul.level.name].push(ul)
    return acc
  }, {} as Record<string, UserCertificationLevel[]>)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Zertifizierungsstufen Übersicht
          </h1>
          <p className="text-secondary-600 mt-1">
            Übersicht aller Benutzer und ihrer erreichten Zertifizierungsstufen
          </p>
        </div>
        <Link href="/dashboard/admin/certification-levels">
          <Button variant="outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Zurück zur Verwaltung
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600 mb-1">Gesamt erreichte Stufen</p>
            <p className="text-2xl font-bold text-primary-900">{userLevels.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600 mb-1">Gültige Zertifizierungen</p>
            <p className="text-2xl font-bold text-success-600">
              {userLevels.filter((ul) => ul.isValid).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600 mb-1">Ungültige Zertifizierungen</p>
            <p className="text-2xl font-bold text-warning-600">
              {userLevels.filter((ul) => !ul.isValid).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-secondary-600 mb-1">Verschiedene Stufen</p>
            <p className="text-2xl font-bold text-primary-900">{uniqueLevels.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Suche
              </label>
              <Input
                type="text"
                placeholder="Name, E-Mail, Stufe oder Zertifikat-Nr."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Stufe
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Alle Stufen</option>
                {uniqueLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Gültigkeit
              </label>
              <select
                value={validityFilter}
                onChange={(e) => setValidityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Alle</option>
                <option value="valid">Nur gültige</option>
                <option value="invalid">Nur ungültige</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredUserLevels.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-secondary-500">Keine Ergebnisse gefunden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByLevel).map(([levelName, levels]) => (
            <Card key={levelName}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{levelName}</span>
                  <Badge variant="secondary">{levels.length} Benutzer</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-secondary-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-700">
                          Benutzer
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-700">
                          E-Mail
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-700">
                          Zertifikat-Nr.
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-700">
                          Erreicht am
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-700">
                          Gültig bis
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-700">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-secondary-700">
                          Aktionen
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {levels.map((ul) => (
                        <tr key={ul.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                          <td className="py-3 px-4">
                            <Link
                              href={`/dashboard/admin/users/${ul.user.id}`}
                              className="font-medium text-primary-600 hover:underline"
                            >
                              {ul.user.name || 'Kein Name'}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-sm text-secondary-600">{ul.user.email}</td>
                          <td className="py-3 px-4 text-sm font-mono text-secondary-700">
                            {ul.certificateNumber || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-secondary-600">
                            {new Date(ul.achievedAt).toLocaleDateString('de-DE')}
                          </td>
                          <td className="py-3 px-4 text-sm text-secondary-600">
                            {ul.expiresAt
                              ? new Date(ul.expiresAt).toLocaleDateString('de-DE')
                              : 'Unbegrenzt'}
                          </td>
                          <td className="py-3 px-4">
                            {ul.isValid ? (
                              <Badge variant="success" size="sm">
                                Gültig
                              </Badge>
                            ) : (
                              <Badge variant="warning" size="sm">
                                Ungültig
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/dashboard/admin/users/${ul.user.id}`}>
                              <Button variant="ghost" size="sm">
                                Details
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
