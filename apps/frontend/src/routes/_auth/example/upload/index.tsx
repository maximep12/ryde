import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components'
import { createFileRoute } from '@tanstack/react-router'
import { BoxesIcon, FileTextIcon, PackageIcon, UploadCloudIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_auth/example/upload/')({
  component: UploadDataPage,
  staticData: {
    title: 'route.uploadData',
    crumb: 'route.uploadData',
  },
})

type DropzoneProps = {
  title: string
  description: string
  accept: string
  icon: React.ReactNode
  expectedColumns: string[]
}

function MockDropzone({ title, description, accept, icon, expectedColumns }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>(
    'idle',
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
    setUploadStatus('idle')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
      setUploadStatus('idle')
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    if (files.length === 1) {
      setUploadStatus('idle')
    }
  }

  const handleUpload = () => {
    if (files.length === 0) return

    setUploadStatus('uploading')

    // Simulate upload with random success/error
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3
      setUploadStatus(isSuccess ? 'success' : 'error')

      if (isSuccess) {
        // Clear files after successful upload
        setTimeout(() => {
          setFiles([])
          setUploadStatus('idle')
        }, 2000)
      }
    }, 1500)
  }

  return (
    <Card className="flex h-full flex-col">
      <div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription className="min-h-[40px]">{description}</CardDescription>
        </CardHeader>
      </div>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        {/* Dropzone section */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          }`}
        >
          <input
            type="file"
            accept={accept}
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <UploadCloudIcon
            className={`mb-3 size-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
          />
          <p className="text-center font-medium">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-muted-foreground mt-1 text-center text-sm">
            or click to browse your files
          </p>
          <p className="text-muted-foreground mt-2 text-xs">Accepts: {accept}</p>
        </div>

        {/* Bottom section: template button and file list */}
        <div className="space-y-4">
          {/* Show Template button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <FileTextIcon className="mr-2 size-4" />
                Show Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{title} Import Template</DialogTitle>
                <DialogDescription>
                  Your file should contain the following columns in the first row.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted rounded-md p-4">
                  <p className="text-muted-foreground mb-2 text-sm font-medium">Expected columns:</p>
                  <div className="flex flex-wrap gap-2">
                    {expectedColumns.map((col) => (
                      <span
                        key={col}
                        className="bg-background rounded border px-2 py-1 font-mono text-sm"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-muted-foreground text-sm">
                  <p className="mb-2 font-medium">Example CSV format:</p>
                  <pre className="bg-muted overflow-x-auto rounded p-3 font-mono text-xs">
                    {expectedColumns.join(',')}
                    {'\n'}
                    {expectedColumns.map(() => '...').join(',')}
                  </pre>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected files:</p>
              <ul className="space-y-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-destructive ml-2 shrink-0 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadStatus === 'uploading'}
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Files'}
              </button>

              {uploadStatus === 'success' && (
                <p className="text-center text-sm text-green-600 dark:text-green-400">
                  Files uploaded successfully!
                </p>
              )}

              {uploadStatus === 'error' && (
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  Upload failed. Please check your file format and try again.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function UploadDataPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Upload Data</h1>
        <p className="text-muted-foreground mt-1">
          Import data from CSV or Excel files to update the system
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MockDropzone
          title="Users"
          description="Import user accounts and profile information"
          accept=".csv,.xlsx,.xls"
          icon={<UsersIcon className="size-5" />}
          expectedColumns={['email', 'firstName', 'lastName', 'department', 'role']}
        />

        <MockDropzone
          title="Products"
          description="Import product catalog and pricing data"
          accept=".csv,.xlsx,.xls"
          icon={<PackageIcon className="size-5" />}
          expectedColumns={['sku', 'name', 'description', 'category', 'price', 'status']}
        />

        <MockDropzone
          title="Inventory"
          description="Import stock levels and warehouse data"
          accept=".csv,.xlsx,.xls"
          icon={<BoxesIcon className="size-5" />}
          expectedColumns={['sku', 'warehouse', 'quantity', 'reorderPoint', 'lastUpdated']}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>
              <strong>File formats:</strong> CSV, Excel (.xlsx, .xls) files are supported
            </li>
            <li>
              <strong>Headers:</strong> The first row must contain column headers matching the
              expected columns
            </li>
            <li>
              <strong>Encoding:</strong> Use UTF-8 encoding for CSV files to ensure special
              characters are preserved
            </li>
            <li>
              <strong>Date format:</strong> Use ISO 8601 format (YYYY-MM-DD) for date fields
            </li>
            <li>
              <strong>Size limit:</strong> Maximum file size is 10MB per file
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
