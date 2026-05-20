<template>
  <v-dialog :model-value="modelValue" max-width="560" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="pt-4 px-6">
        {{ plate.status === 'PRINT_FAILED' ? 'Inspect Failed Print' : 'Confirm Print Completion' }}
      </v-card-title>

      <v-card-text class="px-6">
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ plate.status === 'PRINT_FAILED'
            ? 'Record which parts passed or failed. Parts with failed quantity will be requeued for reprinting.'
            : 'Confirm how many of each part came out successfully.' }}
        </p>

        <div class="d-flex ga-2 mb-3">
          <v-btn size="small" variant="tonal" color="success" @click="markAll('pass')">Mark All Passed</v-btn>
          <v-btn size="small" variant="tonal" color="error" @click="markAll('fail')">Mark All Failed</v-btn>
        </div>

        <v-table density="compact">
          <thead>
            <tr>
              <th>Part</th>
              <th class="text-center" style="width:100px">Passed</th>
              <th class="text-center" style="width:100px">Failed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.plateItemId">
              <td class="text-body-2">
                {{ row.partName }}
                <span class="text-medium-emphasis ml-1">×{{ row.totalQty }}</span>
              </td>
              <td>
                <v-text-field
                  v-model.number="row.passed"
                  type="number"
                  min="0"
                  :max="row.totalQty"
                  density="compact"
                  hide-details
                  variant="outlined"
                  style="min-width: 70px"
                  @update:model-value="clampRow(row)"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.failed"
                  type="number"
                  min="0"
                  :max="row.totalQty"
                  density="compact"
                  hide-details
                  variant="outlined"
                  style="min-width: 70px"
                  @update:model-value="clampRow(row)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="submit">Confirm</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PlannedPlate } from '@/backend/build-order-workflow.service'
import { PlannedPlateService } from '@/backend/build-order-workflow.service'

interface InspectRow {
  plateItemId: number
  partName: string
  totalQty: number
  passed: number
  failed: number
}

const props = defineProps<{
  plate: PlannedPlate
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  done: []
}>()

const saving = ref(false)
const rows = ref<InspectRow[]>([])

watch(
  () => props.modelValue,
  (open) => {
    if (open) initRows()
  },
  { immediate: true }
)

function initRows() {
  const allFailed = props.plate.status === 'PRINT_FAILED'
  rows.value = (props.plate.items ?? []).map((item) => ({
    plateItemId: item.id,
    partName: item.printPart?.name ?? `Part #${item.printPartId}`,
    totalQty: item.quantity,
    passed: allFailed ? 0 : item.quantity,
    failed: allFailed ? item.quantity : 0,
  }))
}

function clampRow(row: InspectRow) {
  row.passed = Math.max(0, Math.min(row.totalQty, row.passed ?? 0))
  row.failed = Math.max(0, Math.min(row.totalQty, row.failed ?? 0))
  // Keep passed + failed ≤ totalQty
  if (row.passed + row.failed > row.totalQty) {
    row.failed = row.totalQty - row.passed
  }
}

function markAll(mode: 'pass' | 'fail') {
  for (const row of rows.value) {
    if (mode === 'pass') {
      row.passed = row.totalQty
      row.failed = 0
    } else {
      row.passed = 0
      row.failed = row.totalQty
    }
  }
}

async function submit() {
  saving.value = true
  try {
    await PlannedPlateService.complete(
      props.plate.id,
      rows.value.map((r) => ({
        plateItemId: r.plateItemId,
        passedQuantity: r.passed,
        failedQuantity: r.failed,
      }))
    )
    emit('update:modelValue', false)
    emit('done')
  } catch (e: any) {
    console.error('Failed to confirm plate', e)
  } finally {
    saving.value = false
  }
}
</script>
