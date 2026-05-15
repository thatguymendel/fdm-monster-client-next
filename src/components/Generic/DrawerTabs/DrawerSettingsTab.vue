<template>
  <div class="settings-tab pa-3 d-flex flex-column ga-4">

    <!-- Auto-eject -->
    <v-card elevation="1" rounded="lg">
      <v-card-title class="text-subtitle-1 py-3">Auto-Eject</v-card-title>
      <v-card-text class="pt-0">
        <v-skeleton-loader v-if="loading" type="text" />
        <div v-else>
          <v-checkbox
            v-model="hasAutoEject"
            label="Bed self-clears after each print"
            hide-details
            density="compact"
            :loading="saving"
            @update:model-value="saveAutoEject"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Printer Capability -->
    <v-card elevation="1" rounded="lg">
      <v-card-title class="text-subtitle-1 py-3">Printer Capability</v-card-title>
      <v-card-text class="pt-0">
        <v-skeleton-loader v-if="loading" type="table-row@3" />
        <div v-else-if="capability">
          <v-table density="compact">
            <tbody>
              <tr v-if="capability.printerModel">
                <td class="text-medium-emphasis">Model</td>
                <td>{{ capability.printerModel }}</td>
              </tr>
              <tr v-if="capability.nozzleDiameterMm">
                <td class="text-medium-emphasis">Nozzle</td>
                <td>{{ capability.nozzleDiameterMm }}mm</td>
              </tr>
              <tr v-if="capability.bedWidthMm && capability.bedDepthMm">
                <td class="text-medium-emphasis">Bed size</td>
                <td>{{ capability.bedWidthMm }}×{{ capability.bedDepthMm }}×{{ capability.bedHeightMm ?? '?' }}mm</td>
              </tr>
            </tbody>
          </v-table>
          <div v-if="!capability.printerModel && !capability.nozzleDiameterMm && !capability.bedWidthMm"
            class="text-caption text-medium-emphasis">
            No capability data recorded yet.
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis">
          No capability data recorded yet.
        </div>
      </v-card-text>
    </v-card>

    <!-- Camera Settings -->
    <v-card v-if="hasCamera" elevation="1" rounded="lg">
      <v-card-title class="text-subtitle-1 py-3">Camera Settings</v-card-title>
      <v-card-text class="pt-0 d-flex flex-column ga-3">
        <div class="d-flex ga-4 flex-wrap">
          <v-checkbox
            :model-value="cameraSettings.flipH"
            label="Flip Horizontal"
            hide-details
            density="compact"
            @update:model-value="updateCamera({ flipH: !!$event })"
          />
          <v-checkbox
            :model-value="cameraSettings.flipV"
            label="Flip Vertical"
            hide-details
            density="compact"
            @update:model-value="updateCamera({ flipV: !!$event })"
          />
        </div>
        <div>
          <div class="text-caption text-medium-emphasis mb-1">Rotation</div>
          <v-btn-toggle
            :model-value="cameraSettings.rotate"
            mandatory
            density="compact"
            variant="outlined"
            divided
            @update:model-value="updateCamera({ rotate: $event })"
          >
            <v-btn :value="0">0°</v-btn>
            <v-btn :value="90">90°</v-btn>
            <v-btn :value="180">180°</v-btn>
            <v-btn :value="270">270°</v-btn>
          </v-btn-toggle>
        </div>
        <v-btn
          size="small"
          variant="text"
          color="error"
          @click="updateCamera({ flipH: false, flipV: false, rotate: 0 })"
        >
          Reset Camera Settings
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Open full settings -->
    <v-btn
      variant="outlined"
      prepend-icon="open_in_new"
      @click="openFullSettings()"
    >
      Open Full Settings
    </v-btn>

  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { PrinterCapabilityService, type PrinterCapability } from '@/backend/global-queue.service'
import { DialogName } from '@/components/Generic/Dialogs/dialog.constants'
import { useDialog } from '@/shared/dialog.composable'
import { useCameraSettings } from '@/shared/camera-settings.composable'
import { usePrinterStore } from '@/store/printer.store'

const props = defineProps<{ printerId: number }>()

const printerStore = usePrinterStore()
const printer = computed(() => printerStore.printer(props.printerId))
const hasCamera = computed(() => !!printer.value?.streamURL)

const { settings: cameraSettings, update: updateCamera } = useCameraSettings(props.printerId)

const capability = ref<PrinterCapability | null>(null)
const hasAutoEject = ref(false)
const loading = ref(false)
const saving = ref(false)

async function loadCapability() {
  loading.value = true
  try {
    capability.value = await PrinterCapabilityService.getCapability(props.printerId)
    hasAutoEject.value = capability.value?.hasAutoEject ?? false
  } catch {
    capability.value = null
  } finally {
    loading.value = false
  }
}

async function saveAutoEject(value: boolean | null) {
  saving.value = true
  try {
    await PrinterCapabilityService.upsert(props.printerId, { hasAutoEject: value ?? false })
  } finally {
    saving.value = false
  }
}

function openFullSettings() {
  useDialog(DialogName.AddOrUpdatePrinterDialog).openDialog({ id: props.printerId })
}

watch(
  () => props.printerId,
  (newId, oldId) => {
    if (newId && newId !== oldId) loadCapability()
  },
  { immediate: true }
)
</script>

<style scoped>
.settings-tab {
  overflow-y: auto;
}
</style>
