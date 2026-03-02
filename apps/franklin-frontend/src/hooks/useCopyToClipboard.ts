import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export const useCopyToClipboard = () => {
  const { t } = useTranslation('common')

  const copyToClipboard = (content: string, label: string) => {
    navigator.clipboard.writeText(content)
    toast.info(t('actions.copiedToClipboard', { label, content }))
  }

  return copyToClipboard
}
