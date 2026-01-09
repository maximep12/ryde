import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type ValidateReportInput = {
  plantName: string
  materialNumber: string
}

export function useValidateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ plantName, materialNumber }: ValidateReportInput) => {
      const api = getApi()
      const res = await api.reports[':plantName'][':materialNumber'].validate.$post({
        param: { plantName, materialNumber },
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as { message?: string }).message || 'Failed to validate report')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate the report detail
      queryClient.invalidateQueries({
        queryKey: ['report', variables.plantName, variables.materialNumber],
      })
      // Invalidate the reports list to update validation counts
      queryClient.invalidateQueries({
        queryKey: ['reports'],
      })
    },
  })
}
