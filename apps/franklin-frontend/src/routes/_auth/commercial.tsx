import { MetabaseEmbed } from '@/components/MetabaseEmbed'
import { metabaseUrlsAtom } from '@/stores/ryde-session'
import { createFileRoute } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import { LoaderIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/commercial')({
  component: CommercialPage,
  staticData: {
    title: 'route.commercial',
    crumb: 'route.commercial',
  },
})

function CommercialPage() {
  const metabaseUrls = useAtomValue(metabaseUrlsAtom)
  const url = metabaseUrls?.commercial

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
