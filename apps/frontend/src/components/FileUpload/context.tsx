import { useUploadFile } from '@/hooks/mutations/uploads/useUploadFile'
import { useUploadStatus } from '@/hooks/queries/uploads/useUploadStatus'
import { CSV_HEADERS, CSV_UPLOAD_TYPE_LABELS, UPLOAD_REPORT_STATUS, UploadType } from '@repo/csv'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useEffect, useRef, useState } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export type ResultsSummary = {
  total: number
  valid: number
  invalid: number
}

type FileUploadContextValue = {
  // State
  uploadType: UploadType
  file: File | null
  uploadStatus: UploadStatus
  uploadProgress: number
  isDragging: boolean
  label: string
  expectedColumns: readonly string[]
  errorMessage: string | null
  resultsSummary: ResultsSummary | null
  uploadId: string | null

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
  uploadType: UploadType
  onClose: () => void
  children: React.ReactNode
}

export function FileUploadProvider({ uploadType, onClose, children }: FileUploadProviderProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultsSummary, setResultsSummary] = useState<ResultsSummary | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)

  const label = CSV_UPLOAD_TYPE_LABELS[uploadType]
  const expectedColumns = CSV_HEADERS[uploadType]

  // Upload mutation
  const uploadMutation = useUploadFile()

  // Status polling query - only enabled after upload completes
  const statusQuery = useUploadStatus(uploadedFileName, {
    enabled: uploadStatus === 'processing',
  })

  // Handle upload mutation state changes
  useEffect(() => {
    if (uploadMutation.isPending) {
      setUploadProgress(50) // Show progress while uploading to S3
    }
    if (uploadMutation.isSuccess) {
      setUploadedFileName(uploadMutation.data.fileName)
      setUploadStatus('processing')
      setUploadProgress(75) // Show progress while processing
    }
    if (uploadMutation.isError) {
      setUploadStatus('error')
      setErrorMessage(uploadMutation.error?.message ?? 'Upload failed')
      setUploadProgress(0)
    }
  }, [
    uploadMutation.isPending,
    uploadMutation.isSuccess,
    uploadMutation.isError,
    uploadMutation.data,
    uploadMutation.error,
  ])

  // Handle status polling results
  useEffect(() => {
    if (!statusQuery.data) return

    const { status, metadata } = statusQuery.data

    // Check for processing error
    if (metadata?.error) {
      setUploadStatus('error')
      setErrorMessage(metadata.error)
      setUploadProgress(0)
      return
    }

    // Store the upload ID for linking to details page
    if (metadata?.uuid) {
      setUploadId(metadata.uuid)
    }

    // Update progress based on status
    if (status === UPLOAD_REPORT_STATUS.NOT_STARTED) {
      setUploadProgress(75)
    } else if (status === UPLOAD_REPORT_STATUS.PROCESSING) {
      setUploadProgress(85)
    } else if (status === UPLOAD_REPORT_STATUS.COMPLETED) {
      setUploadProgress(100)

      // Use summary from backend (already calculated)
      const { summary } = statusQuery.data
      if (summary) {
        setResultsSummary({ total: summary.total, valid: summary.valid, invalid: summary.invalid })
      }

      setUploadStatus('success')

      // Invalidate my-uploads query so the list refreshes
      queryClient.invalidateQueries({ queryKey: ['my-uploads'] })
    }
  }, [statusQuery.data])

  // Handle status query error
  useEffect(() => {
    if (statusQuery.isError) {
      setUploadStatus('error')
      setErrorMessage(statusQuery.error?.message ?? 'Failed to check upload status')
    }
  }, [statusQuery.isError, statusQuery.error])

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
    setUploadedFileName(null)
    setErrorMessage(null)
  }

  const startUpload = () => {
    if (!file) return
    setUploadStatus('uploading')
    setUploadProgress(25)
    setErrorMessage(null)

    uploadMutation.mutate({
      file,
      uploadType,
    })
  }

  const reset = () => {
    setFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setUploadedFileName(null)
    setErrorMessage(null)
    setResultsSummary(null)
    setUploadId(null)
    uploadMutation.reset()
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
    errorMessage,
    resultsSummary,
    uploadId,
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
