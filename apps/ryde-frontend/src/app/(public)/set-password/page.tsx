"use client"

import { useState, useContext, useEffect, Suspense } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthContext } from "~/app/context"
import { TWSC_ROLES, BRAND_ROLES } from "~/constants"
import rydeLogo from "~/images/ryde-logo.png"
import { setPassword } from "~/lib/api"
import { setJwtCookie } from "~/lib/auth"

function SetPasswordForm() {
  const { setUserRole } = useContext(AuthContext)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      router.replace("/login")
    }
  }, [token, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { token: jwt, user } = await setPassword({ email, password, token })
      setJwtCookie(jwt)
      setUserRole(user.role)

      if (TWSC_ROLES.includes(user.role)) {
        router.replace("/commercial")
      } else if (BRAND_ROLES.includes(user.role)) {
        router.replace("/fileUpload")
      }
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
        <h1 className="mt-6 text-2xl font-semibold">Set your password</h1>
        <p className="mt-2 text-gray-400">
          Choose a password to complete your account setup.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <input
          type="password"
          required
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-white px-4 py-3 font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Set password"}
        </button>
      </form>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  )
}
