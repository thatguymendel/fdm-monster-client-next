<template>
  <v-card>
    <v-card-text>
      <div class="d-flex align-center mb-2">
        <h2 class="text-h6">Filament</h2>
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi:mdi-plus" @click="openDialog()">Add</v-btn>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Filament entries are shared between the spool-loading workflow and the plate optimizer.
        Add a <strong>Slicer Profile Path</strong> to enable auto-slicing for that filament.
      </p>

      <v-data-table
        :headers="headers"
        :items="presets"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.color="{ item }">
          <div class="d-flex align-center ga-2">
            <div v-if="item.colorHex" class="color-swatch" :style="{ backgroundColor: item.colorHex }" />
            <span class="text-capitalize">{{ item.colorName }}</span>
          </div>
        </template>

        <template #item.material="{ item }">
          <v-chip size="small" variant="tonal">{{ item.material.toUpperCase() }}</v-chip>
        </template>

        <template #item.filamentProfilePath="{ item }">
          <v-icon v-if="item.filamentProfilePath" color="success" size="small">check_circle</v-icon>
          <v-icon v-else color="grey" size="small">radio_button_unchecked</v-icon>
        </template>

        <template #item.defaultWeightGrams="{ item }">
          {{ item.defaultWeightGrams ? `${item.defaultWeightGrams}g` : '—' }}
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <v-btn icon size="small" variant="text" @click="openDialog(item)">
              <v-icon>mdi:mdi-pencil</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error" @click="confirmDelete(item)">
              <v-icon>mdi:mdi-delete</v-icon>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card-text>

    <!-- Add / Edit Dialog -->
    <v-dialog v-model="dialog" max-width="520">
      <v-card>
        <v-card-title class="pt-4 px-6">{{ editing ? 'Edit Filament' : 'Add Filament' }}</v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="form.name" label="Name (e.g. Hatchbox PLA Black)" density="compact" class="mb-1" />

          <v-row>
            <v-col cols="6">
              <v-select
                v-model="form.material"
                label="Material"
                :items="['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PA', 'PC', 'OTHER']"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.colorName" label="Color name (e.g. black)" density="compact" />
            </v-col>
          </v-row>

          <div class="d-flex align-center ga-2 mb-2">
            <div class="color-picker-wrapper">
              <div class="color-picker-btn" :style="{ backgroundColor: form.colorHex || '#aaaaaa' }" />
              <input
                type="color"
                :value="form.colorHex || '#aaaaaa'"
                class="color-picker-input"
                @input="(e) => form.colorHex = (e.target as HTMLInputElement).value"
              />
            </div>
            <v-text-field v-model="form.colorHex" label="Color hex" hide-details density="compact" />
          </div>

          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.brand" label="Brand (optional)" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.defaultWeightGrams"
                label="Default spool weight (g)"
                type="number"
                density="compact"
              />
            </v-col>
          </v-row>

          <v-divider class="my-3" />
          <div class="text-caption text-medium-emphasis mb-2">
            SLICER INTEGRATION (optional)
          </div>
          <div class="text-body-2 text-medium-emphasis mb-2">Filament profile (.json)</div>
          <ProfileFileUpload
            :path="form.filamentProfilePath"
            type="filament"
            @uploaded="form.filamentProfilePath = $event"
            @error="notify($event, 'error')"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!form.name || !form.material || !form.colorName"
            @click="save"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirm -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card>
        <v-card-title>Delete Filament?</v-card-title>
        <v-card-text>Delete <strong>{{ deletingItem?.name }}</strong>? This cannot be undone.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="submitDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarMsg }}</v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FilamentService, type FilamentPreset } from '@/backend/filament.service'
import ProfileFileUpload from '@/components/Settings/ProfileFileUpload.vue'

const presets = ref<FilamentPreset[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const deleteDialog = ref(false)
const deleting = ref(false)
const editing = ref<FilamentPreset | null>(null)
const deletingItem = ref<FilamentPreset | null>(null)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Material', key: 'material' },
  { title: 'Color', key: 'color' },
  { title: 'Default Weight', key: 'defaultWeightGrams' },
  { title: 'Slicer Profile', key: 'filamentProfilePath', width: 120 },
  { title: 'Actions', key: 'actions', sortable: false, width: 100 },
]

const form = ref({
  name: '',
  material: 'PLA',
  colorName: '',
  colorHex: null as string | null,
  brand: null as string | null,
  defaultWeightGrams: null as number | null,
  filamentProfilePath: null as string | null,
})

function notify(msg: string, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function load() {
  loading.value = true
  try {
    presets.value = await FilamentService.listPresets()
  } catch (_) {
    notify('Failed to load filaments', 'error')
  } finally {
    loading.value = false
  }
}

function openDialog(preset?: FilamentPreset) {
  editing.value = preset ?? null
  form.value = preset
    ? {
        name: preset.name,
        material: preset.material.toUpperCase(),
        colorName: preset.colorName,
        colorHex: preset.colorHex,
        brand: preset.brand,
        defaultWeightGrams: preset.defaultWeightGrams,
        filamentProfilePath: preset.filamentProfilePath ?? null,
      }
    : { name: '', material: 'PLA', colorName: '', colorHex: null, brand: null, defaultWeightGrams: null, filamentProfilePath: null }
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    const dto = {
      name: form.value.name,
      material: form.value.material,
      colorName: form.value.colorName,
      colorHex: form.value.colorHex || null,
      brand: form.value.brand || null,
      defaultWeightGrams: form.value.defaultWeightGrams,
      filamentProfilePath: form.value.filamentProfilePath || null,
    }

    if (editing.value) {
      const updated = await FilamentService.updatePreset(editing.value.id, dto)
      const idx = presets.value.findIndex(p => p.id === editing.value!.id)
      if (idx !== -1) presets.value[idx] = updated
      notify('Filament updated')
    } else {
      const created = await FilamentService.createPreset(dto as any)
      presets.value.push(created)
      notify('Filament created')
    }
    dialog.value = false
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(preset: FilamentPreset) {
  deletingItem.value = preset
  deleteDialog.value = true
}

async function submitDelete() {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await FilamentService.deletePreset(deletingItem.value.id)
    presets.value = presets.value.filter(p => p.id !== deletingItem.value!.id)
    notify('Filament deleted')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to delete', 'error')
  } finally {
    deleting.value = false
    deleteDialog.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.color-picker-wrapper {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.color-picker-btn {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.color-picker-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
</style>
