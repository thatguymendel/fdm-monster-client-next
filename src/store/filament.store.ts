import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FilamentService, type FilamentSpool } from '@/backend/filament.service'

export const useFilamentStore = defineStore('filament', () => {
  const spoolByPrinterId = ref<Record<number, FilamentSpool | null>>({})

  async function fetchAll() {
    try {
      const assignments = await FilamentService.listAssignments()
      const map: Record<number, FilamentSpool | null> = {}
      for (const a of assignments) {
        map[a.printerId] = a.spool ?? null
      }
      spoolByPrinterId.value = map
    } catch {
      // silently fail — filament indicator is cosmetic
    }
  }

  function setSpoolForPrinter(printerId: number, spool: FilamentSpool | null) {
    spoolByPrinterId.value = { ...spoolByPrinterId.value, [printerId]: spool }
  }

  function getSpoolForPrinter(printerId: number): FilamentSpool | null {
    return spoolByPrinterId.value[printerId] ?? null
  }

  return { spoolByPrinterId, fetchAll, setSpoolForPrinter, getSpoolForPrinter }
})
