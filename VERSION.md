# Versionierungs-Richtlinien

Dieses Dokument beschreibt die Versionierungsstrategie für LearnHub LMS.

## Semantic Versioning

LearnHub folgt [Semantic Versioning 2.0.0](https://semver.org/lang/de/).

Format: **MAJOR.MINOR.PATCH** (z.B. 1.2.3)

## Wann welche Version erhöhen?

### MAJOR Version (X.0.0)

Erhöhe die MAJOR-Version bei **Breaking Changes**, die bestehende Funktionalität grundlegend ändern:

#### Beispiele für MAJOR-Version-Updates:
- ✅ Entfernen von Features oder API-Endpunkten
- ✅ Änderung der Datenbank-Schema-Struktur mit Breaking Changes (z.B. Umbenennung von Feldern)
- ✅ Änderung der Authentifizierungs-Mechanismen
- ✅ Umstellung auf eine neue Framework-Version mit Breaking Changes
- ✅ Änderung der URL-Struktur (z.B. von `/courses/[id]` zu `/c/[id]`)
- ✅ Entfernen von Lesson-Types
- ✅ Änderung der API-Response-Struktur, die bestehende Integrationen bricht

#### Prozess:
```bash
npm version major
git push origin main --tags
```

### MINOR Version (x.Y.0)

Erhöhe die MINOR-Version bei **neuen Features**, die backwards-compatible sind:

#### Beispiele für MINOR-Version-Updates:
- ✅ Neue Lesson-Types (wie POWERPOINT in 1.0.0)
- ✅ Neue Module/Features (z.B. Forum, Chat, Live-Sessions)
- ✅ Neue API-Endpunkte (ohne Änderung bestehender)
- ✅ Neue UI-Komponenten oder Dashboard-Bereiche
- ✅ Datenbank-Schema-Erweiterungen (additive, z.B. neue Felder mit Default-Werten)
- ✅ Neue Einstellungs-Optionen (wie publicUrl in 1.0.0)
- ✅ Neue Integrations-Optionen (z.B. OAuth-Provider, Payment-Gateways)
- ✅ Neue Zertifizierungs-Features

#### Prozess:
```bash
npm version minor
git push origin main --tags
```

### PATCH Version (x.x.Z)

Erhöhe die PATCH-Version bei **Bug Fixes** und kleinen Verbesserungen:

#### Beispiele für PATCH-Version-Updates:
- ✅ Bug Fixes (z.B. Korrektur des 403-Fehlers bei PowerPoint-Viewing)
- ✅ UI/UX-Verbesserungen ohne neue Features
- ✅ Performance-Optimierungen
- ✅ Sicherheits-Patches
- ✅ Dokumentations-Updates
- ✅ Dependency-Updates (ohne Breaking Changes)
- ✅ Verbesserung von Fehlermeldungen
- ✅ Accessibility-Verbesserungen

#### Prozess:
```bash
npm version patch
git push origin main --tags
```

## Automatisierter Workflow

### 1. Version Update mit npm

```bash
# Für PATCH (Bug Fixes)
npm version patch -m "chore: bump version to %s"

# Für MINOR (neue Features)
npm version minor -m "feat: bump version to %s"

# Für MAJOR (Breaking Changes)
npm version major -m "chore!: bump version to %s"
```

Dies aktualisiert automatisch:
- `package.json` Version
- Erstellt einen Git-Commit mit der Version
- Erstellt einen Git-Tag (z.B. `v1.2.3`)

### 2. CHANGELOG.md Update

Vor jedem Version-Update:

1. Öffne `CHANGELOG.md`
2. Füge neuen Abschnitt mit Version und Datum hinzu:
   ```markdown
   ## [1.2.3] - 2026-02-15

   ### Hinzugefügt
   - Neue Feature-Beschreibung

   ### Geändert
   - Änderungen an bestehender Funktionalität

   ### Behoben
   - Bug Fix-Beschreibung

   ### Entfernt
   - Entfernte Features
   ```

3. Commit CHANGELOG.md:
   ```bash
   git add CHANGELOG.md
   git commit -m "docs: update CHANGELOG for v1.2.3"
   ```

### 3. Git Tag Push

Nach `npm version`:

```bash
git push origin main --tags
```

### 4. GitHub Release (optional)

Auf GitHub:
1. Gehe zu "Releases"
2. "Create a new release"
3. Wähle den Tag (z.B. `v1.2.3`)
4. Kopiere den CHANGELOG-Eintrag in die Release Notes
5. Publish Release

## CHANGELOG Kategorien

Verwende diese Kategorien in CHANGELOG.md:

- **Hinzugefügt** (`Added`): Neue Features
- **Geändert** (`Changed`): Änderungen an bestehender Funktionalität
- **Veraltet** (`Deprecated`): Features, die bald entfernt werden
- **Entfernt** (`Removed`): Entfernte Features
- **Behoben** (`Fixed`): Bug Fixes
- **Sicherheit** (`Security`): Sicherheits-relevante Änderungen

## Entscheidungshilfe

```
Frage: Bricht die Änderung bestehende Funktionalität?
├─ JA → MAJOR
└─ NEIN
   ├─ Frage: Fügt die Änderung neue Funktionalität hinzu?
   │  ├─ JA → MINOR
   │  └─ NEIN → PATCH (Bug Fix / Verbesserung)
```

## Beispiele aus LearnHub

### MAJOR (Breaking Changes)
- ❌ Umbenennung von `Lesson.type` zu `Lesson.contentType`
- ❌ Entfernung des TEXT Lesson-Types
- ❌ Änderung der Certificate API von REST zu GraphQL

### MINOR (Neue Features)
- ✅ Hinzufügen von POWERPOINT Lesson-Type (Version 1.0.0)
- ✅ Hinzufügen von publicUrl Setting (Version 1.0.0)
- ✅ "Zum nächsten Modul"-Button im Quiz (Version 1.0.0)
- ✅ Neues Forum-Feature
- ✅ Live-Video-Sessions

### PATCH (Bug Fixes)
- ✅ Korrektur des PowerPoint 403-Fehlers
- ✅ Verbesserung der Localhost-Warnung
- ✅ Performance-Optimierung der Datenbank-Queries
- ✅ Korrektur von TypeScript-Typen

## Version Display

Die aktuelle Version wird angezeigt:
- Im Footer der Anwendung (unten rechts)
- In `package.json`
- In Git Tags
- In GitHub Releases

## Kommunikation

Bei neuen Releases:
- **MAJOR**: Migrations-Guide im CHANGELOG + Release Notes + Ankündigung
- **MINOR**: Release Notes mit Feature-Beschreibung
- **PATCH**: Kurze Erwähnung in Release Notes
