import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useMuestras() {
  return useQuery({
    queryKey: ['muestras'],
    queryFn:  api.getMuestras,
  })
}

export function useYacimientos() {
  return useQuery({
    queryKey: ['yacimientos'],
    queryFn:  api.getYacimientos,
  })
}

export function useIslas() {
  return useQuery({
    queryKey: ['islas'],
    queryFn:  api.getIslas,
  })
}
