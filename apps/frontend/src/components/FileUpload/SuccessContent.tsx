import { CheckCircleIcon } from 'lucide-react'
import { useFileUpload } from './context'
import { ResetButton } from './ResetButton'

type SuccessContentProps = {
  children?: React.ReactNode
}

export function SuccessContent({ children }: SuccessContentProps) {
  const { file, uploadStatus } = useFileUpload()

  if (uploadStatus !== 'success') return null

  if (children) return <>{children}</>

  return (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-full">
        <CheckCircleIcon className="text-primary size-8" />
      </div>
      <p className="text-primary text-center font-medium">Upload successful!</p>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        {file?.name} has been uploaded and processed.
      </p>
      <ResetButton className="mt-6">Upload another file</ResetButton>
    </div>
  )
}
