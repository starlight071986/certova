'use client'

import { useState, useRef } from 'react'
import { Button, Spinner } from '@/components/ui'

interface FileUploadProps {
  type: 'video' | 'audio' | 'pdf' | 'powerpoint'
  value?: string
  onChange: (url: string, duration?: number) => void
  onError?: (error: string) => void
}

const TYPE_CONFIG = {
  video: {
    accept: 'video/mp4,video/webm,video/ogg',
    extensions: '.mp4, .webm, .ogv',
    maxSize: 500,
    label: 'Video',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  audio: {
    accept: 'audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/webm',
    extensions: '.mp3, .ogg, .wav',
    maxSize: 100,
    label: 'Audio',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    ),
  },
  pdf: {
    accept: 'application/pdf',
    extensions: '.pdf',
    maxSize: 50,
    label: 'PDF',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  powerpoint: {
    accept: 'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extensions: '.ppt, .pptx',
    maxSize: 100,
    label: 'PowerPoint',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6" />
      </svg>
    ),
  },
}

export default function FileUpload({ type, value, onChange, onError }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [filename, setFilename] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const config = TYPE_CONFIG[type]

  // Extract filename from value if it's a local upload path
  const displayFilename = filename || (value?.startsWith('/uploads') ? value.split('/').pop() : null)

  // Extract duration from video/audio file
  const getMediaDuration = (file: File): Promise<number | undefined> => {
    return new Promise((resolve) => {
      if (type !== 'video' && type !== 'audio') {
        resolve(undefined)
        return
      }

      const url = URL.createObjectURL(file)
      const media = type === 'video' ? document.createElement('video') : document.createElement('audio')

      media.preload = 'metadata'
      media.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        // Convert seconds to minutes, rounded up
        const durationMinutes = Math.ceil(media.duration / 60)
        resolve(durationMinutes)
      }
      media.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(undefined)
      }
      media.src = url
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    const maxBytes = config.maxSize * 1024 * 1024
    if (file.size > maxBytes) {
      onError?.(`Datei zu groß. Maximum: ${config.maxSize}MB`)
      return
    }

    setUploading(true)
    setProgress(0)

    let progressInterval: NodeJS.Timeout | null = null
    let uploadAborted = false

    try {
      // Extract duration for video/audio files
      const duration = await getMediaDuration(file)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      // Simulate progress for better UX
      // Progress slower for larger files to be more realistic
      const fileSizeMB = file.size / (1024 * 1024)
      const progressSpeed = fileSizeMB > 100 ? 500 : 200 // Slower for large files

      progressInterval = setInterval(() => {
        setProgress((prev) => {
          // Slow down as we approach 85% to avoid getting stuck at 90%
          if (prev < 70) return prev + 10
          if (prev < 85) return prev + 5
          return prev + 2
        })
      }, progressSpeed)

      // Set timeout for large files (5 minutes)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        uploadAborted = true
        controller.abort()
      }, 300000) // 5 minutes

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      if (progressInterval) clearInterval(progressInterval)
      setProgress(100)

      if (uploadAborted) {
        onError?.('Upload-Timeout: Die Datei ist zu groß oder die Verbindung zu langsam')
        return
      }

      if (res.ok) {
        const data = await res.json()
        onChange(data.url, duration)
        setFilename(data.filename)
      } else {
        const data = await res.json()
        onError?.(data.error || 'Fehler beim Hochladen')
      }
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval)
      if (uploadAborted) {
        onError?.('Upload-Timeout: Die Datei ist zu groß oder die Verbindung zu langsam')
      } else if ((err as Error).name === 'AbortError') {
        onError?.('Upload abgebrochen: Timeout überschritten')
      } else {
        onError?.('Fehler beim Hochladen der Datei')
      }
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    onChange('')
    setFilename(null)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {value ? (
        <div className="border-2 border-success-200 bg-success-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-success-600">{config.icon}</div>
              <div>
                <p className="font-medium text-success-900 text-sm">
                  {displayFilename || 'Datei hochgeladen'}
                </p>
                <p className="text-xs text-success-600 truncate max-w-[200px]">{value}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(value, '_blank')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-600 hover:bg-danger-50"
                onClick={handleRemove}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      ) : uploading ? (
        <div className="border-2 border-primary-200 bg-primary-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-900">Wird hochgeladen...</p>
              <div className="mt-2 h-2 bg-primary-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
        >
          <div className="text-secondary-400 mx-auto mb-2">{config.icon}</div>
          <p className="text-sm font-medium text-secondary-700">
            {config.label} hochladen
          </p>
          <p className="text-xs text-secondary-500 mt-1">
            Erlaubt: {config.extensions}
          </p>
          <p className="text-xs text-secondary-400">
            Max. {config.maxSize}MB
          </p>
        </button>
      )}
    </div>
  )
}
