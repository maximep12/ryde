import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/products/')({
  component: ImportProductsPage,
  staticData: {
    title: 'route.importProducts',
    crumb: 'route.importProducts',
  },
})

const EXPECTED_COLUMNS = ['source_id', 'maktx', 'maktg', 'ean11']

function ImportProductsPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Products Schema"
      description="Upload the products master data file"
      uploadEndpoint="/products"
      reportsEndpoint="/products/reports"
      expectedColumns={EXPECTED_COLUMNS}
      unit="products"
      uploadType="products"
      accept={['.csv']}
      onBack={() => navigate({ to: '/admin/imports' })}
    />
  )
}
