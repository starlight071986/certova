'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Spinner, Badge } from '@/components/ui'
import Link from 'next/link'

interface LevelStat {
  levelId: string
  levelName: string
  totalAchieved: number
  validCount: number
  invalidCount: number
  recentAchievements: Array<{
    userName: string
    userEmail: string
    achievedAt: string
  }>
}

export default function CertificationLevelReports() {
  const [stats, setStats] = useState<LevelStat[]>([])
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalLevelsAchieved, setTotalLevelsAchieved] = useState(0)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/reports/certification-levels')
      if (res.ok) {
        const data = await res.json()
        setStats(data.levelStats)
        setTotalUsers(data.totalUsers)
        setTotalLevelsAchieved(data.totalLevelsAchieved)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
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
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-secondary-600 mb-1">Gesamt erreichte Stufen</p>
            <p className="text-4xl font-bold text-primary-900">{totalLevelsAchieved}</p>
            <p className="text-sm text-secondary-500 mt-2">
              Von {totalUsers} Benutzern
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-secondary-600 mb-1">Gültige Zertifizierungen</p>
            <p className="text-4xl font-bold text-success-600">
              {stats.reduce((sum, s) => sum + s.validCount, 0)}
            </p>
            <p className="text-sm text-secondary-500 mt-2">
              {totalLevelsAchieved > 0
                ? Math.round(
                    (stats.reduce((sum, s) => sum + s.validCount, 0) /
                      totalLevelsAchieved) *
                      100
                  )
                : 0}
              % der Gesamtzahl
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-secondary-600 mb-1">Ungültige Zertifizierungen</p>
            <p className="text-4xl font-bold text-warning-600">
              {stats.reduce((sum, s) => sum + s.invalidCount, 0)}
            </p>
            <p className="text-sm text-secondary-500 mt-2">
              {totalLevelsAchieved > 0
                ? Math.round(
                    (stats.reduce((sum, s) => sum + s.invalidCount, 0) /
                      totalLevelsAchieved) *
                      100
                  )
                : 0}
              % der Gesamtzahl
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Level Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Statistik nach Zertifizierungsstufe</CardTitle>
            <Link href="/dashboard/admin/certification-levels/users">
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Detaillierte Übersicht →
              </button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-center text-secondary-500 py-8">
              Keine Daten verfügbar
            </p>
          ) : (
            <div className="space-y-6">
              {stats.map((stat) => (
                <div key={stat.levelId} className="border-b border-secondary-200 pb-6 last:border-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-secondary-900 mb-1">
                        {stat.levelName}
                      </h3>
                      <div className="flex gap-4 text-sm">
                        <span className="text-secondary-600">
                          <span className="font-semibold">{stat.totalAchieved}</span> erreicht
                        </span>
                        <span className="text-success-600">
                          <span className="font-semibold">{stat.validCount}</span> gültig
                        </span>
                        {stat.invalidCount > 0 && (
                          <span className="text-warning-600">
                            <span className="font-semibold">{stat.invalidCount}</span> ungültig
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="primary">{stat.totalAchieved}</Badge>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success-600 rounded-full"
                        style={{
                          width: `${
                            stat.totalAchieved > 0
                              ? (stat.validCount / stat.totalAchieved) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-secondary-500 mt-1">
                      {stat.totalAchieved > 0
                        ? Math.round((stat.validCount / stat.totalAchieved) * 100)
                        : 0}
                      % gültige Zertifizierungen
                    </p>
                  </div>

                  {/* Recent Achievements */}
                  {stat.recentAchievements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-secondary-700 mb-2">
                        Neueste Erfolge:
                      </p>
                      <div className="space-y-1">
                        {stat.recentAchievements.map((achievement, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-secondary-700">
                              {achievement.userName || achievement.userEmail}
                            </span>
                            <span className="text-secondary-500">
                              {new Date(achievement.achievedAt).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
