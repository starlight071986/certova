'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  Avatar,
  Badge,
} from '@/components/ui'
import Footer from '@/components/Footer'

interface HeaderStats {
  availableCourses: number
  pendingReviews: number
  expiringCertificates: number
}

interface AppSettings {
  siteTitle: string
  logoUrl: string | null
  privacyPolicyUrl: string | null
  imprintUrl: string | null
}

// Icons als SVG-Komponenten
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const CertificateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const ReviewIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)

const LevelsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [headerStats, setHeaderStats] = useState<HeaderStats | null>(null)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    fetchHeaderStats()
    fetchAppSettings()
  }, [])

  const fetchHeaderStats = async () => {
    try {
      const res = await fetch('/api/header-stats')
      if (res.ok) {
        const data = await res.json()
        setHeaderStats(data)
      }
    } catch (error) {
      console.error('Error fetching header stats:', error)
    }
  }

  const fetchAppSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setAppSettings(data)
      }
    } catch (error) {
      console.error('Error fetching app settings:', error)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Meine Kurse', href: '/dashboard/courses', icon: BookIcon },
    { name: 'Zertifizierungsstufen', href: '/dashboard/certification-levels', icon: LevelsIcon },
    { name: 'Zertifikate', href: '/dashboard/certificates', icon: CertificateIcon },
  ]

  const adminNavigation = [
    { name: 'Kursprüfung', href: '/dashboard/review', icon: ReviewIcon },
    { name: 'Benutzer', href: '/dashboard/users', icon: UsersIcon },
    { name: 'Benutzergruppen', href: '/dashboard/admin/user-groups', icon: UsersIcon },
    { name: 'Zertifizierungsstufen', href: '/dashboard/admin/certification-levels', icon: CertificateIcon },
    { name: 'Berichte', href: '/dashboard/admin/reports', icon: ChartIcon },
    { name: 'Einstellungen', href: '/dashboard/settings', icon: SettingsIcon },
  ]

  return (
    <div className="flex h-screen bg-secondary-50">
      {/* Sidebar */}
      <Sidebar collapsed={!sidebarOpen} width="md">
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
            <img
              src={appSettings?.logoUrl || '/assets/certova-logo_only-Farbe.svg'}
              alt={appSettings?.siteTitle || 'Certova'}
              className="h-8 object-contain flex-shrink-0"
              style={{ maxWidth: sidebarOpen ? '160px' : '32px' }}
            />
            {sidebarOpen && (
              <span className="text-lg font-bold text-primary-900">
                {appSettings?.siteTitle || 'Certova'}
              </span>
            )}
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarSection>
            {navigation.map((item) => (
              <SidebarItem
                key={item.name}
                href={item.href}
                icon={<item.icon />}
                active={pathname === item.href}
              >
                {sidebarOpen && item.name}
              </SidebarItem>
            ))}
          </SidebarSection>

          {isAdmin && (
            <SidebarSection title={sidebarOpen ? 'Administration' : undefined}>
              {adminNavigation.map((item) => (
                <SidebarItem
                  key={item.name}
                  href={item.href}
                  icon={<item.icon />}
                  active={pathname === item.href}
                >
                  {sidebarOpen && item.name}
                </SidebarItem>
              ))}
            </SidebarSection>
          )}
        </SidebarContent>

        <SidebarFooter>
          <Link
            href="/dashboard/profile"
            className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} hover:bg-secondary-100 rounded-lg p-2 -m-2 transition-colors`}
          >
            <Avatar
              name={session?.user?.name || 'Benutzer'}
              src={session?.user?.image}
              size="sm"
              status="online"
            />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 truncate">
                  {session?.user?.name || 'Benutzer'}
                </p>
                <p className="text-xs text-secondary-500 truncate">
                  {session?.user?.role === 'ADMIN' ? 'Administrator' :
                   session?.user?.role === 'INSTRUCTOR' ? 'Kursersteller' : 'Lernender'}
                </p>
              </div>
            )}
          </Link>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-secondary-200 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100"
          >
            <MenuIcon />
          </button>

          <div className="flex items-center gap-4">
            {headerStats && (
              <>
                {headerStats.availableCourses > 0 && (
                  <Link href="/dashboard/courses">
                    <Badge variant="accent" dot className="cursor-pointer hover:opacity-80">
                      {headerStats.availableCourses} {headerStats.availableCourses === 1 ? 'Kurs' : 'Kurse'} verfügbar
                    </Badge>
                  </Link>
                )}
                {isAdmin && headerStats.pendingReviews > 0 && (
                  <Link href="/dashboard/review">
                    <Badge variant="warning" dot className="cursor-pointer hover:opacity-80">
                      {headerStats.pendingReviews} zur Prüfung
                    </Badge>
                  </Link>
                )}
                {headerStats.expiringCertificates > 0 && (
                  <Link href="/dashboard/certificates">
                    <Badge variant="danger" dot className="cursor-pointer hover:opacity-80">
                      {headerStats.expiringCertificates} {headerStats.expiringCertificates === 1 ? 'Zertifikat läuft' : 'Zertifikate laufen'} bald ab
                    </Badge>
                  </Link>
                )}
              </>
            )}
            <button
              className="flex items-center gap-2 text-secondary-600 hover:text-danger-600 transition-colors"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogoutIcon />
              <span className="hidden sm:inline text-sm">Abmelden</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
