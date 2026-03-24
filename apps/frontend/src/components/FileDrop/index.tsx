'use no memo'

import { Button } from '@repo/ui/components'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileIcon,
  RefreshCwIcon,
  UploadCloudIcon,
  XIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

type DropStatus = 'idle' | 'uploading' | 'success' | 'error'

type FileDropProps = {
  /** File extensions to accept, e.g. ['.xlsx', '.xls']. Defaults to ['.xlsx', '.xls', '.csv'] */
  accept?: string[]
  /** Called with the selected file when the user clicks Upload. Should return a promise. */
  onUpload: (file: File) => Promise<void>
  /** Called when the user resets the dropzone (remove file or upload another). */
  onReset?: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FileDrop({ accept = ['.xlsx', '.xls', '.csv'], onUpload, onReset }: FileDropProps) {
  const acceptAttr = accept.join(',')
  const acceptHint = accept.join(', ')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dropStatus, setDropStatus] = useState<DropStatus>('idle')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (dropStatus === 'idle') setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (dropStatus !== 'idle') return
    const dropped = Array.from(e.dataTransfer.files).find((f) =>
      accept.some((ext) => f.name.toLowerCase().endsWith(ext)),
    )
    if (dropped) setFile(dropped)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (dropStatus !== 'idle') return
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const handleUpload = async () => {
    if (!file) return
    setDropStatus('uploading')
    try {
      await onUpload(file)
      setDropStatus('success')
    } catch {
      setDropStatus('error')
    }
  }

  const handleReset = () => {
    setFile(null)
    setDropStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
    onReset?.()
  }

  const dropzoneClasses = (() => {
    const base =
      'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors'
    if (dropStatus === 'uploading') return `${base} border-primary/50 bg-primary/5`
    if (dropStatus === 'success')
      return `${base} border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/10`
    if (dropStatus === 'error') return `${base} border-red-500/50 bg-red-50 dark:bg-red-900/10`
    if (isDragging) return `${base} cursor-pointer border-primary bg-primary/5`
    if (file) return `${base} cursor-pointer border-primary/50 bg-primary/5`
    return `${base} cursor-pointer border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50`
  })()

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={dropzoneClasses}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptAttr}
          onChange={handleFileSelect}
          className={`absolute inset-0 cursor-pointer opacity-0 ${dropStatus !== 'idle' || file ? 'pointer-events-none' : ''}`}
        />

        {dropStatus === 'idle' && !file && (
          <>
            <UploadCloudIcon
              className={`mb-3 size-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <p className="font-medium">{isDragging ? 'Drop file here' : 'Drag & drop file here'}</p>
            <p className="text-muted-foreground mt-1 text-sm">or click to browse</p>
            <p className="text-muted-foreground mt-2 text-xs">Accepts: {acceptHint}</p>
          </>
        )}

        {dropStatus === 'idle' && file && (
          <>
            <FileIcon className="text-primary mb-3 size-10" />
            <p className="font-medium">{file.name}</p>
            <p className="text-muted-foreground mt-1 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
          </>
        )}

        {dropStatus === 'uploading' && (
          <>
            <UploadCloudIcon className="text-primary mb-3 size-10 animate-pulse" />
            <p className="font-medium">Uploading...</p>
            <p className="text-muted-foreground mt-1 text-sm">{file?.name}</p>
          </>
        )}

        {dropStatus === 'success' && (
          <>
            <CheckCircle2Icon className="mb-3 size-10 text-emerald-600" />
            <p className="font-medium text-emerald-700 dark:text-emerald-400">Upload successful</p>
            <p className="text-muted-foreground mt-1 text-sm">{file?.name}</p>
          </>
        )}

        {dropStatus === 'error' && (
          <>
            <AlertCircleIcon className="mb-3 size-10 text-red-600" />
            <p className="font-medium text-red-700 dark:text-red-400">Upload failed</p>
            <p className="text-muted-foreground mt-1 text-sm">{file?.name}</p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {dropStatus === 'idle' && file && (
          <>
            <Button onClick={handleUpload}>
              <UploadCloudIcon className="size-4" />
              Upload
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <XIcon className="size-4" />
              Remove
            </Button>
          </>
        )}
        {(dropStatus === 'success' || dropStatus === 'error') && (
          <>
            <Button variant="outline" onClick={handleReset}>
              Upload another file
            </Button>
            <Button variant="outline" size="icon" onClick={handleUpload} title="Re-run same file">
              <RefreshCwIcon className="size-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
