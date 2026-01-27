'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  onClose?: () => void
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'info',
      title,
      onClose,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      info: {
        container: 'bg-primary-50 border-primary-200 text-primary-800',
        icon: 'text-primary-500',
        title: 'text-primary-900',
      },
      success: {
        container: 'bg-success-50 border-success-200 text-success-800',
        icon: 'text-success-500',
        title: 'text-success-900',
      },
      warning: {
        container: 'bg-warning-50 border-warning-200 text-warning-800',
        icon: 'text-warning-500',
        title: 'text-warning-900',
      },
      danger: {
        container: 'bg-danger-50 border-danger-200 text-danger-800',
        icon: 'text-danger-500',
        title: 'text-danger-900',
      },
    }

    const icons = {
      info: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
      ),
      success: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      ),
      warning: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
      danger: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
      ),
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative rounded-lg border p-4',
          variants[variant].container,
          className
        )}
        {...props}
      >
        <div className="flex">
          <div className={cn('flex-shrink-0', variants[variant].icon)}>
            {icons[variant]}
          </div>
          <div className="ml-3 flex-1">
            {title && (
              <h3 className={cn('text-sm font-medium', variants[variant].title)}>
                {title}
              </h3>
            )}
            <div className={cn('text-sm', title && 'mt-1')}>
              {children}
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 items-center justify-center',
                'hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                variants[variant].icon
              )}
            >
              <span className="sr-only">Schließen</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }
)

Alert.displayName = 'Alert'

export { Alert }
