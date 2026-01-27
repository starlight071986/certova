'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, Button, Spinner, Badge } from '@/components/ui'
import { exportToCSV, exportToPDF } from '@/lib/report-exports'

export default function CertificateReports() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/reports/certificates')
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

    const csvData = data.certificates.map((cert: any) => ({
      Nummer: cert.number,
      Benutzer: cert.user,
      Email: cert.userEmail,
      Kurs: cert.courseTitle,
      Instructor: cert.instructor,
      Ausgestellt: new Date(cert.issuedAt).toLocaleDateString('de-DE'),
      'Läuft ab': cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString('de-DE') : 'Nie',
      Status: cert.isExpired
        ? 'Abgelaufen'
        : cert.expiresIn30Days
        ? 'Läuft bald ab'
        : 'Gültig',
    }))

    exportToCSV(csvData, 'zertifikatsberichte')
  }

  const handleExportPDF = async () => {
    if (!data) return
    await exportToPDF('Zertifikatsberichte', data, 'certificates')
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
            <div className="text-sm font-medium text-secondary-600">Gesamt Zertifikate</div>
            <div className="text-3xl font-bold text-primary-900 mt-2">
              {data.overview.totalCertificates}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Insgesamt ausgestellt</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Gültig</div>
            <div className="text-3xl font-bold text-success-600 mt-2">
              {data.overview.validCertificates}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Aktuell gültige</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Abgelaufen</div>
            <div className="text-3xl font-bold text-danger-600 mt-2">
              {data.overview.expiredCertificates}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Nicht mehr gültig</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Laufen bald ab</div>
            <div className="text-3xl font-bold text-warning-600 mt-2">
              {data.overview.expiringIn30Days}
            </div>
            <div className="text-xs text-secondary-500 mt-1">In 30 Tagen</div>
          </CardContent>
        </Card>
      </div>

      {/* Issuance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ausstellungstrend (12 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends.issuance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="issued"
                stroke="#28a745"
                strokeWidth={2}
                name="Ausgestellt"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Certificates by Course */}
      <Card>
        <CardHeader>
          <CardTitle>Zertifikate nach Kurs (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byCourse.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="courseTitle" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0056b3" name="Anzahl Zertifikate" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expiring Soon Alert */}
      {data.expiringSoon.length > 0 && (
        <Card className="border-warning-300 bg-warning-50">
          <CardHeader>
            <CardTitle className="text-warning-900">
              ⚠️ Zertifikate laufen in den nächsten 30 Tagen ab ({data.expiringSoon.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-warning-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-warning-900">Nummer</th>
                    <th className="px-4 py-3 text-left font-medium text-warning-900">Benutzer</th>
                    <th className="px-4 py-3 text-left font-medium text-warning-900">Kurs</th>
                    <th className="px-4 py-3 text-left font-medium text-warning-900">Läuft ab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warning-200">
                  {data.expiringSoon.map((cert: any) => (
                    <tr key={cert.id} className="hover:bg-warning-100">
                      <td className="px-4 py-3 font-mono text-xs text-warning-900">
                        {cert.number}
                      </td>
                      <td className="px-4 py-3 text-warning-900">{cert.user}</td>
                      <td className="px-4 py-3 text-warning-900">{cert.courseTitle}</td>
                      <td className="px-4 py-3 text-warning-900">
                        {new Date(cert.expiresAt).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Certificates */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Zertifikate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Nummer</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Benutzer</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Kurs</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Instructor</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Ausgestellt</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Läuft ab</th>
                  <th className="px-4 py-3 text-center font-medium text-secondary-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200">
                {data.recent.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-mono text-xs text-secondary-700">
                      {cert.number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-secondary-900">{cert.user}</div>
                      <div className="text-xs text-secondary-500">{cert.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-secondary-900">{cert.courseTitle}</td>
                    <td className="px-4 py-3 text-secondary-700">{cert.instructor}</td>
                    <td className="px-4 py-3 text-secondary-700">
                      {new Date(cert.issuedAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-secondary-700">
                      {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString('de-DE') : 'Nie'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          cert.isExpired
                            ? 'danger'
                            : cert.expiresIn30Days
                            ? 'warning'
                            : 'success'
                        }
                        size="sm"
                      >
                        {cert.isExpired
                          ? 'Abgelaufen'
                          : cert.expiresIn30Days
                          ? 'Läuft bald ab'
                          : 'Gültig'}
                      </Badge>
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
