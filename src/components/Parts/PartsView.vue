<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Parts</h1>
    </div>

    <!-- ─── Toolbar ──────────────────────────────────────────────────────────── -->
    <div class="d-flex align-center ga-2 mb-3 flex-wrap">
      <!-- Breadcrumbs -->
      <div class="d-flex align-center ga-1 mr-2">
        <v-btn
          variant="text"
          size="small"
          density="compact"
          @click="navigateToFolder(null)"
        >
          Parts
        </v-btn>
        <template v-for="(crumb, i) in breadcrumbs" :key="crumb.id">
          <v-icon size="small" color="medium-emphasis">mdi:mdi-chevron-right</v-icon>
          <v-btn
            variant="text"
            size="small"
            density="compact"
            :disabled="i === breadcrumbs.length - 1"
            @click="navigateToFolder(crumb.id)"
          >
            {{ crumb.name }}
          </v-btn>
        </template>
      </div>

      <v-spacer />

      <v-text-field
        v-model="searchQuery"
        placeholder="Search parts..."
        prepend-inner-icon="mdi:mdi-magnify"
        density="compact"
        hide-details
        clearable
        style="max-width: 260px"
        @update:model-value="onSearch"
      />
      <v-btn variant="tonal" prepend-icon="mdi:mdi-folder-plus" @click="openFolderDialog()">
        New Folder
      </v-btn>
      <v-btn color="primary" prepend-icon="mdi:mdi-plus" @click="openPartDialog()">
        New Part
      </v-btn>
      <v-btn icon variant="text" :loading="loading" @click="refresh">
        <v-icon>mdi:mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- ─── Combined table ───────────────────────────────────────────────────── -->
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      item-value="key"
      hover
      :items-per-page="50"
    >
      <!-- Name cell -->
      <template #item.name="{ item }">
        <div class="d-flex align-center ga-2">
          <template v-if="item.type === 'folder'">
            <v-icon color="amber-darken-2">mdi:mdi-folder</v-icon>
            <a
              class="folder-link text-body-2"
              @click.prevent="enterFolder(item.data as PartFolder)"
            >
              {{ item.data.name }}
            </a>
          </template>
          <template v-else>
            <v-chip
              size="x-small"
              variant="tonal"
              :color="fileExtColor((item.data as PrintPart).partFile?.fileExtension)"
            >
              {{ (item.data as PrintPart).partFile?.fileExtension?.toUpperCase() ?? 'NO FILE' }}
            </v-chip>
            <span class="text-body-2">
              {{ item.data.name }}
              <span class="text-medium-emphasis text-caption ml-1">
                — {{ (item.data as PrintPart).externalPartId }}
              </span>
            </span>
          </template>
        </div>
      </template>

      <!-- Profile cell (parts only) -->
      <template #item.printProfile="{ item }">
        <span v-if="item.type === 'part'">
          {{ (item.data as PrintPart).printProfile?.name ?? '—' }}
        </span>
      </template>

      <!-- Filament cell (parts only) -->
      <template #item.filamentProfile="{ item }">
        <template v-if="item.type === 'part'">
          <div v-if="(item.data as PrintPart).filamentProfile" class="d-flex align-center ga-1">
            <div
              v-if="(item.data as PrintPart).filamentProfile?.colorHex"
              class="color-dot"
              :style="{ backgroundColor: (item.data as PrintPart).filamentProfile!.colorHex! }"
            />
            {{ (item.data as PrintPart).filamentProfile!.name }}
          </div>
          <span v-else>—</span>
        </template>
      </template>

      <!-- Constraint cell (parts only) -->
      <template #item.plateConstraint="{ item }">
        <v-chip
          v-if="item.type === 'part'"
          :color="constraintColor((item.data as PrintPart).plateConstraint)"
          size="small"
          variant="tonal"
        >
          {{ (item.data as PrintPart).plateConstraint }}
        </v-chip>
      </template>

      <!-- Est. time (parts only) -->
      <template #item.estimatedPrintMinutes="{ item }">
        <span v-if="item.type === 'part'">
          {{ (item.data as PrintPart).estimatedPrintMinutes != null
            ? `${(item.data as PrintPart).estimatedPrintMinutes} min`
            : '—' }}
        </span>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <div class="d-flex ga-1 justify-end">
          <template v-if="item.type === 'folder'">
            <v-btn icon size="small" variant="text" @click="openFolderDialog(item.data as PartFolder)">
              <v-icon>mdi:mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error"
              @click="confirmDeleteFolder(item.data as PartFolder)">
              <v-icon>mdi:mdi-delete</v-icon>
            </v-btn>
          </template>
          <template v-else>
            <v-btn icon size="small" variant="text" @click="openPartDialog(item.data as PrintPart)">
              <v-icon>mdi:mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error"
              @click="confirmDeletePart(item.data as PrintPart)">
              <v-icon>mdi:mdi-delete</v-icon>
            </v-btn>
          </template>
        </div>
      </template>
    </v-data-table>

    <!-- ─── New / Rename Folder dialog ───────────────────────────────────────── -->
    <v-dialog v-model="folderDialog" max-width="400">
      <v-card>
        <v-card-title class="pt-4 px-6">
          {{ editingFolder ? 'Rename Folder' : 'New Folder' }}
        </v-card-title>
        <v-card-text class="px-6">
          <v-text-field
            v-model="folderName"
            label="Folder name"
            density="compact"
            autofocus
            @keyup.enter="submitFolder"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="folderDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingFolder" :disabled="!folderName.trim()" @click="submitFolder">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── Delete Folder confirm ─────────────────────────────────────────────── -->
    <v-dialog v-model="deleteFolderDialog" max-width="460">
      <v-card>
        <v-card-title>Delete Folder?</v-card-title>
        <v-card-text>
          Delete <strong>{{ deletingFolder?.name }}</strong>?
          All contents will be moved to the parent folder.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteFolderDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deletingFolderLoading" @click="submitDeleteFolder">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── New / Edit Part dialog ────────────────────────────────────────────── -->
    <v-dialog v-model="partDialog" max-width="540">
      <v-card>
        <v-card-title class="pt-4 px-6">{{ editingPart ? 'Edit Part' : 'New Part' }}</v-card-title>
        <v-card-text class="px-6">
          <v-text-field
            v-model="partForm.externalPartId"
            label="External Part ID"
            density="compact"
            :disabled="!!editingPart"
            class="mb-1"
          />
          <v-text-field
            v-model="partForm.name"
            label="Display Name"
            density="compact"
            class="mb-1"
          />

          <!-- File upload -->
          <div class="d-flex align-center ga-2 mb-3">
            <v-btn
              variant="tonal"
              size="small"
              prepend-icon="mdi:mdi-paperclip"
              :loading="uploadingFile"
              @click="triggerFileUpload"
            >
              {{ partForm.partFileId ? 'Replace STL / 3MF' : 'Upload STL / 3MF' }}
            </v-btn>
            <span v-if="uploadedFileName" class="text-body-2 text-truncate" style="max-width: 200px">
              {{ uploadedFileName }}
            </span>
            <span v-else-if="editingPart?.partFile" class="text-body-2 text-medium-emphasis">
              {{ editingPart.partFile.originalFileName }}
            </span>
            <input
              ref="fileInput"
              type="file"
              accept=".stl,.3mf"
              style="display: none"
              @change="onFileSelected"
            />
          </div>

          <v-row>
            <v-col cols="6">
              <v-select
                v-model="partForm.printProfileId"
                label="Print Profile"
                :items="printProfileItems"
                item-value="value"
                item-title="title"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="partForm.filamentProfileId"
                label="Filament Profile"
                :items="filamentProfileItems"
                item-value="value"
                item-title="title"
                density="compact"
                clearable
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="partForm.plateConstraint"
                label="Plate Constraint"
                :items="['REQUIRED', 'PREFERRED', 'FLEXIBLE']"
                density="compact"
              />
            </v-col>
            <v-col cols="3">
              <v-text-field
                v-model.number="partForm.maxPerPlate"
                label="Max / plate"
                type="number"
                density="compact"
              />
            </v-col>
            <v-col cols="3">
              <v-text-field
                v-model.number="partForm.estimatedPrintMinutes"
                label="Est. min"
                type="number"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="partDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingPart"
            :disabled="!partForm.externalPartId || !partForm.name"
            @click="submitPart"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── Delete Part confirm ───────────────────────────────────────────────── -->
    <v-dialog v-model="deletePartDialog" max-width="420">
      <v-card>
        <v-card-title>Delete Part?</v-card-title>
        <v-card-text>
          Delete <strong>{{ deletingPart?.externalPartId }}</strong>? This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deletePartDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deletingPartLoading" @click="submitDeletePart">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── Snackbar ──────────────────────────────────────────────────────────── -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import {
  PartFolderService,
  PartFileService,
  type PartFolder,
} from '@/backend/part-catalog.service'
import {
  PrintPartService,
  PrintProfileService,
  type PrintPart,
  type PlateConstraint,
} from '@/backend/build-order-workflow.service'
import { FilamentService } from '@/backend/filament.service'

// ─── State ────────────────────────────────────────────────────────────────────

const loading = ref(false)
const currentFolderId = ref<number | null>(null)
const breadcrumbs = ref<{ id: number; name: string }[]>([])
const folders = ref<PartFolder[]>([])
const parts = ref<PrintPart[]>([])
const searchQuery = ref('')

// ─── Snackbar ─────────────────────────────────────────────────────────────────

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

function notify(msg: string, color = 'success') {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

// ─── Table ───────────────────────────────────────────────────────────────────

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Print Profile', key: 'printProfile', sortable: false },
  { title: 'Filament', key: 'filamentProfile', sortable: false },
  { title: 'Constraint', key: 'plateConstraint', sortable: false },
  { title: 'Est. Time', key: 'estimatedPrintMinutes', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

type CatalogItem =
  | { type: 'folder'; key: string; data: PartFolder }
  | { type: 'part'; key: string; data: PrintPart }

const items = computed<CatalogItem[]>(() => [
  ...folders.value.map(f => ({ type: 'folder' as const, key: `f-${f.id}`, data: f })),
  ...parts.value.map(p => ({ type: 'part' as const, key: `p-${p.id}`, data: p })),
])

function fileExtColor(ext?: string): string {
  if (ext === '3mf') return 'blue'
  if (ext === 'stl') return 'green'
  return 'grey'
}

function constraintColor(c: PlateConstraint): string {
  return c === 'REQUIRED' ? 'error' : c === 'PREFERRED' ? 'warning' : 'success'
}

// ─── Navigation ───────────────────────────────────────────────────────────────

async function loadFolder(folderId: number | null) {
  loading.value = true
  try {
    const [foldersData, partsData] = await Promise.all([
      PartFolderService.getChildren(folderId),
      PrintPartService.listInFolder(folderId),
    ])
    folders.value = foldersData
    parts.value = partsData
  } catch (_) {
    notify('Failed to load folder contents', 'error')
  } finally {
    loading.value = false
  }
}

async function navigateToFolder(folderId: number | null) {
  searchQuery.value = ''
  currentFolderId.value = folderId
  if (folderId === null) {
    breadcrumbs.value = []
  } else {
    const idx = breadcrumbs.value.findIndex(c => c.id === folderId)
    if (idx !== -1) {
      breadcrumbs.value = breadcrumbs.value.slice(0, idx + 1)
    }
  }
  await loadFolder(folderId)
}

async function enterFolder(folder: PartFolder) {
  searchQuery.value = ''
  currentFolderId.value = folder.id
  breadcrumbs.value = [...breadcrumbs.value, { id: folder.id, name: folder.name }]
  await loadFolder(folder.id)
}

async function onSearch() {
  if (!searchQuery.value.trim()) {
    await loadFolder(currentFolderId.value)
    return
  }
  loading.value = true
  try {
    const results = await PrintPartService.search(searchQuery.value.trim())
    folders.value = []
    parts.value = results
  } catch (_) {
    notify('Search failed', 'error')
  } finally {
    loading.value = false
  }
}

async function refresh() {
  if (searchQuery.value.trim()) {
    await onSearch()
  } else {
    await loadFolder(currentFolderId.value)
  }
}

// ─── Folder CRUD ──────────────────────────────────────────────────────────────

const folderDialog = ref(false)
const folderName = ref('')
const savingFolder = ref(false)
const editingFolder = ref<PartFolder | null>(null)

function openFolderDialog(folder?: PartFolder) {
  editingFolder.value = folder ?? null
  folderName.value = folder?.name ?? ''
  folderDialog.value = true
}

async function submitFolder() {
  if (!folderName.value.trim()) return
  savingFolder.value = true
  try {
    if (editingFolder.value) {
      await PartFolderService.rename(editingFolder.value.id, folderName.value.trim())
      notify('Folder renamed')
    } else {
      await PartFolderService.create(folderName.value.trim(), currentFolderId.value)
      notify('Folder created')
    }
    folderDialog.value = false
    await loadFolder(currentFolderId.value)
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to save folder', 'error')
  } finally {
    savingFolder.value = false
  }
}

const deleteFolderDialog = ref(false)
const deletingFolder = ref<PartFolder | null>(null)
const deletingFolderLoading = ref(false)

function confirmDeleteFolder(folder: PartFolder) {
  deletingFolder.value = folder
  deleteFolderDialog.value = true
}

async function submitDeleteFolder() {
  if (!deletingFolder.value) return
  deletingFolderLoading.value = true
  try {
    await PartFolderService.delete(deletingFolder.value.id)
    notify('Folder deleted')
    deleteFolderDialog.value = false
    await loadFolder(currentFolderId.value)
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to delete folder', 'error')
  } finally {
    deletingFolderLoading.value = false
  }
}

// ─── Part CRUD ────────────────────────────────────────────────────────────────

const partDialog = ref(false)
const savingPart = ref(false)
const editingPart = ref<PrintPart | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadedFileName = ref<string | null>(null)
const uploadingFile = ref(false)

const partForm = ref<{
  externalPartId: string
  name: string
  partFileId: string | null
  printProfileId: number | null
  filamentProfileId: number | null
  plateConstraint: PlateConstraint
  maxPerPlate: number
  estimatedPrintMinutes: number | null
}>({
  externalPartId: '',
  name: '',
  partFileId: null,
  printProfileId: null,
  filamentProfileId: null,
  plateConstraint: 'FLEXIBLE',
  maxPerPlate: 4,
  estimatedPrintMinutes: null,
})

function openPartDialog(part?: PrintPart) {
  editingPart.value = part ?? null
  uploadedFileName.value = null
  partForm.value = part
    ? {
        externalPartId: part.externalPartId,
        name: part.name,
        partFileId: part.partFileId,
        printProfileId: part.printProfileId,
        filamentProfileId: part.filamentProfileId,
        plateConstraint: part.plateConstraint,
        maxPerPlate: part.maxPerPlate,
        estimatedPrintMinutes: part.estimatedPrintMinutes,
      }
    : {
        externalPartId: '',
        name: '',
        partFileId: null,
        printProfileId: null,
        filamentProfileId: null,
        plateConstraint: 'FLEXIBLE',
        maxPerPlate: 4,
        estimatedPrintMinutes: null,
      }
  partDialog.value = true
}

function triggerFileUpload() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingFile.value = true
  try {
    const result = await PartFileService.upload(file)
    partForm.value.partFileId = result.id
    uploadedFileName.value = result.originalFileName
    if (!partForm.value.name) {
      partForm.value.name = result.originalFileName.replace(/\.(stl|3mf)$/i, '')
    }
  } catch (err: any) {
    notify(err?.response?.data?.error ?? 'Failed to upload file', 'error')
  } finally {
    uploadingFile.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function submitPart() {
  savingPart.value = true
  try {
    if (editingPart.value) {
      const updated = await PrintPartService.update(editingPart.value.id, {
        name: partForm.value.name,
        partFileId: partForm.value.partFileId,
        printProfileId: partForm.value.printProfileId,
        filamentProfileId: partForm.value.filamentProfileId,
        plateConstraint: partForm.value.plateConstraint,
        maxPerPlate: partForm.value.maxPerPlate,
        estimatedPrintMinutes: partForm.value.estimatedPrintMinutes,
      })
      const idx = parts.value.findIndex(p => p.id === editingPart.value!.id)
      if (idx !== -1) parts.value[idx] = updated
      notify('Part updated')
    } else {
      const created = await PrintPartService.create({
        externalPartId: partForm.value.externalPartId,
        name: partForm.value.name,
        partFileId: partForm.value.partFileId,
        folderId: currentFolderId.value,
        printProfileId: partForm.value.printProfileId,
        filamentProfileId: partForm.value.filamentProfileId,
        plateConstraint: partForm.value.plateConstraint,
        maxPerPlate: partForm.value.maxPerPlate,
        estimatedPrintMinutes: partForm.value.estimatedPrintMinutes,
      })
      parts.value.push(created)
      notify('Part created')
    }
    partDialog.value = false
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to save part', 'error')
  } finally {
    savingPart.value = false
  }
}

const deletePartDialog = ref(false)
const deletingPart = ref<PrintPart | null>(null)
const deletingPartLoading = ref(false)

function confirmDeletePart(part: PrintPart) {
  deletingPart.value = part
  deletePartDialog.value = true
}

async function submitDeletePart() {
  if (!deletingPart.value) return
  deletingPartLoading.value = true
  try {
    await PrintPartService.remove(deletingPart.value.id)
    parts.value = parts.value.filter(p => p.id !== deletingPart.value!.id)
    notify('Part deleted')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to delete part', 'error')
  } finally {
    deletingPartLoading.value = false
    deletePartDialog.value = false
  }
}

// ─── Profile dropdowns ────────────────────────────────────────────────────────

const printProfiles = ref<{ id: number; name: string }[]>([])
const filamentProfiles = ref<{ id: number; name: string }[]>([])

const printProfileItems = computed(() =>
  printProfiles.value.map(p => ({ value: p.id, title: p.name }))
)
const filamentProfileItems = computed(() =>
  filamentProfiles.value.map(p => ({ value: p.id, title: p.name }))
)

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadFolder(null)
  try {
    const [pp, fp] = await Promise.all([PrintProfileService.list(), FilamentService.listPresets()])
    printProfiles.value = pp
    filamentProfiles.value = fp
  } catch (_) {
    // non-critical
  }
})
</script>

<style scoped>
.folder-link {
  cursor: pointer;
  color: inherit;
  text-decoration: none;
  font-weight: 500;
}
.folder-link:hover {
  text-decoration: underline;
}
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}
</style>
