<template>
  <v-navigation-drawer
    :model-value="drawerOpened"
    location="right"
    temporary
    width="600"
    class="printer-side-nav"
    @update:model-value="closeDrawer"
  >
    <template v-if="storedSideNavPrinter">

      <!-- Fixed header -->
      <div class="drawer-header flex-shrink-0">
        <div class="d-flex align-center ga-2 pa-3 pb-2">
          <v-avatar size="40" color="primary" class="flex-shrink-0">
            <span class="text-body-1 font-weight-bold">{{ avatarInitials }}</span>
          </v-avatar>

          <div class="flex-grow-1 min-width-0">
            <div class="text-h6 font-weight-bold text-truncate">
              {{ storedSideNavPrinter.name }}
            </div>
            <div class="text-caption text-medium-emphasis">{{ serviceName }}</div>
          </div>

          <v-chip :color="statusColor" :prepend-icon="statusIcon" size="small" class="flex-shrink-0">
            {{ statusText }}
          </v-chip>

          <v-btn
            :icon="cameraVisible ? 'videocam' : 'videocam_off'"
            size="small"
            variant="text"
            :color="storedSideNavPrinter.streamURL ? 'default' : 'medium-emphasis'"
            @click="cameraVisible = !cameraVisible"
          />

          <v-btn
            v-if="hasWebInterfaceForPrinter"
            icon="open_in_new"
            size="small"
            variant="text"
            @click="openPrinterURL()"
          />
        </div>
      </div>

      <v-divider />

      <!-- Collapsible camera banner -->
      <v-expand-transition>
        <div
          v-if="cameraVisible && storedSideNavPrinter.streamURL"
          class="camera-banner flex-shrink-0"
        >
          <img
            v-show="!cameraError"
            :src="storedSideNavPrinter.streamURL"
            :style="cameraTransform ? { transform: cameraTransform } : {}"
            alt="Camera stream"
            class="camera-img"
            @error="cameraError = true"
            @load="cameraError = false"
          />
          <div v-show="cameraError" class="d-flex flex-column align-center justify-center pa-3 text-medium-emphasis">
            <v-icon size="36" class="mb-1">videocam_off</v-icon>
            <div class="text-caption">Stream unavailable</div>
          </div>
        </div>
      </v-expand-transition>

      <!-- Tab bar -->
      <v-tabs
        v-model="activeTab"
        density="compact"
        class="drawer-tabs flex-shrink-0"
      >
        <v-tooltip v-for="tab in drawerTabs" :key="tab.value" :text="tab.label" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-tab v-bind="tooltipProps" :value="tab.value" class="drawer-icon-tab">
              <v-icon size="20">{{ tab.icon }}</v-icon>
            </v-tab>
          </template>
        </v-tooltip>
      </v-tabs>

      <v-divider />

      <!-- Tab content (fills remaining height) -->
      <div class="drawer-content">
        <KeepAlive>
          <component :is="activeTabComponent" :printer-id="printerId!" />
        </KeepAlive>
      </div>

    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { generateInitials } from '@/shared/noun-adjectives.data'
import { PrintersService } from '@/backend'
import { usePrinterStore } from '@/store/printer.store'
import { usePrinterStateStore } from '@/store/printer-state.store'
import { getPrinterTypeName } from '@/shared/printer-types.constants'
import { hasWebInterface } from '@/shared/printer-capabilities.constants'
import { useFileExplorer } from '@/shared/file-explorer.composable'
import { useCameraSettings } from '@/shared/camera-settings.composable'
import DrawerOverviewTab from './DrawerTabs/DrawerOverviewTab.vue'
import DrawerFilesTab from './DrawerTabs/DrawerFilesTab.vue'
import DrawerControlsTab from './DrawerTabs/DrawerControlsTab.vue'
import DrawerSettingsTab from './DrawerTabs/DrawerSettingsTab.vue'
import DrawerHistoryTab from './DrawerTabs/DrawerHistoryTab.vue'

const printersStore = usePrinterStore()
const printerStateStore = usePrinterStateStore()
const fileExplorer = useFileExplorer()

const drawerOpened = fileExplorer.isOpen
const printerId = fileExplorer.currentPrinterId

const activeTab = ref<'overview' | 'files' | 'controls' | 'settings' | 'history'>('overview')
const cameraVisible = ref(true)
const cameraError = ref(false)

const drawerTabs = [
  { value: 'overview', label: 'Overview', icon: 'mdi:mdi-home' },
  { value: 'files',    label: 'Files',    icon: 'mdi:mdi-folder' },
  { value: 'controls', label: 'Controls', icon: 'mdi:mdi-gamepad-variant' },
  { value: 'settings', label: 'Settings', icon: 'mdi:mdi-cog-outline' },
  { value: 'history',  label: 'History',  icon: 'mdi:mdi-history' },
]

const cameraTransform = computed(() => {
  if (!printerId.value) return ''
  return useCameraSettings(printerId.value).cameraTransform.value
})

const tabComponents = {
  overview: DrawerOverviewTab,
  files: DrawerFilesTab,
  controls: DrawerControlsTab,
  settings: DrawerSettingsTab,
  history: DrawerHistoryTab,
}

const activeTabComponent = computed(() => tabComponents[activeTab.value])

const storedSideNavPrinter = computed(() => {
  if (!printerId.value) return undefined
  return printersStore.printer(printerId.value)
})

const serviceName = computed(() => getPrinterTypeName(storedSideNavPrinter.value?.printerType))

const isOnline = computed(() =>
  printerId.value ? printerStateStore.isApiResponding(printerId.value) : false
)
const isOperational = computed(() =>
  printerId.value ? printerStateStore.isPrinterOperational(printerId.value) : false
)
const isEnabled = computed(() => storedSideNavPrinter.value?.enabled)
const isPrinting = computed(() =>
  printerId.value ? printerStateStore.isPrinterPrinting(printerId.value) : false
)
const isPaused = computed(() =>
  printerId.value ? printerStateStore.isPrinterPaused(printerId.value) : false
)

const statusColor = computed(() => {
  if (!isEnabled.value) return 'error'
  if (!isOnline.value) return 'warning'
  if (isPrinting.value) return 'success'
  if (isOperational.value) return 'primary'
  return 'medium-emphasis'
})

const statusIcon = computed(() => {
  if (!isEnabled.value) return 'power_off'
  if (!isOnline.value) return 'wifi_off'
  if (isPrinting.value) return 'print'
  if (isOperational.value) return 'check_circle'
  return 'radio_button_unchecked'
})

const statusText = computed(() => {
  if (!isEnabled.value) return 'Disabled'
  if (!isOnline.value) return 'Offline'
  if (isPrinting.value && isPaused.value) return 'Paused'
  if (isPrinting.value) return 'Printing'
  if (isOperational.value) return 'Ready'
  return 'Idle'
})

const avatarInitials = computed(() => {
  const p = storedSideNavPrinter.value
  return p ? generateInitials(p.name) : ''
})

const hasWebInterfaceForPrinter = computed(
  () => storedSideNavPrinter.value && hasWebInterface(storedSideNavPrinter.value.printerType)
)

function openPrinterURL() {
  if (!storedSideNavPrinter.value) return
  PrintersService.openPrinterURL(storedSideNavPrinter.value.printerURL)
  closeDrawer()
}

function closeDrawer() {
  fileExplorer.closeFileExplorer()
}

watch(printerId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    cameraError.value = false
    activeTab.value = 'overview'
  }
})
</script>

<style scoped>
.printer-side-nav {
  background: rgb(var(--v-theme-surface));
  height: 100vh;
}

.printer-side-nav :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.camera-banner {
  overflow: hidden;
  max-height: 220px;
  background: #000;
}

.camera-img {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  display: block;
}

.drawer-tabs {
  flex-shrink: 0;
}

.drawer-icon-tab {
  min-width: 0 !important;
  flex: 1 1 0 !important;
}

.drawer-content {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.drawer-content > * {
  flex: 1 1 0;
  min-height: 0;
}

.min-width-0 {
  min-width: 0;
}
</style>
