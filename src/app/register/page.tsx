'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert } from '@/components/ui'

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registrierung fehlgeschlagen.')
        return
      }

      // Auto-login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        router.push('/login')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LH</span>
          </div>
          <span className="text-xl font-bold text-primary-900">LearnHub</span>
        </Link>
      </header>

      {/* Registration Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md" variant="elevated">
          <CardHeader className="text-center">
            <CardTitle as="h1" className="text-2xl">Konto erstellen</CardTitle>
            <CardDescription>
              Registrieren Sie sich für LearnHub
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="danger" className="mb-4" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Name"
                type="text"
                placeholder="Max Mustermann"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />

              <Input
                label="E-Mail-Adresse"
                type="email"
                placeholder="name@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Passwort"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                hint="Min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl"
              />

              <Input
                label="Passwort bestätigen"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <div className="text-sm text-secondary-600">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="w-4 h-4 mt-0.5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>
                    Ich akzeptiere die{' '}
                    <Link href="/terms" className="text-primary-600 hover:underline">
                      Nutzungsbedingungen
                    </Link>{' '}
                    und{' '}
                    <Link href="/privacy" className="text-primary-600 hover:underline">
                      Datenschutzerklärung
                    </Link>
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Registrieren
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-secondary-600">
              Bereits ein Konto?{' '}
              <Link
                href="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Jetzt anmelden
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-secondary-500">
        © 2025 LearnHub. Ein Produkt der Alamos GmbH.
      </footer>
    </div>
  )
}
