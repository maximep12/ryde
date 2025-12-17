import { SidebarTrigger } from '@repo/ui/components'

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
      </div>

      <div className="flex items-center gap-2">
        {/* TODO: Add theme selector */}
        {/* TODO: Add language selector */}
        {/* TODO: Add user menu */}
      </div>
    </header>
  )
}
