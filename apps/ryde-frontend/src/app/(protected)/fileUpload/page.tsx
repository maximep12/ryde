"use client"

import { useContext, useState } from "react"
import { FileUpload } from "~/app/_components/fileUpload"
import { uploadFile } from "~/lib/api"
import { AuthContext } from "~/app/context"
import { ROLES } from "~/constants"

const imports = [
  {
    title: "SELL-IN",
    type: ["XLSX"],
    action: uploadFile("sellin-orders/file"),
    category: "Sell-In",
  },
  {
    title: "CONFIRMED",
    type: ["XLSX"],
    action: uploadFile("sellin-orders-confirmed/file"),
    category: "Sell-In",
  },
  {
    title: "7-ELEVEN CONFIRMED",
    type: ["XLSX"],
    action: uploadFile("sellin-orders-confirmed/file/7-eleven"),
    category: "Sell-In",
  },
  {
    title: "AMAZON",
    type: ["TSV", "TXT"],
    action: uploadFile("amazon-orders/file", "text/csv"),
    category: "Amazon",
  },
  {
    title: "AMAZON BUNDLES",
    type: ["CSV", "TXT"],
    action: uploadFile("amazon-orders/bundles", "text/csv"),
    category: "Amazon",
  },
  {
    title: "FORECAST",
    type: ["XLSX"],
    action: uploadFile("forecast/amazon"),
    category: "Amazon",
  },
  {
    title: "RABBA SELL-OUT",
    type: ["CSV"],
    action: uploadFile("banners/rabba", "text/csv"),
    category: "Sell-Out",
  },
  {
    title: "CIRCLE K ON SELL-OUT",
    type: ["XLSX"],
    action: uploadFile("banners/circleK"),
    category: "Sell-Out",
  },
  {
    title: "CIRCLE K QC-ATL SELL-OUT",
    type: ["XLSX"],
    action: uploadFile("banners/circleK/qcatl"),
    category: "Sell-Out",
  },
  {
    title: "CENTRAL MARKET SELL-OUT",
    type: ["XLSX"],
    action: uploadFile("banners/centralMarket"),
    category: "Sell-Out",
  },
  {
    title: "LOBLAWS SELL-OUT",
    type: ["CSV"],
    action: uploadFile("banners/loblaws"),
    category: "Sell-Out",
  },
  {
    title: "PARKLAND SELL-OUT",
    type: ["XLSX"],
    action: uploadFile("banners/parkland"),
    category: "Sell-Out",
  },
  {
    title: "PETRO CANADA SELL-OUT",
    type: ["XLSX"],
    action: uploadFile("banners/petrocanada"),
    category: "Sell-Out",
  },
  {
    title: "7ELEVEN SELL-OUT",
    type: ["XLSX"],
    action: uploadFile("banners/7eleven"),
    category: "Sell-Out",
  },
  {
    title: "NAP Orange SELL-OUT",
    type: ["XLSX"],
    action: uploadFile("banners/napOrange"),
    category: "Sell-Out",
  },
  {
    title: "Sobeys SELL-OUT",
    type: ["XLSX"],
    action: uploadFile("banners/sobeys"),
    category: "Sell-Out",
  },
  {
    title: "CUSTOMER FACINGS",
    type: ["XLSX"],
    action: uploadFile("customerProductStatus"),
    category: "Other",
  },
  {
    title: "SELL-IN TARGETS",
    type: ["XLSX"],
    action: uploadFile("customers/targets"),
    category: "Sell-In",
  },
  {
    title: "UPDATE CUSTOMERS SCHEMA",
    type: ["XLSX"],
    action: uploadFile("customers"),
    category: "Schema",
  },
  {
    title: "UPDATE PRODUCTS SCHEMA",
    type: ["CSV"],
    action: uploadFile("products", "text/csv"),
    category: "Schema",
  },
  {
    title: "UPDATE PRODUCT FORMATS SCHEMA",
    type: ["CSV"],
    action: uploadFile("products/formats", "text/csv"),
    category: "Schema",
  },
]

export default function FileUploadPage() {
  const [filterText, setFilterText] = useState("")
  const { userRole } = useContext(AuthContext)

  function getAvailableImports({ userRole }: { userRole: string | null }) {
    if (userRole && [ROLES.ADMIN, ROLES.DATA_MANAGER].includes(userRole)) {
      return imports
    }
    if (userRole === ROLES.RABBA) {
      return imports.filter((x) => x.title.includes("RABBA"))
    }

    if (userRole === ROLES.CIRCLE_K) {
      return imports.filter((x) => x.title.includes("CIRCLE K"))
    }
    return []
  }

  const availableImports = getAvailableImports({ userRole })

  const filteredImports = availableImports.filter((imp) =>
    imp.title.toLowerCase().includes(filterText.toLowerCase()),
  )

  const categories = filteredImports.reduce<[string, typeof filteredImports][]>(
    (acc, imp) => {
      const group = acc.find(([key]) => key === imp.category)
      if (group) {
        group[1].push(imp)
      } else {
        acc.push([imp.category, [imp]])
      }
      return acc
    },
    [],
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          File Imports
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload and manage your data files
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-2 bg-white/80 px-2 pb-4 backdrop-blur-lg">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search imports..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="space-y-10">
          {categories.map(([category, items]) => (
            <section key={category}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {category}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-500">
                  {items?.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {items?.map((imp) => (
                  <FileUpload
                    key={imp.title}
                    title={imp.title}
                    action={imp.action}
                    type={imp.type}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16">
          <p className="text-sm text-slate-400">No imports match your search</p>
        </div>
      )}
    </div>
  )
}
