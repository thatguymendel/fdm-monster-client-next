import { getHttpClient } from '@/shared/http-client'

export interface SkuPart {
  id: number
  skuId: number
  partName: string
  sortOrder: number
  fileStorageId: string | null
  stlFileStorageId: string | null
  slicerProfileId: number | null
  requiredMaterial: string
  requiredColorName: string
  requiredNozzleMm: number | null
  quantityPerBuild: number
}

export interface Sku {
  id: number
  externalSkuId: string
  name: string
  description: string | null
  active: boolean
  parts: SkuPart[]
}

export interface CreateSkuDto {
  externalSkuId: string
  name: string
  description?: string | null
  active?: boolean
}

export interface CreateSkuPartDto {
  partName: string
  requiredMaterial: string
  requiredColorName: string
  requiredNozzleMm?: number | null
  quantityPerBuild?: number
  sortOrder?: number
}

export interface BuildRequest {
  id: number
  externalOrderId: string | null
  skuId: number
  quantity: number
  status: string
  statusReason: string | null
  priority: number
  requestedBy: string | null
  webhookCallbackUrl: string | null
  createdAt: string
  updatedAt: string
  acceptedAt: string | null
  completedAt: string | null
  failedAt: string | null
}

export interface IntakeBuildRequestDto {
  externalOrderId?: string | null
  externalSkuId: string
  quantity: number
  priority?: number
  requestedBy?: string | null
}

export interface DispatchStatus {
  queued: number
  dispatchFailed: number
  printing: number
}

export class SkuService {
  static async list(): Promise<Sku[]> {
    const client = await getHttpClient()
    const { data } = await client.get<Sku[]>('/api/v2/sku')
    return data
  }

  static async get(id: number): Promise<Sku> {
    const client = await getHttpClient()
    const { data } = await client.get<Sku>(`/api/v2/sku/${id}`)
    return data
  }

  static async create(dto: CreateSkuDto): Promise<Sku> {
    const client = await getHttpClient()
    const { data } = await client.post<Sku>('/api/v2/sku', dto)
    return data
  }

  static async update(id: number, dto: Partial<CreateSkuDto>): Promise<Sku> {
    const client = await getHttpClient()
    const { data } = await client.patch<Sku>(`/api/v2/sku/${id}`, dto)
    return data
  }

  static async remove(id: number): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/sku/${id}`)
  }

  static async addPart(skuId: number, dto: CreateSkuPartDto): Promise<SkuPart> {
    const client = await getHttpClient()
    const { data } = await client.post<SkuPart>(`/api/v2/sku/${skuId}/parts`, dto)
    return data
  }

  static async removePart(skuId: number, partId: number): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/sku/${skuId}/parts/${partId}`)
  }

  static async uploadPartGcode(skuId: number, partId: number, file: File): Promise<SkuPart> {
    const client = await getHttpClient()
    const form = new FormData()
    form.append('file', file)
    const { data } = await client.post<SkuPart>(`/api/v2/sku/${skuId}/parts/${partId}/file`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }
}

export class BuildRequestService {
  static async list(page = 0, pageSize = 50, status?: string): Promise<BuildRequest[]> {
    const client = await getHttpClient()
    const { data } = await client.get<BuildRequest[]>('/api/v2/build-request', {
      params: { page, pageSize, ...(status ? { status } : {}) }
    })
    return data
  }

  static async intake(dto: IntakeBuildRequestDto): Promise<BuildRequest> {
    const client = await getHttpClient()
    const { data } = await client.post<BuildRequest>('/api/v2/build-request', dto)
    return data
  }

  static async accept(id: number): Promise<BuildRequest> {
    const client = await getHttpClient()
    const { data } = await client.post<BuildRequest>(`/api/v2/build-request/${id}/accept`)
    return data
  }

  static async reject(id: number, reason: string): Promise<BuildRequest> {
    const client = await getHttpClient()
    const { data } = await client.post<BuildRequest>(`/api/v2/build-request/${id}/reject`, { reason })
    return data
  }
}

export class DispatchService {
  static async getStatus(): Promise<DispatchStatus> {
    const client = await getHttpClient()
    const { data } = await client.get<DispatchStatus>('/api/v2/auto-dispatch/status')
    return data
  }

  static async trigger(): Promise<void> {
    const client = await getHttpClient()
    await client.post('/api/v2/auto-dispatch/trigger')
  }

  static async dispatchRequest(id: number): Promise<void> {
    const client = await getHttpClient()
    await client.post(`/api/v2/auto-dispatch/build-request/${id}/dispatch`)
  }
}
