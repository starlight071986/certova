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

interface CourseReportData {
  overview: {
    totalCourses: number
    publishedCourses: number
    draftCourses: number
    totalEnrollments: number
    totalCompletions: number
    avgCompletionRate: number
  }
  courses: Array<{
    id: string
    title: string
    status: string
    creditCost: number
    instructor: string
    totalEnrollments: number
    activeEnrollments: number
    completedEnrollments: number
    completionRate: number
    totalLessons: number
    revenue: number
  }>
  trends: {
    enrollments: Array<{ month: string; enrollments: number }>
    completions: Array<{ month: string; completions: number }>
  }
}

export default function CourseReports() {
  const [data, setData] = useState<CourseReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/reports/courses')
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

    const csvData = data.courses.map((course) => ({
      Kurs: course.title,
      Instructor: course.instructor,
      Status: course.status,
      'Preis (Credits)': course.creditCost,
      Buchungen: course.totalEnrollments,
      Aktiv: course.activeEnrollments,
      Abgeschlossen: course.completedEnrollments,
      'Abschlussrate (%)': course.completionRate,
      Lektionen: course.totalLessons,
      'Umsatz (Credits)': course.revenue,
    }))

    exportToCSV(csvData, 'kursstatistiken')
  }

  const handleExportPDF = async () => {
    if (!data) return
    await exportToPDF('Kursstatistiken', data, 'courses')
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Gesamt Kurse</div>
            <div className="text-3xl font-bold text-primary-900 mt-2">
              {data.overview.totalCourses}
            </div>
            <div className="text-xs text-secondary-500 mt-1">
              {data.overview.publishedCourses} veröffentlicht, {data.overview.draftCourses} Entwürfe
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Gesamt Buchungen</div>
            <div className="text-3xl font-bold text-primary-900 mt-2">
              {data.overview.totalEnrollments}
            </div>
            <div className="text-xs text-secondary-500 mt-1">
              {data.overview.totalCompletions} abgeschlossen
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-secondary-600">Durchschn. Abschlussrate</div>
            <div className="text-3xl font-bold text-success-600 mt-2">
              {data.overview.avgCompletionRate}%
            </div>
            <div className="text-xs text-secondary-500 mt-1">Über alle Kurse</div>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Buchungstrend (12 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends.enrollments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="enrollments"
                stroke="#0056b3"
                strokeWidth={2}
                name="Buchungen"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Completion Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Abschlusstrend (12 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends.completions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="completions"
                stroke="#28a745"
                strokeWidth={2}
                name="Abschlüsse"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Course Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kursübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Kurs</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-700">Instructor</th>
                  <th className="px-4 py-3 text-center font-medium text-secondary-700">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">Buchungen</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">Aktiv</th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">
                    Abgeschlossen
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">
                    Abschlussrate
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-secondary-700">Umsatz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200">
                {data.courses.map((course) => (
                  <tr key={course.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-secondary-900">{course.title}</div>
                      <div className="text-xs text-secondary-500">
                        {course.totalLessons} Lektionen · {course.creditCost} Credits
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary-700">{course.instructor}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          course.status === 'APPROVED'
                            ? 'success'
                            : course.status === 'DRAFT'
                            ? 'secondary'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {course.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-secondary-900">
                      {course.totalEnrollments}
                    </td>
                    <td className="px-4 py-3 text-right text-primary-600">
                      {course.activeEnrollments}
                    </td>
                    <td className="px-4 py-3 text-right text-success-600">
                      {course.completedEnrollments}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          course.completionRate >= 70
                            ? 'text-success-600 font-medium'
                            : course.completionRate >= 50
                            ? 'text-warning-600 font-medium'
                            : 'text-danger-600 font-medium'
                        }
                      >
                        {course.completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-secondary-900 font-medium">
                      {course.revenue}
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
