import { cn } from "~/lib/utils"

type SuccessBoxProps = {
  bgColor: string
  children: React.ReactNode
}

export function SuccessBox({ bgColor, children }: SuccessBoxProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded p-4 ring-1",

        bgColor === "green"
          ? "bg-green-50 text-green-600 ring-green-600"
          : bgColor === "yellow"
            ? "bg-amber-50 text-amber-600 ring-amber-600"
            : bgColor === "red"
              ? "bg-red-50 text-red-600 ring-red-600"
              : "bg-transparent",
      )}
    >
      {children}
    </div>
  )
}
