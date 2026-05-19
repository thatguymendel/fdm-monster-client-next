import { getHttpClient } from '@/shared/http-client'

export interface OptimizerSettings {
  holdWindowHighMs: number
  holdWindowNormalMs: number
  holdWindowLowMs: number
  fillThreshold: number
  defaultMaxPerPlate: number
}

export class OptimizerSettingsService {
  static async get(): Promise<OptimizerSettings> {
    const client = await getHttpClient()
    const { data } = await client.get<OptimizerSettings>('/api/v2/optimizer-settings')
    return data
  }

  static async update(settings: Partial<OptimizerSettings>): Promise<OptimizerSettings> {
    const client = await getHttpClient()
    const { data } = await client.patch<OptimizerSettings>('/api/v2/optimizer-settings', settings)
    return data
  }
}
