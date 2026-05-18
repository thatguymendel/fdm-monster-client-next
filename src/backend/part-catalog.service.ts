import { getHttpClient } from '@/shared/http-client'

// ─── PartFolder ───────────────────────────────────────────────────────────────

export interface PartFolder {
  id: number
  name: string
  parentId: number | null
  createdAt: string
  updatedAt: string
}

export class PartFolderService {
  static async getChildren(parentId: number | null): Promise<PartFolder[]> {
    const client = await getHttpClient()
    const params = parentId === null ? { parentId: 'null' } : { parentId }
    const { data } = await client.get<{ folders: PartFolder[] }>('/api/v2/part-folders', { params })
    return data.folders
  }

  static async listAll(): Promise<PartFolder[]> {
    const client = await getHttpClient()
    const { data } = await client.get<{ folders: PartFolder[] }>('/api/v2/part-folders', { params: { all: 'true' } })
    return data.folders
  }

  static async create(name: string, parentId?: number | null): Promise<PartFolder> {
    const client = await getHttpClient()
    const { data } = await client.post<PartFolder>('/api/v2/part-folders', { name, parentId: parentId ?? null })
    return data
  }

  static async rename(id: number, name: string): Promise<PartFolder> {
    const client = await getHttpClient()
    const { data } = await client.patch<PartFolder>(`/api/v2/part-folders/${id}`, { name })
    return data
  }

  static async move(id: number, newParentId: number | null): Promise<PartFolder> {
    const client = await getHttpClient()
    const { data } = await client.patch<PartFolder>(`/api/v2/part-folders/${id}`, { parentId: newParentId })
    return data
  }

  static async delete(id: number): Promise<void> {
    const client = await getHttpClient()
    await client.delete(`/api/v2/part-folders/${id}`)
  }
}

// ─── PartFile ─────────────────────────────────────────────────────────────────

export interface PartFile {
  id: string
  originalFileName: string
  fileExtension: string
  fileSize: number
  createdAt: string
}

export interface PartFileUploadResult {
  id: string
  originalFileName: string
  fileExtension: string
  fileSize: number
}

export class PartFileService {
  static async upload(file: File): Promise<PartFileUploadResult> {
    const client = await getHttpClient()
    const form = new FormData()
    form.append('file', file, file.name)
    const { data } = await client.post<PartFileUploadResult>(
      '/api/v2/part-files/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  }
}
