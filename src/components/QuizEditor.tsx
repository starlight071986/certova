'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Spinner,
  Alert,
} from '@/components/ui'

interface MatchingPair {
  id: string
  left: string
  right: string
}

interface QuizQuestion {
  id: string
  type: 'YES_NO' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'MATCHING'
  text: string
  options?: { id: string; text: string; isCorrect: boolean }[] | MatchingPair[]
  correctAnswer?: boolean
  points: number
  order: number
}

interface Quiz {
  id: string
  title: string
  description?: string
  isRequired: boolean
  passingScore: number
  maxAttempts: number
  shuffleQuestions: boolean
  questions: QuizQuestion[]
}

interface QuizEditorProps {
  moduleId: string
  moduleName: string
  onClose: () => void
  onSave: () => void
}

const questionTypes = [
  { value: 'YES_NO', label: 'Ja/Nein' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'MATCHING', label: 'Zuordnung (Drag & Drop)' },
]

export default function QuizEditor({ moduleId, moduleName, onClose, onSave }: QuizEditorProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Quiz settings
  const [title, setTitle] = useState('Lernerfolgskontrolle')
  const [description, setDescription] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [passingScore, setPassingScore] = useState(80)
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)

  // Question modal
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [questionType, setQuestionType] = useState<'YES_NO' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'MATCHING'>('SINGLE_CHOICE')
  const [questionText, setQuestionText] = useState('')
  const [questionPoints, setQuestionPoints] = useState(1)
  const [correctAnswer, setCorrectAnswer] = useState<boolean>(true)
  const [options, setOptions] = useState<{ id: string; text: string; isCorrect: boolean }[]>([
    { id: '1', text: '', isCorrect: true },
    { id: '2', text: '', isCorrect: false },
  ])
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([
    { id: crypto.randomUUID(), left: '', right: '' },
    { id: crypto.randomUUID(), left: '', right: '' },
  ])

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null)

  useEffect(() => {
    fetchQuiz()
  }, [moduleId])

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/modules/${moduleId}/quiz`)
      if (res.ok) {
        const data = await res.json()
        if (data.id) {
          setQuiz(data)
          setTitle(data.title)
          setDescription(data.description || '')
          setIsRequired(data.isRequired)
          setPassingScore(data.passingScore)
          setMaxAttempts(data.maxAttempts)
          setShuffleQuestions(data.shuffleQuestions)
        }
      }
    } catch (err) {
      setError('Fehler beim Laden des Quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/modules/${moduleId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          isRequired,
          passingScore,
          maxAttempts,
          shuffleQuestions,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setQuiz(data)
        setSuccess('Einstellungen gespeichert')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Fehler beim Speichern der Einstellungen')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuiz = async () => {
    if (!quiz) return

    setSaving(true)
    try {
      const res = await fetch(`/api/modules/${moduleId}/quiz`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setSuccess('Quiz gelöscht')
        onSave()
        onClose()
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Löschen')
      }
    } catch (err) {
      setError('Fehler beim Löschen des Quiz')
    } finally {
      setSaving(false)
    }
  }

  const openQuestionModal = (question?: QuizQuestion) => {
    if (question) {
      setEditingQuestion(question)
      setQuestionType(question.type)
      setQuestionText(question.text)
      setQuestionPoints(question.points)
      if (question.type === 'YES_NO') {
        setCorrectAnswer(question.correctAnswer ?? true)
      } else if (question.type === 'MATCHING' && question.options) {
        setMatchingPairs(question.options as MatchingPair[])
      } else if (question.options) {
        setOptions(question.options as { id: string; text: string; isCorrect: boolean }[])
      }
    } else {
      setEditingQuestion(null)
      setQuestionType('SINGLE_CHOICE')
      setQuestionText('')
      setQuestionPoints(1)
      setCorrectAnswer(true)
      setOptions([
        { id: crypto.randomUUID(), text: '', isCorrect: true },
        { id: crypto.randomUUID(), text: '', isCorrect: false },
      ])
      setMatchingPairs([
        { id: crypto.randomUUID(), left: '', right: '' },
        { id: crypto.randomUUID(), left: '', right: '' },
      ])
    }
    setShowQuestionModal(true)
  }

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      setError('Bitte geben Sie eine Frage ein')
      return
    }

    if (questionType === 'MATCHING') {
      if (matchingPairs.some((p) => !p.left.trim() || !p.right.trim())) {
        setError('Bitte füllen Sie alle Zuordnungspaare aus')
        return
      }
      if (matchingPairs.length < 2) {
        setError('Mindestens 2 Zuordnungspaare erforderlich')
        return
      }
    } else if (questionType !== 'YES_NO') {
      if (options.some((o) => !o.text.trim())) {
        setError('Bitte füllen Sie alle Antwortoptionen aus')
        return
      }
      if (!options.some((o) => o.isCorrect)) {
        setError('Bitte markieren Sie mindestens eine richtige Antwort')
        return
      }
    }

    setSaving(true)
    setError('')

    try {
      let bodyOptions: unknown
      if (questionType === 'YES_NO') {
        bodyOptions = undefined
      } else if (questionType === 'MATCHING') {
        bodyOptions = matchingPairs
      } else {
        bodyOptions = options
      }

      const body = {
        type: questionType,
        text: questionText,
        points: questionPoints,
        ...(questionType === 'YES_NO'
          ? { correctAnswer }
          : { options: bodyOptions }),
      }

      if (editingQuestion) {
        const res = await fetch(`/api/quiz/questions/${editingQuestion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (res.ok) {
          fetchQuiz()
          setShowQuestionModal(false)
          setSuccess('Frage aktualisiert')
        } else {
          const data = await res.json()
          setError(data.error || 'Fehler beim Speichern')
        }
      } else {
        const res = await fetch(`/api/modules/${moduleId}/quiz/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (res.ok) {
          fetchQuiz()
          setShowQuestionModal(false)
          setSuccess('Frage hinzugefügt')
        } else {
          const data = await res.json()
          setError(data.error || 'Fehler beim Erstellen')
        }
      }
    } catch (err) {
      setError('Fehler beim Speichern der Frage')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!deletingQuestionId) return

    setSaving(true)
    try {
      const res = await fetch(`/api/quiz/questions/${deletingQuestionId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchQuiz()
        setShowDeleteConfirm(false)
        setDeletingQuestionId(null)
        setSuccess('Frage gelöscht')
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Löschen')
      }
    } catch (err) {
      setError('Fehler beim Löschen der Frage')
    } finally {
      setSaving(false)
    }
  }

  const addOption = () => {
    setOptions([...options, { id: crypto.randomUUID(), text: '', isCorrect: false }])
  }

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter((o) => o.id !== id))
    }
  }

  const updateOption = (id: string, field: 'text' | 'isCorrect', value: string | boolean) => {
    setOptions(options.map((o) => {
      if (o.id === id) {
        return { ...o, [field]: value }
      }
      // For single choice, uncheck others when one is checked
      if (field === 'isCorrect' && value === true && questionType === 'SINGLE_CHOICE') {
        return { ...o, isCorrect: false }
      }
      return o
    }))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <CardContent className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lernerfolgskontrolle</CardTitle>
              <p className="text-sm text-secondary-500 mt-1">Modul: {moduleName}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alerts */}
          {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

          {/* Quiz Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-primary-900">Einstellungen</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Titel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lernerfolgskontrolle"
              />
              <Input
                label="Bestehensgrenze (%)"
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 80)}
              />
            </div>
            <Textarea
              label="Beschreibung (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Kurze Beschreibung der Lernerfolgskontrolle..."
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Max. Versuche (0 = unbegrenzt)"
                type="number"
                min={0}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 0)}
              />
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isRequired" className="text-sm text-secondary-700">
                  Pflicht zum Bestehen
                </label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="shuffleQuestions"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="shuffleQuestions" className="text-sm text-secondary-700">
                  Fragen mischen
                </label>
              </div>
            </div>
            <Button variant="primary" onClick={handleSaveSettings} isLoading={saving}>
              Einstellungen speichern
            </Button>
          </div>

          {/* Questions */}
          {quiz && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-primary-900">
                  Fragen ({quiz.questions.length})
                </h3>
                <Button variant="primary" size="sm" onClick={() => openQuestionModal()}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Frage hinzufügen
                </Button>
              </div>

              {quiz.questions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-secondary-200 rounded-lg">
                  <p className="text-secondary-500 mb-3">Noch keine Fragen vorhanden.</p>
                  <Button variant="outline" onClick={() => openQuestionModal()}>
                    Erste Frage hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quiz.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="p-4 bg-secondary-50 rounded-lg border border-secondary-200 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-secondary-500">
                              {index + 1}.
                            </span>
                            <Badge variant="secondary" size="sm">
                              {questionTypes.find((t) => t.value === question.type)?.label}
                            </Badge>
                            <Badge variant="accent" size="sm">
                              {question.points} {question.points === 1 ? 'Punkt' : 'Punkte'}
                            </Badge>
                          </div>
                          <p className="text-secondary-900">{question.text}</p>
                          {question.type === 'YES_NO' && (
                            <p className="text-sm text-success-600 mt-1">
                              Richtige Antwort: {question.correctAnswer ? 'Ja' : 'Nein'}
                            </p>
                          )}
                          {question.type === 'MATCHING' && question.options && (
                            <div className="mt-2 space-y-1">
                              {(question.options as MatchingPair[]).map((pair) => (
                                <div
                                  key={pair.id}
                                  className="text-sm flex items-center gap-2 text-secondary-600"
                                >
                                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                                    {pair.left}
                                  </span>
                                  <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  <span className="bg-accent-100 text-accent-700 px-2 py-0.5 rounded">
                                    {pair.right}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {question.type !== 'MATCHING' && question.options && (
                            <div className="mt-2 space-y-1">
                              {(question.options as { id: string; text: string; isCorrect: boolean }[]).map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`text-sm flex items-center gap-2 ${
                                    opt.isCorrect ? 'text-success-600' : 'text-secondary-600'
                                  }`}
                                >
                                  {opt.isCorrect ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <span className="w-4 h-4 flex items-center justify-center">•</span>
                                  )}
                                  {opt.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openQuestionModal(question)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger-600 hover:bg-danger-50"
                            onClick={() => {
                              setDeletingQuestionId(question.id)
                              setShowDeleteConfirm(true)
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete Quiz */}
          {quiz && (
            <div className="pt-4 border-t border-secondary-200">
              <Button
                variant="ghost"
                className="text-danger-600 hover:bg-danger-50"
                onClick={handleDeleteQuiz}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Lernerfolgskontrolle löschen
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Question Modal */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        title={editingQuestion ? 'Frage bearbeiten' : 'Neue Frage'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowQuestionModal(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleSaveQuestion} isLoading={saving}>
              {editingQuestion ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Fragetyp"
            options={questionTypes}
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as any)}
          />
          <Textarea
            label="Frage"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            placeholder="Geben Sie hier die Frage ein..."
          />
          <Input
            label="Punkte"
            type="number"
            min={1}
            value={questionPoints}
            onChange={(e) => setQuestionPoints(parseInt(e.target.value) || 1)}
          />

          {questionType === 'YES_NO' && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Richtige Antwort
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctAnswer === true}
                    onChange={() => setCorrectAnswer(true)}
                    className="w-4 h-4 border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Ja</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctAnswer === false}
                    onChange={() => setCorrectAnswer(false)}
                    className="w-4 h-4 border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Nein</span>
                </label>
              </div>
            </div>
          )}

          {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary-700">
                Antwortoptionen
                {questionType === 'SINGLE_CHOICE' && ' (genau eine richtig)'}
                {questionType === 'MULTIPLE_CHOICE' && ' (mehrere können richtig sein)'}
              </label>
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-3">
                  <input
                    type={questionType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                    name="correctOption"
                    checked={option.isCorrect}
                    onChange={(e) => updateOption(option.id, 'isCorrect', e.target.checked)}
                    className="w-4 h-4 border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(option.id)}
                      className="text-danger-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Option hinzufügen
              </Button>
            </div>
          )}

          {questionType === 'MATCHING' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary-700">
                Zuordnungspaare (per Drag & Drop zuordnen)
              </label>
              <p className="text-xs text-secondary-500">
                Definieren Sie Paare, die zueinander gehören. Der Lernende muss die rechte Seite per Drag & Drop zur passenden linken Seite ziehen.
              </p>
              {matchingPairs.map((pair, index) => (
                <div key={pair.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      value={pair.left}
                      onChange={(e) => {
                        setMatchingPairs(matchingPairs.map((p) =>
                          p.id === pair.id ? { ...p, left: e.target.value } : p
                        ))
                      }}
                      placeholder={`Begriff ${index + 1}`}
                    />
                  </div>
                  <svg className="w-5 h-5 text-secondary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <div className="flex-1">
                    <Input
                      value={pair.right}
                      onChange={(e) => {
                        setMatchingPairs(matchingPairs.map((p) =>
                          p.id === pair.id ? { ...p, right: e.target.value } : p
                        ))
                      }}
                      placeholder={`Zuordnung ${index + 1}`}
                    />
                  </div>
                  {matchingPairs.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMatchingPairs(matchingPairs.filter((p) => p.id !== pair.id))}
                      className="text-danger-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMatchingPairs([...matchingPairs, { id: crypto.randomUUID(), left: '', right: '' }])}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Paar hinzufügen
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeletingQuestionId(null)
        }}
        title="Frage löschen"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Abbrechen
            </Button>
            <Button variant="danger" onClick={handleDeleteQuestion} isLoading={saving}>
              Löschen
            </Button>
          </>
        }
      >
        <p className="text-secondary-600">
          Sind Sie sicher, dass Sie diese Frage löschen möchten?
        </p>
      </Modal>
    </div>
  )
}
