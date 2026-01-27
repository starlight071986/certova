'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Alert,
  Spinner,
} from '@/components/ui'

// Drag and Drop Matching Question Component
function MatchingQuestion({
  questionId,
  pairs,
  answers,
  onMatch,
  onRemove,
}: {
  questionId: string
  pairs: MatchingPair[]
  answers: Record<string, string>
  onMatch: (questionId: string, leftId: string, rightId: string) => void
  onRemove: (questionId: string, leftId: string) => void
}) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  // Shuffle right side options for display
  const [shuffledRights] = useState(() => {
    const rights = pairs.map(p => ({ id: p.id, text: p.right }))
    return rights.sort(() => Math.random() - 0.5)
  })

  // Get unassigned right items
  const assignedRights = Object.values(answers)
  const availableRights = shuffledRights.filter(r => !assignedRights.includes(r.id))

  const handleDragStart = (e: React.DragEvent, rightId: string) => {
    setDraggedItem(rightId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', rightId)
  }

  const handleDragOver = (e: React.DragEvent, leftId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(leftId)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, leftId: string) => {
    e.preventDefault()
    const rightId = e.dataTransfer.getData('text/plain')
    if (rightId) {
      onMatch(questionId, leftId, rightId)
    }
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-secondary-500">
        Ziehen Sie die Antworten auf der rechten Seite zu den passenden Begriffen.
      </p>

      <div className="grid grid-cols-2 gap-6">
        {/* Left side - Drop targets */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-secondary-500 uppercase tracking-wide">Begriffe</p>
          {pairs.map((pair) => {
            const matchedRightId = answers[pair.id]
            const matchedRight = shuffledRights.find(r => r.id === matchedRightId)

            return (
              <div
                key={pair.id}
                onDragOver={(e) => handleDragOver(e, pair.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, pair.id)}
                className={`p-3 rounded-lg border-2 transition-all min-h-[60px] ${
                  dragOverItem === pair.id
                    ? 'border-primary-500 bg-primary-50 border-dashed'
                    : matchedRight
                    ? 'border-success-300 bg-success-50'
                    : 'border-secondary-200 bg-white'
                }`}
              >
                <div className="font-medium text-secondary-900 mb-1">{pair.left}</div>
                {matchedRight ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-accent-100 text-accent-700 text-sm">
                      {matchedRight.text}
                    </span>
                    <button
                      onClick={() => onRemove(questionId, pair.id)}
                      className="text-secondary-400 hover:text-danger-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <span className="text-secondary-400 text-sm italic">Antwort hier ablegen...</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Right side - Draggable items */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-secondary-500 uppercase tracking-wide">Antworten</p>
          {availableRights.length > 0 ? (
            availableRights.map((right) => (
              <div
                key={right.id}
                draggable
                onDragStart={(e) => handleDragStart(e, right.id)}
                onDragEnd={handleDragEnd}
                className={`p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all ${
                  draggedItem === right.id
                    ? 'border-primary-500 bg-primary-100 opacity-50'
                    : 'border-accent-300 bg-accent-50 hover:border-accent-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-secondary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                  <span className="text-secondary-900">{right.text}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-secondary-400 text-sm border-2 border-dashed border-secondary-200 rounded-lg">
              Alle Antworten zugeordnet
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm text-secondary-500">
        <span>{Object.keys(answers).length} von {pairs.length} zugeordnet</span>
        {Object.keys(answers).length === pairs.length && (
          <svg className="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  )
}

interface MatchingPair {
  id: string
  left: string
  right: string
}

interface QuizQuestion {
  id: string
  type: 'YES_NO' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'MATCHING'
  text: string
  options?: { id: string; text: string }[] | MatchingPair[]
  order: number
  points: number
}

interface Quiz {
  id: string
  title: string
  description: string | null
  passingScore: number
  maxAttempts: number
  questions: QuizQuestion[]
}

interface QuizStatus {
  canAttempt: boolean
  attemptsUsed: number
  maxAttempts: number
  bestScore: number | null
  passed: boolean
  currentAttempt: { id: string } | null
}

interface QuizResult {
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  passingScore: number
  questions: {
    id: string
    text: string
    type: string
    options: { id: string; text: string; isCorrect: boolean }[] | MatchingPair[] | null
    correctAnswer: boolean | null
    userAnswer: unknown
    isCorrect: boolean
    points: number
    maxPoints: number
  }[]
}

interface ModuleInfo {
  id: string
  title: string
  order: number
  lessons?: { id: string }[]
}

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [status, setStatus] = useState<QuizStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [nextModule, setNextModule] = useState<ModuleInfo | null>(null)

  // Quiz taking state
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<QuizResult | null>(null)

  useEffect(() => {
    fetchQuiz()
    fetchNextModule()
  }, [params.moduleId])

  const fetchQuiz = async () => {
    try {
      const [quizRes, statusRes] = await Promise.all([
        fetch(`/api/modules/${params.moduleId}/quiz`),
        fetch(`/api/modules/${params.moduleId}/quiz/attempt`),
      ])

      if (quizRes.ok) {
        const quizData = await quizRes.json()
        setQuiz(quizData)
      } else {
        setError('Quiz nicht gefunden')
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setStatus(statusData)
        if (statusData.currentAttempt) {
          setAttemptId(statusData.currentAttempt.id)
        }
      }
    } catch (err) {
      setError('Fehler beim Laden des Quiz')
    } finally {
      setLoading(false)
    }
  }

  const fetchNextModule = async () => {
    try {
      const res = await fetch(`/api/courses/${params.id}`)
      if (res.ok) {
        const course = await res.json()
        const modules = course.modules || []

        // Find current module index
        const currentModuleIndex = modules.findIndex((m: ModuleInfo) => m.id === params.moduleId)

        // Check if there's a next module
        if (currentModuleIndex !== -1 && currentModuleIndex < modules.length - 1) {
          setNextModule(modules[currentModuleIndex + 1])
        }
      }
    } catch (err) {
      // Silently fail - next module button simply won't appear
      console.error('Failed to fetch next module:', err)
    }
  }

  const startQuiz = async () => {
    setStarting(true)
    try {
      const res = await fetch(`/api/modules/${params.moduleId}/quiz/attempt`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setAttemptId(data.attempt.id)
        setCurrentQuestionIndex(0)
        setAnswers({})
        setResult(null)
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Starten des Quiz')
      }
    } catch (err) {
      setError('Fehler beim Starten des Quiz')
    } finally {
      setStarting(false)
    }
  }

  const handleAnswer = (questionId: string, answer: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleMultipleChoiceToggle = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || []
      if (current.includes(optionId)) {
        return { ...prev, [questionId]: current.filter((id) => id !== optionId) }
      } else {
        return { ...prev, [questionId]: [...current, optionId] }
      }
    })
  }

  const handleMatchingDrop = (questionId: string, leftId: string, rightId: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as Record<string, string>) || {}
      return { ...prev, [questionId]: { ...current, [leftId]: rightId } }
    })
  }

  const removeMatchingAnswer = (questionId: string, leftId: string) => {
    setAnswers((prev) => {
      const current = { ...((prev[questionId] as Record<string, string>) || {}) }
      delete current[leftId]
      return { ...prev, [questionId]: current }
    })
  }

  const submitQuiz = async () => {
    if (!attemptId || !quiz) return

    setSubmitting(true)
    try {
      const formattedAnswers = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? null,
      }))

      const res = await fetch(`/api/quiz/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
        setAttemptId(null)
        fetchQuiz() // Refresh status
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Abgeben des Quiz')
      }
    } catch (err) {
      setError('Fehler beim Abgeben des Quiz')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/courses/${params.id}`}
          className="inline-flex items-center text-sm text-secondary-600 hover:text-primary-600"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zum Kurs
        </Link>
        <Alert variant="danger">{error || 'Quiz nicht gefunden'}</Alert>
      </div>
    )
  }

  // Show result if available
  if (result) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/courses/${params.id}`}
          className="inline-flex items-center text-sm text-secondary-600 hover:text-primary-600"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zum Kurs
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ergebnis: {quiz.title}</CardTitle>
              <Badge variant={result.passed ? 'success' : 'danger'} size="lg">
                {result.passed ? 'Bestanden' : 'Nicht bestanden'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-8">
              <div className={`text-6xl font-bold mb-2 ${result.passed ? 'text-success-600' : 'text-danger-600'}`}>
                {result.percentage}%
              </div>
              <p className="text-secondary-600">
                {result.score} von {result.maxScore} Punkten
              </p>
              <p className="text-sm text-secondary-500 mt-1">
                Bestehensgrenze: {result.passingScore}%
              </p>
            </div>

            <h3 className="font-semibold text-primary-900 mb-4">Auswertung</h3>
            <div className="space-y-4">
              {result.questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border ${
                    question.isCorrect
                      ? 'bg-success-50 border-success-200'
                      : 'bg-danger-50 border-danger-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      question.isCorrect ? 'bg-success-100 text-success-600' : 'bg-danger-100 text-danger-600'
                    }`}>
                      {question.isCorrect ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-secondary-900 mb-2">
                        {index + 1}. {question.text}
                      </p>
                      <div className="text-sm">
                        {question.type === 'YES_NO' && (
                          <div className="space-y-1">
                            <p className="text-secondary-600">
                              Ihre Antwort: {question.userAnswer === true ? 'Ja' : question.userAnswer === false ? 'Nein' : 'Keine Antwort'}
                            </p>
                          </div>
                        )}
                        {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && question.options && (
                          <div className="space-y-1">
                            {(question.options as { id: string; text: string; isCorrect: boolean }[]).map((opt) => {
                              const isUserSelected = Array.isArray(question.userAnswer)
                                ? question.userAnswer.includes(opt.id)
                                : question.userAnswer === opt.id
                              // Only show options that the user selected
                              if (!isUserSelected) return null
                              return (
                                <div
                                  key={opt.id}
                                  className="flex items-center gap-2 text-secondary-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span>{opt.text}</span>
                                </div>
                              )
                            })}
                            {!Array.isArray(question.userAnswer) && !question.userAnswer && (
                              <p className="text-secondary-500 italic">Keine Antwort</p>
                            )}
                            {Array.isArray(question.userAnswer) && question.userAnswer.length === 0 && (
                              <p className="text-secondary-500 italic">Keine Antwort</p>
                            )}
                          </div>
                        )}
                        {question.type === 'MATCHING' && question.options && (
                          <div className="space-y-2">
                            <p className="text-secondary-500 text-xs mb-2">Ihre Zuordnungen:</p>
                            {(question.options as MatchingPair[]).map((pair) => {
                              const userMatching = question.userAnswer as Record<string, string> | undefined
                              const userRight = userMatching?.[pair.id]
                              return (
                                <div
                                  key={pair.id}
                                  className="flex items-center gap-2 text-secondary-600"
                                >
                                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs">
                                    {pair.left}
                                  </span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  <span className="bg-secondary-100 text-secondary-700 px-2 py-0.5 rounded text-xs">
                                    {userRight
                                      ? (question.options as MatchingPair[]).find(p => p.id === userRight)?.right || 'Keine Zuordnung'
                                      : 'Keine Zuordnung'
                                    }
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-secondary-500 mt-2">
                        {question.points} von {question.maxPoints} Punkten
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3 justify-between">
              <div className="flex gap-3">
                {!result.passed && status && status.attemptsUsed < status.maxAttempts && (
                  <Button variant="primary" onClick={startQuiz}>
                    Erneut versuchen ({status.maxAttempts - status.attemptsUsed} Versuche übrig)
                  </Button>
                )}
                <Button variant="outline" onClick={() => router.push(`/dashboard/courses/${params.id}`)}>
                  Zurück zum Kurs
                </Button>
              </div>
              {nextModule && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const firstLesson = nextModule.lessons?.[0]
                    if (firstLesson) {
                      router.push(`/dashboard/courses/${params.id}/lessons/${firstLesson.id}`)
                    } else {
                      router.push(`/dashboard/courses/${params.id}`)
                    }
                  }}
                >
                  Zum nächsten Modul
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show quiz taking interface
  if (attemptId) {
    const currentQuestion = quiz.questions[currentQuestionIndex]
    const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== null).length
    const progress = Math.round((answeredCount / quiz.questions.length) * 100)

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Progress Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary-900">{quiz.title}</h1>
          <span className="text-sm text-secondary-500">
            Frage {currentQuestionIndex + 1} von {quiz.questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <Card>
          <CardContent className="py-8">
            <div className="mb-6">
              <Badge variant="secondary" size="sm" className="mb-3">
                {currentQuestion.points} {currentQuestion.points === 1 ? 'Punkt' : 'Punkte'}
              </Badge>
              <h2 className="text-lg font-medium text-primary-900">{currentQuestion.text}</h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.type === 'YES_NO' && (
                <>
                  <button
                    onClick={() => handleAnswer(currentQuestion.id, true)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      answers[currentQuestion.id] === true
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    }`}
                  >
                    <span className="font-medium">Ja</span>
                  </button>
                  <button
                    onClick={() => handleAnswer(currentQuestion.id, false)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      answers[currentQuestion.id] === false
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    }`}
                  >
                    <span className="font-medium">Nein</span>
                  </button>
                </>
              )}

              {currentQuestion.type === 'SINGLE_CHOICE' && (currentQuestion.options as { id: string; text: string }[] | undefined)?.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswer(currentQuestion.id, option.id)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    answers[currentQuestion.id] === option.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      answers[currentQuestion.id] === option.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-secondary-300'
                    }`}>
                      {answers[currentQuestion.id] === option.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span>{option.text}</span>
                  </div>
                </button>
              ))}

              {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options?.map((option) => {
                const opt = option as { id: string; text: string }
                const isSelected = ((answers[currentQuestion.id] as string[]) || []).includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleMultipleChoiceToggle(currentQuestion.id, opt.id)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-secondary-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span>{opt.text}</span>
                    </div>
                  </button>
                )
              })}

              {currentQuestion.type === 'MATCHING' && currentQuestion.options && (
                <MatchingQuestion
                  questionId={currentQuestion.id}
                  pairs={currentQuestion.options as MatchingPair[]}
                  answers={(answers[currentQuestion.id] as Record<string, string>) || {}}
                  onMatch={handleMatchingDrop}
                  onRemove={removeMatchingAnswer}
                />
              )}
            </div>

            {currentQuestion.type === 'MULTIPLE_CHOICE' && (
              <p className="text-sm text-secondary-500 mt-3">
                Mehrere Antworten möglich
              </p>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </Button>

          {currentQuestionIndex < quiz.questions.length - 1 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            >
              Weiter
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          ) : (
            <Button variant="accent" onClick={submitQuiz} isLoading={submitting}>
              Quiz abgeben
            </Button>
          )}
        </div>

        {/* Question Navigator */}
        <div className="flex flex-wrap gap-2 justify-center">
          {quiz.questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null
            const isCurrent = idx === currentQuestionIndex
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  isCurrent
                    ? 'bg-primary-600 text-white'
                    : isAnswered
                    ? 'bg-success-100 text-success-700 border border-success-300'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Show quiz start page
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link
        href={`/dashboard/courses/${params.id}`}
        className="inline-flex items-center text-sm text-secondary-600 hover:text-primary-600"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zurück zum Kurs
      </Link>

      <Card>
        <CardHeader className="text-center border-b border-secondary-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <CardTitle className="text-2xl">{quiz.title}</CardTitle>
          {quiz.description && (
            <p className="text-secondary-600 mt-2">{quiz.description}</p>
          )}
        </CardHeader>
        <CardContent className="py-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-900">{quiz.questions.length}</p>
              <p className="text-sm text-secondary-600">Fragen</p>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-900">{quiz.passingScore}%</p>
              <p className="text-sm text-secondary-600">Bestehensgrenze</p>
            </div>
          </div>

          {status && (
            <div className="mb-6 p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary-600">Versuche:</span>
                <span className="font-medium">
                  {status.attemptsUsed} von {status.maxAttempts === 0 ? 'unbegrenzt' : status.maxAttempts}
                </span>
              </div>
              {status.bestScore !== null && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-secondary-600">Bestes Ergebnis:</span>
                  <Badge variant={status.passed ? 'success' : 'secondary'}>
                    {status.bestScore}%
                  </Badge>
                </div>
              )}
            </div>
          )}

          {status?.passed ? (
            <div className="text-center">
              <Badge variant="success" size="lg" className="mb-4">
                Bereits bestanden
              </Badge>
              <p className="text-secondary-600 mb-4">
                Sie haben dieses Quiz bereits erfolgreich abgeschlossen.
              </p>
              <Button variant="outline" onClick={() => router.push(`/dashboard/courses/${params.id}`)}>
                Zurück zum Kurs
              </Button>
            </div>
          ) : status?.canAttempt ? (
            <Button variant="accent" className="w-full" onClick={startQuiz} isLoading={starting}>
              Quiz starten
            </Button>
          ) : (
            <div className="text-center">
              <Badge variant="danger" size="lg" className="mb-4">
                Keine Versuche mehr
              </Badge>
              <p className="text-secondary-600">
                Sie haben die maximale Anzahl an Versuchen erreicht.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
