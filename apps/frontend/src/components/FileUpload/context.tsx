import { CSV_HEADERS, CSV_UPLOAD_TYPE_LABELS, CsvUploadType } from '@repo/csv'
import { createContext, use, useEffect, useRef, useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

type FileUploadContextValue = {
  // State
  uploadType: CsvUploadType
  file: File | null
  uploadStatus: UploadStatus
  uploadProgress: number
  isDragging: boolean
  label: string
  expectedColumns: readonly string[]

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>

  // Handlers
  setFile: (file: File | null) => void
  setIsDragging: (isDragging: boolean) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  removeFile: () => void
  startUpload: () => void
  reset: () => void
  close: () => void
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null)

// =============================================================================
// HOOK
// =============================================================================

export function useFileUpload() {
  const context = use(FileUploadContext)
  if (!context) {
    throw new Error('useFileUpload must be used within a FileUpload.Root')
  }
  return context
}

// =============================================================================
// PROVIDER
// =============================================================================

type FileUploadProviderProps = {
  uploadType: CsvUploadType
  onClose: () => void
  children: React.ReactNode
}

export function FileUploadProvider({ uploadType, onClose, children }: FileUploadProviderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const label = CSV_UPLOAD_TYPE_LABELS[uploadType]
  const expectedColumns = CSV_HEADERS[uploadType]

  // Simulate upload progress animation
  useEffect(() => {
    if (uploadStatus !== 'uploading') return

    setUploadProgress(0)
    const duration = 1200 // Total upload time in ms
    const interval = 50 // Update every 50ms
    const increment = 100 / (duration / interval)

    // Determine outcome at start (for debugging: 0 = always error, 0.5 = 50/50, 1 = always success)
    const successChance = 0.75
    const willSucceed = Math.random() < successChance

    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        const next = prev + increment
        if (next >= 100) {
          clearInterval(timer)
          setTimeout(() => setUploadStatus(willSucceed ? 'success' : 'error'), 200)
          return 100
        }
        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [uploadStatus])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadStatus === 'idle') {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (uploadStatus !== 'idle') return

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'),
    )
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadStatus !== 'idle') return
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
  }

  const startUpload = () => {
    if (!file) return
    setUploadStatus('uploading')
  }

  const reset = () => {
    setFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
  }

  const close = () => {
    reset()
    onClose()
  }

  const value: FileUploadContextValue = {
    uploadType,
    file,
    uploadStatus,
    uploadProgress,
    isDragging,
    label,
    expectedColumns,
    fileInputRef,
    setFile,
    setIsDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeFile,
    startUpload,
    reset,
    close,
  }

  return <FileUploadContext.Provider value={value}>{children}</FileUploadContext.Provider>
}
