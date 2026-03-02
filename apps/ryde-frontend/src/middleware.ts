import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { AUTH_COOKIE_NAME } from "~/lib/auth"

const TWSC_ROUTES = [
  "/commercial",
  "/trade",
  "/sellout",
  "/inventory",
  "/reports",
  "/amazon",
]
const BRAND_ROUTES = ["/fileUpload"]
const ADMIN_ROUTES = ["/settings"]

const TWSC_ALLOWED_ROLES = ["Admin", "Trade", "Data manager"]
const BRAND_ALLOWED_ROLES = ["Admin", "Data manager"]
const ADMIN_ALLOWED_ROLES = ["Admin"]

const PUBLIC_PATHS = [
  "/login",
  "/unauthorized",
  "/request-access",
  "/set-password",
]

function clearCookieAndRedirect(request: NextRequest, destination = "/login") {
  const response = NextResponse.redirect(new URL(destination, request.url))
  response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 })
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.\w+$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return clearCookieAndRedirect(request)
  }

  let payload: { role?: string }
  try {
    const { payload: verified } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    )
    payload = verified as { role?: string }
  } catch {
    return clearCookieAndRedirect(request)
  }

  const role = payload.role
  if (!role) {
    return clearCookieAndRedirect(request)
  }

  // TWSC routes: require admin or trade
  if (TWSC_ROUTES.includes(pathname)) {
    if (!TWSC_ALLOWED_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }
    return NextResponse.next()
  }

  // Brand routes: require admin, rabba, or circle k
  if (BRAND_ROUTES.includes(pathname)) {
    if (!BRAND_ALLOWED_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }
    return NextResponse.next()
  }

  // Admin-only routes
  if (ADMIN_ROUTES.includes(pathname)) {
    if (!ADMIN_ALLOWED_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }
    return NextResponse.next()
  }

  // Root path: any valid JWT is fine
  if (pathname === "/") {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
