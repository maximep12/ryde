'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/amazon-orders/')({
  component: ImportAmazonOrdersPage,
  staticData: {
    title: 'route.importAmazonOrders',
    crumb: 'route.importAmazonOrders',
  },
})

const EXPECTED_COLUMNS = [
  'amazon-order-id',
  'purchase-date',
  'order-status',
  'sku',
  'quantity',
  'item-price',
  'ship-state',
  'ship-postal-code',
  'currency',
  'ship-country',
  'sales-channel',
]

function ImportAmazonOrdersPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Amazon Orders"
      description="Upload the Amazon orders TSV file"
      uploadEndpoint="/amazon-orders/file"
      reportsEndpoint="/amazon-orders/reports"
      expectedColumns={EXPECTED_COLUMNS}
      unit="orders"
      uploadType="amazon-orders"
      accept={['.tsv', '.txt']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/amazon-orders/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
