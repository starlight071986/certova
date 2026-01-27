import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

export interface LogoConfig {
  baseLogoPath: string // Path to the base logo image
  text: string // Text to overlay
  textPositionX: number // X position in pixels
  textPositionY: number // Y position in pixels
  textMarginTop: number
  textMarginBottom: number
  textMarginLeft: number
  textMarginRight: number
  fontSize: number
  fontColor: string // Hex color
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
}

/**
 * Generate a custom logo with text overlay
 * @param config Logo configuration
 * @returns Buffer containing PNG image data
 */
export async function generateCustomLogo(config: LogoConfig): Promise<Buffer> {
  try {
    // Validate base logo exists
    const baseLogoAbsolutePath = path.join(process.cwd(), 'public', config.baseLogoPath)

    if (!fs.existsSync(baseLogoAbsolutePath)) {
      throw new Error(`Base logo not found at: ${baseLogoAbsolutePath}`)
    }

    // Load base logo
    const baseImage = sharp(baseLogoAbsolutePath)
    const metadata = await baseImage.metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read base logo dimensions')
    }

    const imageWidth = metadata.width
    const imageHeight = metadata.height

    // Use direct pixel positioning from top-left corner
    // If both positions are 0, center horizontally at top
    let textX = config.textPositionX
    let textY = config.textPositionY

    if (textX === 0 && textY === 0) {
      // Special case: center horizontally at top with margin
      textX = imageWidth / 2
      textY = config.textMarginTop
    } else {
      // Use direct pixel positions from top-left
      textX = config.textPositionX
      textY = config.textPositionY
    }

    // Determine text anchor based on position
    const isCenter = config.textPositionX === 0 && config.textPositionY === 0
    const textAnchor = isCenter ? 'middle' : 'start'

    // Create SVG text overlay
    const svgText = createTextSVG(
      config.text,
      imageWidth,
      imageHeight,
      textX,
      textY,
      config.fontSize,
      config.fontColor,
      config.fontFamily,
      textAnchor
    )

    // Composite text onto base image
    const result = await baseImage
      .composite([
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer()

    return result
  } catch (error) {
    console.error('Error generating custom logo:', error)
    throw error
  }
}

/**
 * Create an SVG text overlay
 */
function createTextSVG(
  text: string,
  width: number,
  height: number,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  fontFamily: string,
  textAnchor: 'start' | 'middle' | 'end'
): string {

  // Escape special characters in text
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${x}"
        y="${y}"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        fill="${color}"
        text-anchor="${textAnchor}"
        dominant-baseline="middle"
      >
        ${escapedText}
      </text>
    </svg>
  `
}

/**
 * Generate custom logo and save to database
 * Used when creating a UserCertificationLevel
 */
export async function generateAndStoreLogo(
  baseLogoUrl: string | null,
  text: string,
  logoConfig: {
    textPositionX: number
    textPositionY: number
    textMarginTop: number
    textMarginBottom: number
    textMarginLeft: number
    textMarginRight: number
    fontSize: number
    fontColor: string
    fontFamily: string
    textAlign: string
  }
): Promise<Buffer | null> {
  if (!baseLogoUrl) {
    return null
  }

  try {
    const config: LogoConfig = {
      baseLogoPath: baseLogoUrl,
      text,
      textPositionX: logoConfig.textPositionX,
      textPositionY: logoConfig.textPositionY,
      textMarginTop: logoConfig.textMarginTop,
      textMarginBottom: logoConfig.textMarginBottom,
      textMarginLeft: logoConfig.textMarginLeft,
      textMarginRight: logoConfig.textMarginRight,
      fontSize: logoConfig.fontSize,
      fontColor: logoConfig.fontColor,
      fontFamily: logoConfig.fontFamily,
      textAlign: logoConfig.textAlign as 'left' | 'center' | 'right',
    }

    const logoBuffer = await generateCustomLogo(config)
    return logoBuffer
  } catch (error) {
    console.error('Error generating and storing logo:', error)
    return null
  }
}
