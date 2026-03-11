'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-in-orders/')({
  component: ImportSellInOrdersPage,
  staticData: {
    title: 'route.importSellInOrders',
    crumb: 'route.importSellInOrders',
  },
})

const EXPECTED_COLUMNS = [
  'Sales Organization',
  'Sold-to Party',
  'Billing Date',
  'Billing Document',
  'Product',
  'Sales Document',
  'Created On',
  'Sales Volume Qty',
]

function ImportSellInOrdersPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Sell-In Orders"
      description="Upload the sell-in orders file"
      uploadEndpoint="/sellin-orders/file"
      reportsEndpoint="/sellin-orders/reports"
      expectedColumns={EXPECTED_COLUMNS}
      unit="orders"
      uploadType="sell-in-orders"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-in-orders/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
