import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center border font-medium w-fit select-none whitespace-nowrap shrink-0 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-border bg-background text-foreground [a&]:hover:bg-primary/90',
        transparent: 'border-border bg-transparent text-foreground [a&]:hover:bg-primary/10',
        primary: 'border-none bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'border-none bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        success: 'border-none bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 [a&]:hover:bg-gray-800 dark:[a&]:hover:bg-gray-200',
        muted: 'border-none bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 [a&]:hover:bg-gray-300 dark:[a&]:hover:bg-gray-600',
      },
      size: {
        lg: 'h-8 px-3 py-1 rounded-md text-sm [&>svg]:size-4',
        default: 'h-6 px-2 py-0.5 rounded-md text-xs [&>svg]:size-3',
        xs: 'h-5 px-1.5 rounded-md text-xs [&>svg]:size-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
