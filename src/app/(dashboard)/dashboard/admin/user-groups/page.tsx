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
  Modal,
} from '@/components/ui'

interface UserGroup {
  id: string
  name: string
  description: string | null
  createdAt: string
  _count: {
    members: number
    courseAccess: number
  }
}

interface User {
  id: string
  name: string | null
  email: string
  company: string | null
}

interface GroupMember {
  id: string
  user: User
}

interface GroupDetails extends UserGroup {
  members: GroupMember[]
}

export default function UserGroupsPage() {
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupDetails | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [groupsRes, usersRes] = await Promise.all([
        fetch('/api/user-groups'),
        fetch('/api/users'),
      ])

      if (groupsRes.ok) {
        setGroups(await groupsRes.json())
      }
      if (usersRes.ok) {
        setUsers(await usersRes.json())
      }
    } catch (err) {
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const res = await fetch(`/api/user-groups/${groupId}`)
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.error('Error fetching group details:', err)
    }
    return null
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/user-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      })

      if (res.ok) {
        const newGroup = await res.json()
        setGroups([...groups, newGroup])
        setShowCreateModal(false)
        setName('')
        setDescription('')
        setSuccess('Benutzergruppe erstellt')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Erstellen')
      }
    } catch (err) {
      setError('Fehler beim Erstellen der Benutzergruppe')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/user-groups/${selectedGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      })

      if (res.ok) {
        const updatedGroup = await res.json()
        setGroups(groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)))
        setShowEditModal(false)
        setSuccess('Benutzergruppe aktualisiert')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Aktualisieren')
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren der Benutzergruppe')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return
    setSaving(true)

    try {
      const res = await fetch(`/api/user-groups/${selectedGroup.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setGroups(groups.filter((g) => g.id !== selectedGroup.id))
        setShowDeleteModal(false)
        setSelectedGroup(null)
        setSuccess('Benutzergruppe gelöscht')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Löschen')
      }
    } catch (err) {
      setError('Fehler beim Löschen der Benutzergruppe')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMembers = async () => {
    if (!selectedGroup || selectedUsers.length === 0) return
    setSaving(true)

    try {
      const res = await fetch(`/api/user-groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers }),
      })

      if (res.ok) {
        const updatedGroup = await res.json()
        setSelectedGroup(updatedGroup)
        setGroups(groups.map((g) =>
          g.id === updatedGroup.id
            ? { ...g, _count: { ...g._count, members: updatedGroup.members.length } }
            : g
        ))
        setSelectedUsers([])
        setSuccess('Mitglieder hinzugefügt')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Hinzufügen')
      }
    } catch (err) {
      setError('Fehler beim Hinzufügen der Mitglieder')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return

    try {
      const res = await fetch(`/api/user-groups/${selectedGroup.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (res.ok) {
        setSelectedGroup({
          ...selectedGroup,
          members: selectedGroup.members.filter((m) => m.user.id !== userId),
        })
        setGroups(groups.map((g) =>
          g.id === selectedGroup.id
            ? { ...g, _count: { ...g._count, members: g._count.members - 1 } }
            : g
        ))
      }
    } catch (err) {
      console.error('Error removing member:', err)
    }
  }

  const openEditModal = async (group: UserGroup) => {
    const details = await fetchGroupDetails(group.id)
    if (details) {
      setSelectedGroup(details)
      setName(details.name)
      setDescription(details.description || '')
      setShowEditModal(true)
    }
  }

  const openMembersModal = async (group: UserGroup) => {
    const details = await fetchGroupDetails(group.id)
    if (details) {
      setSelectedGroup(details)
      setSelectedUsers([])
      setUserSearch('')
      setShowMembersModal(true)
    }
  }

  const openDeleteModal = (group: UserGroup) => {
    setSelectedGroup(group as GroupDetails)
    setShowDeleteModal(true)
  }

  // Filter users for adding to group
  const availableUsers = selectedGroup
    ? users.filter(
        (u) =>
          !selectedGroup.members.some((m) => m.user.id === u.id) &&
          (userSearch === '' ||
            (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase()))
      )
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Benutzergruppen</h1>
          <p className="text-secondary-600">
            Verwalten Sie Benutzergruppen für die Kurszuweisung.
          </p>
        </div>
        <Button variant="primary" onClick={() => {
          setName('')
          setDescription('')
          setShowCreateModal(true)
        }}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Gruppe
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Groups List */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <svg className="w-12 h-12 mx-auto mb-3 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="font-medium text-secondary-900 mb-1">Keine Benutzergruppen</h3>
            <p className="text-sm text-secondary-500">
              Erstellen Sie Benutzergruppen, um Kurse gezielt freizuschalten.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-primary-900">{group.name}</h3>
                      <Badge variant="secondary" size="sm">
                        {group._count.members} Mitglieder
                      </Badge>
                      <Badge variant="primary" size="sm">
                        {group._count.courseAccess} Kurse
                      </Badge>
                    </div>
                    {group.description && (
                      <p className="text-sm text-secondary-600 mt-1">{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openMembersModal(group)}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Mitglieder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(group)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => openDeleteModal(group)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Neue Benutzergruppe"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Vertrieb, Marketing, IT"
            required
          />
          <Input
            label="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung der Gruppe"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Erstellen
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Benutzergruppe bearbeiten"
      >
        <form onSubmit={handleUpdateGroup} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Speichern
            </Button>
          </div>
        </form>
      </Modal>

      {/* Members Modal */}
      <Modal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        title={`Mitglieder: ${selectedGroup?.name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Current Members */}
          <div>
            <h4 className="font-medium text-primary-900 mb-2">Aktuelle Mitglieder</h4>
            {selectedGroup?.members.length === 0 ? (
              <p className="text-sm text-secondary-500">Keine Mitglieder</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedGroup?.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 bg-secondary-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{member.user.name || member.user.email}</p>
                      <p className="text-xs text-secondary-500">
                        {member.user.email}
                        {member.user.company && ` · ${member.user.company}`}
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveMember(member.user.id)}
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

          {/* Add Members */}
          <div className="pt-4 border-t border-secondary-200">
            <h4 className="font-medium text-primary-900 mb-2">Mitglieder hinzufügen</h4>
            <Input
              placeholder="Benutzer suchen..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="mb-2"
            />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-secondary-500 py-2">Keine weiteren Benutzer verfügbar</p>
              ) : (
                availableUsers.slice(0, 20).map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-2 hover:bg-secondary-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id])
                        } else {
                          setSelectedUsers(selectedUsers.filter((id) => id !== user.id))
                        }
                      }}
                      className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-sm">{user.name || user.email}</p>
                      <p className="text-xs text-secondary-500">
                        {user.email}
                        {user.company && ` · ${user.company}`}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {selectedUsers.length > 0 && (
              <div className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddMembers}
                  isLoading={saving}
                >
                  {selectedUsers.length} Benutzer hinzufügen
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowMembersModal(false)}>
              Schließen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Benutzergruppe löschen"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteGroup}
              isLoading={saving}
            >
              Löschen
            </Button>
          </>
        }
      >
        <p className="text-secondary-600">
          Sind Sie sicher, dass Sie die Benutzergruppe <strong>{selectedGroup?.name}</strong> löschen möchten?
          Alle Kurszuweisungen für diese Gruppe werden ebenfalls entfernt.
        </p>
      </Modal>
    </div>
  )
}
