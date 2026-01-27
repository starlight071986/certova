import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Get app settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Get or create default settings
    let settings = await db.appSettings.findFirst()
    if (!settings) {
      settings = await db.appSettings.create({
        data: { id: 'default' },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Einstellungen' }, { status: 500 })
  }
}

// Update app settings (admin only)
const updateSettingsSchema = z.object({
  publicUrl: z.string().url().optional().nullable(),
  courseNumberPrefix: z.string().min(1).max(5).optional(),
  siteTitle: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  privacyPolicyUrl: z.string().url().optional().nullable(),
  imprintUrl: z.string().url().optional().nullable(),
})

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const result = updateSettingsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    // Ensure settings exist
    let settings = await db.appSettings.findFirst()
    if (!settings) {
      settings = await db.appSettings.create({
        data: { id: 'default' },
      })
    }

    // Build update data
    const updateData: any = {}
    if (result.data.publicUrl !== undefined) {
      updateData.publicUrl = result.data.publicUrl
    }
    if (result.data.courseNumberPrefix !== undefined) {
      updateData.courseNumberPrefix = result.data.courseNumberPrefix
    }
    if (result.data.siteTitle !== undefined) {
      updateData.siteTitle = result.data.siteTitle
    }
    if (result.data.logoUrl !== undefined) {
      updateData.logoUrl = result.data.logoUrl
    }
    if (result.data.faviconUrl !== undefined) {
      updateData.faviconUrl = result.data.faviconUrl
    }
    if (result.data.privacyPolicyUrl !== undefined) {
      updateData.privacyPolicyUrl = result.data.privacyPolicyUrl
    }
    if (result.data.imprintUrl !== undefined) {
      updateData.imprintUrl = result.data.imprintUrl
    }

    // Update settings
    const updatedSettings = await db.appSettings.update({
      where: { id: settings.id },
      data: updateData,
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Fehler beim Speichern der Einstellungen' }, { status: 500 })
  }
}
