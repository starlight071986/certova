'use client'

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy' | 'away'
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      name,
      size = 'md',
      status,
      alt,
      ...props
    },
    ref
  ) => {
    const sizes = {
      xs: 'h-6 w-6 text-xs',
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-12 w-12 text-lg',
      xl: 'h-16 w-16 text-xl',
    }

    const statusSizes = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-4 w-4',
    }

    const statusColors = {
      online: 'bg-success-500',
      offline: 'bg-secondary-400',
      busy: 'bg-danger-500',
      away: 'bg-warning-500',
    }

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    return (
      <div ref={ref} className={cn('relative inline-flex', className)}>
        {src ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className={cn(
              'rounded-full object-cover',
              'ring-2 ring-white',
              sizes[size]
            )}
            {...props}
          />
        ) : (
          <div
            className={cn(
              'rounded-full flex items-center justify-center',
              'bg-primary-100 text-primary-700 font-medium',
              'ring-2 ring-white',
              sizes[size]
            )}
          >
            {name ? getInitials(name) : '?'}
          </div>
        )}
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
              statusColors[status],
              statusSizes[size]
            )}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

// Avatar Group for displaying multiple avatars
export interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: AvatarProps['size']
  className?: string
}

const AvatarGroup = ({
  children,
  max,
  size = 'md',
  className,
}: AvatarGroupProps) => {
  const childArray = Array.isArray(children) ? children : [children]
  const visibleAvatars = max ? childArray.slice(0, max) : childArray
  const remainingCount = max ? Math.max(0, childArray.length - max) : 0

  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
  }

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleAvatars}
      {remainingCount > 0 && (
        <div
          className={cn(
            'rounded-full flex items-center justify-center',
            'bg-secondary-200 text-secondary-700 font-medium',
            'ring-2 ring-white',
            sizes[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

export { Avatar, AvatarGroup }
