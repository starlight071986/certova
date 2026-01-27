/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('Keine Daten zum Exportieren verfügbar')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? '')
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    ),
  ].join('\n')

  // Create download link
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export report to PDF format
 */
export async function exportToPDF(title: string, data: any, reportType: string) {
  try {
    // Create a temporary HTML element with the report content
    const printContent = document.createElement('div')
    printContent.style.padding = '20px'
    printContent.innerHTML = generatePDFHTML(title, data, reportType)

    // Open print dialog
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            h1 {
              color: #0056b3;
              border-bottom: 2px solid #0056b3;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            h2 {
              color: #666;
              margin-top: 30px;
              margin-bottom: 15px;
            }
            .overview {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
              margin-bottom: 30px;
            }
            .overview-card {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              background: #f9f9f9;
            }
            .overview-card .label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .overview-card .value {
              font-size: 28px;
              font-weight: bold;
              color: #0056b3;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background-color: #f5f5f5;
              font-weight: 600;
              color: #333;
            }
            tr:hover {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <div class="footer">
            <p>Generiert am ${new Date().toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
            <p>LearnHub - Learning Management System</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print()
    }, 500)
  } catch (error) {
    console.error('PDF Export Error:', error)
    alert('Fehler beim Erstellen des PDFs')
  }
}

/**
 * Generate HTML content for PDF export
 */
function generatePDFHTML(title: string, data: any, reportType: string): string {
  switch (reportType) {
    case 'courses':
      return generateCourseReportHTML(data)
    case 'users':
      return generateUserReportHTML(data)
    case 'finance':
      return generateFinanceReportHTML(data)
    case 'certificates':
      return generateCertificateReportHTML(data)
    default:
      return '<p>Unbekannter Berichtstyp</p>'
  }
}

function generateCourseReportHTML(data: any): string {
  return `
    <h1>Kursstatistiken</h1>

    <div class="overview">
      <div class="overview-card">
        <div class="label">Gesamt Kurse</div>
        <div class="value">${data.overview.totalCourses}</div>
      </div>
      <div class="overview-card">
        <div class="label">Gesamt Buchungen</div>
        <div class="value">${data.overview.totalEnrollments}</div>
      </div>
      <div class="overview-card">
        <div class="label">Durchschn. Abschlussrate</div>
        <div class="value">${data.overview.avgCompletionRate}%</div>
      </div>
    </div>

    <h2>Kursübersicht</h2>
    <table>
      <thead>
        <tr>
          <th>Kurs</th>
          <th>Instructor</th>
          <th>Status</th>
          <th>Buchungen</th>
          <th>Aktiv</th>
          <th>Abgeschlossen</th>
          <th>Abschlussrate</th>
          <th>Umsatz</th>
        </tr>
      </thead>
      <tbody>
        ${data.courses
          .map(
            (course: any) => `
          <tr>
            <td>${course.title}</td>
            <td>${course.instructor}</td>
            <td>${course.status}</td>
            <td>${course.totalEnrollments}</td>
            <td>${course.activeEnrollments}</td>
            <td>${course.completedEnrollments}</td>
            <td>${course.completionRate}%</td>
            <td>${course.revenue} Credits</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}

function generateUserReportHTML(data: any): string {
  return `
    <h1>Benutzerstatistiken</h1>

    <div class="overview">
      <div class="overview-card">
        <div class="label">Gesamt Benutzer</div>
        <div class="value">${data.overview.totalUsers}</div>
      </div>
      <div class="overview-card">
        <div class="label">Aktive Benutzer</div>
        <div class="value">${data.overview.activeUsers}</div>
      </div>
      <div class="overview-card">
        <div class="label">Gesamt Buchungen</div>
        <div class="value">${data.overview.totalEnrollments}</div>
      </div>
    </div>

    <h2>Benutzerübersicht (Top 20)</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>E-Mail</th>
          <th>Rolle</th>
          <th>Buchungen</th>
          <th>Abgeschlossen</th>
          <th>Zertifikate</th>
          <th>Credits</th>
        </tr>
      </thead>
      <tbody>
        ${data.users
          .slice(0, 20)
          .map(
            (user: any) => `
          <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.totalEnrollments}</td>
            <td>${user.completedCourses}</td>
            <td>${user.totalCertificates}</td>
            <td>${user.credits}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}

function generateFinanceReportHTML(data: any): string {
  return `
    <h1>Finanzberichte</h1>

    <div class="overview">
      <div class="overview-card">
        <div class="label">Gesamt Umsatz</div>
        <div class="value">${data.overview.totalRevenue} Credits</div>
      </div>
      <div class="overview-card">
        <div class="label">Credits ausgegeben</div>
        <div class="value">${data.overview.totalCreditsIssued}</div>
      </div>
      <div class="overview-card">
        <div class="label">Credits verbraucht</div>
        <div class="value">${data.overview.totalCreditsSpent}</div>
      </div>
    </div>

    <h2>Umsatz nach Kurs (Top 10)</h2>
    <table>
      <thead>
        <tr>
          <th>Kurs</th>
          <th>Instructor</th>
          <th>Buchungen</th>
          <th>Umsatz</th>
        </tr>
      </thead>
      <tbody>
        ${data.revenueByCourse
          .slice(0, 10)
          .map(
            (course: any) => `
          <tr>
            <td>${course.courseTitle}</td>
            <td>${course.instructor}</td>
            <td>${course.enrollments}</td>
            <td>${course.revenue} Credits</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}

function generateCertificateReportHTML(data: any): string {
  return `
    <h1>Zertifikatsberichte</h1>

    <div class="overview">
      <div class="overview-card">
        <div class="label">Gesamt Zertifikate</div>
        <div class="value">${data.overview.totalCertificates}</div>
      </div>
      <div class="overview-card">
        <div class="label">Gültig</div>
        <div class="value">${data.overview.validCertificates}</div>
      </div>
      <div class="overview-card">
        <div class="label">Abgelaufen</div>
        <div class="value">${data.overview.expiredCertificates}</div>
      </div>
      <div class="overview-card">
        <div class="label">Laufen in 30 Tagen ab</div>
        <div class="value">${data.overview.expiringIn30Days}</div>
      </div>
    </div>

    <h2>Aktuelle Zertifikate (Top 20)</h2>
    <table>
      <thead>
        <tr>
          <th>Nr</th>
          <th>Benutzer</th>
          <th>Kurs</th>
          <th>Ausgestellt</th>
          <th>Läuft ab</th>
        </tr>
      </thead>
      <tbody>
        ${data.recent
          .map(
            (cert: any) => `
          <tr>
            <td>${cert.number}</td>
            <td>${cert.user}</td>
            <td>${cert.courseTitle}</td>
            <td>${new Date(cert.issuedAt).toLocaleDateString('de-DE')}</td>
            <td>${cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString('de-DE') : 'Nie'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}
