import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type CreateProductReportCommentInput = {
  productCode: string
  content: string
}

export function useCreateProductReportComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productCode, content }: CreateProductReportCommentInput) => {
      const api = getApi()
      const res = await api.example['product-reports'][':productCode'].comments.$post({
        param: { productCode },
        json: { content },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to create comment')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['product-report', variables.productCode, 'comments'],
      })
      // Also invalidate the list to update hasComments flag
      queryClient.invalidateQueries({
        queryKey: ['product-reports'],
      })
    },
  })
}
