'use client'

import { useState, useEffect } from 'react'
import { Button, Spinner } from '@/components/ui'

interface PowerPointViewerProps {
  lessonId: string
  title?: string
}

export default function PowerPointViewer({ lessonId, title = 'PowerPoint' }: PowerPointViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isLocalhost, setIsLocalhost] = useState(false)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadPresentation() {
      try {
        // Fetch settings to get publicUrl
        const settingsRes = await fetch('/api/settings')
        let baseUrl = window.location.origin

        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          if (settings.publicUrl) {
            setPublicUrl(settings.publicUrl)
            baseUrl = settings.publicUrl
          }
        }

        // Check if running on localhost
        const hostname = window.location.hostname
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')
        setIsLocalhost(isLocal)

        // Fetch token from API
        const res = await fetch(`/api/lessons/${lessonId}/presentation-token`)
        if (!res.ok) {
          throw new Error('Token fetch failed')
        }

        const { token } = await res.json()

        // Build protected presentation URL using baseUrl (publicUrl or current origin)
        const presentationUrl = `${baseUrl}/api/presentations/serve?token=${token}`
        setDownloadUrl(presentationUrl)

        // Only show localhost error if we don't have a publicUrl configured
        if (isLocal && !publicUrl && !settingsRes.ok) {
          // On localhost without publicUrl, Microsoft Viewer won't work
          setLoading(false)
          setError(true)
          return
        }

        // URL-encode for Microsoft Viewer
        const encodedUrl = encodeURIComponent(presentationUrl)

        // Microsoft Office Online Viewer URL
        const msViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`

        setViewerUrl(msViewerUrl)
      } catch (err) {
        console.error('Failed to load presentation:', err)
        setError(true)
        setLoading(false)
      }
    }

    loadPresentation()
  }, [lessonId])

  const handleIframeLoad = () => {
    setLoading(false)
  }

  const handleIframeError = () => {
    setError(true)
    setLoading(false)
  }

  if (error) {
    if (isLocalhost && !publicUrl) {
      // Localhost development mode without publicUrl - show download option
      return (
        <div className="flex flex-col items-center justify-center h-full bg-warning-50 rounded-lg border-2 border-warning-200 p-8">
          <svg className="w-16 h-16 text-warning-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-secondary-900 font-medium mb-2">Entwicklungsmodus</p>
          <p className="text-sm text-secondary-600 mb-4 text-center max-w-md">
            Der PowerPoint-Viewer funktioniert nur mit öffentlich zugänglichen URLs.
            Im Entwicklungsmodus (localhost) kann Microsoft nicht auf die Datei zugreifen.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {downloadUrl && (
              <Button
                variant="primary"
                onClick={() => window.open(downloadUrl, '_blank')}
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Präsentation herunterladen
              </Button>
            )}
            <div className="p-4 bg-accent-50 rounded-lg border border-accent-200">
              <p className="text-xs text-accent-800">
                <strong>Tipp:</strong> In den Einstellungen können Sie eine öffentliche URL konfigurieren,
                damit der Viewer auch im Entwicklungsmodus funktioniert.
                In der Produktionsumgebung wird die Präsentation direkt angezeigt.
              </p>
            </div>
          </div>
        </div>
      )
    }

    // General error
    return (
      <div className="flex flex-col items-center justify-center h-full bg-secondary-50 rounded-lg border-2 border-secondary-200 p-8">
        <svg className="w-16 h-16 text-danger-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-secondary-700 font-medium mb-2">Präsentation konnte nicht geladen werden</p>
        <p className="text-sm text-secondary-500 mb-4">Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.</p>
        <div className="flex gap-3">
          {downloadUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(downloadUrl, '_blank')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Herunterladen
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
          >
            Seite neu laden
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border border-secondary-200">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <Spinner size="lg" />
          <span className="ml-3 text-secondary-600">Präsentation wird geladen...</span>
        </div>
      )}

      {viewerUrl && (
        <iframe
          src={viewerUrl}
          className="w-full h-full bg-white"
          title={title}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{
            border: 'none',
            minHeight: '80vh'
          }}
          allowFullScreen
        />
      )}

      {/* Info banner for manual navigation */}
      <div className="px-4 py-2 bg-primary-50 border-t border-primary-200 text-sm text-primary-700">
        💡 <strong>Tipp:</strong> Verwenden Sie die Pfeiltasten oder klicken Sie auf die Folie, um durch die Präsentation zu navigieren.
        Notieren Sie sich bei Bedarf Ihre aktuelle Folienzahl zum späteren Fortsetzen.
      </div>
    </div>
  )
}
