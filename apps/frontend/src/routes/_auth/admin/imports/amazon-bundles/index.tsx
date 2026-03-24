'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/amazon-bundles/')({
  component: ImportAmazonBundlesPage,
  staticData: {
    title: 'route.importAmazonBundles',
    crumb: 'route.importAmazonBundles',
  },
})

const EXPECTED_COLUMNS = ['DATE', 'BUNDLE_ASIN', 'TITLE', 'BUNDLES_SOLD', 'TOTAL_SALES']

function ImportAmazonBundlesPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Amazon Bundles"
      description="Upload the Amazon bundle orders CSV file"
      uploadEndpoint="/amazon-orders/bundles"
      reportsEndpoint="/amazon-orders/reports/bundles"
      expectedColumns={EXPECTED_COLUMNS}
      unit="bundle orders"
      uploadType="amazon-bundles"
      accept={['.csv']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/amazon-bundles/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
