import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

interface PaleoParams {
  timeRangeStart: number
  timeRangeEnd:   number
  nsim:           number
  runm:           number
  binH:           number
  model:          string
}

export function usePaleodemography(isla: string, params: PaleoParams, enabled: boolean) {
  return useQuery({
    queryKey: ['paleodemography', isla, params],
    queryFn:  () => api.getPaleodemography(isla, params),
    enabled,
  })
}
