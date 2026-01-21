import { Button } from '@repo/ui/components'
import { useFileUpload } from './context'

type ResetButtonProps = {
  children?: React.ReactNode
  className?: string
}

export function ResetButton({ children, className = '' }: ResetButtonProps) {
  const { reset } = useFileUpload()

  return (
    <Button onClick={reset} variant="ghost" className={className}>
      {children ?? 'Reset'}
    </Button>
  )
}
