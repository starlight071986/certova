import puppeteer from 'puppeteer'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateCertificateHTML } from './certificate-template'
import { generateLevelCertificateHTML } from './level-certificate-template'

interface CertificateData {
  userName: string
  userEmail: string
  courseTitle: string
  courseDescription?: string | null
  courseNumber?: string | null
  instructorName: string
  completedAt: Date
  certificateNumber: string
  organizationName?: string
  logoUrl?: string | null
  siteTitle?: string
}

/**
 * Converts a logo file to a base64 data URL for embedding in HTML
 * @param logoPath Path to the logo file (relative to public directory)
 * @returns Base64 data URL or null if file doesn't exist
 */
function logoToBase64(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null

  try {
    // Convert relative public path to absolute filesystem path
    const publicDir = join(process.cwd(), 'public')
    const absolutePath = logoPath.startsWith('/')
      ? join(publicDir, logoPath.substring(1))
      : join(publicDir, logoPath)

    // Read the file
    const fileBuffer = readFileSync(absolutePath)

    // Determine MIME type based on file extension
    const ext = logoPath.toLowerCase().split('.').pop()
    const mimeTypes: Record<string, string> = {
      'svg': 'image/svg+xml',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }

    const mimeType = mimeTypes[ext || ''] || 'image/png'

    // Convert to base64 data URL
    const base64 = fileBuffer.toString('base64')
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error('Error converting logo to base64:', error)
    return null
  }
}

/**
 * Generates a PDF certificate using Puppeteer
 * @param data Certificate data
 * @returns Buffer containing the PDF data
 */
export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  let browser = null

  try {
    // Launch browser with system Chromium
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    })

    const page = await browser.newPage()

    // Set viewport to A4 size
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      deviceScaleFactor: 2, // Higher quality
    })

    // Convert logo to base64 for embedding in HTML
    const logoBase64 = logoToBase64(data.logoUrl)

    // Generate HTML content with base64 logo
    const htmlContent = generateCertificateHTML({
      ...data,
      logoUrl: logoBase64
    })

    // Set content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      preferCSSPageSize: true,
    })

    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error('Error generating PDF certificate:', error)
    throw new Error('Failed to generate certificate PDF')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

interface LevelCertificateData {
  userName: string
  userEmail: string
  levelName: string
  levelDescription?: string | null
  courses: Array<{
    title: string
  }>
  achievedAt: Date
  expiresAt?: Date | null
  certificateNumber: string
  logoUrl?: string | null
  siteTitle?: string
}

/**
 * Generates a PDF certificate for a certification level using Puppeteer
 * @param data Level certificate data
 * @returns Buffer containing the PDF data
 */
export async function generateLevelCertificatePDF(data: LevelCertificateData): Promise<Buffer> {
  let browser = null

  try {
    // Launch browser with system Chromium
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    })

    const page = await browser.newPage()

    // Set viewport to A4 size
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      deviceScaleFactor: 2, // Higher quality
    })

    // Convert logo to base64 for embedding in HTML
    const logoBase64 = logoToBase64(data.logoUrl)

    // Generate HTML content with base64 logo
    const htmlContent = generateLevelCertificateHTML({
      ...data,
      logoUrl: logoBase64
    })

    // Set content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      preferCSSPageSize: true,
    })

    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error('Error generating level certificate PDF:', error)
    throw new Error('Failed to generate level certificate PDF')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
