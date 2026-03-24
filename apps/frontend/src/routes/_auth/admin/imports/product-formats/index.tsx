import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/product-formats/')({
  component: ImportProductFormatsPage,
  staticData: {
    title: 'route.importProductFormats',
    crumb: 'route.importProductFormats',
  },
})

const EXPECTED_COLUMNS = ['sourceId', 'umrez', 'umren', 'ean11', 'meinh']

function ImportProductFormatsPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Product Formats Schema"
      description="Upload the product formats file"
      uploadEndpoint="/products/formats"
      reportsEndpoint="/products/formats/reports"
      expectedColumns={EXPECTED_COLUMNS}
      unit="product formats"
      uploadType="product-formats"
      accept={['.csv']}
      onBack={() => navigate({ to: '/admin/imports' })}
    />
  )
}
