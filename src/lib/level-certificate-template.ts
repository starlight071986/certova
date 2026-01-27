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

export function generateLevelCertificateHTML(data: LevelCertificateData): string {
  const formattedAchievedDate = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(data.achievedAt)

  const formattedExpiryDate = data.expiresAt
    ? new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(data.expiresAt)
    : null

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zertifizierungsstufe - ${data.userName}</title>
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
      font-size: 32px;
      font-weight: 300;
      letter-spacing: 10px;
      color: rgba(0, 60, 120, 0.4);
      text-transform: uppercase;
    }

    /* Wasserzeichen */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px;
      font-weight: 100;
      color: rgba(0, 60, 120, 0.03);
      letter-spacing: 15px;
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

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0056b3;
    }

    .logo {
      max-width: 180px;
      max-height: 80px;
      object-fit: contain;
    }

    .header-info {
      text-align: right;
    }

    .header-title {
      font-size: 28px;
      font-weight: 700;
      color: #0056b3;
      margin-bottom: 5px;
    }

    .cert-number {
      font-size: 12px;
      color: #666;
      font-weight: 500;
      letter-spacing: 1px;
    }

    /* Main Content */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 20px 0;
    }

    .cert-type {
      text-align: center;
      font-size: 16px;
      color: #0056b3;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 30px;
    }

    .level-badge {
      text-align: center;
      margin-bottom: 40px;
    }

    .level-name {
      font-size: 42px;
      font-weight: 700;
      color: #0056b3;
      line-height: 1.2;
      margin-bottom: 10px;
    }

    .level-description {
      font-size: 16px;
      color: #666;
      line-height: 1.5;
    }

    .recipient-section {
      text-align: center;
      margin: 40px 0;
    }

    .recipient-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }

    .recipient-name {
      font-size: 32px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 10px;
    }

    .custom-text {
      font-size: 20px;
      color: #0056b3;
      font-style: italic;
      margin-top: 10px;
    }

    /* Courses Section */
    .courses-section {
      background: rgba(0, 86, 179, 0.05);
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }

    .courses-title {
      font-size: 16px;
      font-weight: 600;
      color: #0056b3;
      margin-bottom: 15px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .courses-list {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 10px;
    }

    .course-item {
      display: flex;
      align-items: center;
      font-size: 13px;
      color: #333;
      padding: 8px;
      background: white;
      border-radius: 6px;
    }

    .course-item::before {
      content: '✓';
      display: inline-block;
      width: 20px;
      height: 20px;
      background: #28a745;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 20px;
      font-weight: bold;
      font-size: 12px;
      margin-right: 10px;
      flex-shrink: 0;
    }

    /* Date Section */
    .date-section {
      text-align: center;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 2px solid #e0e0e0;
    }

    .date-row {
      display: flex;
      justify-content: center;
      gap: 60px;
      margin-top: 15px;
    }

    .date-item {
      text-align: center;
    }

    .date-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }

    .date-value {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .expiry-warning {
      font-size: 11px;
      color: #dc3545;
      margin-top: 10px;
      font-style: italic;
    }

    /* Footer */
    .footer {
      margin-top: auto;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      font-size: 11px;
      color: #666;
    }

    .footer-note {
      line-height: 1.6;
    }

    /* Decorative Elements */
    .decorative-corner {
      position: absolute;
      width: 80px;
      height: 80px;
    }

    .corner-top-left {
      top: 30px;
      left: 30px;
      border-top: 4px solid rgba(0, 86, 179, 0.2);
      border-left: 4px solid rgba(0, 86, 179, 0.2);
    }

    .corner-bottom-right {
      bottom: 30px;
      right: 90px;
      border-bottom: 4px solid rgba(0, 86, 179, 0.2);
      border-right: 4px solid rgba(0, 86, 179, 0.2);
    }
  </style>
</head>
<body>
  <!-- Decorative Elements -->
  <div class="decorative-corner corner-top-left"></div>
  <div class="decorative-corner corner-bottom-right"></div>

  <!-- Vertical Text -->
  <div class="vertical-text">
    <span>Zertifikat</span>
  </div>

  <!-- Watermark -->
  <div class="watermark">Zertifikat</div>

  <!-- Main Content -->
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div>
        ${
          data.logoUrl
            ? `<img src="${data.logoUrl}" alt="Logo" class="logo">`
            : `<div class="header-title">${data.siteTitle || 'LearnHub'}</div>`
        }
      </div>
      <div class="header-info">
        <div class="cert-number">Zertifikat-Nr.: ${data.certificateNumber}</div>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="cert-type">Zertifizierungsstufe</div>

      <div class="level-badge">
        <div class="level-name">${data.levelName}</div>
        ${
          data.levelDescription
            ? `<div class="level-description">${data.levelDescription}</div>`
            : ''
        }
      </div>

      <div class="recipient-section">
        <div class="recipient-label">Verliehen an</div>
        <div class="recipient-name">${data.userName}</div>
      </div>

      <div class="courses-section">
        <div class="courses-title">Erfolgreich abgeschlossene Kurse</div>
        <ul class="courses-list">
          ${data.courses.map((course) => `<li class="course-item">${course.title}</li>`).join('')}
        </ul>
      </div>

      <div class="date-section">
        <div class="date-row">
          <div class="date-item">
            <div class="date-label">Erreicht am</div>
            <div class="date-value">${formattedAchievedDate}</div>
          </div>
          ${
            formattedExpiryDate
              ? `
          <div class="date-item">
            <div class="date-label">Gültig bis</div>
            <div class="date-value">${formattedExpiryDate}</div>
          </div>
          `
              : '<div class="date-item"><div class="date-label">Gültigkeit</div><div class="date-value">Unbegrenzt</div></div>'
          }
        </div>
        ${
          data.expiresAt
            ? '<div class="expiry-warning">Dieses Zertifikat verliert seine Gültigkeit, wenn eines der zugeordneten Kurszertifikate abläuft.</div>'
            : ''
        }
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-note">
        Dieses Zertifikat bescheinigt, dass die genannte Person alle erforderlichen Kurse<br>
        erfolgreich absolviert und die Zertifizierungsstufe <strong>${data.levelName}</strong> erreicht hat.
      </div>
    </div>
  </div>
</body>
</html>`
}
