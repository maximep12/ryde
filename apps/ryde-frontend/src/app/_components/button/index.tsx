import { useState } from "react"
import { ClipLoader } from "react-spinners"

type ButtonProps = {
  text: string
  onClick: () => void | Promise<void>
  disabled?: boolean
}

export function Button({ text, onClick, disabled = false }: ButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function processClick() {
    if (isLoading) return
    setIsLoading(true)
    await onClick()
    setIsLoading(false)
  }

  return (
    <div
      className={`relative flex h-12 items-center rounded-md px-5 text-white ${
        disabled
          ? "bg-slate-600"
          : "bg-slate-800 hover:cursor-pointer hover:bg-slate-700"
      }`}
      onClick={processClick}
    >
      <div
        className={`absolute left-0 top-0 flex h-full w-full items-center justify-center ${
          isLoading ? "block" : "hidden"
        }`}
      >
        <ClipLoader color="white" />
      </div>
      <p className={`select-none ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {text}
      </p>
    </div>
  )
}
