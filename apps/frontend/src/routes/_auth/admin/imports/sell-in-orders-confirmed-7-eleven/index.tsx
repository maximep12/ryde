'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-in-orders-confirmed-7-eleven/')({
  component: ImportSellInOrdersConfirmed7ElevenPage,
  staticData: {
    title: 'route.importSellInOrdersConfirmed7Eleven',
    crumb: 'route.importSellInOrdersConfirmed7Eleven',
  },
})

const EXPECTED_COLUMNS = ['Item Code', 'Description', 'UPC', 'Pack', 'Size', 'Quantity', 'Amount']

function ImportSellInOrdersConfirmed7ElevenPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="7-Eleven Confirmed"
      description="Upload the 7-Eleven confirmed orders file (SSR_001 format)"
      uploadEndpoint="/sellin-orders-confirmed/file/7-eleven"
      reportsEndpoint="/sellin-orders-confirmed/reports/7-eleven"
      expectedColumns={EXPECTED_COLUMNS}
      unit="orders"
      uploadType="sell-in-orders-confirmed-7-eleven"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-in-orders-confirmed-7-eleven/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
