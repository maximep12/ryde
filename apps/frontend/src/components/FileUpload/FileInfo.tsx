import { FileTextIcon, XIcon } from 'lucide-react'
import { useFileUpload } from './context'

type FileInfoProps = {
  children?: React.ReactNode
}

export function FileInfo({ children }: FileInfoProps) {
  const { file, uploadStatus, fileInputRef, removeFile } = useFileUpload()

  if (uploadStatus !== 'idle' || !file) return null

  if (children) return <>{children}</>

  return (
    <>
      <div className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-full">
        <FileTextIcon className="text-primary size-8" />
      </div>
      <p className="text-center font-medium">{file.name}</p>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        {(file.size / 1024).toFixed(1)} KB
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          removeFile()
        }}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive relative z-10 mt-4 flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
      >
        <XIcon className="size-4" />
        Remove file
      </button>
      <p className="text-muted-foreground mt-4 text-center text-xs">
        Drop or{' '}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          className="hover:text-foreground cursor-pointer underline"
        >
          select another file
        </button>{' '}
        to replace
      </p>
    </>
  )
}
