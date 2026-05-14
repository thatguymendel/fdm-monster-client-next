import { getHttpClient } from '@/shared/http-client'

export interface FilamentSpool {
  id: number
  name: string
  brand: string | null
  material: string
  colorName: string
  colorHex: string | null
  diameterMm: number
  remainingWeightGrams: number | null
  totalWeightGrams: number | null
  purchasedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateSpoolDto {
  name: string
  brand?: string | null
  material: string
  colorName: string
  colorHex?: string | null
  diameterMm?: number
  totalWeightGrams?: number | null
  remainingWeightGrams?: number | null
  notes?: string | null
}

export interface FilamentAssignment {
  id: number
  printerId: number
  spoolId: number | null
  toolIndex: number
  assignedAt: string
  spool?: FilamentSpool
}

export class FilamentService {
  static async listSpools(): Promise<FilamentSpool[]> {
    const client = await getHttpClient()
    const { data } = await client.get<FilamentSpool[]>('/api/v2/filament/spools')
    return data
  }

  static async createSpool(dto: CreateSpoolDto): Promise<FilamentSpool> {
    const client = await getHttpClient()
    const { data } = await client.post<FilamentSpool>('/api/v2/filament/spools', dto)
    return data
  }

  static async updateSpool(id: number, dto: Partial<CreateSpoolDto>): Promise<FilamentSpool> {
    const client = await getHttpClient()
    const { data } = await client.patch<FilamentSpool>(`/api/v2/filament/spools/${id}`, dto)
    return data
  }

  static async deleteSpool(id: number): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/filament/spools/${id}`)
  }

  static async listAssignments(): Promise<FilamentAssignment[]> {
    const client = await getHttpClient()
    const { data } = await client.get<FilamentAssignment[]>('/api/v2/filament/assignments')
    return data
  }

  static async getCurrentAssignment(printerId: number): Promise<FilamentSpool | null> {
    const client = await getHttpClient()
    try {
      const { data } = await client.get<FilamentSpool>(`/api/v2/filament/printer/${printerId}/current`)
      return data
    } catch {
      return null
    }
  }

  static async assignSpool(printerId: number, spoolId: number, toolIndex = 0): Promise<FilamentAssignment> {
    const client = await getHttpClient()
    const { data } = await client.post<FilamentAssignment>(
      `/api/v2/filament/printer/${printerId}/assign`,
      { spoolId, toolIndex }
    )
    return data
  }

  static async unassignSpool(printerId: number, toolIndex = 0): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/filament/printer/${printerId}/assign`, { params: { toolIndex } })
  }
}
