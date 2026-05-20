<template>
  <div>
    <!-- ─── Filter chips + refresh ───────────────────────────────────────── -->
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <span class="text-caption text-medium-emphasis">Filter:</span>
      <v-chip
        v-for="s in allStatuses"
        :key="s"
        :color="activeStatuses.has(s) ? plateStatusColor(s) : 'grey'"
        :variant="activeStatuses.has(s) ? 'tonal' : 'outlined'"
        size="small"
        class="cursor-pointer"
        @click="toggleStatus(s)"
      >
        {{ s.replace(/_/g, ' ') }}
      </v-chip>
      <v-spacer />
      <v-btn icon variant="text" size="small" :loading="loading" @click="fetch">
        <v-icon>mdi:mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- ─── Plates list ───────────────────────────────────────────────────── -->
    <div v-if="loading" class="pa-6 text-center">
      <v-progress-circular indeterminate />
    </div>

    <div v-else-if="!filteredPlates.length" class="pa-4 text-medium-emphasis text-body-2">
      <v-icon size="small" class="mr-1">mdi:mdi-check-circle-outline</v-icon>
      No plates match the selected filters.
    </div>

    <div v-else class="plates-list">
      <PlateRow
        v-for="plate in filteredPlates"
        :key="plate.id"
        :plate="plate"
        :loading="forcingSlice.has(plate.id)"
        :cancelling="cancellingPlate.has(plate.id)"
        :printer-map="printerMap"
        @force-slice="forceSlice"
        @inspect="inspectPlate = $event; inspectDialog = true"
        @cancel="cancelPlate"
        @detail="detailPlate = $event; detailDialog = true"
      />
    </div>
  </div>

  <PlateInspectDialog
    v-if="inspectPlate"
    v-model="inspectDialog"
    :plate="inspectPlate"
    @done="fetch"
  />

  <PlateDetailDialog
    v-if="detailPlate"
    v-model="detailDialog"
    :plate="detailPlate"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { PlannedPlateService, type PlannedPlate, type PlannedPlateStatus } from '@/backend/build-order-workflow.service'
import { PrintersService } from '@/backend/printers.service'

import PlateRow from '@/components/Production/PlateRow.vue'
import PlateInspectDialog from '@/components/Production/PlateInspectDialog.vue'
import PlateDetailDialog from '@/components/Production/PlateDetailDialog.vue'

// ─── Status filter ────────────────────────────────────────────────────────────

const allStatuses: PlannedPlateStatus[] = [
  'PLANNING', 'READY_TO_SLICE', 'SLICING', 'SLICE_FAILED',
  'QUEUED', 'PRINTING', 'AWAITING_CONFIRMATION', 'PRINT_FAILED', 'DONE', 'CANCELLED',
]

const defaultActive = new Set<PlannedPlateStatus>(['SLICING', 'SLICE_FAILED', 'QUEUED', 'PRINTING', 'AWAITING_CONFIRMATION', 'PRINT_FAILED'])
const activeStatuses = ref(new Set<PlannedPlateStatus>(defaultActive))

function toggleStatus(s: PlannedPlateStatus) {
  const next = new Set(activeStatuses.value)
  if (next.has(s)) next.delete(s)
  else next.add(s)
  activeStatuses.value = next
}

function plateStatusColor(status: PlannedPlateStatus): string {
  const map: Record<PlannedPlateStatus, string> = {
    PLANNING: 'blue-grey', READY_TO_SLICE: 'blue', SLICING: 'orange',
    SLICE_FAILED: 'error', QUEUED: 'teal', PRINTING: 'purple',
    AWAITING_CONFIRMATION: 'cyan', PRINT_FAILED: 'deep-orange',
    DONE: 'success', CANCELLED: 'grey',
  }
  return map[status] ?? 'grey'
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const loading = ref(false)
const allPlates = ref<PlannedPlate[]>([])
const printerMap = ref(new Map<number, string>())
const forcingSlice = ref(new Set<number>())
const cancellingPlate = ref(new Set<number>())
const inspectDialog = ref(false)
const inspectPlate = ref<PlannedPlate | null>(null)
const detailDialog = ref(false)
const detailPlate = ref<PlannedPlate | null>(null)

const filteredPlates = computed(() =>
  allPlates.value.filter(p => activeStatuses.value.has(p.status))
)

async function fetch() {
  loading.value = true
  try {
    allPlates.value = await PlannedPlateService.list()
  } catch {
    // silently fail — parent can surface errors
  } finally {
    loading.value = false
  }
}

async function cancelPlate(plate: PlannedPlate) {
  cancellingPlate.value = new Set([...cancellingPlate.value, plate.id])
  try {
    await PlannedPlateService.cancel(plate.id)
    await fetch()
  } catch {
    // parent snackbar not available here
  } finally {
    const next = new Set(cancellingPlate.value); next.delete(plate.id); cancellingPlate.value = next
  }
}

async function forceSlice(plate: PlannedPlate) {
  forcingSlice.value = new Set([...forcingSlice.value, plate.id])
  try {
    await PlannedPlateService.forceSlice(plate.id)
    await fetch()
  } catch {
    // parent snackbar not available here — could emit if needed
  } finally {
    const next = new Set(forcingSlice.value)
    next.delete(plate.id)
    forcingSlice.value = next
  }
}

// ─── Auto-refresh every 10s ───────────────────────────────────────────────────

let timer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  fetch()
  timer = setInterval(fetch, 10_000)
  // Load printer names once for the fallback printer chip
  try {
    const printers = await PrintersService.getPrinters()
    printerMap.value = new Map(printers.map(p => [p.id, p.name]))
  } catch { /* non-critical */ }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.plates-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
</style>
