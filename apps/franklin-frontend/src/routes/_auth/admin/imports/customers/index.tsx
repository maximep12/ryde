'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/customers/')({
  component: ImportCustomersPage,
  staticData: {
    title: 'route.importCustomers',
    crumb: 'route.importCustomers',
  },
})

const EXPECTED_COLUMNS = [
  'Id',
  'Name',
  'Country',
  'State',
  'Area',
  'Channel',
  'Sub-Channel',
  'Banner',
  'Banner Internal ID',
  'Status',
  'Territory',
  'Phase',
  'Cluster',
  'Distribution Center',
]

function ImportCustomersPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Customers Schema"
      description="Upload the customers master data file"
      uploadEndpoint="/customers"
      reportsEndpoint="/customers/reports"
      expectedColumns={EXPECTED_COLUMNS}
      unit="customers"
      uploadType="customers"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/customers/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
