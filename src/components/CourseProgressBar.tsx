'use client'

import { useRouter } from 'next/navigation'

interface Module {
  id: string
  title: string
  order: number
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | null
  hasQuiz?: boolean
  quizPassed?: boolean | null
}

interface CourseProgressBarProps {
  courseId: string
  modules: Module[]
  currentModuleId?: string
  isCompleted?: boolean
}

type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | null

export default function CourseProgressBar({
  courseId,
  modules,
  currentModuleId,
  isCompleted = false,
}: CourseProgressBarProps) {
  const router = useRouter()

  // Calculate finish status
  const allModulesCompleted = modules.every(m => m.status === 'COMPLETED')
  const allQuizzesPassed = modules.filter(m => m.hasQuiz).every(m => m.quizPassed === true)
  const finishStatus: StepStatus = isCompleted ? 'COMPLETED' :
    (allModulesCompleted && allQuizzesPassed) ? 'IN_PROGRESS' : null

  const getStatusColor = (status: StepStatus, isCurrent: boolean, isFinish: boolean = false) => {
    if (isCurrent) {
      return 'bg-primary-500 border-primary-500 text-white'
    }
    switch (status) {
      case 'COMPLETED':
        return isFinish
          ? 'bg-accent-500 border-accent-500 text-white'
          : 'bg-success-500 border-success-500 text-white'
      case 'IN_PROGRESS':
        return 'bg-primary-100 border-primary-500 text-primary-600'
      case 'FAILED':
        return 'bg-danger-100 border-danger-500 text-danger-600'
      default:
        return 'bg-white border-secondary-300 text-secondary-400'
    }
  }

  const getLineColor = (status: StepStatus) => {
    if (status === 'COMPLETED') {
      return 'bg-success-500'
    }
    if (status === 'IN_PROGRESS' || status === 'FAILED') {
      return 'bg-gradient-to-r from-success-500 to-secondary-300'
    }
    return 'bg-secondary-300'
  }

  const getQuizStatus = (module: Module): StepStatus => {
    if (module.quizPassed === true) return 'COMPLETED'
    if (module.quizPassed === false) return 'FAILED'
    if (module.status === 'COMPLETED' || module.status === 'IN_PROGRESS') return 'IN_PROGRESS'
    return null
  }

  const getStatusLabel = (status: StepStatus) => {
    if (status === 'COMPLETED') return 'Fertig'
    if (status === 'IN_PROGRESS') return 'In Arbeit'
    if (status === 'FAILED') return 'Fehlgeschl.'
    return 'Offen'
  }

  const navigateToModule = (moduleId: string) => {
    router.push(`/dashboard/courses/${courseId}#module-${moduleId}`)
  }

  const navigateToQuiz = (moduleId: string) => {
    router.push(`/dashboard/courses/${courseId}/modules/${moduleId}/quiz`)
  }

  return (
    <div className="w-full px-6 py-6 pb-14">
      <div className="flex items-center">
        {modules.map((module, index) => {
          const quizStatus = module.hasQuiz ? getQuizStatus(module) : null
          const isLastModule = index === modules.length - 1

          return (
            <div key={module.id} className="contents">
              {/* Module Circle */}
              <div className="relative group flex-shrink-0">
                <button
                  onClick={() => navigateToModule(module.id)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium text-sm transition-all hover:scale-110 ${getStatusColor(
                    module.status,
                    module.id === currentModuleId
                  )}`}
                >
                  {module.status === 'COMPLETED' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : module.status === 'FAILED' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    module.order
                  )}
                </button>

                {/* Module Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-secondary-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {module.title}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-secondary-900" />
                </div>

                {/* Module Label */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-xs text-secondary-500 whitespace-nowrap text-center">
                  <div className="font-medium">Modul {module.order}</div>
                  <div className="text-[10px]">{getStatusLabel(module.status)}</div>
                </div>
              </div>

              {/* Short line to Quiz (if exists) */}
              {module.hasQuiz && (
                <>
                  <div className={`w-2 h-0.5 ${getLineColor(module.status)}`} />

                  {/* Quiz Circle (smaller, close to module) */}
                  <div className="relative group flex-shrink-0">
                    <button
                      onClick={() => navigateToQuiz(module.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${getStatusColor(
                        quizStatus,
                        false
                      )}`}
                    >
                      {quizStatus === 'COMPLETED' ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : quizStatus === 'FAILED' ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>

                    {/* Quiz Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-secondary-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Quiz
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-secondary-900" />
                    </div>
                  </div>
                </>
              )}

              {/* Long connecting line to next module */}
              {!isLastModule && (
                <div className={`flex-1 h-0.5 mx-2 ${getLineColor(module.hasQuiz ? quizStatus : module.status)}`} />
              )}
            </div>
          )
        })}

        {/* Line to Finish */}
        <div className={`flex-1 h-0.5 mx-2 ${getLineColor(
          modules.length > 0
            ? (modules[modules.length - 1].hasQuiz
              ? getQuizStatus(modules[modules.length - 1])
              : modules[modules.length - 1].status)
            : null
        )}`} />

        {/* Finish Step */}
        <div className="relative group flex-shrink-0">
          <button
            onClick={() => router.push(`/dashboard/courses/${courseId}`)}
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium text-sm transition-all hover:scale-110 ${getStatusColor(
              finishStatus,
              false,
              true
            )}`}
          >
            {finishStatus === 'COMPLETED' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            )}
          </button>

          {/* Finish Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-secondary-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            Kurs abschließen
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-secondary-900" />
          </div>

          {/* Finish Label */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-xs text-secondary-500 whitespace-nowrap text-center">
            <div className="font-medium">Abschluss</div>
            <div className="text-[10px]">{getStatusLabel(finishStatus)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
