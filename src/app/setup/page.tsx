'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Button,
  Alert,
} from '@/components/ui'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup')
      const data = await response.json()

      if (data.adminExists) {
        // Admin exists, redirect to login
        router.push('/login')
      } else {
        setChecking(false)
      }
    } catch (error) {
      console.error('Setup check error:', error)
      setError('Fehler beim Prüfen des Setup-Status')
      setChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    if (!/[A-Z]/.test(password)) {
      setError('Passwort muss mindestens einen Großbuchstaben enthalten')
      return
    }

    if (!/[a-z]/.test(password)) {
      setError('Passwort muss mindestens einen Kleinbuchstaben enthalten')
      return
    }

    if (!/[0-9]/.test(password)) {
      setError('Passwort muss mindestens eine Zahl enthalten')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen des Administrators')
      }

      // Success - redirect to login
      router.push('/login?setup=success')
    } catch (error: any) {
      setError(error.message || 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md" variant="elevated">
          <CardContent className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-secondary-600">Setup wird geprüft...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      {/* Header */}
      <header className="p-4">
        <div className="flex items-center gap-2">
          <img
            src="/assets/certova-logo_only-Farbe.svg"
            alt="Certova Logo"
            className="h-8"
          />
          <span className="text-xl font-bold text-primary-900">Certova</span>
        </div>
      </header>

      {/* Setup Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md" variant="elevated">
          <CardHeader className="text-center">
            <CardTitle as="h1" className="text-2xl">
              Willkommen bei Certova
            </CardTitle>
            <CardDescription>
              Erstellen Sie den ersten Administrator-Account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="danger" onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-secondary-700">
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Max Mustermann"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
                  E-Mail
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
                  Passwort
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <p className="text-xs text-secondary-500">
                  Mindestens 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Zahl
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700">
                  Passwort bestätigen
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Wird erstellt...' : 'Administrator erstellen'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-sm text-secondary-500">
        © 2025 Certova. Ein Produkt der Alamos GmbH.
      </footer>
    </div>
  )
}
