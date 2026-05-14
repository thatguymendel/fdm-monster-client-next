<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Filament Manager</h1>
    </div>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="spools">Spools ({{ spools.length }})</v-tab>
      <v-tab value="assignments">Printer Assignments</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- SPOOLS TAB -->
      <v-window-item value="spools">
        <v-btn color="primary" prepend-icon="mdi:mdi-plus" class="mb-3" @click="openCreateDialog">
          Add Spool
        </v-btn>

        <v-data-table
          :headers="spoolHeaders"
          :items="spools"
          :loading="loading"
          item-value="id"
          hover
        >
          <template #item.colorName="{ item }">
            <div class="d-flex align-center ga-2">
              <div
                class="color-swatch"
                :style="{ backgroundColor: item.colorHex || '#999' }"
              />
              <span class="text-capitalize">{{ item.colorName }}</span>
            </div>
          </template>

          <template #item.material="{ item }">
            <v-chip size="small" variant="tonal">{{ item.material.toUpperCase() }}</v-chip>
          </template>

          <template #item.weight="{ item }">
            <span>{{ item.remainingWeightGrams ?? '?' }}g</span>
            <span class="text-grey"> / {{ item.totalWeightGrams ?? '?' }}g</span>
          </template>

          <template #item.actions="{ item }">
            <v-btn icon size="small" variant="text" @click="openEditDialog(item)">
              <v-icon>mdi:mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error" @click="confirmDelete(item)">
              <v-icon>mdi:mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-window-item>

      <!-- ASSIGNMENTS TAB -->
      <v-window-item value="assignments">
        <v-data-table
          :headers="assignmentHeaders"
          :items="assignmentsWithPrinterNames"
          :loading="loadingAssignments"
          item-value="id"
          hover
        >
          <template #item.spool="{ item }">
            <div v-if="item.spool" class="d-flex align-center ga-2">
              <div
                class="color-swatch"
                :style="{ backgroundColor: item.spool.colorHex || '#999' }"
              />
              <div>
                <div>{{ item.spool.name }}</div>
                <div class="text-caption text-grey">
                  {{ item.spool.material.toUpperCase() }} · {{ item.spool.colorName }}
                </div>
              </div>
            </div>
            <span v-else class="text-grey text-caption">None assigned</span>
          </template>

          <template #item.actions="{ item }">
            <v-btn size="small" variant="tonal" @click="openReassignDialog(item)">
              Change
            </v-btn>
          </template>
        </v-data-table>
      </v-window-item>
    </v-window>

    <!-- Add / Edit Spool Dialog -->
    <v-dialog v-model="spoolDialog" max-width="520">
      <v-card>
        <v-card-title class="pt-4 px-6">
          {{ editingSpool ? 'Edit Spool' : 'Add Spool' }}
        </v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="form.name" label="Name" required class="mb-1" />
          <v-text-field v-model="form.brand" label="Brand" class="mb-1" />
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="form.material"
                label="Material"
                :items="['pla', 'petg', 'abs', 'tpu', 'asa', 'pa', 'pc', 'other']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.colorName" label="Color Name (lowercase)" required />
            </v-col>
          </v-row>
          <v-text-field v-model="form.colorHex" label="Color Hex (e.g. #FF5500)" class="mb-1" />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.totalWeightGrams"
                label="Total Weight (g)"
                type="number"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.remainingWeightGrams"
                label="Remaining Weight (g)"
                type="number"
              />
            </v-col>
          </v-row>
          <v-textarea v-model="form.notes" label="Notes" rows="2" />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="spoolDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveSpool">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reassign Dialog -->
    <v-dialog v-model="reassignDialog" max-width="420">
      <v-card>
        <v-card-title class="pt-4 px-6">
          Assign Spool — {{ reassigningName }}
        </v-card-title>
        <v-card-text class="px-6">
          <v-select
            v-model="selectedSpoolId"
            label="Select Spool"
            :items="spoolSelectItems"
            item-title="label"
            item-value="id"
            clearable
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-btn color="error" variant="tonal" :loading="saving" @click="doUnassign">
            Unassign
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="reassignDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!selectedSpoolId" @click="doReassign">
            Assign
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirm Dialog -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card>
        <v-card-title class="pt-4 px-6">Delete Spool?</v-card-title>
        <v-card-text class="px-6">
          Delete <strong>{{ deletingSpool?.name }}</strong>? This cannot be undone.
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="saving" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { FilamentService, type FilamentSpool, type FilamentAssignment } from '@/backend/filament.service'

// ── State ──────────────────────────────────────────────────────────────────
const tab = ref('spools')
const loading = ref(false)
const loadingAssignments = ref(false)
const saving = ref(false)

const spools = ref<FilamentSpool[]>([])
const assignments = ref<FilamentAssignment[]>([])
const printerList = ref<{ id: number; name: string }[]>([])
const printerNames = ref<Record<number, string>>({})

// Dialogs
const spoolDialog = ref(false)
const deleteDialog = ref(false)
const reassignDialog = ref(false)

const editingSpool = ref<FilamentSpool | null>(null)
const deletingSpool = ref<FilamentSpool | null>(null)
const reassigningAssignment = ref<FilamentAssignment | null>(null)
const selectedSpoolId = ref<number | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const emptyForm = () => ({
  name: '',
  brand: '',
  material: 'pla',
  colorName: '',
  colorHex: '',
  totalWeightGrams: 1000,
  remainingWeightGrams: 1000,
  notes: '',
})
const form = ref(emptyForm())

// ── Table headers ──────────────────────────────────────────────────────────
const spoolHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Brand', key: 'brand' },
  { title: 'Material', key: 'material' },
  { title: 'Color', key: 'colorName' },
  { title: 'Weight', key: 'weight', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

const assignmentHeaders = [
  { title: 'Printer', key: 'printerName' },
  { title: 'Loaded Spool', key: 'spool', sortable: false },
  { title: 'Tool', key: 'toolIndex' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

// ── Computed ───────────────────────────────────────────────────────────────
const assignmentsWithPrinterNames = computed(() => {
  const result = assignments.value.map((a) => ({
    ...a,
    printerName: printerNames.value[a.printerId] ?? `Printer ${a.printerId}`,
  }))
  const assignedIds = new Set(assignments.value.map((a) => a.printerId))
  for (const p of printerList.value) {
    if (!assignedIds.has(p.id)) {
      result.push({ id: 0, printerId: p.id, spoolId: null, spool: null, toolIndex: 0, printerName: p.name })
    }
  }
  return result.sort((a, b) => a.printerName.localeCompare(b.printerName))
})

const spoolSelectItems = computed(() =>
  spools.value.map((s) => ({
    id: s.id,
    label: `${s.name} — ${s.material.toUpperCase()} ${s.colorName}`,
  }))
)

const reassigningName = computed(() => {
  if (!reassigningAssignment.value) return ''
  return printerNames.value[reassigningAssignment.value.printerId] ?? `Printer ${reassigningAssignment.value.printerId}`
})

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchSpools() {
  loading.value = true
  try {
    spools.value = await FilamentService.listSpools()
  } finally {
    loading.value = false
  }
}

async function fetchAssignments() {
  loadingAssignments.value = true
  try {
    assignments.value = await FilamentService.listAssignments()
  } finally {
    loadingAssignments.value = false
  }
}

async function fetchPrinterNames() {
  try {
    const { data } = await (await import('@/shared/http-client')).getHttpClient().then((c) =>
      c.get<{ id: number; name: string }[]>('/api/v2/printer')
    )
    printerList.value = data
    printerNames.value = Object.fromEntries(data.map((p) => [p.id, p.name]))
  } catch {
    // Silently fail — assignments tab degrades gracefully
  }
}

onMounted(() => {
  fetchSpools()
  fetchAssignments()
  fetchPrinterNames()
})

// ── Spool CRUD ─────────────────────────────────────────────────────────────
function openCreateDialog() {
  editingSpool.value = null
  form.value = emptyForm()
  spoolDialog.value = true
}

function openEditDialog(spool: FilamentSpool) {
  editingSpool.value = spool
  form.value = {
    name: spool.name,
    brand: spool.brand ?? '',
    material: spool.material,
    colorName: spool.colorName,
    colorHex: spool.colorHex ?? '',
    totalWeightGrams: spool.totalWeightGrams ?? 1000,
    remainingWeightGrams: spool.remainingWeightGrams ?? 1000,
    notes: spool.notes ?? '',
  }
  spoolDialog.value = true
}

async function saveSpool() {
  saving.value = true
  try {
    const dto = {
      ...form.value,
      brand: form.value.brand || null,
      colorHex: form.value.colorHex || null,
      notes: form.value.notes || null,
    }
    if (editingSpool.value) {
      await FilamentService.updateSpool(editingSpool.value.id, dto)
      notify('Spool updated')
    } else {
      await FilamentService.createSpool(dto)
      notify('Spool created')
    }
    spoolDialog.value = false
    await fetchSpools()
  } catch {
    notify('Failed to save spool', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(spool: FilamentSpool) {
  deletingSpool.value = spool
  deleteDialog.value = true
}

async function doDelete() {
  if (!deletingSpool.value) return
  saving.value = true
  try {
    await FilamentService.deleteSpool(deletingSpool.value.id)
    notify('Spool deleted')
    deleteDialog.value = false
    await fetchSpools()
  } catch {
    notify('Failed to delete spool', 'error')
  } finally {
    saving.value = false
  }
}

// ── Assignment ─────────────────────────────────────────────────────────────
function openReassignDialog(assignment: FilamentAssignment) {
  reassigningAssignment.value = assignment
  selectedSpoolId.value = assignment.spoolId
  reassignDialog.value = true
}

async function doReassign() {
  if (!reassigningAssignment.value || !selectedSpoolId.value) return
  saving.value = true
  try {
    await FilamentService.assignSpool(
      reassigningAssignment.value.printerId,
      selectedSpoolId.value,
      reassigningAssignment.value.toolIndex
    )
    notify('Spool assigned')
    reassignDialog.value = false
    await fetchAssignments()
  } catch {
    notify('Failed to assign spool', 'error')
  } finally {
    saving.value = false
  }
}

async function doUnassign() {
  if (!reassigningAssignment.value) return
  saving.value = true
  try {
    await FilamentService.unassignSpool(
      reassigningAssignment.value.printerId,
      reassigningAssignment.value.toolIndex
    )
    notify('Spool unassigned')
    reassignDialog.value = false
    await fetchAssignments()
  } catch {
    notify('Failed to unassign spool', 'error')
  } finally {
    saving.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function notify(text: string, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}
</style>
