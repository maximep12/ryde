import { useFileUpload } from './context'

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
