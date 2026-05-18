<template>
  <v-card>
    <v-card-text>
      <div class="d-flex align-center mb-4">
        <h2 class="text-h6">Filament Profiles</h2>
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi:mdi-plus" @click="openDialog()">Add Profile</v-btn>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Filament profiles map to OrcaSlicer filament settings files and define the material and
        color used when slicing plates.
      </p>

      <v-data-table
        :headers="headers"
        :items="profiles"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.color="{ item }">
          <div class="d-flex align-center ga-2">
            <div
              v-if="item.colorHex"
              class="color-swatch"
              :style="{ backgroundColor: item.colorHex }"
            />
            <span class="text-capitalize">{{ item.colorName }}</span>
          </div>
        </template>

        <template #item.material="{ item }">
          <v-chip size="small" variant="tonal">{{ item.material.toUpperCase() }}</v-chip>
        </template>

        <template #item.active="{ item }">
          <v-icon :color="item.active ? 'success' : 'grey'" size="small">
            {{ item.active ? 'check_circle' : 'cancel' }}
          </v-icon>
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
    <v-dialog v-model="dialog" max-width="480">
      <v-card>
        <v-card-title class="pt-4 px-6">{{ editing ? 'Edit Profile' : 'Add Filament Profile' }}</v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="form.name" label="Name" density="compact" class="mb-1" />
          <v-text-field
            v-model="form.filamentProfilePath"
            label="Filament profile path (.json)"
            density="compact"
            hint="Path to OrcaSlicer filament settings JSON"
            persistent-hint
            class="mb-2"
          />
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
          <div class="d-flex align-center ga-2 mb-1">
            <div class="color-picker-wrapper">
              <div class="color-picker-btn" :style="{ backgroundColor: form.colorHex || '#aaaaaa' }" />
              <input
                type="color"
                :value="form.colorHex || '#aaaaaa'"
                class="color-picker-input"
                @input="(e) => form.colorHex = (e.target as HTMLInputElement).value"
              />
            </div>
            <v-text-field
              v-model="form.colorHex"
              label="Color hex (e.g. #1a1a1a)"
              hide-details
              density="compact"
            />
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!form.name || !form.filamentProfilePath || !form.material || !form.colorName"
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
        <v-card-title>Delete Profile?</v-card-title>
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
import { FilamentProfileService, type FilamentProfile, type CreateFilamentProfileDto } from '@/backend/build-order-workflow.service'

const profiles = ref<FilamentProfile[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const deleteDialog = ref(false)
const deleting = ref(false)
const editing = ref<FilamentProfile | null>(null)
const deletingItem = ref<FilamentProfile | null>(null)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Material', key: 'material' },
  { title: 'Color', key: 'color' },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Actions', key: 'actions', sortable: false, width: 100 },
]

const form = ref<CreateFilamentProfileDto>({
  name: '',
  filamentProfilePath: '',
  material: 'PLA',
  colorName: '',
  colorHex: null,
})

function notify(msg: string, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function load() {
  loading.value = true
  try {
    profiles.value = await FilamentProfileService.list()
  } catch (_) {
    notify('Failed to load profiles', 'error')
  } finally {
    loading.value = false
  }
}

function openDialog(profile?: FilamentProfile) {
  editing.value = profile ?? null
  form.value = profile
    ? {
        name: profile.name,
        filamentProfilePath: profile.filamentProfilePath,
        material: profile.material,
        colorName: profile.colorName,
        colorHex: profile.colorHex,
      }
    : { name: '', filamentProfilePath: '', material: 'PLA', colorName: '', colorHex: null }
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      const updated = await FilamentProfileService.update(editing.value.id, form.value)
      const idx = profiles.value.findIndex(p => p.id === editing.value!.id)
      if (idx !== -1) profiles.value[idx] = updated
      notify('Profile updated')
    } else {
      const created = await FilamentProfileService.create(form.value)
      profiles.value.push(created)
      notify('Profile created')
    }
    dialog.value = false
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(profile: FilamentProfile) {
  deletingItem.value = profile
  deleteDialog.value = true
}

async function submitDelete() {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await FilamentProfileService.remove(deletingItem.value.id)
    profiles.value = profiles.value.filter(p => p.id !== deletingItem.value!.id)
    notify('Profile deleted')
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
