import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type ValidateProductReportInput = {
  productCode: string
}

export function useValidateProductReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productCode }: ValidateProductReportInput) => {
      const api = getApi()
      const res = await api.example['product-reports'][':productCode'].validate.$post({
        param: { productCode },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(
          (error as { message?: string }).message || 'Failed to validate product report',
        )
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate the report detail
      queryClient.invalidateQueries({
        queryKey: ['product-reports', 'detail', variables.productCode],
      })
      // Invalidate the reports list to update validation timestamp
      queryClient.invalidateQueries({
        queryKey: ['product-reports'],
      })
    },
  })
}
