import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Delete certificate (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Only admins can delete certificates
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const certificate = await db.certificate.findUnique({
      where: { id: params.id },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Zertifikat nicht gefunden' },
        { status: 404 }
      )
    }

    // Delete certificate
    await db.certificate.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Certificate deletion error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Zertifikats' },
      { status: 500 }
    )
  }
}
