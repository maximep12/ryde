import { TRADE_TABS } from "./constants"
import { type MetabaseUrls } from "./types"

export function getUrlsFromStorage(): MetabaseUrls {
  return Object.values(TRADE_TABS).reduce(
    (acc, it) => {
      const lowerName = it.route.toLowerCase()
      const url = window.sessionStorage.getItem(lowerName.concat("-url"))

      return url ? { ...acc, [lowerName]: url } : acc
    },
    { commercial: "", sellout: "", inventory: "", reports: "", amazon: "" },
  )
}
