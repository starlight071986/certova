import puppeteer from 'puppeteer'
import { generateCertificateHTML } from './certificate-template'
import { generateLevelCertificateHTML } from './level-certificate-template'

interface CertificateData {
  userName: string
  userEmail: string
  courseTitle: string
  courseDescription?: string | null
  instructorName: string
  completedAt: Date
  certificateNumber: string
  organizationName?: string
  logoUrl?: string | null
  siteTitle?: string
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

    // Generate HTML content
    const htmlContent = generateCertificateHTML(data)

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

    // Generate HTML content
    const htmlContent = generateLevelCertificateHTML(data)

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
