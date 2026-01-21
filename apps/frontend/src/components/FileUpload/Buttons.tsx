import { Button } from '@repo/ui/components'
import { useFileUpload } from './context'

type CancelButtonProps = {
  children?: React.ReactNode
}

export function CancelButton({ children }: CancelButtonProps) {
  const { uploadStatus, close } = useFileUpload()

  return (
    <Button variant="outline" onClick={close}>
      {children ?? (uploadStatus === 'success' ? 'Close' : 'Cancel')}
    </Button>
  )
}

type UploadButtonProps = {
  children?: React.ReactNode
}

export function UploadButton({ children }: UploadButtonProps) {
  const { file, uploadStatus, startUpload } = useFileUpload()

  if (uploadStatus === 'success') return null

  return (
    <Button onClick={startUpload} disabled={!file || uploadStatus === 'uploading'}>
      {children ?? (uploadStatus === 'uploading' ? 'Uploading...' : 'Upload')}
    </Button>
  )
}

type RetryButtonProps = {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary'
  children?: React.ReactNode
}

export function RetryButton({ variant = 'ghost', children }: RetryButtonProps) {
  const { reset } = useFileUpload()

  return (
    <Button onClick={reset} variant={variant}>
      {children ?? 'Try again'}
    </Button>
  )
}

type UploadAnotherButtonProps = {
  children?: React.ReactNode
}

export function UploadAnotherButton({ children }: UploadAnotherButtonProps) {
  const { reset } = useFileUpload()

  return (
    <button
      type="button"
      onClick={reset}
      className="text-primary hover:text-primary/80 cursor-pointer text-sm underline"
    >
      {children ?? 'Upload another file'}
    </button>
  )
}
