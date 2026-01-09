import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { FileRouteTypes } from '@/routeTree.gen'
import {
  BoxesIcon,
  ClipboardListIcon,
  FileSpreadsheetIcon,
  PackageIcon,
  TrendingUpIcon,
  UploadCloudIcon,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_auth/supply-demand/upload/')({
  component: UploadDataPage,
  staticData: {
    title: 'route.supplyDemandUpload',
    crumb: 'route.supplyDemandUpload',
  },
})

type DropzoneProps = {
  title: string
  description: string
  accept: string
  icon: React.ReactNode
  linkTo: FileRouteTypes['to']
  linkLabel: string
}

function MockDropzone({ title, description, accept, icon, linkTo, linkLabel }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])

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
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Link
            to={linkTo}
            className="text-primary hover:text-primary/80 text-sm font-medium hover:underline"
          >
            {linkLabel} &rarr;
          </Link>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
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
            className={`mb-4 size-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
          />
          <p className="text-center font-medium">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-muted-foreground mt-1 text-center text-sm">
            or click to browse your files
          </p>
          <p className="text-muted-foreground mt-2 text-xs">Accepts: {accept}</p>
        </div>

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
                    className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
          Upload supply and demand data files for processing
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <MockDropzone
          title="Product Status"
          description="Upload product status and lifecycle data"
          accept=".csv,.xlsx,.xls"
          icon={<PackageIcon className="size-5" />}
          linkTo="/supply-demand/product-status"
          linkLabel="View Product Status"
        />

        <MockDropzone
          title="Forecasts"
          description="Upload demand forecast and projection files"
          accept=".csv,.xlsx,.xls"
          icon={<TrendingUpIcon className="size-5" />}
          linkTo="/supply-demand/forecasts"
          linkLabel="View Forecasts"
        />

        <MockDropzone
          title="Inventory"
          description="Upload inventory and stock level data"
          accept=".csv,.xlsx,.xls"
          icon={<BoxesIcon className="size-5" />}
          linkTo="/supply-demand/inventory"
          linkLabel="View Inventory"
        />

        <MockDropzone
          title="One Line S&D"
          description="Upload one-line supply and demand data"
          accept=".csv,.xlsx,.xls"
          icon={<FileSpreadsheetIcon className="size-5" />}
          linkTo="/supply-demand/one-line-sd"
          linkLabel="View One Line S&D"
        />

        <MockDropzone
          title="Open PO"
          description="Upload open purchase order data"
          accept=".csv,.xlsx,.xls"
          icon={<ClipboardListIcon className="size-5" />}
          linkTo="/supply-demand/open-po"
          linkLabel="View Open PO"
        />
      </div>
    </div>
  )
}
