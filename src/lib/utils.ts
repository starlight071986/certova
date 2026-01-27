import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Kombiniert Tailwind-Klassen intelligent.
 * Verwendet clsx für bedingte Klassen und tailwind-merge für Konfliktauflösung.
 *
 * Beispiel:
 * cn('px-4 py-2', isActive && 'bg-primary-500', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
