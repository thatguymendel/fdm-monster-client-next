<template>
  <div class="overview-tab pa-3 d-flex flex-column ga-3">

    <!-- Job progress card (dominates when printing) -->
    <v-card
      v-if="isPrinting || isStoppable || isPaused"
      elevation="3"
      rounded="lg"
      color="surface-variant"
    >
      <v-card-text>
        <!-- Controls always first so they're visible without scrolling -->
        <div class="d-flex ga-2 mb-3">
          <v-btn
            v-if="isPrinting || isPaused"
            :color="isPaused ? 'success' : 'warning'"
            size="small"
            variant="outlined"
            @click="isPaused ? clickResumePrint() : clickPausePrint()"
          >
            <v-icon start>{{ isPaused ? 'play_arrow' : 'pause' }}</v-icon>
            {{ isPaused ? 'Resume' : 'Pause' }}
          </v-btn>
          <v-btn
            v-if="isStoppable"
            color="error"
            size="small"
            variant="outlined"
            @click="clickStopPrint()"
          >
            <v-icon start>stop</v-icon>
            Cancel
          </v-btn>
        </div>

        <div class="d-flex align-center ga-2 mb-2">
          <v-icon color="primary">insert_drive_file</v-icon>
          <span class="text-body-2 text-truncate font-weight-medium">
            {{ currentPrintingFilePath || 'Unknown file' }}
          </span>
        </div>

        <div class="d-flex justify-space-between align-center text-caption text-medium-emphasis mb-1">
          <span>{{ formatDuration(currentJob?.progress?.printTime) }}</span>
          <span class="text-h6 font-weight-bold text-on-surface">
            {{ truncateProgress(currentJob?.progress?.completion) }}%
          </span>
          <span>~{{ formatDuration(currentJob?.progress?.printTimeLeft) }} left</span>
        </div>

        <v-progress-linear
          :model-value="currentJob?.progress?.completion"
          color="primary"
          height="8"
          rounded
          class="mb-2"
        />

        <div v-if="currentZ" class="text-caption text-medium-emphasis">
          Z: {{ currentZ }}mm
        </div>
      </v-card-text>
    </v-card>

    <!-- Bed Needs Clearing card (dominant when idle and bed is dirty) -->
    <v-card
      v-else-if="!bedLoading && !bedCapability?.bedCleared"
      elevation="3"
      rounded="lg"
      color="warning"
      variant="tonal"
    >
      <v-card-text>
        <div class="d-flex align-center ga-2 mb-2">
          <v-icon color="warning" size="24">mdi:mdi-printer-3d</v-icon>
          <span class="text-body-1 font-weight-bold">Bed Needs Clearing</span>
        </div>
        <div class="text-body-2 text-medium-emphasis mb-3">
          Remove the last print before starting a new job.
        </div>
        <v-btn
          color="warning"
          variant="elevated"
          size="small"
          :loading="bedClearing"
          @click="markBedCleared()"
        >
          <v-icon start>check_circle</v-icon>
          Mark Bed Cleared
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Status alerts -->
    <v-alert
      v-if="!isEnabled"
      type="warning"
      variant="tonal"
      density="compact"
    >
      <template #prepend><v-icon>power_off</v-icon></template>
      Printer is disabled. Enable to receive live updates.
    </v-alert>

    <v-alert
      v-else-if="!isOnline"
      type="info"
      variant="tonal"
      density="compact"
    >
      <template #prepend><v-icon>wifi_off</v-icon></template>
      Printer appears offline. Attempting to reconnect...
    </v-alert>

    <v-alert
      v-if="maintenanceReason"
      type="error"
      variant="tonal"
      density="compact"
    >
      <template #prepend><v-icon>construction</v-icon></template>
      <div>
        <div class="font-weight-bold">Under Maintenance</div>
        <div class="text-caption">{{ maintenanceReason }}</div>
      </div>
    </v-alert>

    <!-- Quick Actions -->
    <div>
      <div class="text-overline text-medium-emphasis mb-2">Quick Actions</div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn
          :disabled="!isEnabled || !isOnline"
          :color="isOperational ? 'warning' : 'success'"
          size="small"
          variant="outlined"
          @click="togglePrinterConnection()"
        >
          <v-icon start>{{ isOperational ? 'usb_off' : 'usb' }}</v-icon>
          {{ isOperational ? 'Disconnect' : 'Connect' }}
        </v-btn>

        <v-btn
          :color="isEnabled ? 'warning' : 'success'"
          size="small"
          variant="outlined"
          @click="toggleEnabled()"
        >
          <v-icon start>{{ isEnabled ? 'pause' : 'play_arrow' }}</v-icon>
          {{ isEnabled ? 'Disable' : 'Enable' }}
        </v-btn>

        <v-btn size="small" variant="outlined" @click="refreshSocketState()">
          <v-icon start>refresh</v-icon>
          Refresh
        </v-btn>

        <v-btn
          :color="isUnderMaintenance ? 'warning' : 'default'"
          size="small"
          variant="outlined"
          @click="toggleMaintenance()"
        >
          <v-icon start>{{ isUnderMaintenance ? 'build_circle' : 'build' }}</v-icon>
          {{ isUnderMaintenance ? 'Update' : 'Maintenance' }}
        </v-btn>

        <!-- Bed cleared chip shown only when bed IS cleared (card handles dirty state) -->
        <v-chip
          v-if="!bedLoading && bedCapability?.bedCleared"
          color="success"
          prepend-icon="mdi:mdi-check-circle"
          size="small"
        >
          Bed Cleared{{ bedCapability?.hasAutoEject ? ' (auto)' : '' }}
        </v-chip>
      </div>
    </div>

    <!-- Filament -->
    <v-card elevation="1" rounded="lg">
      <v-card-title class="text-subtitle-1 py-3">
        <div class="d-flex align-center">
          <v-icon start size="small">mdi:mdi-water</v-icon>
          <span>Filament</span>
          <v-spacer />
          <v-btn
            v-if="currentSpool"
            size="small"
            variant="text"
            color="error"
            :loading="filamentSaving"
            @click="doUnloadSpool()"
          >
            Unload
          </v-btn>
          <v-btn size="small" variant="tonal" color="primary" @click="openLoadSpoolDialog()">
            {{ currentSpool ? 'Change' : 'Load Spool' }}
          </v-btn>
        </div>
      </v-card-title>
      <v-card-text class="pt-0">
        <div v-if="filamentLoading" class="d-flex justify-center py-2">
          <v-progress-circular indeterminate size="20" />
        </div>
        <div v-else-if="currentSpool" class="d-flex align-center ga-2">
          <div
            class="filament-swatch"
            :style="{ backgroundColor: currentSpool.colorHex || '#aaa' }"
          />
          <div>
            <div class="text-body-2 font-weight-medium">{{ currentSpool.name }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ currentSpool.material?.toUpperCase() ?? '' }} · {{ currentSpool.colorName }}
            </div>
            <div class="text-caption">
              <span :class="remainingPct < 20 ? 'text-error' : ''">
                {{ currentSpool.remainingWeightGrams ?? '?' }}g
              </span>
              <span class="text-medium-emphasis"> / {{ currentSpool.totalWeightGrams ?? '?' }}g</span>
            </div>
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis">
          No filament loaded
        </div>
      </v-card-text>
    </v-card>

    <!-- Load Spool Dialog -->
    <v-dialog v-model="loadSpoolDialog" max-width="460">
      <v-card>
        <v-card-title class="pt-4 px-6">Load Spool</v-card-title>
        <v-card-text class="px-6 pb-0">
          <v-select
            v-model="selectedPresetId"
            label="Load from preset (optional)"
            :items="presetSelectItems"
            item-title="label"
            item-value="id"
            clearable
            hide-details
            class="mb-4"
            @update:model-value="applyPreset"
          />
          <v-divider class="mb-4" />
          <v-text-field v-model="loadForm.name" label="Spool name / brand" required class="mb-1" />
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="loadForm.material"
                label="Material"
                :items="['pla', 'petg', 'abs', 'tpu', 'asa', 'pa', 'pc', 'other']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="loadForm.colorName" label="Color (e.g. tan)" />
            </v-col>
          </v-row>
          <div class="d-flex align-center ga-2 mb-1">
            <div class="color-picker-wrapper">
              <div class="color-picker-btn" :style="{ backgroundColor: loadForm.colorHex || '#aaaaaa' }" />
              <input
                type="color"
                :value="loadForm.colorHex || '#aaaaaa'"
                class="color-picker-input"
                @input="(e) => (loadForm.colorHex = (e.target as HTMLInputElement).value)"
              />
            </div>
            <v-text-field
              v-model="loadForm.colorHex"
              label="Color hex (e.g. #C4A35A)"
              hide-details
              density="compact"
            />
          </div>
          <v-text-field
            v-model.number="loadForm.weightGrams"
            label="Starting weight (g)"
            type="number"
          />
          <v-checkbox
            v-model="saveAsPreset"
            label="Save as preset"
            hide-details
            density="compact"
            class="mb-2"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="loadSpoolDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="filamentSaving"
            :disabled="!loadForm.name || !loadForm.material || !loadForm.colorName"
            @click="doLoadSpool()"
          >
            Load
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { PrintersService } from '@/backend'
import { PrinterMaintenanceLogService } from '@/backend/printer-maintenance-log.service'
import { FilamentService, type FilamentSpool, type FilamentPreset } from '@/backend/filament.service'
import { useFilamentStore } from '@/store/filament.store'
import { usePrinterStore } from '@/store/printer.store'
import { usePrinterStateStore } from '@/store/printer-state.store'
import { PrinterCapabilityService, type PrinterCapability } from '@/backend/global-queue.service'
import { DialogName } from '@/components/Generic/Dialogs/dialog.constants'
import { useDialog } from '@/shared/dialog.composable'
import { formatDuration } from '@/utils/date-time.utils'

const props = defineProps<{ printerId: number }>()

const printersStore = usePrinterStore()
const printerStateStore = usePrinterStateStore()
const filamentStore = useFilamentStore()

const printer = computed(() => printersStore.printer(props.printerId))

const isOnline = computed(() => printerStateStore.isApiResponding(props.printerId))
const isOperational = computed(() => printerStateStore.isPrinterOperational(props.printerId))
const isEnabled = computed(() => printer.value?.enabled)
const isUnderMaintenance = computed(() => !!printer.value?.disabledReason?.length)
const maintenanceReason = computed(() => printer.value?.disabledReason ?? null)
const isPrinting = computed(() => printerStateStore.isPrinterPrinting(props.printerId))
const isStoppable = computed(() => printerStateStore.isPrinterStoppable(props.printerId))
const isPaused = computed(() => printerStateStore.isPrinterPaused(props.printerId))

const currentJob = computed(() => printerStateStore.printerJobsById[props.printerId])
const currentPrintingFilePath = computed(() => printerStateStore.printingFilePathsByPrinterId[props.printerId])
const currentZ = computed(() => {
  const events = printerStateStore.printerEventsById[props.printerId]
  return events?.current?.payload?.currentZ ?? null
})

function truncateProgress(progress?: number | null) {
  if (progress == null) return '0'
  return progress.toFixed(1)
}

// ── Bed ───────────────────────────────────────────────────────────────────────

const bedCapability = ref<PrinterCapability | null | undefined>(undefined)
const bedLoading = ref(false)
const bedClearing = ref(false)

async function fetchBedCapability() {
  bedLoading.value = true
  try {
    bedCapability.value = await PrinterCapabilityService.getCapability(props.printerId)
  } catch {
    bedCapability.value = null
  } finally {
    bedLoading.value = false
  }
}

async function markBedCleared() {
  bedClearing.value = true
  try {
    await PrinterCapabilityService.markBedCleared(props.printerId)
    await fetchBedCapability()
  } finally {
    bedClearing.value = false
  }
}

// ── Filament ──────────────────────────────────────────────────────────────────

const currentSpool = ref<FilamentSpool | null>(null)
const presets = ref<FilamentPreset[]>([])
const filamentLoading = ref(false)
const filamentSaving = ref(false)
const loadSpoolDialog = ref(false)
const selectedPresetId = ref<number | null>(null)
const saveAsPreset = ref(false)

const emptyLoadForm = () => ({ name: '', material: 'pla', colorName: '', colorHex: '', weightGrams: 1000 })
const loadForm = ref(emptyLoadForm())

const remainingPct = computed(() => {
  if (!currentSpool.value?.remainingWeightGrams || !currentSpool.value?.totalWeightGrams) return 100
  return (currentSpool.value.remainingWeightGrams / currentSpool.value.totalWeightGrams) * 100
})

const presetSelectItems = computed(() =>
  presets.value.map((p) => ({
    id: p.id,
    label: `${p.name} — ${p.material.toUpperCase()} ${p.colorName}`,
  }))
)

async function fetchCurrentSpool() {
  filamentLoading.value = true
  try {
    const assignment = await FilamentService.getCurrentAssignment(props.printerId)
    currentSpool.value = assignment?.spool ?? null
  } finally {
    filamentLoading.value = false
  }
}

async function openLoadSpoolDialog() {
  loadForm.value = emptyLoadForm()
  selectedPresetId.value = null
  saveAsPreset.value = false
  presets.value = await FilamentService.listPresets()
  loadSpoolDialog.value = true
}

function applyPreset(presetId: number | null) {
  if (!presetId) return
  const preset = presets.value.find((p) => p.id === presetId)
  if (!preset) return
  loadForm.value = {
    name: preset.name,
    material: preset.material,
    colorName: preset.colorName,
    colorHex: preset.colorHex ?? '',
    weightGrams: preset.defaultWeightGrams ?? 1000,
  }
}

async function doLoadSpool() {
  filamentSaving.value = true
  try {
    if (saveAsPreset.value) {
      await FilamentService.createPreset({
        name: loadForm.value.name,
        brand: null,
        material: loadForm.value.material,
        colorName: loadForm.value.colorName,
        colorHex: loadForm.value.colorHex || null,
        defaultWeightGrams: loadForm.value.weightGrams,
      })
    }
    const assignment = await FilamentService.loadSpool(props.printerId, {
      name: loadForm.value.name,
      material: loadForm.value.material,
      colorName: loadForm.value.colorName,
      colorHex: loadForm.value.colorHex || null,
      weightGrams: loadForm.value.weightGrams,
    })
    currentSpool.value = assignment.spool ?? null
    filamentStore.setSpoolForPrinter(props.printerId, assignment.spool ?? null)
    loadSpoolDialog.value = false
  } finally {
    filamentSaving.value = false
  }
}

async function doUnloadSpool() {
  filamentSaving.value = true
  try {
    await FilamentService.unassignSpool(props.printerId)
    currentSpool.value = null
    filamentStore.setSpoolForPrinter(props.printerId, null)
  } finally {
    filamentSaving.value = false
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function togglePrinterConnection() {
  if (printerStateStore.isPrinterOperational(props.printerId)) {
    return await PrintersService.sendPrinterDisconnectCommand(props.printerId)
  }
  await PrintersService.sendPrinterConnectCommand(props.printerId)
}

async function toggleEnabled() {
  if (!printer.value) return
  await PrintersService.toggleEnabled(props.printerId, !printer.value.enabled)
}

async function toggleMaintenance() {
  if (isUnderMaintenance.value) {
    const activeLog = await PrinterMaintenanceLogService.getActiveByPrinterId(props.printerId)
    if (activeLog) {
      await PrinterMaintenanceLogService.complete(activeLog.id, {})
    }
    return
  }
  await useDialog(DialogName.PrinterMaintenanceDialog).openDialog({ printerId: props.printerId })
}

async function refreshSocketState() {
  await PrintersService.refreshSocket(props.printerId)
}

async function clickStopPrint() {
  if (confirm('Are you sure to cancel the current print job?')) {
    await PrintersService.stopPrintJob(props.printerId)
  }
}

async function clickPausePrint() {
  await PrintersService.pausePrintJob(props.printerId)
}

async function clickResumePrint() {
  await PrintersService.resumePrintJob(props.printerId)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

watch(
  () => props.printerId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      fetchBedCapability()
      fetchCurrentSpool()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.overview-tab {
  overflow-y: auto;
}

.filament-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.color-picker-wrapper {
  position: relative;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;
}

.color-picker-btn {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.25);
}

.color-picker-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
}
</style>
