'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      hint,
      disabled,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-secondary-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          className={cn(
            'block w-full rounded-md border transition-colors duration-200',
            'text-secondary-900 placeholder:text-secondary-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed',
            'resize-y',
            error
              ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-200'
              : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-200',
            'px-3 py-2',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-danger-600">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-secondary-500">{hint}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
