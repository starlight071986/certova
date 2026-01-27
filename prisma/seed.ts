import { PrismaClient, Role, CourseStatus, LessonType, QuestionType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Password for all test users: Test1234!
  const passwordHash = await hash('Test1234!', 12)

  // Create Organization
  const org = await prisma.organization.upsert({
    where: { domain: 'alamos.gmbh' },
    update: {},
    create: {
      name: 'Alamos GmbH',
      domain: 'alamos.gmbh',
      licenses: 100,
    },
  })
  console.log('✅ Organization:', org.name)

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@learnhub.local' },
    update: {},
    create: {
      email: 'admin@learnhub.local',
      name: 'Max Admin',
      passwordHash,
      role: Role.ADMIN,
      organizationId: org.id,
    },
  })
  console.log('✅ Admin:', admin.email)

  // Create Instructor
  const instructor = await prisma.user.upsert({
    where: { email: 'trainer@learnhub.local' },
    update: {},
    create: {
      email: 'trainer@learnhub.local',
      name: 'Lisa Trainer',
      passwordHash,
      role: Role.INSTRUCTOR,
      organizationId: org.id,
    },
  })
  console.log('✅ Instructor:', instructor.email)

  // Create Learner
  const learner = await prisma.user.upsert({
    where: { email: 'user@learnhub.local' },
    update: {},
    create: {
      email: 'user@learnhub.local',
      name: 'Tom Teilnehmer',
      passwordHash,
      role: Role.LEARNER,
      organizationId: org.id,
    },
  })
  console.log('✅ Learner:', learner.email)

  // Create Categories
  const categories = await Promise.all([
    prisma.courseCategory.upsert({
      where: { name: 'Compliance' },
      update: {},
      create: { name: 'Compliance' },
    }),
    prisma.courseCategory.upsert({
      where: { name: 'IT-Sicherheit' },
      update: {},
      create: { name: 'IT-Sicherheit' },
    }),
    prisma.courseCategory.upsert({
      where: { name: 'Arbeitssicherheit' },
      update: {},
      create: { name: 'Arbeitssicherheit' },
    }),
  ])
  console.log('✅ Categories:', categories.length)

  // Create Sample Course: Datenschutz Grundlagen
  const course1 = await prisma.course.upsert({
    where: { id: 'course-datenschutz' },
    update: {},
    create: {
      id: 'course-datenschutz',
      title: 'Datenschutz Grundlagen',
      description: 'Lernen Sie die wichtigsten Grundlagen des Datenschutzes und der DSGVO kennen.',
      status: CourseStatus.APPROVED,
      publishedAt: new Date(),
      instructorId: instructor.id,
      organizationId: org.id,
      categories: { connect: [{ name: 'Compliance' }] },
    },
  })

  // Module 1
  const module1 = await prisma.module.upsert({
    where: { id: 'module-dsgvo-basics' },
    update: {},
    create: {
      id: 'module-dsgvo-basics',
      title: 'DSGVO Grundlagen',
      description: 'In diesem Modul lernen Sie die grundlegenden Konzepte der DSGVO kennen.',
      order: 1,
      courseId: course1.id,
    },
  })

  await prisma.lesson.upsert({
    where: { id: 'lesson-1-1' },
    update: {},
    create: {
      id: 'lesson-1-1',
      title: 'Was ist die DSGVO?',
      type: LessonType.TEXT,
      content: 'Die Datenschutz-Grundverordnung (DSGVO) ist eine EU-Verordnung...',
      order: 1,
      duration: 10,
      moduleId: module1.id,
    },
  })

  await prisma.lesson.upsert({
    where: { id: 'lesson-1-2' },
    update: {},
    create: {
      id: 'lesson-1-2',
      title: 'Personenbezogene Daten',
      type: LessonType.VIDEO,
      videoUrl: 'https://example.com/video1.mp4',
      order: 2,
      duration: 15,
      moduleId: module1.id,
    },
  })

  // Module 2
  const module2 = await prisma.module.upsert({
    where: { id: 'module-rechte' },
    update: {},
    create: {
      id: 'module-rechte',
      title: 'Rechte der Betroffenen',
      description: 'Erfahren Sie, welche Rechte betroffene Personen nach der DSGVO haben.',
      order: 2,
      courseId: course1.id,
    },
  })

  await prisma.lesson.upsert({
    where: { id: 'lesson-2-1' },
    update: {},
    create: {
      id: 'lesson-2-1',
      title: 'Auskunftsrecht',
      type: LessonType.TEXT,
      content: 'Jede Person hat das Recht zu erfahren, welche Daten...',
      order: 1,
      duration: 8,
      moduleId: module2.id,
    },
  })

  console.log('✅ Course:', course1.title)

  // Quiz for Module 1 (DSGVO Grundlagen) - Required
  const quiz1 = await prisma.moduleQuiz.upsert({
    where: { moduleId: module1.id },
    update: {},
    create: {
      id: 'quiz-dsgvo-basics',
      title: 'Lernerfolgskontrolle: DSGVO Grundlagen',
      description: 'Testen Sie Ihr Wissen zu den DSGVO Grundlagen.',
      isRequired: true,
      passingScore: 70,
      maxAttempts: 3,
      moduleId: module1.id,
    },
  })

  // Quiz Questions for Module 1
  await prisma.quizQuestion.upsert({
    where: { id: 'question-1-1' },
    update: {},
    create: {
      id: 'question-1-1',
      type: QuestionType.YES_NO,
      text: 'Die DSGVO gilt nur in Deutschland.',
      correctAnswer: false,
      order: 1,
      points: 1,
      quizId: quiz1.id,
    },
  })

  await prisma.quizQuestion.upsert({
    where: { id: 'question-1-2' },
    update: {},
    create: {
      id: 'question-1-2',
      type: QuestionType.SINGLE_CHOICE,
      text: 'Wofür steht DSGVO?',
      options: [
        { id: 'opt-1-2-a', text: 'Datenschutz-Grundverordnung', isCorrect: true },
        { id: 'opt-1-2-b', text: 'Daten-Sicherheits-Gesetz-Verordnung', isCorrect: false },
        { id: 'opt-1-2-c', text: 'Deutsche Sicherheits-Grund-Verordnung', isCorrect: false },
        { id: 'opt-1-2-d', text: 'Digitale Schutz-Garantie-Vorschrift', isCorrect: false },
      ],
      order: 2,
      points: 1,
      quizId: quiz1.id,
    },
  })

  await prisma.quizQuestion.upsert({
    where: { id: 'question-1-3' },
    update: {},
    create: {
      id: 'question-1-3',
      type: QuestionType.MULTIPLE_CHOICE,
      text: 'Welche der folgenden sind personenbezogene Daten?',
      options: [
        { id: 'opt-1-3-a', text: 'Name', isCorrect: true },
        { id: 'opt-1-3-b', text: 'E-Mail-Adresse', isCorrect: true },
        { id: 'opt-1-3-c', text: 'IP-Adresse', isCorrect: true },
        { id: 'opt-1-3-d', text: 'Wetterdaten', isCorrect: false },
      ],
      order: 3,
      points: 2,
      quizId: quiz1.id,
    },
  })

  await prisma.quizQuestion.upsert({
    where: { id: 'question-1-4' },
    update: {},
    create: {
      id: 'question-1-4',
      type: QuestionType.YES_NO,
      text: 'Unternehmen müssen einen Datenschutzbeauftragten bestellen, wenn sie regelmäßig sensible Daten verarbeiten.',
      correctAnswer: true,
      order: 4,
      points: 1,
      quizId: quiz1.id,
    },
  })

  console.log('✅ Quiz for Module 1 created')

  // Quiz for Module 2 (Rechte der Betroffenen) - Optional
  const quiz2 = await prisma.moduleQuiz.upsert({
    where: { moduleId: module2.id },
    update: {},
    create: {
      id: 'quiz-rechte',
      title: 'Wissenstest: Betroffenenrechte',
      description: 'Überprüfen Sie Ihr Verständnis der Betroffenenrechte.',
      isRequired: false,
      passingScore: 60,
      maxAttempts: 0, // Unlimited
      moduleId: module2.id,
    },
  })

  await prisma.quizQuestion.upsert({
    where: { id: 'question-2-1' },
    update: {},
    create: {
      id: 'question-2-1',
      type: QuestionType.SINGLE_CHOICE,
      text: 'Innerhalb welcher Frist muss ein Unternehmen auf eine Auskunftsanfrage reagieren?',
      options: [
        { id: 'opt-2-1-a', text: '7 Tage', isCorrect: false },
        { id: 'opt-2-1-b', text: '14 Tage', isCorrect: false },
        { id: 'opt-2-1-c', text: '1 Monat', isCorrect: true },
        { id: 'opt-2-1-d', text: '3 Monate', isCorrect: false },
      ],
      order: 1,
      points: 1,
      quizId: quiz2.id,
    },
  })

  await prisma.quizQuestion.upsert({
    where: { id: 'question-2-2' },
    update: {},
    create: {
      id: 'question-2-2',
      type: QuestionType.MULTIPLE_CHOICE,
      text: 'Welche Rechte haben betroffene Personen nach der DSGVO?',
      options: [
        { id: 'opt-2-2-a', text: 'Recht auf Auskunft', isCorrect: true },
        { id: 'opt-2-2-b', text: 'Recht auf Löschung', isCorrect: true },
        { id: 'opt-2-2-c', text: 'Recht auf kostenlosen Internetzugang', isCorrect: false },
        { id: 'opt-2-2-d', text: 'Recht auf Datenübertragbarkeit', isCorrect: true },
      ],
      order: 2,
      points: 2,
      quizId: quiz2.id,
    },
  })

  console.log('✅ Quiz for Module 2 created')

  // Create Sample Course: IT-Sicherheit
  const course2 = await prisma.course.upsert({
    where: { id: 'course-it-security' },
    update: {},
    create: {
      id: 'course-it-security',
      title: 'IT-Sicherheit im Unternehmen',
      description: 'Schützen Sie sich und Ihr Unternehmen vor Cyberbedrohungen.',
      status: CourseStatus.APPROVED,
      publishedAt: new Date(),
      instructorId: instructor.id,
      organizationId: org.id,
      categories: { connect: [{ name: 'IT-Sicherheit' }] },
    },
  })

  const module3 = await prisma.module.upsert({
    where: { id: 'module-phishing' },
    update: {},
    create: {
      id: 'module-phishing',
      title: 'Phishing erkennen',
      description: 'Lernen Sie, wie Sie Phishing-Angriffe erkennen und vermeiden.',
      order: 1,
      courseId: course2.id,
    },
  })

  await prisma.lesson.upsert({
    where: { id: 'lesson-3-1' },
    update: {},
    create: {
      id: 'lesson-3-1',
      title: 'Was ist Phishing?',
      type: LessonType.TEXT,
      content: 'Phishing ist eine Betrugsmethode...',
      order: 1,
      duration: 12,
      moduleId: module3.id,
    },
  })

  console.log('✅ Course:', course2.title)

  // Quiz for Module 3 (Phishing) - Required
  const quiz3 = await prisma.moduleQuiz.upsert({
    where: { moduleId: module3.id },
    update: {},
    create: {
      id: 'quiz-phishing',
      title: 'Phishing-Test',
      description: 'Können Sie Phishing-Versuche erkennen?',
      isRequired: true,
      passingScore: 80,
      maxAttempts: 2,
      moduleId: module3.id,
    },
  })

  await prisma.quizQuestion.upsert({
    where: { id: 'question-3-1' },
    update: {},
    create: {
      id: 'question-3-1',
      type: QuestionType.YES_NO,
      text: 'Phishing-E-Mails können auch von scheinbar bekannten Absendern kommen.',
      correctAnswer: true,
      order: 1,
      points: 1,
      quizId: quiz3.id,
    },
  })

  await prisma.quizQuestion.upsert({
    where: { id: 'question-3-2' },
    update: {},
    create: {
      id: 'question-3-2',
      type: QuestionType.MULTIPLE_CHOICE,
      text: 'Welche Anzeichen können auf eine Phishing-E-Mail hindeuten?',
      options: [
        { id: 'opt-3-2-a', text: 'Dringende Aufforderung zum Handeln', isCorrect: true },
        { id: 'opt-3-2-b', text: 'Rechtschreibfehler', isCorrect: true },
        { id: 'opt-3-2-c', text: 'Verdächtige Links', isCorrect: true },
        { id: 'opt-3-2-d', text: 'Firmenlogo im Header', isCorrect: false },
      ],
      order: 2,
      points: 2,
      quizId: quiz3.id,
    },
  })

  await prisma.quizQuestion.upsert({
    where: { id: 'question-3-3' },
    update: {},
    create: {
      id: 'question-3-3',
      type: QuestionType.SINGLE_CHOICE,
      text: 'Was sollten Sie tun, wenn Sie eine verdächtige E-Mail erhalten?',
      options: [
        { id: 'opt-3-3-a', text: 'Sofort auf den Link klicken, um zu prüfen', isCorrect: false },
        { id: 'opt-3-3-b', text: 'Die E-Mail an die IT-Abteilung melden', isCorrect: true },
        { id: 'opt-3-3-c', text: 'Die Daten eingeben und später ändern', isCorrect: false },
        { id: 'opt-3-3-d', text: 'Die E-Mail ignorieren und löschen', isCorrect: false },
      ],
      order: 3,
      points: 1,
      quizId: quiz3.id,
    },
  })

  console.log('✅ Quiz for Module 3 created')

  // Enroll learner in courses
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: learner.id, courseId: course1.id } },
    update: {},
    create: {
      userId: learner.id,
      courseId: course1.id,
      lastAccessAt: new Date(),
    },
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: learner.id, courseId: course2.id } },
    update: {},
    create: {
      userId: learner.id,
      courseId: course2.id,
      lastAccessAt: new Date(),
    },
  })

  console.log('✅ Enrollments created')

  // Add some progress
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: learner.id, lessonId: 'lesson-1-1' } },
    update: {},
    create: {
      userId: learner.id,
      lessonId: 'lesson-1-1',
      completed: true,
      completedAt: new Date(),
      timeSpent: 600,
    },
  })

  console.log('✅ Progress tracked')

  console.log('')
  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('📧 Test-Zugänge (Passwort: Test1234!):')
  console.log('   Admin:    admin@learnhub.local')
  console.log('   Trainer:  trainer@learnhub.local')
  console.log('   User:     user@learnhub.local')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
