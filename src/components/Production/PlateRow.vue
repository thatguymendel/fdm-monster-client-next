<template>
  <div class="plate-row pa-2 rounded mb-1">
    <!-- Top row: ID, status, profiles, printer, actions -->
    <div class="d-flex align-center ga-2 flex-wrap">
      <span class="text-caption text-medium-emphasis" style="min-width: 60px">
        Plate #{{ plate.id }}
      </span>

      <v-chip :color="plateStatusColor(plate.status)" size="small" variant="tonal">
        {{ plate.status.replace(/_/g, ' ') }}
      </v-chip>

      <span class="text-body-2 text-medium-emphasis">
        {{ plate.printProfile?.name ?? `Profile #${plate.printProfileId}` }}
        ·
        {{ plate.filamentProfile?.name ?? `Filament #${plate.filamentProfileId}` }}
      </span>

      <!-- Printer chip -->
      <v-chip
        v-if="plate.printJob?.printerName"
        :color="plate.status === 'PRINTING' ? 'purple' : 'teal'"
        size="small"
        variant="tonal"
        prepend-icon="mdi:mdi-printer"
      >
        {{ plate.printJob.printerName }}
        <span v-if="plate.status === 'PRINTING' && plate.printJob.progress != null" class="ml-1">
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

      <v-progress-circular
        v-if="plate.status === 'SLICING'"
        indeterminate
        size="18"
        color="orange"
      />
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
import type { PlannedPlate, PlannedPlateStatus } from '@/backend/build-order-workflow.service'

defineProps<{
  plate: PlannedPlate
  loading?: boolean
}>()

const emit = defineEmits<{
  forceSlice: [plate: PlannedPlate]
}>()

function plateStatusColor(status: PlannedPlateStatus): string {
  const map: Record<PlannedPlateStatus, string> = {
    PLANNING: 'blue-grey',
    READY_TO_SLICE: 'blue',
    SLICING: 'orange',
    SLICE_FAILED: 'error',
    QUEUED: 'teal',
    PRINTING: 'purple',
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
</style>
