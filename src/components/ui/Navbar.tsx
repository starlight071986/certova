'use client'

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface NavbarProps extends HTMLAttributes<HTMLElement> {
  logo?: ReactNode
  sticky?: boolean
  transparent?: boolean
}

const Navbar = forwardRef<HTMLElement, NavbarProps>(
  (
    {
      className,
      logo,
      sticky = true,
      transparent = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <nav
        ref={ref}
        className={cn(
          'w-full z-40 transition-all duration-200',
          sticky && 'sticky top-0',
          transparent
            ? 'bg-transparent'
            : 'bg-white border-b border-secondary-200 shadow-sm',
          className
        )}
        {...props}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            {logo && <div className="flex-shrink-0">{logo}</div>}

            {/* Navigation Items */}
            <div className="flex items-center gap-4">{children}</div>
          </div>
        </div>
      </nav>
    )
  }
)

Navbar.displayName = 'Navbar'

// NavLink Component
export interface NavLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  href: string
  active?: boolean
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, href, active = false, children, ...props }, ref) => (
    <a
      ref={ref}
      href={href}
      className={cn(
        'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
        active
          ? 'text-primary-700 bg-primary-50'
          : 'text-secondary-600 hover:text-primary-600 hover:bg-secondary-50',
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
)

NavLink.displayName = 'NavLink'

export { Navbar, NavLink }
