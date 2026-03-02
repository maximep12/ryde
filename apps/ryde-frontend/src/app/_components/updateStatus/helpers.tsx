import { type ReactNode } from "react"
import { BANNERS, TRADE_TABS } from "~/constants"

type ChildrenContent = {
  children: ReactNode
}

function TextBox({ children }: ChildrenContent) {
  return <div className="wrap">{children}</div>
}

function TextLine({ children }: ChildrenContent) {
  return <p className="py-1">{children}</p>
}

export function UpdateDatesByRoute({
  route,
  updateDates,
}: {
  route: string
  updateDates: {
    amazon: string
    confirmed: string
    sellIn: string
    sellOut: Record<string, string>
  } | null
}) {
  if (!updateDates) return <TextLine>Dates N/A</TextLine>

  const sellInText = `Sell IN: Source: Invoiced Orders; Update: Mondays; Period: from launch to ${updateDates.sellIn}`

  const sellOutText = `Sell OUT: 
  Sources available: Circle K Banner (updated on Wednesdays; Period: from launch to ${
    updateDates.sellOut[BANNERS.CIRCLE_K]
  }) & Rabba Banner (Ad-hoc updates; Period: from launch to ${
    updateDates.sellOut[BANNERS.RABBA]
  })`

  const confirmedText = `Sell IN Booked Confirmed: Source: Orders Booked Confirmed; Update: Mondays; Period: from launch to ${updateDates.confirmed}`

  const velocity =
    "VPO: Velocity per Outlet. Formula: #bottles sold per store per week; Sources Circle K & Rabba Banners."

  const amazonText = `Amazon latest import: ${updateDates.amazon}`

  if (route.includes(TRADE_TABS.COMMERCIAL.route)) {
    return (
      <TextBox>
        <TextLine>{sellInText}</TextLine>
        <TextLine>{confirmedText}</TextLine>
      </TextBox>
    )
  }

  if (route.includes(TRADE_TABS.SELLOUT.route)) {
    return (
      <TextBox>
        <TextLine>{sellOutText}</TextLine>
        <TextLine>{velocity}</TextLine>
      </TextBox>
    )
  }

  if (
    route.includes(TRADE_TABS.INVENTORY.route) ||
    route.includes(TRADE_TABS.REPORTS.route)
  ) {
    return (
      <TextBox>
        <TextLine>{sellInText}</TextLine>
        <TextLine>{confirmedText}</TextLine>
        <TextLine>{sellOutText}</TextLine>
      </TextBox>
    )
  }

  if (route.includes(TRADE_TABS.AMAZON.route)) {
    return (
      <TextBox>
        <TextLine>{amazonText}</TextLine>
      </TextBox>
    )
  }

  return (
    <TextBox>
      <TextLine>{sellInText}</TextLine>
      <TextLine>{velocity}</TextLine>
      <TextLine>{confirmedText}</TextLine>
    </TextBox>
  )
}
