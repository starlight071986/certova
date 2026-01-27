'use client'

import { forwardRef, useEffect, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  footer?: ReactNode
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      isOpen,
      onClose,
      title,
      description,
      size = 'md',
      closeOnOverlay = true,
      closeOnEscape = true,
      footer,
      children,
      ...props
    },
    ref
  ) => {
    const sizes = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-4xl',
    }

    useEffect(() => {
      if (!closeOnEscape) return

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose, closeOnEscape])

    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
      return () => {
        document.body.style.overflow = ''
      }
    }, [isOpen])

    if (!isOpen) return null

    const modalContent = (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 animate-fade-in"
          onClick={closeOnOverlay ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          className={cn(
            'relative z-10 w-full mx-4 bg-white rounded-lg shadow-xl',
            'animate-slide-in',
            sizes[size],
            className
          )}
          {...props}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-6 pt-6 pb-4 border-b border-secondary-200">
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-secondary-900"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm text-secondary-600"
                >
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'absolute top-4 right-4 p-1 rounded-md',
              'text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              'transition-colors duration-200'
            )}
          >
            <span className="sr-only">Schließen</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>

          {/* Content */}
          <div className="px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50 rounded-b-lg flex justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    )

    if (typeof window === 'undefined') return null
    return createPortal(modalContent, document.body)
  }
)

Modal.displayName = 'Modal'

export { Modal }
