'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-in-orders-confirmed/')({
  component: ImportSellInOrdersConfirmedPage,
  staticData: {
    title: 'route.importSellInOrdersConfirmed',
    crumb: 'route.importSellInOrdersConfirmed',
  },
})

const EXPECTED_COLUMNS = [
  'Document Date',
  'Sold-to Party',
  'Sales Document',
  'Sales Document Type',
  'Material',
  'Sales Unit',
  'Delivery Date',
  'Net Value (Item)',
  'Overall Status Description',
  'Reason for Rejection',
  'Confirmed Quantity (Schedule Line)',
]

function ImportSellInOrdersConfirmedPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Sell-In Confirmed"
      description="Upload the confirmed sell-in orders file"
      uploadEndpoint="/sellin-orders-confirmed/file"
      reportsEndpoint="/sellin-orders-confirmed/reports"
      expectedColumns={EXPECTED_COLUMNS}
      unit="orders"
      uploadType="sell-in-orders-confirmed"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-in-orders-confirmed/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
