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

export function generateCertificateHTML(data: CertificateData): string {
  const formattedDate = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data.completedAt)

  const formattedDateLong = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(data.completedAt)

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zertifikat - ${data.userName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 0;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
      background: linear-gradient(to bottom right, #ffffff 0%, #f8f9fa 100%);
      position: relative;
      width: 210mm;
      height: 297mm;
      padding: 0;
      margin: 0;
    }

    /* Seitenrand rechts mit vertikalem Text */
    .vertical-text {
      position: absolute;
      right: 0;
      top: 0;
      width: 60px;
      height: 100%;
      background: linear-gradient(180deg, #e8f1f8 0%, #b8d4e8 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .vertical-text span {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 36px;
      font-weight: 300;
      letter-spacing: 12px;
      color: rgba(0, 60, 120, 0.4);
      text-transform: uppercase;
    }

    /* Wasserzeichen */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      font-weight: 100;
      color: rgba(0, 60, 120, 0.03);
      letter-spacing: 20px;
      text-transform: uppercase;
      z-index: 0;
      user-select: none;
    }

    /* Content Container */
    .container {
      position: relative;
      z-index: 1;
      width: calc(100% - 60px);
      height: 100%;
      padding: 50px 60px;
      display: flex;
      flex-direction: column;
    }

    /* Header mit Logo */
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 60px;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo {
      width: 80px;
      height: 80px;
      object-fit: contain;
    }

    .logo-fallback {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #0056b3 0%, #003d82 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      font-weight: bold;
    }

    .organization-info {
      display: flex;
      flex-direction: column;
    }

    .organization-name {
      font-size: 16px;
      font-weight: 600;
      color: #0056b3;
      line-height: 1.3;
    }

    .organization-subtitle {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    /* Haupttitel ZERTIFIKAT */
    .title {
      text-align: center;
      font-size: 56px;
      font-weight: 300;
      letter-spacing: 18px;
      color: #003d82;
      margin-bottom: 60px;
      text-transform: uppercase;
    }

    /* Name des Teilnehmers */
    .participant-name {
      text-align: center;
      font-size: 36px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 40px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 20px;
    }

    /* Einleitungstext */
    .intro-text {
      text-align: center;
      font-size: 14px;
      color: #555;
      margin-bottom: 30px;
      line-height: 1.6;
    }

    /* Kursname */
    .course-title {
      text-align: center;
      font-size: 32px;
      font-weight: 600;
      color: #0056b3;
      margin-bottom: 20px;
      line-height: 1.3;
    }

    /* "mit Erfolg teilgenommen" */
    .success-text {
      text-align: center;
      font-size: 16px;
      color: #333;
      margin-bottom: 40px;
      font-style: italic;
    }

    /* Kursbeschreibung */
    .course-description {
      font-size: 13px;
      line-height: 1.8;
      color: #333;
      margin-bottom: 30px;
      text-align: justify;
      padding: 0 20px;
    }

    /* Footer mit Unterschrift */
    .footer {
      margin-top: auto;
      padding-top: 40px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .signature-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .signature-line {
      font-size: 12px;
      color: #666;
      margin-bottom: 3px;
    }

    .signature-name {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .date-location {
      text-align: right;
      font-size: 13px;
      color: #555;
    }

    /* Zertifikatsnummer */
    .certificate-number {
      position: absolute;
      bottom: 30px;
      left: 60px;
      font-size: 10px;
      color: #999;
      letter-spacing: 1px;
    }

    /* Dekoratives Element */
    .decorative-line {
      width: 80px;
      height: 3px;
      background: linear-gradient(90deg, #0056b3 0%, transparent 100%);
      margin: 0 auto 20px;
    }
  </style>
</head>
<body>
  <!-- Wasserzeichen -->
  <div class="watermark">ZERTIFIKAT</div>

  <!-- Vertikaler Text rechts -->
  <div class="vertical-text">
    <span>ZERTIFIKAT</span>
  </div>

  <!-- Hauptinhalt -->
  <div class="container">
    <!-- Header mit Logo -->
    <div class="header">
      <div class="logo-container">
        ${
          data.logoUrl
            ? `<img src="${data.logoUrl}" alt="Logo" class="logo" />`
            : `<div class="logo-fallback">${(data.siteTitle || 'LH').substring(0, 2).toUpperCase()}</div>`
        }
        <div class="organization-info">
          <div class="organization-name">${data.siteTitle || 'LearnHub'}</div>
          <div class="organization-subtitle">Learning Management System</div>
        </div>
      </div>
    </div>

    <!-- Titel ZERTIFIKAT -->
    <div class="title">ZERTIFIKAT</div>

    <!-- Dekorative Linie -->
    <div class="decorative-line"></div>

    <!-- Name des Teilnehmers -->
    <div class="participant-name">${data.userName}</div>

    <!-- Einleitungstext -->
    <div class="intro-text">
      hat am ${formattedDate} erfolgreich die Qualifizierung
    </div>

    <!-- Kursname -->
    <div class="course-title">${data.courseTitle}</div>

    <!-- "mit Erfolg teilgenommen" -->
    <div class="success-text">mit Erfolg abgeschlossen.</div>

    <!-- Kursbeschreibung -->
    ${
      data.courseDescription
        ? `<div class="course-description">
        ${data.courseDescription}
      </div>`
        : ''
    }

    <!-- Footer mit Datum -->
    <div class="footer">
      <div class="date-location" style="width: 100%; text-align: center;">
        ${data.organizationName || data.siteTitle || 'LearnHub'}, ${formattedDateLong}
      </div>
    </div>

    <!-- Zertifikatsnummer -->
    <div class="certificate-number">Zertifikat-Nr.: ${data.certificateNumber}</div>
  </div>
</body>
</html>`
}
