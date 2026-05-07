import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

interface CalibrationParams {
  idMuestra:  string
  calCurve:   string
  resOffset:  number
  resError:   number
  normalised: boolean
}

export function useCalibration(params: CalibrationParams, enabled: boolean) {
  return useQuery({
    queryKey: ['calibration', params],
    queryFn:  () => api.getCalibration(params.idMuestra, params),
    enabled,
  })
}
