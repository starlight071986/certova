'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Avatar,
  Spinner,
  Alert,
} from '@/components/ui'

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  company: string | null
  customerNumber: string | null
  credits: number
  isActive: boolean
  createdAt: string
  organization: string | null
  enrollmentsCount: number
  certificatesCount: number
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  INSTRUCTOR: 'Kursersteller',
  REVIEWER: 'Prüfer',
  LEARNER: 'Lernender',
}

const roleBadgeVariants: Record<string, 'primary' | 'accent' | 'secondary' | 'default'> = {
  ADMIN: 'primary',
  INSTRUCTOR: 'accent',
  REVIEWER: 'secondary',
  LEARNER: 'default',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // New user form
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'LEARNER',
  })

  // Edit user form
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    company: '',
    customerNumber: '',
    role: 'LEARNER',
    isActive: true,
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)

      const res = await fetch(`/api/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timeout)
  }, [search, roleFilter])

  const handleCreateUser = async () => {
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Benutzer erfolgreich erstellt')
        setShowCreateModal(false)
        setNewUser({ name: '', email: '', password: '', role: 'LEARNER' })
        fetchUsers()
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError('Fehler beim Erstellen des Benutzers')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) return

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })

      if (res.ok) {
        setSuccess('Benutzer gelöscht')
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (error) {
      setError('Fehler beim Löschen')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (error) {
      setError('Fehler beim Aktualisieren der Rolle')
    }
  }

  const openEditModal = (user: User) => {
    setEditUser(user)
    setEditForm({
      name: user.name || '',
      email: user.email,
      company: user.company || '',
      customerNumber: user.customerNumber || '',
      role: user.role,
      isActive: user.isActive,
    })
    setShowEditModal(true)
  }

  const handleEditUser = async () => {
    if (!editUser) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name || undefined,
          email: editForm.email !== editUser.email ? editForm.email : undefined,
          company: editForm.company || null,
          customerNumber: editForm.customerNumber || null,
          role: editForm.role,
          isActive: editForm.isActive,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Benutzer erfolgreich aktualisiert')
        setShowEditModal(false)
        setEditUser(null)
        fetchUsers()
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError('Fehler beim Aktualisieren des Benutzers')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })

      if (res.ok) {
        setSuccess(currentActive ? 'Benutzer deaktiviert' : 'Benutzer aktiviert')
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (error) {
      setError('Fehler beim Ändern des Status')
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Benutzerverwaltung</h1>
          <p className="text-secondary-600">
            Verwalten Sie Benutzer und deren Berechtigungen.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Benutzer anlegen
        </Button>
      </div>

      {/* Alerts */}
      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Suche nach Name, E-Mail, Unternehmen oder Kundennummer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-80"
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <Select
          options={[
            { value: '', label: 'Alle Rollen' },
            { value: 'ADMIN', label: 'Administrator' },
            { value: 'INSTRUCTOR', label: 'Kursersteller' },
            { value: 'REVIEWER', label: 'Prüfer' },
            { value: 'LEARNER', label: 'Lernender' },
          ]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="sm:w-48"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-secondary-500">Gesamt</p>
            <p className="text-2xl font-bold text-primary-900">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-secondary-500">Admins</p>
            <p className="text-2xl font-bold text-primary-600">
              {users.filter((u) => u.role === 'ADMIN').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-secondary-500">Kursersteller</p>
            <p className="text-2xl font-bold text-accent-600">
              {users.filter((u) => u.role === 'INSTRUCTOR').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-secondary-500">Lernende</p>
            <p className="text-2xl font-bold text-secondary-600">
              {users.filter((u) => u.role === 'LEARNER').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                    Benutzer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                    Kundennr.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                    Unternehmen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                    Rolle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                    Kredits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                    Kurse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                    Zertifikate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-secondary-50 ${!user.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name || user.email} src={user.image} size="sm" />
                        <div>
                          <p className="font-medium text-secondary-900">{user.name || '-'}</p>
                          <p className="text-sm text-secondary-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-secondary-600 font-mono text-sm">
                      {user.customerNumber || '-'}
                    </td>
                    <td className="px-6 py-4 text-secondary-600">
                      {user.company || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-sm border border-secondary-200 rounded px-2 py-1"
                      >
                        <option value="LEARNER">Lernender</option>
                        <option value="INSTRUCTOR">Kursersteller</option>
                        <option value="REVIEWER">Prüfer</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.isActive ? 'success' : 'danger'}
                        size="sm"
                      >
                        {user.isActive ? 'Aktiv' : 'Deaktiviert'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${user.credits > 0 ? 'text-success-600' : 'text-secondary-400'}`}>
                        {user.credits}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-secondary-600">
                      {user.enrollmentsCount}
                    </td>
                    <td className="px-6 py-4 text-secondary-600">
                      {user.certificatesCount}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/admin/users/${user.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Details anzeigen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                          title="Bearbeiten"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          title={user.isActive ? 'Deaktivieren' : 'Aktivieren'}
                          className={user.isActive ? 'text-warning-600 hover:text-warning-700 hover:bg-warning-50' : 'text-success-600 hover:text-success-700 hover:bg-success-50'}
                        >
                          {user.isActive ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                          title="Löschen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Neuen Benutzer anlegen"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleCreateUser} isLoading={creating}>
              Erstellen
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            required
          />
          <Input
            label="E-Mail"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
          <Input
            label="Passwort"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            hint="Mindestens 8 Zeichen"
            required
          />
          <Select
            label="Rolle"
            options={[
              { value: 'LEARNER', label: 'Lernender' },
              { value: 'INSTRUCTOR', label: 'Kursersteller' },
              { value: 'REVIEWER', label: 'Prüfer' },
              { value: 'ADMIN', label: 'Administrator' },
            ]}
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          />
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditUser(null)
        }}
        title="Benutzer bearbeiten"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowEditModal(false)
              setEditUser(null)
            }}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleEditUser} isLoading={saving}>
              Speichern
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Input
            label="E-Mail"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            required
          />
          <Input
            label="Kundennummer"
            value={editForm.customerNumber}
            onChange={(e) => setEditForm({ ...editForm, customerNumber: e.target.value })}
            placeholder="z.B. KD-12345"
          />
          <Input
            label="Unternehmen / Organisation"
            value={editForm.company}
            onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
            placeholder="z.B. Musterfirma GmbH"
          />
          <Select
            label="Rolle"
            options={[
              { value: 'LEARNER', label: 'Lernender' },
              { value: 'INSTRUCTOR', label: 'Kursersteller' },
              { value: 'REVIEWER', label: 'Prüfer' },
              { value: 'ADMIN', label: 'Administrator' },
            ]}
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm text-secondary-700">
              Benutzer ist aktiv
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
