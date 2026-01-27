import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function Home() {
  // Check if any admin exists
  const adminCount = await db.user.count({
    where: { role: 'ADMIN' },
  })

  // If no admin exists, redirect to setup
  if (adminCount === 0) {
    redirect('/setup')
  }

  // Check if user is logged in
  const session = await getServerSession(authOptions)

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  // If not logged in, redirect to login page
  redirect('/login')
}
