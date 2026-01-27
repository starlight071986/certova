import Link from 'next/link'
import { Button } from '@/components/ui'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur border-b border-secondary-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LH</span>
              </div>
              <span className="text-xl font-bold text-primary-900">LearnHub</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-secondary-600 hover:text-primary-600 font-medium transition-colors"
              >
                Anmelden
              </Link>
              <Button variant="primary" size="sm">
                Registrieren
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-900 leading-tight">
            Lernen. Zertifizieren.
            <span className="block text-accent-500">Erfolgreich sein.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-secondary-600 max-w-2xl mx-auto">
            Die moderne E-Learning-Plattform für Unternehmen.
            Schulen Sie Ihre Mitarbeiter effizient und verwalten Sie Zertifizierungen zentral.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="lg">
              Kostenlos starten
            </Button>
            <Button variant="outline" size="lg">
              Demo ansehen
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary-900 mb-12">
            Alles aus einer Hand
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-secondary-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-900 mb-2">Kursverwaltung</h3>
              <p className="text-secondary-600">
                Erstellen und verwalten Sie Schulungsinhalte mit Videos, Dokumenten und interaktiven Modulen.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-secondary-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-900 mb-2">Zertifizierungen</h3>
              <p className="text-secondary-600">
                Automatische Zertifikatserstellung mit Ablaufverfolgung und Erinnerungsfunktion.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-secondary-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-900 mb-2">Reporting</h3>
              <p className="text-secondary-600">
                Detaillierte Auswertungen über Lernfortschritte und Compliance-Status Ihrer Organisation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Bereit, Ihre Schulungen zu digitalisieren?
          </h2>
          <p className="text-primary-200 mb-8">
            Starten Sie noch heute und profitieren Sie von effizientem E-Learning.
          </p>
          <Button variant="accent" size="lg">
            Jetzt kostenlos testen
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-secondary-900 text-secondary-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">LH</span>
            </div>
            <span className="text-white font-semibold">LearnHub</span>
          </div>
          <p className="text-sm">
            © 2025 LearnHub. Ein Produkt der Alamos GmbH.
          </p>
        </div>
      </footer>
    </div>
  )
}
