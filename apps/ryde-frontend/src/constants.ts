export const TRADE_TABS = {
  COMMERCIAL: {
    name: "Commercial",
    route: "commercial",
  },
  SELLOUT: {
    name: "Sell-out",
    route: "sellout",
  },
  INVENTORY: {
    name: "Inventory",
    route: "inventory",
  },
  REPORTS: {
    name: "Reports",
    route: "reports",
  },
  AMAZON: {
    name: "Amazon",
    route: "amazon",
  },
}

export const BRAND_TABS = {
  FILE_UPLOAD: { name: "File upload", route: "fileUpload" },
}

export const SETTINGS_TABS = {
  SETTINGS: { name: "Settings", route: "settings" },
}

export const DATA_MANAGER_TABS = {
  ...TRADE_TABS,
  ...BRAND_TABS,
}

export const ADMIN_TABS = {
  ...DATA_MANAGER_TABS,
  ...SETTINGS_TABS,
}

export const ERRORS = {
  invalidToken:
    "Token not found. Reset your token by visiting /management/[your token].",
}

export const BANNERS = {
  CIRCLE_K: "CIRCLE K ON",
  RABBA: "Rabba",
  INDEPENDANTS: "Independents",
  AISLE_24: "Aisle 24",
} as const

export const ROLES = {
  ADMIN: "Admin",
  TRADE: "Trade",
  DATA_MANAGER: "Data manager",
  RABBA: "rabba",
  CIRCLE_K: "circle k",
  UNAUTHORIZED: "unauthorized",
  PENDING: "Pending",
  DELETED: "Deleted",
}

export const TWSC_ROLES = [ROLES.ADMIN, ROLES.TRADE, ROLES.DATA_MANAGER]
export const BRAND_ROLES = [ROLES.RABBA, ROLES.CIRCLE_K]
