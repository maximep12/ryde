import { FileTextIcon, XCircleIcon } from 'lucide-react'
import { useFileUpload } from './context'
import { ResetButton } from './ResetButton'

type ErrorContentProps = {
  children?: React.ReactNode
}

export function ErrorContent({ children }: ErrorContentProps) {
  const { file, uploadStatus } = useFileUpload()

  if (uploadStatus !== 'error') return null

  if (children) return <>{children}</>

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <XCircleIcon className="size-8 text-red-600 dark:text-red-400" />
      </div>
      <p className="text-center font-medium text-red-700 dark:text-red-400">Upload failed</p>
      <div className="bg-muted/50 mt-2 flex items-center gap-2 rounded-md border px-3 py-1.5">
        <FileTextIcon className="text-muted-foreground size-4" />
        <span className="text-sm">{file?.name}</span>
      </div>
      <p className="text-muted-foreground mt-3 text-center text-sm">
        There was an error processing your file. Please try again.
      </p>
      <ResetButton className="mt-6">Try again</ResetButton>
    </div>
  )
}
