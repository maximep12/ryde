import {
  EXAMPLE_MODULE_CSV_UPLOAD_TYPE_LABELS,
  ExampleModuleCsvUploadType,
} from '@repo/csv'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components'
import { UploadCloudIcon } from 'lucide-react'

export type UploadTypeConfig = {
  type: ExampleModuleCsvUploadType
  icon: React.ReactNode
  description: string
}

type UploadTypeTileProps = {
  config: UploadTypeConfig
  onClick: () => void
}

export function UploadTypeTile({ config, onClick }: UploadTypeTileProps) {
  const label = EXAMPLE_MODULE_CSV_UPLOAD_TYPE_LABELS[config.type]

  return (
    <button
      type="button"
      onClick={onClick}
      className="group cursor-pointer text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-md">
        <CardHeader>
          <div className="bg-primary/10 text-primary mb-3 inline-flex size-12 items-center justify-center rounded-lg">
            {config.icon}
          </div>
          <CardTitle className="flex items-center gap-2">{label}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UploadCloudIcon className="size-4" />
            <span>Click to upload CSV file</span>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}
