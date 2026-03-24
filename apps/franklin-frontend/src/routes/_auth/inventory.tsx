import { MetabaseEmbed } from '@/components/MetabaseEmbed'
import { metabaseUrlsAtom } from '@/stores/session'
import { createFileRoute } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import { LoaderIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/inventory')({
  component: InventoryPage,
  staticData: {
    title: 'route.inventory',
    crumb: 'route.inventory',
  },
})

function InventoryPage() {
  const metabaseUrls = useAtomValue(metabaseUrlsAtom)
  const url = metabaseUrls?.inventory

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoaderIcon className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full">
      <MetabaseEmbed url={url} />
    </div>
  )
}
