import { Button } from '@repo/ui/components'
import { DownloadIcon } from 'lucide-react'
import { downloadCsvTemplate } from '@/lib/downloads'
import { useFileUpload } from './context'

type ExpectedColumnsProps = {
  showDownload?: boolean
}

export function ExpectedColumns({ showDownload = true }: ExpectedColumnsProps) {
  const { uploadType, expectedColumns } = useFileUpload()

  return (
    <div className="bg-muted rounded-md p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-semibold uppercase">Expected columns</p>
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
          <span key={col} className="bg-background rounded px-2 py-0.5 font-mono text-xs">
            {col}
          </span>
        ))}
      </div>
    </div>
  )
}
