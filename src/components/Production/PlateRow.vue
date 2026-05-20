<template>
  <div class="plate-row pa-2 rounded mb-1 cursor-pointer" @click.self="emit('detail', plate)">
    <!-- Top row: ID, status, profiles, printer, actions -->
    <div class="d-flex align-center ga-2 flex-wrap">
      <span class="text-caption text-medium-emphasis" style="min-width: 60px">
        Plate #{{ plate.id }}
      </span>

      <v-icon v-if="plate.reprintOfPlateId != null" size="14" color="grey" title="Reprint plate">mdi:mdi-refresh</v-icon>

      <v-chip :color="plateStatusColor(plate.status)" size="small" variant="tonal">
        {{ plate.status.replace(/_/g, ' ') }}
      </v-chip>

      <span class="text-body-2 text-medium-emphasis">
        {{ plate.printProfile?.name ?? `Profile #${plate.printProfileId}` }}
        ·
        {{ plate.filamentProfile?.name ?? `Filament #${plate.filamentProfileId}` }}
      </span>

      <!-- Printer chip: prefer live job name, fall back to printerId lookup -->
      <v-chip
        v-if="resolvedPrinterName"
        :color="plate.status === 'PRINTING' ? 'purple' : 'teal'"
        size="small"
        variant="tonal"
        prepend-icon="mdi:mdi-printer"
      >
        {{ resolvedPrinterName }}
        <span v-if="plate.status === 'PRINTING' && plate.printJob?.progress != null" class="ml-1">
          · {{ plate.printJob.progress }}%
        </span>
      </v-chip>

      <!-- Slice failed reason -->
      <v-chip
        v-if="plate.status === 'SLICE_FAILED'"
        color="error"
        size="x-small"
        variant="tonal"
        :title="plate.statusReason ?? undefined"
        style="max-width: 220px; overflow: hidden; text-overflow: ellipsis"
      >
        {{ plate.statusReason ?? 'Slice failed' }}
      </v-chip>

      <v-spacer />

      <v-btn
        v-if="plate.status === 'PLANNING' || plate.status === 'SLICE_FAILED'"
        size="small"
        variant="tonal"
        color="primary"
        :loading="loading"
        @click="emit('forceSlice', plate)"
      >
        {{ plate.status === 'SLICE_FAILED' ? 'Retry Slice' : 'Force Slice Now' }}
      </v-btn>

      <v-btn
        v-if="plate.status === 'AWAITING_CONFIRMATION'"
        size="small"
        variant="tonal"
        color="teal"
        @click="emit('inspect', plate)"
      >
        Confirm Print
      </v-btn>

      <v-btn
        v-if="plate.status === 'PRINT_FAILED'"
        size="small"
        variant="tonal"
        color="deep-orange"
        @click="emit('inspect', plate)"
      >
        Inspect / Reprint
      </v-btn>

      <v-btn
        v-if="plate.status === 'CANCELLED'"
        size="small"
        variant="tonal"
        color="blue-grey"
        :loading="requeuing"
        @click.stop="emit('requeue', plate)"
      >
        Requeue
      </v-btn>

      <v-progress-circular
        v-if="plate.status === 'SLICING'"
        indeterminate
        size="18"
        color="orange"
      />

      <v-btn
        v-if="!['PRINTING', 'DONE', 'CANCELLED', 'AWAITING_CONFIRMATION', 'PRINT_FAILED'].includes(plate.status)"
        size="small"
        variant="text"
        color="error"
        icon
        :loading="cancelling"
        @click.stop="emit('cancel', plate)"
      >
        <v-icon size="16">mdi:mdi-close</v-icon>
      </v-btn>

      <v-btn
        size="small"
        variant="text"
        color="grey"
        icon
        @click.stop="emit('detail', plate)"
      >
        <v-icon size="16">mdi:mdi-information-outline</v-icon>
      </v-btn>
    </div>

    <!-- Part chips -->
    <div v-if="plate.items?.length" class="d-flex flex-wrap ga-1 mt-1 ml-1">
      <v-chip
        v-for="item in plate.items"
        :key="item.id"
        size="x-small"
        variant="outlined"
        color="grey"
      >
        {{ item.printPart?.name ?? `Part #${item.printPartId}` }}
        <span v-if="item.quantity > 1" class="ml-1 font-weight-bold">×{{ item.quantity }}</span>
      </v-chip>
    </div>

    <!-- Progress bar for printing -->
    <v-progress-linear
      v-if="plate.status === 'PRINTING' && plate.printJob?.progress != null"
      :model-value="plate.printJob.progress"
      color="purple"
      rounded
      height="3"
      class="mt-2"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlannedPlate, PlannedPlateStatus } from '@/backend/build-order-workflow.service'

const props = defineProps<{
  plate: PlannedPlate
  loading?: boolean
  cancelling?: boolean
  requeuing?: boolean
  /** Map of printerId → printerName for offline fallback when printJob is unavailable */
  printerMap?: Map<number, string>
}>()

/**
 * Best available printer name:
 * 1. Live from the printJob relation (most up-to-date)
 * 2. From printerMap via plate.printerId (survives job cleanup / restarts)
 */
const resolvedPrinterName = computed<string | null>(() => {
  if (props.plate.printJob?.printerName) return props.plate.printJob.printerName
  if (props.plate.printerId && props.printerMap) {
    return props.printerMap.get(props.plate.printerId) ?? null
  }
  return null
})

const emit = defineEmits<{
  forceSlice: [plate: PlannedPlate]
  inspect: [plate: PlannedPlate]
  cancel: [plate: PlannedPlate]
  requeue: [plate: PlannedPlate]
  detail: [plate: PlannedPlate]
}>()

function plateStatusColor(status: PlannedPlateStatus): string {
  const map: Record<PlannedPlateStatus, string> = {
    PLANNING: 'blue-grey',
    READY_TO_SLICE: 'blue',
    SLICING: 'orange',
    SLICE_FAILED: 'error',
    QUEUED: 'teal',
    PRINTING: 'purple',
    AWAITING_CONFIRMATION: 'cyan',
    PRINT_FAILED: 'deep-orange',
    DONE: 'success',
    CANCELLED: 'grey',
  }
  return map[status] ?? 'grey'
}
</script>

<style scoped>
.plate-row {
  background: rgba(var(--v-theme-surface), 0.8);
}
.cursor-pointer {
  cursor: pointer;
}
</style>
