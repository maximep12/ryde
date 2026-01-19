import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type UpdateProductReportCommentInput = {
  productCode: string
  commentId: number
  content: string
}

export function useUpdateProductReportComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productCode, commentId, content }: UpdateProductReportCommentInput) => {
      const api = getApi()
      const res = await api.example['product-reports'][':productCode'].comments[':commentId'].$patch(
        {
          param: { productCode, commentId: commentId.toString() },
          json: { content },
        },
      )
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to update comment')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['product-report', variables.productCode, 'comments'],
      })
    },
  })
}
