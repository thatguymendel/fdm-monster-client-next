<template>
  <div class="history-tab pa-3 d-flex flex-column ga-3">

    <div class="text-overline text-medium-emphasis">Recent Prints</div>

    <div v-if="loading" class="d-flex justify-center py-6">
      <v-progress-circular indeterminate size="32" />
    </div>

    <div v-else-if="!jobs.length" class="text-center py-6">
      <v-icon size="48" color="medium-emphasis" class="mb-2">history</v-icon>
      <div class="text-body-2 text-medium-emphasis">No print history found</div>
    </div>

    <v-list v-else density="compact" class="pa-0">
      <v-list-item
        v-for="job in jobs"
        :key="job.id"
        rounded="lg"
        class="mb-2 job-item"
      >
        <template #prepend>
          <v-icon :color="statusColor(job.status)" size="20">
            {{ statusIcon(job.status) }}
          </v-icon>
        </template>

        <v-list-item-title class="text-body-2 font-weight-medium text-truncate">
          {{ job.fileName }}
        </v-list-item-title>

        <v-list-item-subtitle class="text-caption">
          <span v-if="job.statistics?.actualPrintTimeSeconds">
            {{ formatDuration(job.statistics.actualPrintTimeSeconds) }}
          </span>
          <span v-else-if="job.status === 'FAILED' || job.status === 'CANCELLED'">
            {{ job.status.toLowerCase() }}
          </span>
          <span v-if="job.endedAt" class="text-medium-emphasis ml-1">
            · {{ formatRelativeTime(job.endedAt) }}
          </span>
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>

  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { PrintJobService, type PrintJobDto, type PrintJobStatus } from '@/backend/print-job.service'
import { formatDuration, formatRelativeTime } from '@/utils/date-time.utils'

const props = defineProps<{ printerId: number }>()

const jobs = ref<PrintJobDto[]>([])
const loading = ref(false)

async function loadHistory() {
  loading.value = true
  try {
    const response = await PrintJobService.searchJobsPaged({ page: 1, pageSize: 100 })
    jobs.value = response.items
      .filter((j) => j.printerId === props.printerId)
      .slice(0, 10)
  } catch {
    jobs.value = []
  } finally {
    loading.value = false
  }
}

function statusIcon(status: PrintJobStatus): string {
  if (status === 'COMPLETED') return 'check_circle'
  if (status === 'FAILED' || status === 'CANCELLED') return 'cancel'
  if (status === 'PRINTING') return 'print'
  if (status === 'PAUSED') return 'pause_circle'
  return 'radio_button_unchecked'
}

function statusColor(status: PrintJobStatus): string {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED' || status === 'CANCELLED') return 'error'
  if (status === 'PRINTING') return 'primary'
  return 'medium-emphasis'
}

watch(
  () => props.printerId,
  () => {
    loadHistory()
  },
  { immediate: true }
)
</script>

<style scoped>
.history-tab {
  overflow-y: auto;
}

.job-item {
  background: rgba(var(--v-theme-on-surface), 0.03);
}
</style>
