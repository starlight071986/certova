'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'white'
}

const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      className,
      size = 'md',
      variant = 'primary',
      ...props
    },
    ref
  ) => {
    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    }

    const variants = {
      primary: 'text-primary-600',
      secondary: 'text-secondary-600',
      white: 'text-white',
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Laden..."
        className={cn('inline-flex', className)}
        {...props}
      >
        <svg
          className={cn('animate-spin', sizes[size], variants[variant])}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="sr-only">Laden...</span>
      </div>
    )
  }
)

Spinner.displayName = 'Spinner'

// Loading overlay component
export interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  isLoading: boolean
  text?: string
}

const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, isLoading, text, children, ...props }, ref) => {
    if (!isLoading) return <>{children}</>

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        {children}
        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg z-10">
          <Spinner size="lg" />
          {text && (
            <p className="mt-3 text-sm text-secondary-600 font-medium">{text}</p>
          )}
        </div>
      </div>
    )
  }
)

LoadingOverlay.displayName = 'LoadingOverlay'

export { Spinner, LoadingOverlay }
