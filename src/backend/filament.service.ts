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

export interface FilamentPreset {
  id: number
  name: string
  brand: string | null
  material: string
  colorName: string
  colorHex: string | null
  defaultWeightGrams: number | null
  slicerType: 'orca' | 'prusa'
  /** Path to slicer filament profile (.json for OrcaSlicer, .ini for PrusaSlicer). Optional — only needed for auto-slicing. */
  filamentProfilePath?: string | null
  createdAt: string
  updatedAt: string
}

export interface LoadSpoolDto {
  name: string
  material: string
  colorName: string
  colorHex?: string | null
  weightGrams: number
}

export interface UpdateFilamentPresetDto {
  name?: string
  brand?: string | null
  material?: string
  colorName?: string
  colorHex?: string | null
  defaultWeightGrams?: number | null
  slicerType?: 'orca' | 'prusa'
  filamentProfilePath?: string | null
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

  static async getCurrentAssignment(printerId: number): Promise<FilamentAssignment | null> {
    const client = await getHttpClient()
    try {
      const { data } = await client.get<FilamentAssignment | null>(`/api/v2/filament/printer/${printerId}/current`)
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

  static async loadSpool(printerId: number, dto: LoadSpoolDto, toolIndex = 0): Promise<FilamentAssignment> {
    const client = await getHttpClient()
    const { data } = await client.post<FilamentAssignment>(
      `/api/v2/filament/printer/${printerId}/load`,
      { ...dto, toolIndex }
    )
    return data
  }

  static async listPresets(): Promise<FilamentPreset[]> {
    const client = await getHttpClient()
    const { data } = await client.get<FilamentPreset[]>('/api/v2/filament/presets')
    return data
  }

  static async createPreset(dto: Omit<FilamentPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<FilamentPreset> {
    const client = await getHttpClient()
    const { data } = await client.post<FilamentPreset>('/api/v2/filament/presets', dto)
    return data
  }

  static async updatePreset(id: number, dto: UpdateFilamentPresetDto): Promise<FilamentPreset> {
    const client = await getHttpClient()
    const { data } = await client.patch<FilamentPreset>(`/api/v2/filament/presets/${id}`, dto)
    return data
  }

  static async deletePreset(id: number): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/filament/presets/${id}`)
  }
}
