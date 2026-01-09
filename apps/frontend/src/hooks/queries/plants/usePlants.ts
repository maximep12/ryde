import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type Plant = {
  id: number
  acronym: string
  fullName: string
  city: string
  country: string
}

export type PlantsResponse = {
  items: Plant[]
}

export function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.plants.$get()
      if (!res.ok) {
        throw new Error('Failed to fetch plants')
      }
      return res.json() as Promise<PlantsResponse>
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes (plant data rarely changes)
  })
}

// Helper to create a mapping from city name to acronym
export function usePlantCityToAcronymMap() {
  const { data: plantsData } = usePlants()

  if (!plantsData) return {}

  return plantsData.items.reduce(
    (acc, plant) => {
      acc[plant.city] = plant.acronym
      return acc
    },
    {} as Record<string, string>,
  )
}
