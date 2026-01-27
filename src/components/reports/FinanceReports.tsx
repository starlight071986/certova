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
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, Button, Spinner } from '@/components/ui'
import { exportToCSV, exportToPDF } from '@/lib/report-exports'

export default function FinanceReports() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/reports/finance')
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

    const csvData = data.revenueByCourse.map((course: any) => ({
      Kurs: course.courseTitle,
      Instructor: course.instructor,
      'Preis (Credits)': course.creditCost,
      Buchungen: course.enrollments,
      'Umsatz (Credits)': course.revenue,
    }))

    exportToCSV(csvData, 'finanzberichte')
  }

  const handleExportPDF = async () => {
    if (!data) return
    await exportToPDF('Finanzberichte', data, 'finance')
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
            <div className="text-sm font-medium text-secondary-600">Gesamt Umsatz</div>
            <div className="text-3xl font-bold text-success-600 mt-2">
              {data.overview.totalRevenue}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Credits</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Credits ausgegeben</div>
            <div className="text-3xl font-bold text-primary-900 mt-2">
              {data.overview.totalCreditsIssued}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Gesamt</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Credits verbraucht</div>
            <div className="text-3xl font-bold text-secondary-700 mt-2">
              {data.overview.totalCreditsSpent}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Durch Buchungen</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Im Umlauf</div>
            <div className="text-3xl font-bold text-primary-600 mt-2">
              {data.overview.creditsInCirculation}
            </div>
            <div className="text-xs text-secondary-500 mt-1">Credits aktuell</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Finanztrend (12 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data.trends.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke="#28a745"
                fill="#28a745"
                fillOpacity={0.6}
                name="Umsatz"
              />
              <Area
                type="monotone"
                dataKey="creditsAdded"
                stackId="2"
                stroke="#0056b3"
                fill="#0056b3"
                fillOpacity={0.6}
                name="Credits hinzugefügt"
              />
              <Area
                type="monotone"
                dataKey="creditsSpent"
                stackId="3"
                stroke="#dc3545"
                fill="#dc3545"
                fillOpacity={0.6}
                name="Credits verbraucht"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transaction Types */}
      <Card>
        <CardHeader>
          <CardTitle>Transaktionstypen</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.transactions.byType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0056b3" name="Anzahl" />
              <Bar dataKey="amount" fill="#28a745" name="Betrag (Credits)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Course */}
      <Card>
        <CardHeader>
          <CardTitle>Umsatz nach Kurs (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Kurs</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Instructor</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">
                    Preis (Credits)
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">Buchungen</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">
                    Umsatz (Credits)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200">
                {data.revenueByCourse.slice(0, 10).map((course: any) => (
                  <tr key={course.courseId} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-medium text-secondary-900">{course.courseTitle}</td>
                    <td className="px-4 py-3 text-secondary-700">{course.instructor}</td>
                    <td className="px-4 py-3 text-right text-secondary-900">{course.creditCost}</td>
                    <td className="px-4 py-3 text-right text-secondary-900">{course.enrollments}</td>
                    <td className="px-4 py-3 text-right text-success-600 font-semibold">
                      {course.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Transaktionen (50)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Datum</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Benutzer</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Typ</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Beschreibung</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">Betrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200">
                {data.transactions.recent.map((transaction: any) => (
                  <tr key={transaction.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 text-secondary-700">
                      {new Date(transaction.createdAt).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-secondary-900">{transaction.user}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          transaction.type === 'ENROLLMENT'
                            ? 'bg-danger-100 text-danger-700'
                            : transaction.type === 'PURCHASE'
                            ? 'bg-success-100 text-success-700'
                            : 'bg-secondary-100 text-secondary-700'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary-600 text-xs">
                      {transaction.courseTitle || transaction.description || '-'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        transaction.amount > 0 ? 'text-success-600' : 'text-danger-600'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount}
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
