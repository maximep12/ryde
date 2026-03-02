"use client"

import { useState, useContext, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { AuthContext } from "~/app/context"
import { ROLES, TWSC_ROLES, BRAND_ROLES } from "~/constants"
import rydeLogo from "~/images/ryde-logo.png"
import { loginWithPassword } from "~/lib/api"
import { setJwtCookie } from "~/lib/auth"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const {
    userRole,
    setUserRole,
    roleIsLoaded,
    setUpdateDates,
    setMetabaseUrls,
  } = useContext(AuthContext)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (roleIsLoaded && userRole && userRole !== ROLES.UNAUTHORIZED) {
      if (TWSC_ROLES.includes(userRole)) {
        router.replace("/commercial")
      } else if (BRAND_ROLES.includes(userRole)) {
        router.replace("/fileUpload")
      } else if (userRole === ROLES.PENDING) {
        router.replace("/pending")
      }
    }
  }, [roleIsLoaded, userRole])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { token, user, dates, metabaseDashboardUrls } =
        await loginWithPassword({
          email,
          password,
        })

      setUpdateDates(dates)
      setMetabaseUrls(metabaseDashboardUrls)
      setJwtCookie(token)
      setUserRole(user.role.role)
    } catch (e) {
      setError("Invalid email or password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 px-4">
      <div className="text-center">
        <Image src={rydeLogo} alt="Ryde Logo" className="mx-auto h-12 w-auto" />
        <h1 className="mt-6 text-2xl font-semibold">Sign in to Ryde</h1>
        <p className="mt-2 text-gray-400">
          Enter your credentials to continue.
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-white px-4 py-3 font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/request-access" className="text-white hover:underline">
          Request access
        </Link>
      </p>
    </div>
  )
}
