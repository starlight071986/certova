'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, Spinner } from '@/components/ui'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const setupSuccess = searchParams.get('setup') === 'success'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Ungültige E-Mail-Adresse oder Passwort.')
      } else {
        router.push(callbackUrl)
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
          <img src="/assets/certova-logo_only-Farbe.svg" alt="Certova Logo" className="h-8" />
          <span className="text-xl font-bold text-primary-900">Certova</span>
        </Link>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md" variant="elevated">
          <CardHeader className="text-center">
            <CardTitle as="h1" className="text-2xl">Willkommen zurück</CardTitle>
            <CardDescription>
              Melden Sie sich an, um fortzufahren
            </CardDescription>
          </CardHeader>
          <CardContent>
            {setupSuccess && (
              <Alert variant="success" className="mb-4">
                Administrator-Account erfolgreich erstellt! Sie können sich jetzt anmelden.
              </Alert>
            )}

            {error && (
              <Alert variant="danger" className="mb-4" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-secondary-600">Angemeldet bleiben</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Passwort vergessen?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Anmelden
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-secondary-600">
              Noch kein Konto?{' '}
              <Link
                href="/register"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Jetzt registrieren
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-secondary-500">
        © 2025 Certova. Ein Produkt der Alamos GmbH.
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
