import { MetabaseEmbed } from '@/components/MetabaseEmbed'
import { metabaseUrlsAtom } from '@/stores/session'
import { createFileRoute } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import { LoaderIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/amazon')({
  component: AmazonPage,
  staticData: {
    title: 'route.amazon',
    crumb: 'route.amazon',
  },
})

function AmazonPage() {
  const metabaseUrls = useAtomValue(metabaseUrlsAtom)
  const url = metabaseUrls?.amazon

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
