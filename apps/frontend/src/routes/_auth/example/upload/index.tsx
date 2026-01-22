import { FileUploadModal } from '@/components/FileUpload'
import { UploadTypeConfig, UploadTypeTile } from '@/components/UploadTypeTile'
import { UploadType } from '@repo/csv'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components'
import { createFileRoute } from '@tanstack/react-router'
import { PackageIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_auth/example/upload/')({
  component: UploadDataPage,
  staticData: {
    title: 'route.uploadData',
    crumb: 'route.uploadData',
  },
})

const UPLOAD_TYPES: UploadTypeConfig[] = [
  {
    type: 'products',
    icon: <PackageIcon className="size-6" />,
    description: 'Import product catalog data',
  },
  {
    type: 'clients',
    icon: <UsersIcon className="size-6" />,
    description: 'Import client/customer data',
  },
]

function UploadDataPage() {
  const [selectedUploadType, setSelectedUploadType] = useState<UploadType | null>(null)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Upload Data</h1>
        <p className="text-muted-foreground mt-1">
          Import data from CSV files to update the system
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {UPLOAD_TYPES.map((config) => (
          <UploadTypeTile
            key={config.type}
            config={config}
            onClick={() => setSelectedUploadType(config.type)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
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
              <strong>Size limit:</strong> Maximum file size is 10MB per file
            </li>
          </ul>
        </CardContent>
      </Card>

      <FileUploadModal
        uploadType={selectedUploadType}
        onClose={() => setSelectedUploadType(null)}
      />
    </div>
  )
}
