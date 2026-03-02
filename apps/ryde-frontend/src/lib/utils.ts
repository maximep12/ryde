import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function downloadBlob({
  content,
  fileName,
  addTimestamp = false,
}: {
  content: Blob
  fileName: string
  addTimestamp?: boolean
}) {
  const fileURL = window.URL.createObjectURL(content)

  const el = document.createElement("a")
  el.setAttribute("href", fileURL)

  let newFileName = fileName

  if (addTimestamp) {
    const fileNameParts = fileName.split(".")
    if (fileNameParts.length === 2) {
      const name = fileNameParts[0]
      const extension = fileNameParts[1]

      if (name && extension) {
        const now = new Date()
        const currentTime = [
          now.getMonth() + 1,
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getMilliseconds(),
        ].join("_")

        newFileName = name.concat("_", currentTime, ".", extension)
      }
    }
  }

  el.download = newFileName
  document.body.append(el)
  el.click()

  window.URL.revokeObjectURL(fileURL)
  document.body.removeChild(el)
}
