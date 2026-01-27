'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Alert,
  Spinner,
  Badge,
} from '@/components/ui'

interface UserProfile {
  id: string
  name: string | null
  email: string
  company: string | null
  image: string | null
  role: string
  createdAt: string
  userGroups: {
    group: { id: string; name: string }
  }[]
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator'
    case 'INSTRUCTOR':
      return 'Kursersteller'
    case 'REVIEWER':
      return 'Prüfer'
    default:
      return 'Lernender'
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setName(data.name || '')
        setEmail(data.email || '')
        setCompany(data.company || '')
      }
    } catch (err) {
      setError('Fehler beim Laden des Profils')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    // Validate password change
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setError('Bitte geben Sie Ihr aktuelles Passwort ein')
        setSaving(false)
        return
      }
      if (newPassword !== confirmPassword) {
        setError('Die neuen Passwörter stimmen nicht überein')
        setSaving(false)
        return
      }
      if (newPassword.length < 8) {
        setError('Das neue Passwort muss mindestens 8 Zeichen haben')
        setSaving(false)
        return
      }
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          email: email !== profile?.email ? email : undefined,
          company: company || null,
          ...(newPassword && { currentPassword, newPassword }),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setProfile({ ...profile!, ...data })
        setSuccess('Profil erfolgreich gespeichert')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern des Profils')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!profile) {
    return <Alert variant="danger">Profil konnte nicht geladen werden</Alert>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Mein Profil</h1>
        <p className="text-secondary-600">
          Verwalten Sie Ihre persönlichen Daten und Einstellungen.
        </p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Kontoinformationen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                {profile.image ? (
                  <img
                    src={profile.image}
                    alt={profile.name || 'Profilbild'}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary-600">
                    {(profile.name || profile.email)[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-primary-900">{profile.name || 'Kein Name'}</p>
                <p className="text-sm text-secondary-600">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" size="sm">
                    {getRoleLabel(profile.role)}
                  </Badge>
                  <span className="text-xs text-secondary-500">
                    Mitglied seit {formatDate(profile.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {profile.userGroups.length > 0 && (
              <div className="pt-4 border-t border-secondary-200">
                <p className="text-sm font-medium text-secondary-700 mb-2">Benutzergruppen</p>
                <div className="flex flex-wrap gap-2">
                  {profile.userGroups.map((membership) => (
                    <Badge key={membership.group.id} variant="primary" size="sm">
                      {membership.group.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profil bearbeiten</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ihr vollständiger Name"
            />

            <Input
              label="E-Mail-Adresse"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre.email@beispiel.de"
            />

            <Input
              label="Unternehmen / Organisation"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="z.B. Musterfirma GmbH"
            />

            <div className="pt-4 border-t border-secondary-200">
              <h3 className="font-medium text-primary-900 mb-3">Passwort ändern</h3>
              <p className="text-sm text-secondary-600 mb-4">
                Lassen Sie die Felder leer, wenn Sie Ihr Passwort nicht ändern möchten.
              </p>

              <div className="space-y-3">
                <Input
                  label="Aktuelles Passwort"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <Input
                  label="Neues Passwort"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                />

                <Input
                  label="Neues Passwort bestätigen"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" isLoading={saving}>
                Speichern
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
