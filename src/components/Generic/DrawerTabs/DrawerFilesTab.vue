<template>
  <div class="files-tab d-flex flex-column" style="height:100%">
    <v-alert
      v-if="fileLoadError"
      type="warning"
      variant="tonal"
      density="compact"
      class="ma-3 mb-0 flex-shrink-0"
    >
      Unable to load files
      <v-btn size="small" variant="outlined" class="ml-2" @click="refreshFiles()">
        Try Again
      </v-btn>
    </v-alert>

    <!-- Breadcrumb -->
    <div class="breadcrumb-container ma-3 mb-0 d-flex align-center flex-shrink-0">
      <v-btn
        size="x-small"
        variant="text"
        :disabled="breadcrumbParts.length === 0"
        @click="fileExplorer.setCurrentPath(''); refreshFiles()"
      >
        <v-icon start>home</v-icon>
        Root
      </v-btn>
      <template v-for="(part, index) in breadcrumbParts" :key="index">
        <v-icon size="small" class="mx-1">chevron_right</v-icon>
        <v-btn size="x-small" variant="text" @click="navigateToBreadcrumb(index)">
          {{ part }}
        </v-btn>
      </template>
    </div>

    <!-- Search + refresh -->
    <div class="d-flex align-center ga-2 ma-3 flex-shrink-0">
      <v-text-field
        v-model="fileSearch"
        placeholder="Search files..."
        prepend-inner-icon="search"
        variant="outlined"
        density="compact"
        clearable
        hide-details
        class="flex-grow-1"
      />
      <v-btn icon="refresh" size="small" variant="text" @click="refreshFiles()" />
    </div>

    <!-- File list -->
    <div class="file-list flex-grow-1 mx-3 mb-3">
      <div v-if="loading" class="d-flex justify-center py-4">
        <v-progress-circular indeterminate size="32" />
      </div>
      <div
        v-else-if="!filesListed.length && !fileLoadError"
        class="text-center py-6"
      >
        <v-icon size="48" color="medium-emphasis" class="mb-2">folder_open</v-icon>
        <div class="text-body-2 text-medium-emphasis">No files found</div>
      </div>

      <v-virtual-scroll :items="fileTree" item-height="48" class="file-tree">
        <template #default="{ item }">
          <v-list-item
            :key="item.id"
            density="compact"
            :class="{ 'cursor-pointer': item.type === 'folder' }"
            @click="item.type === 'folder' ? navigateToDir(item.path) : undefined"
          >
            <template #prepend>
              <v-icon
                :color="item.type === 'file' && item.file && isFileBeingPrinted(item.file) ? 'primary' : 'medium-emphasis'"
              >
                {{ getTreeIcon(item) }}
              </v-icon>
            </template>
            <v-list-item-title>
              <div class="d-flex align-center">
                <span
                  :class="{ 'text-primary font-weight-bold': item.type === 'file' && item.file && isFileBeingPrinted(item.file) }"
                  class="text-body-2"
                  :title="item.path"
                >
                  {{ item.name }}
                </span>
                <span
                  v-if="item.type === 'file' && item.file"
                  class="text-caption text-medium-emphasis ml-2"
                >
                  {{ formatFileSize(item.file.size ?? undefined) }}
                </span>
              </div>
            </v-list-item-title>
            <template #append>
              <div
                v-if="item.type === 'file' && item.file"
                class="d-flex ga-1"
                @click.stop
              >
                <v-btn
                  icon="download"
                  size="x-small"
                  variant="text"
                  @click="clickDownloadFile(item.file.path)"
                />
                <v-btn
                  :disabled="isFileBeingPrinted(item.file)"
                  icon="play_arrow"
                  size="x-small"
                  variant="text"
                  color="success"
                  @click="clickPrintFile(item.file)"
                />
                <v-btn
                  :disabled="isFileBeingPrinted(item.file)"
                  icon="delete"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="deleteFile(item.file)"
                />
              </div>
            </template>
          </v-list-item>
        </template>
      </v-virtual-scroll>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { usePrinterStore } from '@/store/printer.store'
import { usePrinterStateStore } from '@/store/printer-state.store'
import { useFileExplorer } from '@/shared/file-explorer.composable'
import { PrinterRemoteFileService } from '@/backend'
import { FileDto } from '@/models/printers/printer-file.model'
import { formatFileSize } from '@/utils/file-size.util'

interface TreeNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  file?: FileDto
}

const props = defineProps<{ printerId: number }>()

const printersStore = usePrinterStore()
const printerStateStore = usePrinterStateStore()
const fileExplorer = useFileExplorer()

const fileSearch = ref<string | undefined>(undefined)
const fileList = ref<FileDto[] | undefined>(undefined)
const loading = fileExplorer.loading
const fileLoadError = fileExplorer.error
const currentPath = fileExplorer.currentPath

const filesListed = computed(() => {
  if (!fileList.value?.length) return []
  return fileList.value.filter((f) =>
    fileSearch.value?.length
      ? `${f.path}`.toLowerCase().includes(fileSearch.value)
      : true
  )
})

const fileTree = computed<TreeNode[]>(() => {
  const items: TreeNode[] = filesListed.value.map((file) => ({
    id: file.path,
    name: file.path.split('/').pop() || file.path,
    type: file.dir ? 'folder' : 'file',
    path: file.path,
    file: file.dir ? undefined : file,
  }))
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return items
})

const breadcrumbParts = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split('/').filter((p) => p.length > 0)
})

async function refreshFiles() {
  fileExplorer.setLoading(true)
  fileExplorer.setError(false)
  try {
    const startDir = currentPath.value || undefined
    fileList.value = await printersStore.loadPrinterFiles(props.printerId, false, startDir)
  } catch (error) {
    console.warn('Failed to load printer files:', error)
    fileExplorer.setError(true)
    fileList.value = []
  } finally {
    fileExplorer.setLoading(false)
  }
}

async function navigateToDir(dirPath: string) {
  fileExplorer.setCurrentPath(dirPath)
  await refreshFiles()
}

async function navigateToBreadcrumb(index: number) {
  const pathParts = currentPath.value.split('/').filter((p) => p.length > 0)
  const newPath = pathParts.slice(0, index + 1).join('/')
  fileExplorer.setCurrentPath(newPath)
  await refreshFiles()
}

async function deleteFile(file: FileDto) {
  await printersStore.deletePrinterFile(props.printerId, file.path)
}

function isFileBeingPrinted(file: FileDto) {
  const jobFilePath = printerStateStore.printingFilePathsByPrinterId[props.printerId]
  return jobFilePath === file.path
}

function getTreeIcon(item: TreeNode) {
  if (item.type === 'folder') return 'folder'
  if (item.file && isFileBeingPrinted(item.file)) return 'play_circle'
  return 'insert_drive_file'
}

async function clickPrintFile(file: FileDto) {
  await printerStateStore.selectAndPrintFile({ printerId: props.printerId, fullPath: file.path })
}

function clickDownloadFile(path: string) {
  PrinterRemoteFileService.downloadFile(props.printerId, path)
}

watch(
  () => props.printerId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      fileList.value = undefined
      refreshFiles()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.files-tab {
  height: 100%;
}

.breadcrumb-container {
  min-height: 32px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
}

.breadcrumb-container::-webkit-scrollbar {
  height: 4px;
}

.breadcrumb-container::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 2px;
}

.file-list {
  overflow: hidden;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.file-tree {
  height: 100%;
}

.cursor-pointer {
  cursor: pointer;
}

.file-tree :deep(.v-list-item:hover) {
  background: rgba(var(--v-theme-on-surface), 0.05);
}
</style>
