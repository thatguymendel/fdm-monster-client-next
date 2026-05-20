import { getHttpClient } from '@/shared/http-client'
import type { PartFile, PartFolder } from './part-catalog.service'

// ─── Print Profile ────────────────────────────────────────────────────────────

export interface PrintProfile {
  id: number
  name: string
  slicerType: 'orca' | 'prusa'
  processProfilePath: string
  printerProfilePath: string | null
  compatiblePrinterTypes: string[]
  nozzleType: string
  nozzleDiameterMm: number
  bedWidthMm: number
  bedDepthMm: number
  active: boolean
  createdAt: string
}

export interface CreatePrintProfileDto {
  name: string
  slicerType?: 'orca' | 'prusa'
  processProfilePath: string
  printerProfilePath?: string | null
  compatiblePrinterTypes?: string[]
  nozzleType?: string
  nozzleDiameterMm?: number
  bedWidthMm?: number
  bedDepthMm?: number
}

export class PrintProfileService {
  static async list(): Promise<PrintProfile[]> {
    const client = await getHttpClient()
    const { data } = await client.get<{ profiles: PrintProfile[] }>('/api/v2/print-profiles')
    return data.profiles
  }

  static async get(id: number): Promise<PrintProfile> {
    const client = await getHttpClient()
    const { data } = await client.get<PrintProfile>(`/api/v2/print-profiles/${id}`)
    return data
  }

  static async create(dto: CreatePrintProfileDto): Promise<PrintProfile> {
    const client = await getHttpClient()
    const { data } = await client.post<PrintProfile>('/api/v2/print-profiles', dto)
    return data
  }

  static async update(id: number, dto: Partial<CreatePrintProfileDto>): Promise<PrintProfile> {
    const client = await getHttpClient()
    const { data } = await client.patch<PrintProfile>(`/api/v2/print-profiles/${id}`, dto)
    return data
  }

  static async remove(id: number): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/print-profiles/${id}`)
  }
}

// ─── Filament Profile ─────────────────────────────────────────────────────────

export interface FilamentProfile {
  id: number
  name: string
  filamentProfilePath: string
  material: string
  colorName: string
  colorHex: string | null
  active: boolean
  createdAt: string
}

export interface CreateFilamentProfileDto {
  name: string
  filamentProfilePath: string
  material: string
  colorName: string
  colorHex?: string | null
}

export class FilamentProfileService {
  static async list(): Promise<FilamentProfile[]> {
    const client = await getHttpClient()
    const { data } = await client.get<{ profiles: FilamentProfile[] }>('/api/v2/filament-profiles')
    return data.profiles
  }

  static async get(id: number): Promise<FilamentProfile> {
    const client = await getHttpClient()
    const { data } = await client.get<FilamentProfile>(`/api/v2/filament-profiles/${id}`)
    return data
  }

  static async create(dto: CreateFilamentProfileDto): Promise<FilamentProfile> {
    const client = await getHttpClient()
    const { data } = await client.post<FilamentProfile>('/api/v2/filament-profiles', dto)
    return data
  }

  static async update(id: number, dto: Partial<CreateFilamentProfileDto>): Promise<FilamentProfile> {
    const client = await getHttpClient()
    const { data } = await client.patch<FilamentProfile>(`/api/v2/filament-profiles/${id}`, dto)
    return data
  }

  static async remove(id: number): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/filament-profiles/${id}`)
  }
}

// ─── Print Part ───────────────────────────────────────────────────────────────

export type PlateConstraint = 'REQUIRED' | 'PREFERRED' | 'FLEXIBLE'

export interface PrintPart {
  id: number
  externalPartId: string
  name: string
  partFileId: string | null
  folderId: number | null
  partFile: PartFile | null
  folder: PartFolder | null
  printProfileId: number | null
  filamentProfileId: number | null
  printProfile: PrintProfile | null
  filamentProfile: FilamentProfile | null
  plateConstraint: PlateConstraint
  maxPerPlate: number
  estimatedPrintMinutes: number | null
  createdAt: string
}

export interface CreatePrintPartDto {
  externalPartId: string
  name: string
  partFileId?: string | null
  folderId?: number | null
  printProfileId?: number | null
  filamentProfileId?: number | null
  plateConstraint?: PlateConstraint
  maxPerPlate?: number
  estimatedPrintMinutes?: number | null
}

export class PrintPartService {
  static async list(): Promise<PrintPart[]> {
    const client = await getHttpClient()
    const { data } = await client.get<{ parts: PrintPart[] }>('/api/v2/print-parts')
    return data.parts
  }

  static async listInFolder(folderId: number | null): Promise<PrintPart[]> {
    const client = await getHttpClient()
    const params = folderId === null ? { folderId: 'null' } : { folderId }
    const { data } = await client.get<{ parts: PrintPart[] }>('/api/v2/print-parts', { params })
    return data.parts
  }

  static async search(query: string): Promise<PrintPart[]> {
    const client = await getHttpClient()
    const { data } = await client.get<{ parts: PrintPart[] }>('/api/v2/print-parts', {
      params: { search: query },
    })
    return data.parts
  }

  static async get(id: number): Promise<PrintPart> {
    const client = await getHttpClient()
    const { data } = await client.get<PrintPart>(`/api/v2/print-parts/${id}`)
    return data
  }

  static async create(dto: CreatePrintPartDto): Promise<PrintPart> {
    const client = await getHttpClient()
    const { data } = await client.post<PrintPart>('/api/v2/print-parts', dto)
    return data
  }

  static async update(id: number, dto: Partial<CreatePrintPartDto>): Promise<PrintPart> {
    const client = await getHttpClient()
    const { data } = await client.patch<PrintPart>(`/api/v2/print-parts/${id}`, dto)
    return data
  }

  static async remove(id: number): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/print-parts/${id}`)
  }

  static async bulkUpsert(parts: CreatePrintPartDto[]): Promise<PrintPart[]> {
    const client = await getHttpClient()
    const { data } = await client.put<{ parts: PrintPart[] }>('/api/v2/print-parts/bulk', { parts })
    return data.parts
  }
}

// ─── Build Order ──────────────────────────────────────────────────────────────

export type BuildOrderStatus =
  | 'RECEIVED'
  | 'ACCEPTED'
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'REJECTED'
  | 'FAILED'

export interface BuildOrderLine {
  id: number
  buildOrderId: number
  externalPartId: string
  printPartId: number | null
  printPart: PrintPart | null
  quantity: number
  completedQuantity: number
  assemblyGroup: string | null
}

export interface BuildOrder {
  id: number
  externalOrderId: string | null
  status: BuildOrderStatus
  source: string
  requiredBy: string | null
  dynamicPriority: number
  estimatedTotalPrintHours: number
  webhookCallbackUrl: string | null
  createdAt: string
  acceptedAt: string | null
  completedAt: string | null
  failedAt: string | null
  lines: BuildOrderLine[]
}

export interface CreateBuildOrderLineDto {
  externalPartId: string
  quantity: number
  assemblyGroup?: string | null
}

export interface CreateBuildOrderDto {
  externalOrderId?: string | null
  requiredBy?: string | null
  webhookCallbackUrl?: string | null
  source?: string
  lines: CreateBuildOrderLineDto[]
}

export class BuildOrderService {
  static async list(status?: BuildOrderStatus): Promise<BuildOrder[]> {
    const client = await getHttpClient()
    const { data } = await client.get<{ orders: BuildOrder[] }>('/api/v2/build-orders', {
      params: status ? { status } : {},
    })
    return data.orders
  }

  static async get(id: number): Promise<BuildOrder> {
    const client = await getHttpClient()
    const { data } = await client.get<BuildOrder>(`/api/v2/build-orders/${id}`)
    return data
  }

  static async intake(dto: CreateBuildOrderDto): Promise<BuildOrder> {
    const client = await getHttpClient()
    const { data } = await client.post<BuildOrder>('/api/v2/build-orders', dto)
    return data
  }

  static async accept(id: number): Promise<BuildOrder> {
    const client = await getHttpClient()
    const { data } = await client.post<BuildOrder>(`/api/v2/build-orders/${id}/accept`)
    return data
  }

  static async reject(id: number, reason?: string): Promise<BuildOrder> {
    const client = await getHttpClient()
    const { data } = await client.post<BuildOrder>(`/api/v2/build-orders/${id}/reject`, { reason })
    return data
  }

  static async forcePlan(id: number): Promise<{ order: BuildOrder; platesCreated: number }> {
    const client = await getHttpClient()
    const { data } = await client.post<{ order: BuildOrder; platesCreated: number }>(`/api/v2/build-orders/${id}/force-plan`)
    return data
  }
}

// ─── Planned Plate ────────────────────────────────────────────────────────────

export type PlannedPlateStatus =
  | 'PLANNING'
  | 'READY_TO_SLICE'
  | 'SLICING'
  | 'SLICE_FAILED'
  | 'QUEUED'
  | 'PRINTING'
  | 'AWAITING_CONFIRMATION'
  | 'PRINT_FAILED'
  | 'DONE'
  | 'CANCELLED'

export interface PlannedPlateItem {
  id: number
  plannedPlateId: number
  buildOrderLineId: number
  printPartId: number
  printPart: PrintPart | null
  quantity: number
  setIndex: number | null
}

export interface PlannedPrintJob {
  id: number
  printerName: string | null
  status: string
  progress: number | null
}

export interface PlannedPlate {
  id: number
  status: PlannedPlateStatus
  statusReason: string | null
  printProfileId: number
  filamentProfileId: number
  printProfile: PrintProfile | null
  filamentProfile: FilamentProfile | null
  printJobId: number | null
  printJob: PlannedPrintJob | null
  /** ID of the printer currently (or last) printing this plate. */
  printerId: number | null
  reprintOfPlateId: number | null
  createdAt: string
  slicingStartedAt: string | null
  slicingCompletedAt: string | null
  items: PlannedPlateItem[]
}

export class PlannedPlateService {
  static async list(status?: PlannedPlateStatus): Promise<PlannedPlate[]> {
    const client = await getHttpClient()
    const { data } = await client.get<{ plates: PlannedPlate[] }>('/api/v2/planned-plates', {
      params: status ? { status } : {},
    })
    return data.plates
  }

  static async listForOrder(buildOrderId: number): Promise<PlannedPlate[]> {
    const client = await getHttpClient()
    const { data } = await client.get<{ plates: PlannedPlate[] }>('/api/v2/planned-plates', {
      params: { buildOrderId },
    })
    return data.plates
  }

  static async get(id: number): Promise<PlannedPlate> {
    const client = await getHttpClient()
    const { data } = await client.get<PlannedPlate>(`/api/v2/planned-plates/${id}`)
    return data
  }

  static async forceSlice(id: number): Promise<PlannedPlate> {
    const client = await getHttpClient()
    const { data } = await client.post<PlannedPlate>(`/api/v2/planned-plates/${id}/force-slice`)
    return data
  }

  static async cancel(id: number): Promise<PlannedPlate> {
    const client = await getHttpClient()
    const { data } = await client.post<PlannedPlate>(`/api/v2/planned-plates/${id}/cancel`)
    return data
  }

  static async complete(
    id: number,
    items: { plateItemId: number; passedQuantity: number; failedQuantity: number }[]
  ): Promise<PlannedPlate> {
    const client = await getHttpClient()
    const { data } = await client.post<PlannedPlate>(`/api/v2/planned-plates/${id}/complete`, { items })
    return data
  }

  static async reprint(id: number): Promise<PlannedPlate> {
    const client = await getHttpClient()
    const { data } = await client.post<PlannedPlate>(`/api/v2/planned-plates/${id}/reprint`)
    return data
  }

  static async requeue(id: number): Promise<PlannedPlate> {
    const client = await getHttpClient()
    const { data } = await client.post<PlannedPlate>(`/api/v2/planned-plates/${id}/requeue`)
    return data
  }
}

// ─── Slicer Config ────────────────────────────────────────────────────────────

export type SlicerConfig =
  | { mode: 'local'; binaryPath: string; timeoutMs?: number }
  | { mode: 'remote'; remoteUrl: string; timeoutMs?: number }

export interface SlicerConfigResponse {
  configured: boolean
  config: SlicerConfig | null
  platesSlicing: number
  platesReadyToSlice: number
  platesQueued: number
}

export interface SlicerTestResult {
  ok: boolean
  version?: string
  error?: string
}

export class SlicerConfigService {
  static async getConfig(): Promise<SlicerConfigResponse> {
    const client = await getHttpClient()
    const { data } = await client.get<SlicerConfigResponse>('/api/v2/slicer-config')
    return data
  }

  static async setConfig(config: SlicerConfig): Promise<SlicerConfigResponse> {
    const client = await getHttpClient()
    const { data } = await client.post<SlicerConfigResponse>('/api/v2/slicer-config', config)
    return data
  }

  static async testConnection(): Promise<SlicerTestResult> {
    const client = await getHttpClient()
    const { data } = await client.post<SlicerTestResult>('/api/v2/slicer-config/test')
    return data
  }
}

// ─── PrusaSlicer Config ───────────────────────────────────────────────────────

export interface PrusaSlicerConfig {
  binaryPath: string
  timeoutMs?: number
}

export interface PrusaSlicerConfigResponse {
  configured: boolean
  config: PrusaSlicerConfig | null
}

export class PrusaSlicerService {
  static async getConfig(): Promise<PrusaSlicerConfigResponse> {
    const client = await getHttpClient()
    const { data } = await client.get<PrusaSlicerConfigResponse>('/api/v2/prusa-slicer')
    return data
  }

  static async setConfig(config: PrusaSlicerConfig): Promise<PrusaSlicerConfigResponse> {
    const client = await getHttpClient()
    const { data } = await client.post<PrusaSlicerConfigResponse>('/api/v2/prusa-slicer', config)
    return data
  }

  static async testConnection(): Promise<SlicerTestResult> {
    const client = await getHttpClient()
    const { data } = await client.post<SlicerTestResult>('/api/v2/prusa-slicer/test')
    return data
  }
}

// ─── Profile File Upload ──────────────────────────────────────────────────────

export interface ProfileFileUploadResult {
  path: string
  fileName: string
}

export class ProfileFileService {
  static async upload(
    type: 'process' | 'machine' | 'filament',
    file: File,
  ): Promise<ProfileFileUploadResult> {
    const client = await getHttpClient()
    const form = new FormData()
    form.append('file', file, file.name)
    const { data } = await client.post<ProfileFileUploadResult>(
      `/api/v2/profile-files?type=${type}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  }
}
