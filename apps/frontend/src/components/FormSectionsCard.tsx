import { Card, CardContent } from '@repo/ui/components'
import { AlertCircleIcon, CheckCircleIcon, CircleHelpIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavigationSection<T extends string> {
  id: T
  label: string
}

interface FormSectionsCardProps<T extends string> {
  sections: NavigationSection<T>[]
  sectionStatus: Record<T, boolean>
  sectionErrors?: Partial<Record<T, boolean>>
  activeSection: T | null
  onSectionClick: (section: T) => void
  action?: ReactNode
}

export function FormSectionsCard<T extends string>({
  sections,
  sectionStatus,
  sectionErrors,
  activeSection,
  onSectionClick,
  action,
}: FormSectionsCardProps<T>) {
  const completedCount = Object.values(sectionStatus).filter(Boolean).length
  const totalCount = Object.keys(sectionStatus).length
  const allComplete = completedCount === totalCount
  const remaining = totalCount - completedCount
  const errorCount = sectionErrors ? Object.values(sectionErrors).filter(Boolean).length : 0

  const getStatusText = () => {
    if (errorCount > 0) {
      return (
        <span className="text-destructive font-normal">
          ({errorCount} {errorCount === 1 ? 'error' : 'errors'})
        </span>
      )
    }
    if (allComplete) {
      return <span className="text-muted-foreground/60 font-normal">(Complete)</span>
    }
    return <span className="text-muted-foreground/60 font-normal">({remaining} left)</span>
  }

  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 font-semibold">
          <span className="uppercase">Form Sections</span> {getStatusText()}
        </h3>
        <nav className="space-y-1">
          {sections.map((section) => {
            const isComplete = sectionStatus[section.id]
            const hasError = sectionErrors?.[section.id]
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionClick(section.id)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium ${
                  isActive ? 'bg-muted' : 'hover:bg-muted'
                } ${
                  hasError
                    ? 'text-destructive'
                    : isComplete
                      ? 'text-black dark:text-white'
                      : 'text-muted-foreground/60'
                }`}
              >
                {hasError ? (
                  <AlertCircleIcon className="text-destructive size-4 shrink-0" />
                ) : isComplete ? (
                  <CheckCircleIcon className="size-4 shrink-0 text-black dark:text-white" />
                ) : (
                  <CircleHelpIcon className="text-muted-foreground/40 size-4 shrink-0" />
                )}
                <span className="truncate">{section.label}</span>
              </button>
            )
          })}
        </nav>
        {action && <div className="mt-6 -mb-1 border-t pt-5">{action}</div>}
      </CardContent>
    </Card>
  )
}
