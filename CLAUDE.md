# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LearnHub is a Learning Management System (LMS) built with Next.js 14, Prisma, NextAuth, and PostgreSQL. It supports multi-role user management (Admin, Instructor, Learner, Reviewer), course creation with modules and lessons, quiz systems, certificates with expiry tracking, and a credit-based enrollment system.

## Development Commands

### Setup and Database
```bash
# Install dependencies
npm install

# Database migrations
npm run db:push              # Push schema changes to database
npm run db:studio            # Open Prisma Studio (database GUI)
npm run db:seed              # Seed database with test data
```

### Running the Application
```bash
npm run dev                  # Development server (http://localhost:3000)
npm run build                # Production build
npm run start                # Start production server
npm run lint                 # Run ESLint
```

### Test Accounts (after seeding)
All test users have password: `Test1234!`
- Admin: `admin@learnhub.local`
- Instructor: `trainer@learnhub.local`
- Learner: `user@learnhub.local`

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT strategy and credential provider
- **File Storage**: Local filesystem (`/public/uploads/`)

### Key Architectural Patterns

**App Router Structure**:
- Route groups used for layout isolation: `app/(dashboard)/` contains all authenticated pages
- Middleware (`src/middleware.ts`) protects dashboard routes and enforces role-based access
- API routes in `app/api/` follow RESTful patterns with dynamic segments

**Authentication Flow**:
- JWT-based sessions via NextAuth.js
- User credentials validated against bcrypt-hashed passwords in database
- Session includes `userId` and `userRole` for authorization
- Auth config in `src/lib/auth.ts`, middleware enforces access control

**Database Architecture** (see `prisma/schema.prisma`):
- **Multi-tenancy**: `Organization` model supports multiple orgs with separate license pools
- **Course hierarchy**: `Course` → `Module` → `Lesson` (ordered, cascading deletes)
- **Progress tracking**: `Enrollment`, `LessonProgress`, `ModuleProgress` track user completion
- **Quiz system**: `ModuleQuiz` attached to modules with `QuizQuestion`, `QuizAttempt`, `QuizAnswer`
- **Certificates**: Auto-generated on course completion with configurable expiry (NEVER, FIXED_DATE, PERIOD_DAYS/MONTHS/YEARS)
- **Access control**: `CourseAccess` model with types ALL/GROUP/USER controls visibility
- **Credit system**: `CreditHistory` tracks transactions (PURCHASE, ENROLLMENT, REFUND, ADMIN_ADJUST, BONUS)

**Role-Based Access**:
- `LEARNER`: Enroll in courses, complete lessons/quizzes, view certificates
- `INSTRUCTOR`: Create/edit own courses (draft → submitted → reviewer approval)
- `REVIEWER`: Approve/reject submitted courses
- `ADMIN`: Full access including user management, settings, user groups, credit adjustments

**Course Lifecycle**:
1. Instructor creates course (status: DRAFT)
2. Instructor submits for review (status: SUBMITTED)
3. Reviewer changes status to IN_REVIEW, then APPROVED or REJECTED
4. Approved courses become visible based on `startDate`/`endDate` and `CourseAccess` rules
5. Learners enroll (may require credits), complete lessons/quizzes
6. Upon completion, certificate auto-generated via `checkCourseCompletionAndCreateCertificate()` in `src/lib/course-completion.ts`

**File Uploads**:
- Handled via `/api/upload` route
- Files stored in `/public/uploads/pdf/` and `/public/uploads/video/`
- `FileUpload.tsx` component handles client-side uploads with progress
- `PDFViewer.tsx` component for in-app PDF rendering

### Component Structure

**UI Components** (`src/components/ui/`):
- Custom design system components: Button, Input, Card, Modal, Sidebar, Badge, Avatar, etc.
- Exported via barrel file `ui/index.ts`
- TailwindCSS with custom color system (primary, secondary, accent, success, warning, danger)

**Feature Components**:
- `CourseAccessManager.tsx`: Manage course visibility (ALL/GROUP/USER)
- `CourseProgressBar.tsx`: Visual progress indicator for course completion
- `QuizEditor.tsx`: Rich editor for creating YES_NO, SINGLE_CHOICE, MULTIPLE_CHOICE, MATCHING questions
- `FileUpload.tsx`: Multi-file upload with drag-and-drop
- `PDFViewer.tsx`: Embedded PDF viewer with navigation

**Layout**:
- `app/(dashboard)/layout.tsx`: Sidebar navigation, role-based menu items, header stats, collapsible sidebar
- Fetches `AppSettings` for branding (logo, site title, privacy/imprint links)
- Header displays dynamic badges: available courses, pending reviews (admin), expiring certificates

### Important Files and Patterns

**Database Access**:
- `src/lib/db.ts`: Singleton Prisma client instance
- Always use `db` export, never instantiate `PrismaClient` directly
- Development: Prisma client attached to `globalThis` to prevent hot-reload issues

**Utilities**:
- `src/lib/utils.ts`: Utility functions (likely includes className merging with `clsx` and `tailwind-merge`)
- `src/lib/course-completion.ts`: Core business logic for certificate generation with Puppeteer
- `src/lib/pdf-generator.ts`: Puppeteer-based PDF generation service
- `src/lib/certificate-template.ts`: HTML/CSS template for professional IHK-style certificates

**Type Safety**:
- `src/types/next-auth.d.ts`: Extends NextAuth types with custom `role` field on session
- Prisma generates types in `.prisma/client` - import enums like `Role`, `CourseStatus`, `LessonType`

**Environment Variables** (`.env.example`):
```
DATABASE_URL=postgresql://postgres:postgres@db:5432/learnhub
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=http://localhost:3000
```

## Common Workflows

### Creating a New Feature with Database Changes
1. Update `prisma/schema.prisma`
2. Run `npm run db:push` to apply changes
3. Update `prisma/seed.ts` if needed for test data
4. Create API routes in `app/api/`
5. Create UI components and pages
6. Update TypeScript types if needed

### Adding a New API Endpoint
- Create `app/api/[resource]/route.ts` for collection endpoints
- Use `app/api/[resource]/[id]/route.ts` for single-resource endpoints
- Export named functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Always validate session with `getServerSession(authOptions)`
- Return `NextResponse.json()` with appropriate status codes
- Use Zod for request body validation

### Creating a New Dashboard Page
1. Add page in `app/(dashboard)/dashboard/[page]/page.tsx`
2. Update navigation array in `app/(dashboard)/layout.tsx` if needed
3. For admin-only pages, middleware automatically restricts access to `/dashboard/users` and `/dashboard/settings`
4. For other role restrictions, check `session?.user?.role` in the page component

### Working with Quizzes
- Module quizzes are optional but can be marked `isRequired`
- Questions support 4 types: YES_NO, SINGLE_CHOICE, MULTIPLE_CHOICE, MATCHING
- MATCHING questions use `options` field with pairs: `[{left, right, correctMatch}]`
- Quiz attempts track score, percentage, and pass/fail based on `passingScore` threshold
- `maxAttempts` of 0 means unlimited attempts
- Required quizzes must be passed before certificate is issued

### Certificate Generation
- Triggered automatically when course completion detected
- Completion requires: all lessons completed + all required quizzes passed
- Certificate number format: `{courseNumberPrefix}-{year}-{5-digit-count}`
- Expiry calculated based on course settings (NEVER/FIXED_DATE/PERIOD_*)
- **PDF Generation**: Uses Puppeteer to render professional IHK-style certificates from HTML/CSS templates
  - Template in `src/lib/certificate-template.ts` generates branded HTML with logo, vertical text, watermark
  - PDF generator in `src/lib/pdf-generator.ts` launches headless browser for high-quality A4 output
  - Generated PDFs stored as binary data in `certificate.pdfData` column (Bytes type)
  - Cached in database to avoid regeneration on subsequent downloads
- Stored data includes snapshot of course info (persists even if course deleted)
- Download endpoint: `/api/certificates/[id]/download`
- **Certificate Regeneration**: If admin deletes a certificate, user can regenerate it via course detail page
  - POST `/api/certificates` creates new certificate with fresh PDF when clicking "Zertifikat erstellen" button
  - Admin can delete certificates via `/api/users/[id]/certificates?certificateId=X` or `/api/certificates/[id]`
  - UI automatically shows "Zertifikat erstellen" button when course is completed but certificate doesn't exist

### User Groups and Course Access
- Admin creates user groups (`/dashboard/admin/user-groups`)
- Assign users to groups via API: `POST /api/user-groups/[id]/members`
- Set course access via `CourseAccessManager` component:
  - ALL: Visible to all active users
  - GROUP: Only visible to members of specified groups
  - USER: Individual user access (less common)
- Multiple access rules can exist per course (union of access)

### Credits System
- Users have `credits` field (integer balance)
- Courses have `creditCost` (0 = free)
- Enrollment deducts credits and creates `CreditHistory` record
- Admin can adjust credits via `/api/users/[id]/credits` endpoint
- All transactions logged with type, amount, balance, and description

## Code Style and Conventions

- Use TypeScript for all new files
- Follow existing component patterns (especially in `src/components/ui/`)
- Prefer server components by default; use `'use client'` only when needed (state, effects, browser APIs)
- Use Prisma transactions for multi-step database operations
- Always handle errors and return meaningful HTTP status codes
- Use the role-based permission pattern consistently across API routes
- TailwindCSS: Use design system colors (primary-*, secondary-*, etc.) not arbitrary values
