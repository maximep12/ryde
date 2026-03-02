import { useFileUpload } from './context'

type ProgressProps = {
  value?: number
  className?: string
}

export function Progress({ value, className = '' }: ProgressProps) {
  const { uploadProgress } = useFileUpload()
  const progressValue = value ?? uploadProgress

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all duration-100 ease-linear"
          style={{ width: `${progressValue}%` }}
        />
      </div>
      <p className="text-muted-foreground mt-2 text-center text-xs">
        {Math.round(progressValue)}% complete
      </p>
    </div>
  )
}
