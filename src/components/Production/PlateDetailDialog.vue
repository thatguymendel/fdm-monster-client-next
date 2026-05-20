<template>
  <v-dialog :model-value="modelValue" max-width="520" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="pt-4 px-6 d-flex align-center ga-2">
        <span>Plate #{{ plate.id }}</span>
        <v-chip :color="statusColor(plate.status)" size="small" variant="tonal">
          {{ plate.status.replace(/_/g, ' ') }}
        </v-chip>
        <v-icon v-if="plate.reprintOfPlateId != null" size="16" color="grey" :title="`Reprint of plate #${plate.reprintOfPlateId}`">
          mdi:mdi-refresh
        </v-icon>
      </v-card-title>

      <v-card-text class="px-6 pb-2">

        <!-- Profile row -->
        <div class="detail-grid mb-3">
          <div class="detail-cell">
            <div class="cell-label">PRINT PROFILE</div>
            <div class="cell-value">{{ plate.printProfile?.name ?? `#${plate.printProfileId}` }}</div>
          </div>
          <div class="detail-cell">
            <div class="cell-label">FILAMENT</div>
            <div class="cell-value">{{ plate.filamentProfile?.name ?? `#${plate.filamentProfileId}` }}</div>
          </div>
        </div>

        <!-- Printer / progress -->
        <div v-if="plate.printJob?.printerName" class="mb-3">
          <div class="cell-label mb-1">PRINTER</div>
          <div class="d-flex align-center ga-2">
            <v-icon size="16">mdi:mdi-printer</v-icon>
            <span class="text-body-2">{{ plate.printJob.printerName }}</span>
            <span v-if="plate.printJob.progress != null" class="text-body-2 text-medium-emphasis">
              · {{ plate.printJob.progress }}%
            </span>
          </div>
          <v-progress-linear
            v-if="plate.status === 'PRINTING' && plate.printJob.progress != null"
            :model-value="plate.printJob.progress"
            color="purple"
            rounded
            height="4"
            class="mt-1"
          />
        </div>

        <!-- Status reason -->
        <v-alert
          v-if="plate.statusReason && (plate.status === 'SLICE_FAILED' || plate.status === 'PRINT_FAILED')"
          color="error"
          variant="tonal"
          density="compact"
          class="mb-3 text-body-2"
        >
          {{ plate.statusReason }}
        </v-alert>

        <!-- Reprint lineage -->
        <div v-if="plate.reprintOfPlateId != null" class="text-caption text-medium-emphasis mb-3">
          Reprinted from plate #{{ plate.reprintOfPlateId }}
        </div>

        <!-- Parts -->
        <div class="cell-label mb-1">PARTS ({{ plate.items?.length ?? 0 }})</div>
        <v-table density="compact" class="mb-2">
          <thead>
            <tr>
              <th>Part</th>
              <th class="text-right" style="width: 80px">Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in plate.items ?? []" :key="item.id">
              <td class="text-body-2">{{ item.printPart?.name ?? `Part #${item.printPartId}` }}</td>
              <td class="text-right text-body-2">{{ item.quantity }}</td>
            </tr>
            <tr v-if="!plate.items?.length">
              <td colspan="2" class="text-medium-emphasis text-body-2">No items</td>
            </tr>
          </tbody>
        </v-table>

        <!-- Timestamps -->
        <div class="d-flex flex-wrap" style="column-gap: 24px; row-gap: 4px;">
          <div class="text-caption text-medium-emphasis">
            Created {{ formatDate(plate.createdAt) }}
          </div>
          <div v-if="plate.slicingCompletedAt" class="text-caption text-medium-emphasis">
            Sliced {{ formatDate(plate.slicingCompletedAt) }}
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { PlannedPlate, PlannedPlateStatus } from '@/backend/build-order-workflow.service'

defineProps<{
  plate: PlannedPlate
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function statusColor(status: PlannedPlateStatus): string {
  const map: Record<PlannedPlateStatus, string> = {
    PLANNING: 'blue-grey', READY_TO_SLICE: 'blue', SLICING: 'orange',
    SLICE_FAILED: 'error', QUEUED: 'teal', PRINTING: 'purple',
    AWAITING_CONFIRMATION: 'cyan', PRINT_FAILED: 'deep-orange',
    DONE: 'success', CANCELLED: 'grey',
  }
  return map[status] ?? 'grey'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}
.detail-cell {
  display: flex;
  flex-direction: column;
}
.cell-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin-bottom: 2px;
}
.cell-value {
  font-size: 0.9rem;
}
</style>
