import { DialogDescription, DialogTitle } from '@repo/ui/components'
import { useFileUpload } from './context'

type HeaderProps = {
  title?: React.ReactNode
  description?: React.ReactNode
}

export function Header({ title, description }: HeaderProps) {
  const { label } = useFileUpload()

  return (
    <div className="space-y-1.5">
      <DialogTitle className="text-lg leading-none font-semibold tracking-tight">
        {title ?? `Upload ${label}`}
      </DialogTitle>
      {description !== null && (
        <DialogDescription>
          {description ??
            `Select a CSV file to import ${label.toLowerCase()} data into the system.`}
        </DialogDescription>
      )}
    </div>
  )
}
