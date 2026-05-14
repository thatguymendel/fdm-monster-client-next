<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h6">Filament Presets</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi:mdi-plus" @click="openDialog">Add Preset</v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Presets are saved filament templates. When loading a spool on a printer, pick a preset to auto-fill the form.
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
          <div class="color-swatch" :style="{ backgroundColor: item.colorHex || '#aaa' }" />
          <span class="text-capitalize">{{ item.colorName }}</span>
        </div>
      </template>

      <template #item.material="{ item }">
        <v-chip size="small" variant="tonal">{{ item.material.toUpperCase() }}</v-chip>
      </template>

      <template #item.defaultWeightGrams="{ item }">
        {{ item.defaultWeightGrams ? `${item.defaultWeightGrams}g` : '—' }}
      </template>

      <template #item.actions="{ item }">
        <v-btn icon size="small" variant="text" color="error" @click="confirmDelete(item)">
          <v-icon>mdi:mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>

    <!-- Add Preset Dialog -->
    <v-dialog v-model="dialog" max-width="460">
      <v-card>
        <v-card-title class="pt-4 px-6">Add Filament Preset</v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="form.name" label="Name (e.g. Hatchbox PLA Tan)" required class="mb-1" />
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="form.material"
                label="Material"
                :items="['pla', 'petg', 'abs', 'tpu', 'asa', 'pa', 'pc', 'other']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.colorName" label="Color (e.g. tan)" />
            </v-col>
          </v-row>
          <v-text-field v-model="form.colorHex" label="Color hex (e.g. #C4A35A)" class="mb-1">
            <template #prepend-inner>
              <div class="color-picker-wrapper">
                <div class="color-picker-btn" :style="{ backgroundColor: form.colorHex || '#aaaaaa' }" />
                <input
                  type="color"
                  :value="form.colorHex || '#aaaaaa'"
                  class="color-picker-input"
                  @input="(e) => form.colorHex = (e.target as HTMLInputElement).value"
                />
              </div>
            </template>
          </v-text-field>
          <v-text-field
            v-model.number="form.defaultWeightGrams"
            label="Default spool weight (g)"
            type="number"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!form.name || !form.colorName" @click="save">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirm -->
    <v-dialog v-model="deleteDialog" max-width="360">
      <v-card>
        <v-card-title class="pt-4 px-6">Delete Preset?</v-card-title>
        <v-card-text class="px-6">Delete <strong>{{ deletingPreset?.name }}</strong>?</v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="saving" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { FilamentService, type FilamentPreset } from '@/backend/filament.service'

const loading = ref(false)
const saving = ref(false)
const presets = ref<FilamentPreset[]>([])
const dialog = ref(false)
const deleteDialog = ref(false)
const deletingPreset = ref<FilamentPreset | null>(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const emptyForm = () => ({ name: '', material: 'pla', colorName: '', colorHex: '', defaultWeightGrams: 1000 })
const form = ref(emptyForm())

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Material', key: 'material' },
  { title: 'Color', key: 'color', sortable: false },
  { title: 'Default Weight', key: 'defaultWeightGrams' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

async function fetchPresets() {
  loading.value = true
  try {
    presets.value = await FilamentService.listPresets()
  } finally {
    loading.value = false
  }
}

onMounted(fetchPresets)

function openDialog() {
  form.value = emptyForm()
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    await FilamentService.createPreset({
      name: form.value.name,
      brand: null,
      material: form.value.material,
      colorName: form.value.colorName,
      colorHex: form.value.colorHex || null,
      defaultWeightGrams: form.value.defaultWeightGrams,
    })
    notify('Preset saved')
    dialog.value = false
    await fetchPresets()
  } catch {
    notify('Failed to save preset', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(preset: FilamentPreset) {
  deletingPreset.value = preset
  deleteDialog.value = true
}

async function doDelete() {
  if (!deletingPreset.value) return
  saving.value = true
  try {
    await FilamentService.deletePreset(deletingPreset.value.id)
    notify('Preset deleted')
    deleteDialog.value = false
    await fetchPresets()
  } catch {
    notify('Failed to delete', 'error')
  } finally {
    saving.value = false
  }
}

function notify(text: string, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.2);
  flex-shrink: 0;
}

.color-picker-wrapper {
  position: relative;
  width: 20px;
  height: 20px;
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
