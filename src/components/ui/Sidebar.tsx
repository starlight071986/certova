'use client'

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  collapsed?: boolean
  width?: 'sm' | 'md' | 'lg'
}

const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    {
      className,
      collapsed = false,
      width = 'md',
      children,
      ...props
    },
    ref
  ) => {
    const widths = {
      sm: collapsed ? 'w-16' : 'w-56',
      md: collapsed ? 'w-16' : 'w-64',
      lg: collapsed ? 'w-16' : 'w-72',
    }

    return (
      <aside
        ref={ref}
        className={cn(
          'h-screen bg-white border-r border-secondary-200',
          'flex flex-col transition-all duration-300 ease-in-out',
          'overflow-hidden',
          widths[width],
          className
        )}
        {...props}
      >
        {children}
      </aside>
    )
  }
)

Sidebar.displayName = 'Sidebar'

// Sidebar Header
export interface SidebarHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const SidebarHeader = forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center h-16 px-4 border-b border-secondary-200',
        'flex-shrink-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

SidebarHeader.displayName = 'SidebarHeader'

// Sidebar Content
export interface SidebarContentProps extends HTMLAttributes<HTMLDivElement> {}

const SidebarContent = forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto py-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)

SidebarContent.displayName = 'SidebarContent'

// Sidebar Footer
export interface SidebarFooterProps extends HTMLAttributes<HTMLDivElement> {}

const SidebarFooter = forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center px-4 py-4 border-t border-secondary-200',
        'flex-shrink-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

SidebarFooter.displayName = 'SidebarFooter'

// Sidebar Section
export interface SidebarSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
}

const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  ({ className, title, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-3 py-2', className)} {...props}>
      {title && (
        <h3 className="px-3 mb-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  )
)

SidebarSection.displayName = 'SidebarSection'

// Sidebar Item
export interface SidebarItemProps extends HTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  active?: boolean
  badge?: ReactNode
  href?: string
}

const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, icon, active = false, badge, children, href, ...props }, ref) => {
    const content = (
      <>
        {icon && (
          <span
            className={cn(
              'flex-shrink-0 w-5 h-5',
              active ? 'text-primary-600' : 'text-secondary-500'
            )}
          >
            {icon}
          </span>
        )}
        <span className="flex-1 truncate">{children}</span>
        {badge && <span className="flex-shrink-0">{badge}</span>}
      </>
    )

    const itemClasses = cn(
      'w-full flex items-center gap-3 px-3 py-2 rounded-md',
      'text-sm font-medium transition-colors duration-200',
      'text-left',
      active
        ? 'bg-primary-50 text-primary-700'
        : 'text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900',
      className
    )

    if (href) {
      return (
        <Link href={href} className={itemClasses}>
          {content}
        </Link>
      )
    }

    return (
      <button ref={ref} className={itemClasses} {...props}>
        {content}
      </button>
    )
  }
)

SidebarItem.displayName = 'SidebarItem'

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
}
