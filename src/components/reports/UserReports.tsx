'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, Button, Spinner, Badge } from '@/components/ui'
import { exportToCSV, exportToPDF } from '@/lib/report-exports'

interface UserReportData {
  overview: {
    totalUsers: number
    activeUsers: number
    inactiveUsers: number
    activeUsersLast30Days: number
    totalEnrollments: number
    totalCertificates: number
    avgEnrollmentsPerUser: string
  }
  users: Array<{
    id: string
    name: string
    email: string
    role: string
    company: string | null
    credits: number
    isActive: boolean
    totalEnrollments: number
    activeCourses: number
    completedCourses: number
    totalCertificates: number
    totalCreditsSpent: number
    lastActivity: Date
  }>
  trends: {
    registrations: Array<{ month: string; registrations: number }>
  }
  distribution: {
    roles: Array<{ role: string; count: number }>
  }
}

const COLORS = ['#0056b3', '#28a745', '#ffc107', '#dc3545']

export default function UserReports() {
  const [data, setData] = useState<UserReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/reports/users')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setError('Fehler beim Laden der Daten')
      }
    } catch (error) {
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!data) return

    const csvData = data.users.map((user) => ({
      Name: user.name,
      Email: user.email,
      Rolle: user.role,
      Firma: user.company || '-',
      Credits: user.credits,
      Status: user.isActive ? 'Aktiv' : 'Inaktiv',
      Buchungen: user.totalEnrollments,
      'Aktive Kurse': user.activeCourses,
      'Abgeschlossene Kurse': user.completedCourses,
      Zertifikate: user.totalCertificates,
      'Credits ausgegeben': user.totalCreditsSpent,
      'Letzte Aktivität': new Date(user.lastActivity).toLocaleDateString('de-DE'),
    }))

    exportToCSV(csvData, 'benutzerstatistiken')
  }

  const handleExportPDF = async () => {
    if (!data) return
    await exportToPDF('Benutzerstatistiken', data, 'users')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-danger-600">{error || 'Keine Daten verfügbar'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          CSV Export
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          PDF Export
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Gesamt Benutzer</div>
            <div className="text-3xl font-bold text-primary-900 mt-2">{data.overview.totalUsers}</div>
            <div className="text-xs text-secondary-500 mt-1">
              {data.overview.activeUsers} aktiv, {data.overview.inactiveUsers} inaktiv
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Aktiv (30 Tage)</div>
            <div className="text-3xl font-bold text-success-600 mt-2">
              {data.overview.activeUsersLast30Days}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Letzte 30 Tage</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Gesamt Buchungen</div>
            <div className="text-3xl font-bold text-primary-900 mt-2">
              {data.overview.totalEnrollments}
            </div>
            <div className="text-xs text-secondary-500 mt-1">
              ⌀ {data.overview.avgEnrollmentsPerUser} pro Benutzer
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Zertifikate</div>
            <div className="text-3xl font-bold text-success-600 mt-2">
              {data.overview.totalCertificates}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Insgesamt ausgestellt</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Registrierungstrend (12 Monate)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trends.registrations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="registrations"
                  stroke="#0056b3"
                  strokeWidth={2}
                  name="Registrierungen"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rollenverteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.distribution.roles}
                  dataKey="count"
                  nameKey="role"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {data.distribution.roles.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>Benutzerübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Benutzer</th>
                  <th className="px-4 py-3 text-center font-medium text-secondary-700">Rolle</th>
                  <th className="px-4 py-3 text-center font-medium text-secondary-700">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">Buchungen</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">Aktiv</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">
                    Abgeschlossen
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">
                    Zertifikate
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-secondary-900">{user.name}</div>
                      <div className="text-xs text-secondary-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" size="sm">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={user.isActive ? 'success' : 'secondary'} size="sm">
                        {user.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-secondary-900">
                      {user.totalEnrollments}
                    </td>
                    <td className="px-4 py-3 text-right text-primary-600">{user.activeCourses}</td>
                    <td className="px-4 py-3 text-right text-success-600">
                      {user.completedCourses}
                    </td>
                    <td className="px-4 py-3 text-right text-success-600">
                      {user.totalCertificates}
                    </td>
                    <td className="px-4 py-3 text-right text-secondary-900 font-medium">
                      {user.credits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
