import { Button } from '@repo/ui/components'
import {
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
  LoaderIcon,
  UploadCloudIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react'
import { useFileUpload } from './context'

// =============================================================================
// HELPERS
// =============================================================================

function downloadCsvTemplate(columns: readonly string[], filename: string) {
  const csvContent = columns.join(',') + '\n'
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-template.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// =============================================================================
// HEADER
// =============================================================================

type HeaderProps = {
  title?: React.ReactNode
  description?: React.ReactNode
}

export function Header({ title, description }: HeaderProps) {
  const { label } = useFileUpload()

  return (
    <div className="space-y-1.5">
      <h2 className="text-lg font-semibold leading-none tracking-tight">
        {title ?? `Upload ${label}`}
      </h2>
      {description !== null && (
        <p className="text-sm text-muted-foreground">
          {description ?? `Select a CSV file to import ${label.toLowerCase()} data into the system.`}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// DROPZONE
// =============================================================================

type DropzoneProps = {
  children?: React.ReactNode
}

export function Dropzone({ children }: DropzoneProps) {
  const {
    file,
    uploadStatus,
    isDragging,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  } = useFileUpload()

  const getDropzoneClasses = () => {
    const base =
      'relative flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors'

    if (uploadStatus === 'uploading') {
      return `${base} border-primary/50 bg-primary/5`
    }
    if (uploadStatus === 'success') {
      return `${base} border-primary/50 bg-primary/5`
    }
    if (uploadStatus === 'error') {
      return `${base} border-red-500/50 bg-red-50 dark:bg-red-900/10`
    }
    if (isDragging) {
      return `${base} cursor-pointer border-primary bg-primary/5`
    }
    if (file) {
      return `${base} cursor-pointer border-primary/50 bg-primary/5`
    }
    return `${base} cursor-pointer border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50`
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={getDropzoneClasses()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileSelect}
        className={`absolute inset-0 cursor-pointer opacity-0 ${uploadStatus !== 'idle' || file ? 'pointer-events-none' : ''}`}
      />
      {children}
    </div>
  )
}

// =============================================================================
// DROPZONE IDLE STATE (no file selected)
// =============================================================================

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

// =============================================================================
// FILE INFO (file selected, idle state)
// =============================================================================

type FileInfoProps = {
  children?: React.ReactNode
}

export function FileInfo({ children }: FileInfoProps) {
  const { file, uploadStatus, fileInputRef, removeFile } = useFileUpload()

  if (uploadStatus !== 'idle' || !file) return null

  if (children) return <>{children}</>

  return (
    <>
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
        <FileTextIcon className="size-8 text-primary" />
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
        className="relative z-10 mt-4 flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
          className="cursor-pointer underline hover:text-foreground"
        >
          select another file
        </button>{' '}
        to replace
      </p>
    </>
  )
}

// =============================================================================
// UPLOADING STATE
// =============================================================================

type UploadingContentProps = {
  children?: React.ReactNode
}

export function UploadingContent({ children }: UploadingContentProps) {
  const { file, uploadStatus, uploadProgress } = useFileUpload()

  if (uploadStatus !== 'uploading') return null

  if (children) return <>{children}</>

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
        <LoaderIcon className="size-8 animate-spin text-primary" />
      </div>
      <p className="text-center font-medium">Uploading {file?.name}</p>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        Please wait while we process your file...
      </p>
      <Progress value={uploadProgress} className="mt-6" />
    </div>
  )
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

type ProgressProps = {
  value?: number
  className?: string
}

export function Progress({ value, className = '' }: ProgressProps) {
  const { uploadProgress } = useFileUpload()
  const progressValue = value ?? uploadProgress

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progressValue}%` }}
        />
      </div>
      <p className="text-muted-foreground mt-2 text-center text-xs">
        {Math.round(progressValue)}% complete
      </p>
    </div>
  )
}

// =============================================================================
// RESET BUTTON (shared by success and error states)
// =============================================================================

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

// =============================================================================
// SUCCESS STATE
// =============================================================================

type SuccessContentProps = {
  children?: React.ReactNode
}

export function SuccessContent({ children }: SuccessContentProps) {
  const { file, uploadStatus } = useFileUpload()

  if (uploadStatus !== 'success') return null

  if (children) return <>{children}</>

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircleIcon className="size-8 text-primary" />
      </div>
      <p className="text-center font-medium text-primary">
        Upload successful!
      </p>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        {file?.name} has been uploaded and processed.
      </p>
      <ResetButton className="mt-6">Upload another file</ResetButton>
    </div>
  )
}

// =============================================================================
// ERROR STATE
// =============================================================================

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
      <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5">
        <FileTextIcon className="size-4 text-muted-foreground" />
        <span className="text-sm">{file?.name}</span>
      </div>
      <p className="text-muted-foreground mt-3 text-center text-sm">
        There was an error processing your file. Please try again.
      </p>
      <ResetButton className="mt-6">Try again</ResetButton>
    </div>
  )
}

// =============================================================================
// EXPECTED COLUMNS
// =============================================================================

type ExpectedColumnsProps = {
  showDownload?: boolean
}

export function ExpectedColumns({ showDownload = true }: ExpectedColumnsProps) {
  const { uploadType, expectedColumns } = useFileUpload()

  return (
    <div className="rounded-md bg-muted p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Expected columns</p>
        {showDownload && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => downloadCsvTemplate(expectedColumns, uploadType)}
          >
            <DownloadIcon className="size-3" />
            Download template
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {expectedColumns.map((col) => (
          <span key={col} className="rounded bg-background px-2 py-0.5 font-mono text-xs">
            {col}
          </span>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// FOOTER
// =============================================================================

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

// =============================================================================
// INDIVIDUAL BUTTONS (for custom footers)
// =============================================================================

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
      className="cursor-pointer text-sm text-primary underline hover:text-primary/80"
    >
      {children ?? 'Upload another file'}
    </button>
  )
}
