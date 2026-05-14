import { defineStore } from 'pinia'

export interface SlicerFile {
  fileName: string
  fileStorageId: string
}

export interface DispatchFileState {
  localFile: File | null
  slicerFile: SlicerFile | null
}

export const useDispatchFileStore = defineStore('DispatchFile', {
  state: (): DispatchFileState => ({
    localFile: null,
    slicerFile: null
  }),
  getters: {
    hasFile(): boolean {
      return this.localFile !== null || this.slicerFile !== null
    },
    displayName(): string | null {
      if (this.localFile) return this.localFile.name
      if (this.slicerFile) return this.slicerFile.fileName
      return null
    },
    isSlicerFile(): boolean {
      return this.slicerFile !== null && this.localFile === null
    }
  },
  actions: {
    setLocalFile(file: File) {
      this.localFile = file
      this.slicerFile = null
    },
    setSlicerFile(file: SlicerFile) {
      this.slicerFile = file
      this.localFile = null
    },
    clearAll() {
      this.localFile = null
      this.slicerFile = null
    }
  }
})
