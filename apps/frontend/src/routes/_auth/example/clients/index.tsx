import { useSearchClients } from '@/hooks/queries/clients/useSearchClients'
import { useRecentlyViewedClients } from '@/hooks/useRecentlyViewedClients'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '@repo/ui/components'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { BuildingIcon, ClockIcon, MailIcon, PhoneIcon, SearchIcon, UserIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_auth/example/clients/')({
  component: ClientsPage,
  staticData: {
    title: 'route.clients',
    crumb: 'route.clients',
  },
})

function ClientsPage() {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { data: results, isLoading, error } = useSearchClients(search)
  const { recentClients } = useRecentlyViewedClients()
  const navigate = useNavigate()

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  const handleSelect = (clientId: number) => {
    setIsOpen(false)
    setSearch('')
    setSelectedIndex(-1)
    navigate({ to: '/example/clients/$clientId', params: { clientId: clientId.toString() } })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex].id)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Client Lookup</h1>
        <p className="text-muted-foreground mt-1">
          Search for clients by name, email, phone, company, or client ID
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="size-5" />
            Search Clients
          </CardTitle>
          <CardDescription>
            Enter at least 3 characters to search. Results are limited to 10 for performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Popover open={isOpen && search.length >= 3} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    if (e.target.value.length >= 3) {
                      setIsOpen(true)
                    }
                  }}
                  onFocus={() => {
                    if (search.length >= 3) {
                      setIsOpen(true)
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by name, email, phone, company, or client ID..."
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border py-2 pr-3 pl-10 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-destructive p-4 text-center text-sm">
                    Error searching clients
                  </div>
                ) : results?.length === 0 ? (
                  <div className="text-muted-foreground p-4 text-center text-sm">
                    No clients found
                  </div>
                ) : (
                  <div className="py-1">
                    <div className="text-muted-foreground px-3 py-1.5 text-xs font-medium">
                      Search Results
                    </div>
                    {results?.map((client: (typeof results)[0], index: number) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelect(client.id)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                          index === selectedIndex ? 'bg-accent' : 'hover:bg-accent'
                        }`}
                      >
                        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                          {client.storeName[0]}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{client.storeName}</span>
                            <span className="text-muted-foreground shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
                              {client.clientCode}
                            </span>
                            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {client.storeType.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                                client.status === 'active'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                            >
                              {client.status}
                            </span>
                          </div>
                          <div className="text-muted-foreground flex items-center gap-3 text-xs">
                            {client.contactName && (
                              <span className="flex items-center gap-1 truncate">
                                <BuildingIcon className="size-3 shrink-0" />
                                <span className="truncate">{client.contactName}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 truncate">
                              <MailIcon className="size-3 shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </CardContent>

        {recentClients.length > 0 && (
          <>
            <div className="border-border border-t" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClockIcon className="size-4" />
                Recently Viewed
              </CardTitle>
              <CardDescription>Your last viewed clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                {recentClients.map((client) => (
                  <Link
                    key={client.id}
                    to="/example/clients/$clientId"
                    params={{ clientId: client.id.toString() }}
                    className="bg-muted/50 hover:bg-primary/10 border-border hover:border-primary/30 flex flex-col items-center gap-2 rounded-lg border px-4 py-5 text-center shadow-inner transition-colors"
                  >
                    <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-medium">
                      {client.storeName[0]}
                    </div>
                    <div className="w-full min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">{client.storeName}</p>
                      <p className="text-muted-foreground font-mono text-xs">{client.clientCode}</p>
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`inline-block size-2 rounded-full ${
                            client.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="text-muted-foreground text-xs capitalize">
                          {client.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <BuildingIcon className="size-4" />
              Search by store name
            </li>
            <li className="flex items-center gap-2">
              <UserIcon className="size-4" />
              Search by contact name
            </li>
            <li className="flex items-center gap-2">
              <MailIcon className="size-4" />
              Search by email address
            </li>
            <li className="flex items-center gap-2">
              <PhoneIcon className="size-4" />
              Search by phone number
            </li>
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs">CLI-001</span>
              Search by client ID
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
