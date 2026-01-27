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

interface UserGroup {
  id: string
  name: string
}

interface User {
  id: string
  name: string | null
  email: string
}

interface AccessRule {
  id: string
  type: 'ALL' | 'GROUP' | 'USER'
  group: UserGroup | null
  user: User | null
}

interface CourseAccessManagerProps {
  courseId: string
  embedded?: boolean
}

export default function CourseAccessManager({ courseId, embedded = false }: CourseAccessManagerProps) {
  const [accessRules, setAccessRules] = useState<AccessRule[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedType, setSelectedType] = useState<'ALL' | 'GROUP' | 'USER'>('ALL')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [courseId])

  const fetchData = async () => {
    try {
      const [accessRes, groupsRes, usersRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/access`),
        fetch('/api/user-groups'),
        fetch('/api/users'),
      ])

      if (accessRes.ok) {
        setAccessRules(await accessRes.json())
      }
      if (groupsRes.ok) {
        setGroups(await groupsRes.json())
      }
      if (usersRes.ok) {
        setUsers(await usersRes.json())
      }
    } catch (err) {
      setError('Fehler beim Laden der Zugriffsdaten')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccess = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/courses/${courseId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          groupId: selectedType === 'GROUP' ? selectedGroupId : undefined,
          userId: selectedType === 'USER' ? selectedUserId : undefined,
        }),
      })

      if (res.ok) {
        const newRule = await res.json()
        if (selectedType === 'ALL') {
          setAccessRules([newRule])
        } else {
          setAccessRules([...accessRules, newRule])
        }
        setSuccess('Zugriff hinzugefügt')
        setSelectedGroupId('')
        setSelectedUserId('')
        setUserSearch('')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Hinzufügen')
      }
    } catch (err) {
      setError('Fehler beim Hinzufügen des Zugriffs')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAccess = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/access?ruleId=${ruleId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setAccessRules(accessRules.filter((r) => r.id !== ruleId))
        setSuccess('Zugriff entfernt')
      }
    } catch (err) {
      console.error('Error removing access:', err)
    }
  }

  // Check if "ALL" rule exists
  const hasAllAccess = accessRules.some((r) => r.type === 'ALL')

  // Filter available groups and users
  const assignedGroupIds = accessRules.filter((r) => r.type === 'GROUP').map((r) => r.group?.id)
  const assignedUserIds = accessRules.filter((r) => r.type === 'USER').map((r) => r.user?.id)
  const availableGroups = groups.filter((g) => !assignedGroupIds.includes(g.id))
  const availableUsers = users.filter(
    (u) =>
      !assignedUserIds.includes(u.id) &&
      (userSearch === '' ||
        (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    )
  }

  const content = (
    <div className="space-y-4">
      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Current Access Rules */}
      <div>
        <h4 className="font-medium text-primary-900 mb-2">Aktuelle Freischaltungen</h4>
        {accessRules.length === 0 ? (
          <p className="text-sm text-secondary-500 py-2">
            Keine Freischaltungen - nur Administratoren können den Kurs sehen.
          </p>
        ) : (
          <div className="space-y-2">
            {accessRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {rule.type === 'ALL' && (
                    <>
                      <Badge variant="success">Alle</Badge>
                      <span className="text-sm">Für alle Benutzer freigegeben</span>
                    </>
                  )}
                  {rule.type === 'GROUP' && rule.group && (
                    <>
                      <Badge variant="primary">Gruppe</Badge>
                      <span className="text-sm">{rule.group.name}</span>
                    </>
                  )}
                  {rule.type === 'USER' && rule.user && (
                    <>
                      <Badge variant="secondary">Benutzer</Badge>
                      <span className="text-sm">{rule.user.name || rule.user.email}</span>
                    </>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveAccess(rule.id)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Access */}
      {!hasAllAccess && (
        <div className="pt-4 border-t border-secondary-200">
          <h4 className="font-medium text-primary-900 mb-3">Zugriff hinzufügen</h4>

          {/* Type Selection */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                selectedType === 'ALL'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-secondary-200 hover:border-secondary-300'
              }`}
            >
              Alle Benutzer
            </button>
            <button
              onClick={() => setSelectedType('GROUP')}
              className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                selectedType === 'GROUP'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-secondary-200 hover:border-secondary-300'
              }`}
            >
              Benutzergruppe
            </button>
            <button
              onClick={() => setSelectedType('USER')}
              className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                selectedType === 'USER'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-secondary-200 hover:border-secondary-300'
              }`}
            >
              Einzelner Benutzer
            </button>
          </div>

          {/* Type-specific inputs */}
          {selectedType === 'ALL' && (
            <p className="text-sm text-secondary-600 mb-3">
              Der Kurs wird für alle registrierten Benutzer freigegeben.
            </p>
          )}

          {selectedType === 'GROUP' && (
            <div className="mb-3">
              {availableGroups.length === 0 ? (
                <p className="text-sm text-secondary-500">Alle Gruppen bereits zugewiesen</p>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Gruppe auswählen...</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {selectedType === 'USER' && (
            <div className="mb-3">
              <Input
                placeholder="Benutzer suchen..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mb-2"
              />
              {userSearch && (
                <div className="max-h-40 overflow-y-auto border border-secondary-200 rounded-lg">
                  {availableUsers.length === 0 ? (
                    <p className="text-sm text-secondary-500 p-3">Keine Benutzer gefunden</p>
                  ) : (
                    availableUsers.slice(0, 10).map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id)
                          setUserSearch(user.name || user.email)
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-secondary-50 ${
                          selectedUserId === user.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <p className="font-medium text-sm">{user.name || 'Ohne Name'}</p>
                        <p className="text-xs text-secondary-500">{user.email}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleAddAccess}
            disabled={
              saving ||
              (selectedType === 'GROUP' && !selectedGroupId) ||
              (selectedType === 'USER' && !selectedUserId)
            }
            isLoading={saving}
          >
            Zugriff hinzufügen
          </Button>
        </div>
      )}

      {hasAllAccess && (
        <p className="text-sm text-secondary-600 pt-4 border-t border-secondary-200">
          Der Kurs ist bereits für alle Benutzer freigegeben. Entfernen Sie diese Regel,
          um spezifische Zugriffsregeln hinzuzufügen.
        </p>
      )}
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kurszugriff verwalten</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}
