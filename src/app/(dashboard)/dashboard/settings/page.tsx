'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Spinner,
  Alert,
  Badge,
} from '@/components/ui'

interface Category {
  id: string
  name: string
  _count?: { courses: number }
}

interface AppSettings {
  id: string
  publicUrl: string | null
  courseNumberPrefix: string
  siteTitle: string
  logoUrl: string | null
  faviconUrl: string | null
  privacyPolicyUrl: string | null
  imprintUrl: string | null
}

type SettingsTab = 'general' | 'courses' | 'categories' | 'legal'

const GeneralIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const TagIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
)

const LegalIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')

  // App Settings
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [publicUrl, setPublicUrl] = useState('')
  const [coursePrefix, setCoursePrefix] = useState('LH')
  const [siteTitle, setSiteTitle] = useState('LearnHub')
  const [privacyUrl, setPrivacyUrl] = useState('')
  const [imprintUrl, setImprintUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [catRes, settingsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/settings'),
      ])

      if (catRes.ok) {
        const data = await catRes.json()
        setCategories(data)
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data)
        setPublicUrl(data.publicUrl || '')
        setCoursePrefix(data.courseNumberPrefix || 'LH')
        setSiteTitle(data.siteTitle || 'LearnHub')
        setPrivacyUrl(data.privacyPolicyUrl || '')
        setImprintUrl(data.imprintUrl || '')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (res.ok) {
        setNewCategoryName('')
        fetchData()
        setSuccess('Kategorie hinzugefügt')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Erstellen')
      }
    } catch (err) {
      setError('Fehler beim Erstellen der Kategorie')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategoryName.trim() }),
      })

      if (res.ok) {
        setEditingCategoryId(null)
        setEditCategoryName('')
        fetchData()
        setSuccess('Kategorie aktualisiert')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Aktualisieren')
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren der Kategorie')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Sind Sie sicher? Die Kategorie wird von allen Kursen entfernt.')) return

    setSaving(true)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchData()
        setSuccess('Kategorie gelöscht')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Löschen')
      }
    } catch (err) {
      setError('Fehler beim Löschen der Kategorie')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveGeneralSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicUrl: publicUrl.trim() || null,
          siteTitle: siteTitle.trim()
        }),
      })

      if (res.ok) {
        setSuccess('Einstellungen gespeichert')
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern der Einstellungen')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCourseSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseNumberPrefix: coursePrefix.trim() }),
      })

      if (res.ok) {
        setSuccess('Einstellungen gespeichert')
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern der Einstellungen')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLegalSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privacyPolicyUrl: privacyUrl.trim() || null,
          imprintUrl: imprintUrl.trim() || null,
        }),
      })

      if (res.ok) {
        setSuccess('Einstellungen gespeichert')
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern der Einstellungen')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setSuccess('Logo hochgeladen')
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Hochladen')
      }
    } catch (err) {
      setError('Fehler beim Hochladen des Logos')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteLogo = async () => {
    if (!confirm('Möchten Sie das Logo wirklich entfernen?')) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings/logo', {
        method: 'DELETE',
      })

      if (res.ok) {
        setSuccess('Logo entfernt')
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Entfernen')
      }
    } catch (err) {
      setError('Fehler beim Entfernen des Logos')
    } finally {
      setSaving(false)
    }
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFavicon(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/settings/favicon', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setSuccess('Favicon hochgeladen')
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Hochladen')
      }
    } catch (err) {
      setError('Fehler beim Hochladen des Favicons')
    } finally {
      setUploadingFavicon(false)
      if (faviconInputRef.current) {
        faviconInputRef.current.value = ''
      }
    }
  }

  const handleDeleteFavicon = async () => {
    if (!confirm('Möchten Sie das Favicon wirklich entfernen?')) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings/favicon', {
        method: 'DELETE',
      })

      if (res.ok) {
        setSuccess('Favicon entfernt')
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Entfernen')
      }
    } catch (err) {
      setError('Fehler beim Entfernen des Favicons')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return null
  }

  const tabs = [
    { id: 'general' as SettingsTab, label: 'Allgemein', icon: GeneralIcon },
    { id: 'courses' as SettingsTab, label: 'Kurse', icon: BookIcon },
    { id: 'categories' as SettingsTab, label: 'Kategorien', icon: TagIcon },
    { id: 'legal' as SettingsTab, label: 'Rechtliches', icon: LegalIcon },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Einstellungen</h1>
        <p className="text-secondary-600">
          Verwalten Sie globale Einstellungen und Konfigurationen.
        </p>
      </div>

      {/* Alerts */}
      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700'
              }`}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>Allgemeine Einstellungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Site Title */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Seitentitel
              </label>
              <Input
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                placeholder="LearnHub"
                className="max-w-md"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Wird in der Navigation und im Browser-Tab angezeigt.
              </p>
            </div>

            {/* Public URL */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Öffentliche URL
              </label>
              <Input
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="https://ihr-lms.de"
                type="url"
                className="max-w-md"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Die öffentliche Domain Ihrer Anwendung (z.B. für PowerPoint-Präsentationen, E-Mails, QR-Codes).
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Logo
              </label>
              <div className="flex items-start gap-4">
                {settings?.logoUrl ? (
                  <div className="relative">
                    <div className="w-32 h-32 border border-secondary-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                      <Image
                        src={settings.logoUrl}
                        alt="Logo"
                        width={128}
                        height={128}
                        className="object-contain"
                      />
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDeleteLogo}
                      className="absolute -top-2 -right-2"
                      disabled={saving}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-secondary-300 rounded-lg flex items-center justify-center text-secondary-400">
                    <span className="text-sm">Kein Logo</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={uploading}
                  >
                    <UploadIcon />
                    <span className="ml-2">Logo hochladen</span>
                  </Button>
                  <p className="text-xs text-secondary-500">
                    PNG, JPEG, SVG oder WebP. Max 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Favicon Upload */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Favicon
              </label>
              <div className="flex items-start gap-4">
                {settings?.faviconUrl ? (
                  <div className="relative">
                    <div className="w-16 h-16 border border-secondary-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                      <Image
                        src={settings.faviconUrl}
                        alt="Favicon"
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDeleteFavicon}
                      className="absolute -top-2 -right-2"
                      disabled={saving}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                ) : (
                  <div className="w-16 h-16 border-2 border-dashed border-secondary-300 rounded-lg flex items-center justify-center text-secondary-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml,.ico"
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => faviconInputRef.current?.click()}
                    isLoading={uploadingFavicon}
                  >
                    <UploadIcon />
                    <span className="ml-2">Favicon hochladen</span>
                  </Button>
                  <p className="text-xs text-secondary-500">
                    ICO, PNG oder SVG. Max 1MB. Empfohlen: 32x32 oder 48x48 Pixel.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleSaveGeneralSettings}
              isLoading={saving}
            >
              Speichern
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Course Settings Tab */}
      {activeTab === 'courses' && (
        <Card>
          <CardHeader>
            <CardTitle>Kurs-Einstellungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Präfix für Kursnummern
              </label>
              <div className="flex gap-3 items-center">
                <Input
                  value={coursePrefix}
                  onChange={(e) => setCoursePrefix(e.target.value.toUpperCase())}
                  placeholder="LH"
                  className="w-24"
                  maxLength={5}
                />
                <span className="text-secondary-500">-</span>
                <span className="text-secondary-600 font-mono">{new Date().getFullYear()}-00001</span>
              </div>
              <p className="text-xs text-secondary-500 mt-2">
                Beispiel: <span className="font-mono">{coursePrefix}-{new Date().getFullYear()}-00001</span>
              </p>
              <p className="text-xs text-secondary-500 mt-1">
                Dieser Präfix wird für die eindeutige Identifizierung von Kursen und Zertifikaten verwendet.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleSaveCourseSettings}
              isLoading={saving}
            >
              Speichern
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card>
          <CardHeader>
            <CardTitle>Kurs-Kategorien</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add Category */}
            <div className="flex gap-2 mb-6">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Neue Kategorie..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button
                variant="primary"
                onClick={handleAddCategory}
                isLoading={saving}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Hinzufügen
              </Button>
            </div>

            {/* Category List */}
            {categories.length === 0 ? (
              <p className="text-secondary-500 text-center py-8">
                Noch keine Kategorien vorhanden.
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg group"
                  >
                    {editingCategoryId === category.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateCategory(category.id)
                            if (e.key === 'Escape') setEditingCategoryId(null)
                          }}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateCategory(category.id)}
                        >
                          Speichern
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategoryId(null)}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-secondary-900">{category.name}</span>
                          {category._count && (
                            <Badge variant="secondary" size="sm">
                              {category._count.courses} Kurse
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCategoryId(category.id)
                              setEditCategoryName(category.name)
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-danger-500 hover:text-danger-700"
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legal Settings Tab */}
      {activeTab === 'legal' && (
        <Card>
          <CardHeader>
            <CardTitle>Rechtliche Hinweise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Link zu den Datenschutzhinweisen
              </label>
              <Input
                value={privacyUrl}
                onChange={(e) => setPrivacyUrl(e.target.value)}
                placeholder="https://example.com/datenschutz"
                type="url"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Wird im Footer angezeigt.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Link zum Impressum
              </label>
              <Input
                value={imprintUrl}
                onChange={(e) => setImprintUrl(e.target.value)}
                placeholder="https://example.com/impressum"
                type="url"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Wird im Footer angezeigt.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleSaveLegalSettings}
              isLoading={saving}
            >
              Speichern
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
