import axios from "axios"
import {
  type MetabaseUrls,
  type UpdateDates,
  type BannerReportsList,
  type BannerUploadResult,
  type UploadResult,
  type ValidTokenResult,
} from "~/types"
import { downloadBlob } from "./utils"
import { clearJwtCookie, getJwtFromCookie } from "./auth"

const apiUrl = process.env.NEXT_PUBLIC_API_URL

const api = axios.create({
  baseURL: apiUrl,
})

api.interceptors.request.use((config) => {
  const jwt = getJwtFromCookie()
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearJwtCookie()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)

export function uploadFile(
  endpoint: string,
  contentType = "multipart/form-data",
) {
  return async ({
    file,
  }: {
    file: File
  }): Promise<UploadResult | BannerUploadResult> => {
    const result = await api.post(endpoint, file, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `filename=${file.name}`,
      },
    })

    return result.data as UploadResult | BannerUploadResult
  }
}

export async function validateToken({
  token,
}: {
  token: string
}): Promise<ValidTokenResult> {
  const result = await api.post(`token`, {
    headers: { "Content-Type": "multipart/form-data" },
    data: { token },
  })

  return result.data as ValidTokenResult
}

export async function downloadMetabaseQuery({
  link,
  fileName,
}: {
  link: string
  fileName: string
}) {
  const response = await axios.get(link, { responseType: "blob" })
  const blob = response.data as Blob

  downloadBlob({ content: blob, fileName, addTimestamp: true })
}

export async function listLatestBannerReports() {
  const result = await api.get("download/list", {
    headers: { "Content-Type": "application/json" },
  })

  return result.data as BannerReportsList
}

export async function downloadBannerReport({
  provider,
  banner,
  fileName,
}: {
  provider: string
  banner: string
  fileName: string
}) {
  const response = await api.get(`download/${banner}/${provider}/${fileName}`, {
    responseType: "blob",
  })

  const blob = new Blob([response.data], { type: "application/octet-stream" })
  downloadBlob({ content: blob, fileName })
}

export async function requestMagicLink({ email }: { email: string }): Promise<{
  role: string
  token: string
  updates: UpdateDates | null
  metabaseDashboardUrls: MetabaseUrls | null
}> {
  const result = await api.post("auth/request-link", { email })
  return result.data as {
    role: string
    token: string
    updates: UpdateDates
    metabaseDashboardUrls: MetabaseUrls
  }
}

export type AuthResult = {
  token: string
  user: {
    id: string
    role: { role: string }
  }
  dates: UpdateDates | null
  metabaseDashboardUrls: MetabaseUrls | null
}

export async function requestAccess({
  email,
}: {
  email: string
}): Promise<{ status: string; message: string }> {
  const result = await api.post("auth/request-access", { email })
  return result.data as { status: string; message: string }
}

export async function setPassword({
  email,
  password,
  token,
}: {
  email: string
  password: string
  token: string
}): Promise<AuthResult> {
  const result = await api.post("auth/set-password", { email, password, token })
  return result.data as AuthResult
}

export async function getMe(): Promise<AuthResult> {
  const result = await api.get("auth/me")
  console.log(result.data)
  return result.data as AuthResult
}

export async function loginWithPassword({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<AuthResult> {
  const result = await api.post("auth/login", { email, password })
  return result.data as AuthResult
}

export type User = {
  id: string
  email: string
  role: { role: string }
}

export async function listUsers(): Promise<User[]> {
  const result = await api.get("users")
  return result.data as User[]
}

export async function updateUserRole({
  id,
  role,
}: {
  id: string
  role: string
}): Promise<void> {
  await api.patch(`users/${id}`, { role })
}

export async function deleteUser({ id }: { id: string }): Promise<void> {
  await api.delete(`users/${id}`)
}

export async function batchUpdateUserRoles(
  pendingRoles: Record<string, string>,
): Promise<User[]> {
  const grouped: Record<string, string[]> = {}
  for (const [id, role] of Object.entries(pendingRoles)) {
    grouped[role] ??= []
    grouped[role].push(id)
  }
  const result = await api.patch("users/batch", grouped)
  return result.data as User[]
}

export async function downloadPeriodTargetReport() {
  const response = await api.get(`download/period-targets`, {
    responseType: "blob",
  })

  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  downloadBlob({ content: blob, fileName: "current_period_target.xlsx" })
}
