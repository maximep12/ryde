import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type DeleteProductReportCommentInput = {
  productCode: string
  commentId: number
}

export function useDeleteProductReportComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productCode, commentId }: DeleteProductReportCommentInput) => {
      const api = getApi()
      const res = await api.example['product-reports'][':productCode'].comments[
        ':commentId'
      ].$delete({
        param: { productCode, commentId: commentId.toString() },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to delete comment')
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
