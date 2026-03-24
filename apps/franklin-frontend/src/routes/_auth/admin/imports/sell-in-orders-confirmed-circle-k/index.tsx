'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-in-orders-confirmed-circle-k/')({
  component: ImportSellInOrdersConfirmedCircleKPage,
  staticData: {
    title: 'route.importSellInOrdersConfirmedCircleK',
    crumb: 'route.importSellInOrdersConfirmedCircleK',
  },
})

const EXPECTED_COLUMNS = ['INV DATE', 'STORE', 'CASE UPC', 'INVOICE', 'QTY SHIPPED']

function ImportSellInOrdersConfirmedCircleKPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Circle K QC Confirmed"
      description="Upload the Circle K QC confirmed orders file (semicolon-delimited)"
      uploadEndpoint="/sellin-orders-confirmed/file/circle-k"
      reportsEndpoint="/sellin-orders-confirmed/reports/circle-k"
      expectedColumns={EXPECTED_COLUMNS}
      unit="orders"
      uploadType="sell-in-orders-confirmed-circle-k"
      accept={['.csv', '.txt']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-in-orders-confirmed-circle-k/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
