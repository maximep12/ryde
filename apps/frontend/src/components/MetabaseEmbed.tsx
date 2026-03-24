import IframeResizer from 'iframe-resizer-react'

export function MetabaseEmbed({ url }: { url: string }) {
  return <IframeResizer src={url} style={{ width: '100%', border: 'none' }} />
}
