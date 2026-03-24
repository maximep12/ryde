import rydeLogo from '@/assets/ryde-logo.png'
import { cn } from '@repo/ui/lib'

interface RydeLogoProps {
  className?: string
}

export function RydeLogo({ className }: RydeLogoProps) {
  return (
    <img
      src={rydeLogo}
      alt="Ryde Logo"
      className={cn('h-8 w-auto invert dark:invert-0', className)}
    />
  )
}
