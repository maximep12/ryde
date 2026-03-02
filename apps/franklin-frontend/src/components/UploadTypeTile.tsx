import { CSV_UPLOAD_TYPE_LABELS, UploadType } from '@repo/csv'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components'
import { UploadCloudIcon } from 'lucide-react'

export type UploadTypeConfig = {
  type: UploadType
  icon: React.ReactNode
  description: string
}

type UploadTypeTileProps = {
  config: UploadTypeConfig
  onClick: () => void
}

export function UploadTypeTile({ config, onClick }: UploadTypeTileProps) {
  const label = CSV_UPLOAD_TYPE_LABELS[config.type]

  return (
    <button
      type="button"
      onClick={onClick}
      className="group focus-visible:ring-ring cursor-pointer text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Card className="group-hover:border-primary/50 h-full transition-all group-hover:shadow-md">
        <CardHeader>
          <div className="bg-primary/10 text-primary mb-3 inline-flex size-12 items-center justify-center rounded-lg">
            {config.icon}
          </div>
          <CardTitle className="flex items-center gap-2">{label}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <UploadCloudIcon className="size-4" />
            <span>Click to upload CSV file</span>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}
