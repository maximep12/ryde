import { UploadCloudIcon } from 'lucide-react'
import { useFileUpload } from './context'

type IdleContentProps = {
  children?: React.ReactNode
}

export function IdleContent({ children }: IdleContentProps) {
  const { file, uploadStatus, isDragging } = useFileUpload()

  if (uploadStatus !== 'idle' || file) return null

  if (children) return <>{children}</>

  return (
    <>
      <UploadCloudIcon
        className={`mb-3 size-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
      />
      <p className="text-center font-medium">
        {isDragging ? 'Drop file here' : 'Drag & drop file here'}
      </p>
      <p className="text-muted-foreground mt-1 text-center text-sm">or click to browse</p>
      <p className="text-muted-foreground mt-2 text-xs">Accepts: .csv, .xlsx, .xls</p>
    </>
  )
}
