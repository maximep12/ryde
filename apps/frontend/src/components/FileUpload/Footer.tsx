import { Button } from '@repo/ui/components'
import { useFileUpload } from './context'

type FooterProps = {
  children?: React.ReactNode
}

export function Footer({ children }: FooterProps) {
  const { file, uploadStatus, startUpload, close } = useFileUpload()

  if (children) {
    return <div className="flex justify-end gap-2">{children}</div>
  }

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={close}>
        {uploadStatus === 'success' ? 'Close' : 'Cancel'}
      </Button>
      {uploadStatus !== 'success' && (
        <Button onClick={startUpload} disabled={!file || uploadStatus === 'uploading'}>
          {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload'}
        </Button>
      )}
    </div>
  )
}
