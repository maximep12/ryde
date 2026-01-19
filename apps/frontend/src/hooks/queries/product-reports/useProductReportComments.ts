import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type ProductReportComment = {
  id: number
  productCode: string
  content: string
  createdAt: string
  updatedAt: string | null
  user: {
    id: string
    givenName: string | null
    familyName: string | null
    email: string
  }
}

export function useProductReportComments(productCode: string) {
  return useQuery({
    queryKey: ['product-report', productCode, 'comments'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example['product-reports'][':productCode'].comments.$get({
        param: { productCode },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch product report comments')
      }
      return res.json() as Promise<ProductReportComment[]>
    },
    enabled: !!productCode,
  })
}
