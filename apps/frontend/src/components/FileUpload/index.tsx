import { ExampleModuleCsvUploadType } from '@repo/csv'
import { Dialog, DialogContent } from '@repo/ui/components'
import {
  CancelButton,
  Dropzone,
  ErrorContent,
  ExpectedColumns,
  FileInfo,
  Footer,
  Header,
  IdleContent,
  Progress,
  ResetButton,
  RetryButton,
  SuccessContent,
  UploadAnotherButton,
  UploadButton,
  UploadingContent,
} from './components'
import { FileUploadProvider } from './context'

// =============================================================================
// ROOT COMPONENT
// =============================================================================

type RootProps = {
  uploadType: ExampleModuleCsvUploadType
  onClose: () => void
  children: React.ReactNode
}

function Root({ uploadType, onClose, children }: RootProps) {
  return (
    <FileUploadProvider uploadType={uploadType} onClose={onClose}>
      {children}
    </FileUploadProvider>
  )
}

// =============================================================================
// MODAL WRAPPER (handles Dialog open/close)
// =============================================================================

type ModalProps = {
  uploadType: ExampleModuleCsvUploadType | null
  onClose: () => void
  children: React.ReactNode
  className?: string
}

function Modal({ uploadType, onClose, children, className = '' }: ModalProps) {
  if (!uploadType) return null

  return (
    <Dialog open={!!uploadType} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`flex flex-col sm:top-[45%] sm:min-h-[560px] sm:max-w-2xl ${className}`}
      >
        <FileUploadProvider uploadType={uploadType} onClose={onClose}>
          {children}
        </FileUploadProvider>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// DROPZONE CONTENT (convenience component that renders all states)
// =============================================================================

function DropzoneContent() {
  return (
    <>
      <IdleContent />
      <FileInfo />
      <UploadingContent />
      <SuccessContent />
      <ErrorContent />
    </>
  )
}

// =============================================================================
// COMPOUND COMPONENT EXPORT
// =============================================================================

export const FileUpload = {
  // Core
  Root,
  Modal,

  // Layout
  Header,
  Dropzone,
  ExpectedColumns,
  Footer,

  // Dropzone states
  DropzoneContent,
  IdleContent,
  FileInfo,
  UploadingContent,
  SuccessContent,
  ErrorContent,

  // Utilities
  Progress,

  // Buttons
  CancelButton,
  UploadButton,
  ResetButton,
  RetryButton,
  UploadAnotherButton,
}

// =============================================================================
// HOOK EXPORT
// =============================================================================

export { useFileUpload } from './context'
export type { UploadStatus } from './context'

// =============================================================================
// DEFAULT COMPOSED MODAL (for common use case)
// =============================================================================

type FileUploadModalProps = {
  uploadType: ExampleModuleCsvUploadType | null
  onClose: () => void
}

export function FileUploadModal({ uploadType, onClose }: FileUploadModalProps) {
  return (
    <FileUpload.Modal uploadType={uploadType} onClose={onClose}>
      <FileUpload.Header />
      <FileUpload.Dropzone>
        <FileUpload.DropzoneContent />
      </FileUpload.Dropzone>
      <FileUpload.ExpectedColumns />
      <FileUpload.Footer />
    </FileUpload.Modal>
  )
}
