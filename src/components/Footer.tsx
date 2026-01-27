'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import packageJson from '../../package.json'

interface AppSettings {
  privacyPolicyUrl?: string | null
  imprintUrl?: string | null
}

export default function Footer() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const version = packageJson.version

  useEffect(() => {
    // Fetch app settings for legal links
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => {
        // Silently fail - footer will just not show legal links
      })
  }, [])

  return (
    <footer className="mt-auto border-t border-secondary-200 bg-white">
      <div className="px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary-500">
          {/* Legal Links (left side) */}
          <div className="flex items-center gap-4">
            {settings?.privacyPolicyUrl && (
              <Link
                href={settings.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-600 transition-colors"
              >
                Datenschutz
              </Link>
            )}
            {settings?.imprintUrl && (
              <Link
                href={settings.imprintUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-600 transition-colors"
              >
                Impressum
              </Link>
            )}
            {!settings?.privacyPolicyUrl && !settings?.imprintUrl && (
              <span className="text-secondary-400">LearnHub LMS</span>
            )}
          </div>

          {/* Version (right side) */}
          <div className="flex items-center gap-2">
            <span className="text-secondary-400">Version</span>
            <Link
              href="https://github.com/IHR-USERNAME/learnhub/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-medium text-secondary-600 hover:text-primary-600 transition-colors"
              title="Versionshistorie anzeigen"
            >
              v{version}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
