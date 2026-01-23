import { LoaderIcon } from 'lucide-react'
import { useFileUpload } from './context'
import { Progress } from './Progress'

type UploadingContentProps = {
  children?: React.ReactNode
}

export function UploadingContent({ children }: UploadingContentProps) {
  const { file, uploadStatus, uploadProgress } = useFileUpload()

  if (uploadStatus !== 'uploading' && uploadStatus !== 'processing') return null

  if (children) return <>{children}</>

  const isProcessing = uploadStatus === 'processing'

  return (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-full">
        <LoaderIcon className="text-primary size-8 animate-spin" />
      </div>
      <p className="text-center font-medium">
        {isProcessing ? 'Processing' : 'Uploading'} {file?.name}
      </p>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        {isProcessing
          ? 'Please wait while we validate and import your data...'
          : 'Please wait while we upload your file...'}
      </p>
      <Progress value={uploadProgress} className="mt-6" />
    </div>
  )
}
