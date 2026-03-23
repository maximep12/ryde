import IframeResizer from 'iframe-resizer-react'

export function MetabaseEmbed({ url }: { url: string }) {
  return <IframeResizer src={url} style={{ height: '100%', width: '100%' }} />
}
