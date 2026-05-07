import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useSPDSite(
  yacimiento: string,
  params: { timeRangeStart: number; timeRangeEnd: number; runm: number },
  enabled: boolean
) {
  return useQuery({
    queryKey: ['spd-site', yacimiento, params],
    queryFn:  () => api.getSPDSite(yacimiento, params),
    enabled,
  })
}

export function useSPDIsland(
  isla: string,
  params: { group: string; timeRangeStart: number; timeRangeEnd: number },
  enabled: boolean
) {
  return useQuery({
    queryKey: ['spd-island', isla, params],
    queryFn:  () => api.getSPDIsland(isla, params),
    enabled,
  })
}
