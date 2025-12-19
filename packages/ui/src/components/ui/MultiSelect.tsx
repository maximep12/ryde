import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { Button } from './Button'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

export type MultiSelectOption = {
  value: string
  label: string
}

type MultiSelectProps = {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggleOption = (optionValue: string) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue]
    )
  }

  const clearAll = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange([])
  }

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <div className="flex flex-1 items-center gap-1 overflow-hidden">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : value.length <= 2 ? (
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map((label) => (
                  <span key={label} className="rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">
                {value.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {value.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                className="flex items-center justify-center"
                onClick={clearAll}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    clearAll(e as unknown as React.MouseEvent)
                  }
                }}
              >
                <XIcon className="size-4 text-muted-foreground hover:text-foreground cursor-pointer" />
              </span>
            )}
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!w-[--radix-popover-trigger-width] p-1" align="start">
        <div className="flex flex-col">
          {options.map((option) => {
            const isSelected = value.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent',
                  isSelected && 'bg-accent/50'
                )}
              >
                <div
                  className={cn(
                    'flex size-4 items-center justify-center rounded-sm border',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <CheckIcon className="size-3" />}
                </div>
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { MultiSelect }
