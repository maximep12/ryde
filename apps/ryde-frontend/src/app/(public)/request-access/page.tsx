"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import rydeLogo from "~/images/ryde-logo.png"
import { requestAccess } from "~/lib/api"

export default function RequestAccessPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { message } = await requestAccess({ email })
      setSuccessMessage(message)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 px-4">
      <div className="text-center">
        <Image src={rydeLogo} alt="Ryde Logo" className="mx-auto h-12 w-auto" />
        <h1 className="mt-6 text-2xl font-semibold">Request access</h1>
        <p className="mt-2 text-gray-400">
          Enter your email to request access to Ryde.
        </p>
      </div>

      {successMessage ? (
        <p className="rounded-lg bg-gray-800 px-4 py-3 text-center text-sm text-gray-300">
          {successMessage}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-white px-4 py-3 font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Request access"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-white hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
