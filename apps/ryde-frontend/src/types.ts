import { type BANNERS } from "./constants"

export type UpdateDates = {
  amazon: string
  confirmed: string
  sellIn: string
  sellOut: {
    [BANNERS.CIRCLE_K]: string
    [BANNERS.RABBA]: string
  }
}

export type MetabaseUrls = {
  amazon: string
  commercial: string
  inventory: string
  reports: string
  sellout: string
}

export type UploadResult = {
  result: {
    created: number
    updated: number
    unit: string
    status: string
  }
  rows: {
    received: number
    rejected: number
    created: number
    updated: number
    deleted: number
    identical: number
  }
  warnings: Array<string>
}

export type BannerUploadResult = {
  result: { status: string }
}

export type ValidTokenResult = {
  jwt: string
  metabaseDashboardUrls: MetabaseUrls | null
  role: string
  updates: UpdateDates | null
}

export type BannerReport = {
  name: string
  date: string
  by: string
}

export type BannerReportsList = {
  sftp: {
    rabba: Array<BannerReport>
  }
  s3: {
    circleK: Array<BannerReport>
    rabba: Array<BannerReport>
  }
}
