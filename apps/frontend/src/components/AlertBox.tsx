import { Button } from '@repo/ui/components'
import { LucideIcon, XIcon } from 'lucide-react'
import { ReactNode } from 'react'

type AlertVariant = 'red' | 'orange' | 'yellow' | 'blue' | 'green'

const activeFilterStyles: Record<
  AlertVariant,
  {
    container: string
    icon: string
    text: string
    button: string
  }
> = {
  red: {
    container: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-800 dark:text-red-200',
    button:
      'text-red-600 hover:bg-red-100 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-900 dark:hover:text-red-200',
  },
  orange: {
    container: 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/30',
    icon: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-800 dark:text-orange-200',
    button:
      'text-orange-600 hover:bg-orange-100 hover:text-orange-800 dark:text-orange-400 dark:hover:bg-orange-900 dark:hover:text-orange-200',
  },
  yellow: {
    container: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/30',
    icon: 'text-yellow-600 dark:text-yellow-400',
    text: 'text-yellow-800 dark:text-yellow-200',
    button:
      'text-yellow-600 hover:bg-yellow-100 hover:text-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-900 dark:hover:text-yellow-200',
  },
  blue: {
    container: 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-200',
    button:
      'text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900 dark:hover:text-blue-200',
  },
  green: {
    container: 'border-green-300 bg-green-100 dark:border-green-900/50 dark:bg-green-950/30',
    icon: 'text-green-700 dark:text-green-400',
    text: 'text-green-900 dark:text-green-200',
    button:
      'text-green-700 hover:bg-green-200 hover:text-green-900 dark:text-green-400 dark:hover:bg-green-900 dark:hover:text-green-200',
  },
}

const variantStyles: Record<
  AlertVariant,
  {
    container: string
    iconBg: string
    iconColor: string
    title: string
    description: string
    button: string
  }
> = {
  red: {
    container: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    iconColor: 'text-red-600 dark:text-red-400',
    title: 'text-red-800 dark:text-red-200',
    description: 'text-red-600 dark:text-red-400',
    button:
      'border-red-300 bg-white text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900',
  },
  orange: {
    container: 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/30',
    iconBg: 'bg-orange-100 dark:bg-orange-900/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
    title: 'text-orange-800 dark:text-orange-200',
    description: 'text-orange-600 dark:text-orange-400',
    button:
      'border-orange-300 bg-white text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900',
  },
  yellow: {
    container: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/30',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-800 dark:text-yellow-200',
    description: 'text-yellow-600 dark:text-yellow-400',
    button:
      'border-yellow-300 bg-white text-yellow-700 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 dark:hover:bg-yellow-900',
  },
  blue: {
    container: 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-200',
    description: 'text-blue-600 dark:text-blue-400',
    button:
      'border-blue-300 bg-white text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900',
  },
  green: {
    container: 'border-green-300 bg-green-100 dark:border-green-900/50 dark:bg-green-950/30',
    iconBg: 'bg-green-200 dark:bg-green-900/50',
    iconColor: 'text-green-700 dark:text-green-400',
    title: 'text-green-900 dark:text-green-200',
    description: 'text-green-700 dark:text-green-400',
    button:
      'border-green-400 bg-white text-green-800 hover:bg-green-200 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900',
  },
}

type AlertBoxProps = {
  variant: AlertVariant
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function AlertBox({
  variant,
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: AlertBoxProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${styles.container}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex size-10 items-center justify-center rounded-full ${styles.iconBg}`}>
          <Icon className={`size-5 ${styles.iconColor}`} />
        </div>
        <div>
          <p className={`font-medium ${styles.title}`}>{title}</p>
          <p className={`text-sm ${styles.description}`}>{description}</p>
        </div>
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className={styles.button} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

type AlertBoxContainerProps = {
  children: ReactNode
}

export function AlertBoxContainer({ children }: AlertBoxContainerProps) {
  return <div className="space-y-2">{children}</div>
}

type ActiveFilterBarProps = {
  variant: AlertVariant
  icon: LucideIcon
  label: string
  onClear: () => void
}

export function ActiveFilterBar({ variant, icon: Icon, label, onClear }: ActiveFilterBarProps) {
  const styles = activeFilterStyles[variant]

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${styles.container}`}>
      <Icon className={`size-4 ${styles.icon}`} />
      <span className={`text-sm font-medium ${styles.text}`}>{label}</span>
      <Button
        variant="ghost"
        size="sm"
        className={`ml-auto h-6 px-2 ${styles.button}`}
        onClick={onClear}
      >
        <XIcon className="size-4" />
        Clear filter
      </Button>
    </div>
  )
}
