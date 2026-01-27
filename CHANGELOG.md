# Changelog

Alle bedeutenden Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [1.0.0] - 2026-01-27

### Hinzugefügt

#### Kernfunktionalität
- **Benutzer-Management**: Multi-Rollen-System (Admin, Instructor, Learner, Reviewer)
- **Kurs-Management**: Vollständiges CRUD für Kurse mit Draft→Submitted→In Review→Approved Workflow
- **Modul-System**: Hierarchische Kursstruktur mit Modulen und Lektionen
- **Lektion-Types**: TEXT, VIDEO, AUDIO, PDF, INTERACTIVE, POWERPOINT
- **Quiz-System**: Modulbasierte Quizze mit 4 Fragetypen (YES_NO, SINGLE_CHOICE, MULTIPLE_CHOICE, MATCHING)
- **Fortschrittstracking**: Automatisches Tracking von Lektionen-, Modul- und Kurs-Fortschritt
- **Einschreibungen**: Credit-basiertes Einschreibungssystem mit Transaktionshistorie

#### Zertifikate
- **Automatische Zertifikatsgenerierung**: Bei Kursabschluss mit Puppeteer-basierter PDF-Generierung
- **Ablaufdatum-Optionen**: NEVER, FIXED_DATE, PERIOD_DAYS/MONTHS/YEARS
- **IHK-Style Design**: Professionelle Zertifikatsvorlage mit Logo und Wasserzeichen
- **Zertifikatsnummer-System**: Eindeutige Nummerierung mit konfigurierbarem Präfix

#### PowerPoint-Integration
- **Microsoft Office Online Viewer**: Einbettung von PowerPoint-Präsentationen mit vollständigen Animationen
- **Token-basierte Sicherheit**: JWT-Tokens mit 12-Stunden-Gültigkeit
- **Tablet-Optimierung**: Touch-optimierte Bedienung für iOS und Android
- **Localhost-Handling**: Entwickler-freundliche Warnung mit Download-Fallback

#### Zugriffsverwaltung
- **Benutzergruppen**: Erstellen und Verwalten von Benutzergruppen
- **Kurszugriff**: Granulare Zugriffskontrolle (ALL, GROUP, USER)
- **Zertifizierungsstufen**: Partner-Level-System mit automatischer Zertifizierung

#### Kredit-System
- **Kredit-Guthaben**: Benutzer haben Kredit-Balance für Kurseinschreibungen
- **Transaktionshistorie**: Vollständige Historie aller Kredit-Transaktionen
- **Admin-Anpassungen**: Admins können Credits manuell anpassen

#### Einstellungen
- **App-Einstellungen**: Konfigurierbare Seitentitel, Logo, Favicon
- **Rechtliches**: Links zu Datenschutz und Impressum
- **PublicUrl**: Konfigurierbare öffentliche URL für externe Services
- **Kursnummern-Präfix**: Anpassbares Präfix für Zertifikatsnummern

#### UI/UX
- **Dashboard**: Rollenbasierte Dashboards mit Statistiken
- **Responsive Design**: Mobile-first Design mit TailwindCSS
- **File Upload**: Drag-and-drop Upload mit Fortschrittsanzeige
- **PDF Viewer**: Eingebetteter PDF-Viewer für Lektionen
- **Quiz-Navigation**: "Zum nächsten Modul"-Button nach Quiz-Abschluss

#### Technische Features
- **Next.js 14 App Router**: Moderne React-Architektur
- **Prisma ORM**: Type-safe Datenbankzugriff
- **NextAuth.js**: JWT-basierte Authentifizierung
- **PostgreSQL**: Robuste Datenbank mit komplexen Relationen
- **TypeScript**: Vollständige Type-Safety

### Sicherheit
- **JWT-basierte Sessions**: Sichere Token-basierte Authentifizierung
- **Bcrypt Passwort-Hashing**: Sichere Passwort-Speicherung
- **Enrollment-Prüfung**: Strikte Zugriffskontrolle auf Kursinhalte
- **Token-geschützte Dateien**: PowerPoint-Dateien nur mit gültigem Token zugänglich

[1.0.0]: https://github.com/IHR-USERNAME/learnhub/releases/tag/v1.0.0
