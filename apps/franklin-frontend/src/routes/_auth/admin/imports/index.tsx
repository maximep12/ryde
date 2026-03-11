import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Building2Icon,
  ClipboardCheckIcon,
  ShoppingCartIcon,
  StoreIcon,
  TargetIcon,
  UploadCloudIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_auth/admin/imports/')({
  component: ImportsPage,
  staticData: {
    title: 'route.imports',
    crumb: 'route.imports',
  },
})

type ImportConfig = {
  title: string
  description: string
  icon: React.ReactNode
  path: string
  category: string
}

const IMPORTS: ImportConfig[] = [
  {
    title: 'route.importCustomers',
    description: 'Upload the customers master data file',
    icon: <StoreIcon className="size-6" />,
    path: '/admin/imports/customers',
    category: 'Schema',
  },
  {
    title: 'route.importSellInTargets',
    description: 'Upload the sell-in targets file',
    icon: <TargetIcon className="size-6" />,
    path: '/admin/imports/sell-in-targets',
    category: 'Sell-In',
  },
  {
    title: 'route.importSellInOrders',
    description: 'Upload the sell-in orders file',
    icon: <ShoppingCartIcon className="size-6" />,
    path: '/admin/imports/sell-in-orders',
    category: 'Sell-In',
  },
  {
    title: 'route.importSellInOrdersConfirmed',
    description: 'Upload the confirmed sell-in orders file',
    icon: <ClipboardCheckIcon className="size-6" />,
    path: '/admin/imports/sell-in-orders-confirmed',
    category: 'Sell-In',
  },
  {
    title: 'route.importSellInOrdersConfirmed7Eleven',
    description: 'Upload the 7-Eleven confirmed orders file',
    icon: <Building2Icon className="size-6" />,
    path: '/admin/imports/sell-in-orders-confirmed-7-eleven',
    category: 'Sell-In',
  },
  /*
  {
    title: 'route.importProducts',
    description: 'Upload the products master data file',
    icon: <PackageIcon className="size-6" />,
    path: '/admin/imports/products',
    category: 'Schema',
  },
  {
    title: 'route.importProductFormats',
    description: 'Upload the product formats file',
    icon: <PackageIcon className="size-6" />,
    path: '/admin/imports/product-formats',
    category: 'Schema',
  },
  */
]

function ImportsPage() {
  const { t } = useTranslation('routes')
  const [filterText, setFilterText] = useState('')

  const filtered = IMPORTS.filter((imp) =>
    t(imp.title).toLowerCase().includes(filterText.toLowerCase()),
  )

  const categories = filtered.reduce<[string, typeof filtered][]>((acc, imp) => {
    const group = acc.find(([key]) => key === imp.category)
    if (group) {
      group[1].push(imp)
    } else {
      acc.push([imp.category, [imp]])
    }
    return acc
  }, [])

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imports</h1>
          <p className="text-muted-foreground mt-1">Import data in the system.</p>
        </div>
      </header>

      <div className="bg-background/80 sticky top-0 z-10 -mx-1 px-1 pb-4 backdrop-blur-lg">
        <Input
          type="search"
          placeholder="Search imports..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      {categories.length > 0 ? (
        <div className="space-y-10">
          {categories.map(([category, items]) => (
            <section key={category}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {category}
                </h2>
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums">
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((imp) => (
                  <Link key={imp.path} to={imp.path} className="group focus-visible:outline-none">
                    <Card className="group-hover:border-primary/50 h-full transition-all group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-offset-2">
                      <CardHeader>
                        <div className="bg-primary/10 text-primary mb-3 inline-flex size-12 items-center justify-center rounded-lg">
                          {imp.icon}
                        </div>
                        <CardTitle>{t(imp.title)}</CardTitle>
                        <CardDescription>{imp.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <UploadCloudIcon className="size-4" />
                          <span>Click to import</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
          <p className="text-muted-foreground text-sm">No imports match your search</p>
        </div>
      )}
    </div>
  )
}
