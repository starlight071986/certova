'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import CourseReports from '@/components/reports/CourseReports'
import UserReports from '@/components/reports/UserReports'
import FinanceReports from '@/components/reports/FinanceReports'
import CertificateReports from '@/components/reports/CertificateReports'
import CertificationLevelReports from '@/components/reports/CertificationLevelReports'

type ReportTab = 'courses' | 'users' | 'finance' | 'certificates' | 'levels'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('courses')

  const tabs = [
    { id: 'courses' as ReportTab, label: 'Kursstatistiken', icon: '📚' },
    { id: 'users' as ReportTab, label: 'Benutzerstatistiken', icon: '👥' },
    { id: 'finance' as ReportTab, label: 'Finanzberichte', icon: '💰' },
    { id: 'certificates' as ReportTab, label: 'Zertifikate', icon: '📜' },
    { id: 'levels' as ReportTab, label: 'Zertifizierungsstufen', icon: '🏆' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary-900">Berichte & Analysen</h1>
        <p className="text-secondary-600 mt-1">
          Umfassende Übersicht über Kurse, Benutzer, Finanzen und Zertifikate
        </p>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b border-secondary-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                    : 'text-secondary-600 hover:text-primary-600 hover:bg-secondary-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div>
        {activeTab === 'courses' && <CourseReports />}
        {activeTab === 'users' && <UserReports />}
        {activeTab === 'finance' && <FinanceReports />}
        {activeTab === 'certificates' && <CertificateReports />}
        {activeTab === 'levels' && <CertificationLevelReports />}
      </div>
    </div>
  )
}
