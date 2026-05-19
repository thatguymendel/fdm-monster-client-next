<template>
  <v-card>
    <v-card-text>
      <div class="d-flex align-center mb-4">
        <h2 class="text-h6">Print Profiles</h2>
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi:mdi-plus" @click="openDialog()">Add Profile</v-btn>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Print profiles map to OrcaSlicer process + printer profile files and define the nozzle and
        bed configuration used when slicing a plate.
      </p>

      <v-data-table
        :headers="headers"
        :items="profiles"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.active="{ item }">
          <v-icon :color="item.active ? 'success' : 'grey'" size="small">
            {{ item.active ? 'check_circle' : 'cancel' }}
          </v-icon>
        </template>

        <template #item.nozzle="{ item }">
          {{ item.nozzleType }} {{ item.nozzleDiameterMm ? `${item.nozzleDiameterMm}mm` : '' }}
        </template>

        <template #item.bed="{ item }">
          {{ item.bedWidthMm && item.bedDepthMm ? `${item.bedWidthMm}×${item.bedDepthMm}mm` : '—' }}
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
    <v-dialog v-model="dialog" max-width="560">
      <v-card>
        <v-card-title class="pt-4 px-6">{{ editing ? 'Edit Profile' : 'Add Print Profile' }}</v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="form.name" label="Name" density="compact" class="mb-3" />

          <v-select
            v-model="form.slicerType"
            label="Slicer"
            :items="[{ title: 'OrcaSlicer', value: 'orca' }, { title: 'PrusaSlicer', value: 'prusa' }]"
            density="compact"
            class="mb-3"
          />

          <div class="text-caption text-medium-emphasis mb-1">
            {{ form.slicerType === 'prusa' ? 'COMBINED CONFIG (.ini — print + printer settings)' : 'PROCESS PROFILE (.json)' }}
          </div>
          <ProfileFileUpload
            :path="form.processProfilePath"
            type="process"
            class="mb-3"
            @uploaded="form.processProfilePath = $event"
          />

          <template v-if="form.slicerType !== 'prusa'">
            <div class="text-caption text-medium-emphasis mb-1">PRINTER PROFILE (.json)</div>
            <ProfileFileUpload
              :path="form.printerProfilePath ?? undefined"
              type="machine"
              class="mb-3"
              @uploaded="form.printerProfilePath = $event"
            />
          </template>

          <v-divider class="mb-3" />
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.nozzleType" label="Nozzle type" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.nozzleDiameterMm"
                label="Nozzle diameter (mm)"
                type="number"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.bedWidthMm"
                label="Bed width (mm)"
                type="number"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="form.bedDepthMm"
                label="Bed depth (mm)"
                type="number"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!form.name || !form.processProfilePath || (form.slicerType !== 'prusa' && !form.printerProfilePath)"
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
import { PrintProfileService, type PrintProfile, type CreatePrintProfileDto } from '@/backend/build-order-workflow.service'
import ProfileFileUpload from '@/components/Settings/ProfileFileUpload.vue'

const profiles = ref<PrintProfile[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const deleteDialog = ref(false)
const deleting = ref(false)
const editing = ref<PrintProfile | null>(null)
const deletingItem = ref<PrintProfile | null>(null)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Nozzle', key: 'nozzle' },
  { title: 'Bed', key: 'bed' },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Actions', key: 'actions', sortable: false, width: 100 },
]

const form = ref<CreatePrintProfileDto>({
  name: '',
  slicerType: 'orca',
  processProfilePath: '',
  printerProfilePath: '',
  nozzleType: '',
  nozzleDiameterMm: undefined,
  bedWidthMm: undefined,
  bedDepthMm: undefined,
})

function notify(msg: string, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function load() {
  loading.value = true
  try {
    profiles.value = await PrintProfileService.list()
  } catch (_) {
    notify('Failed to load profiles', 'error')
  } finally {
    loading.value = false
  }
}

function openDialog(profile?: PrintProfile) {
  editing.value = profile ?? null
  form.value = profile
    ? {
        name: profile.name,
        slicerType: profile.slicerType ?? 'orca',
        processProfilePath: profile.processProfilePath,
        printerProfilePath: profile.printerProfilePath,
        nozzleType: profile.nozzleType,
        nozzleDiameterMm: profile.nozzleDiameterMm,
        bedWidthMm: profile.bedWidthMm,
        bedDepthMm: profile.bedDepthMm,
      }
    : { name: '', slicerType: 'orca', processProfilePath: '', printerProfilePath: '', nozzleType: '', nozzleDiameterMm: undefined, bedWidthMm: undefined, bedDepthMm: undefined }
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    const dto = {
      ...form.value,
      printerProfilePath: form.value.slicerType === 'prusa' ? null : form.value.printerProfilePath,
    }
    if (editing.value) {
      const updated = await PrintProfileService.update(editing.value.id, dto)
      const idx = profiles.value.findIndex(p => p.id === editing.value!.id)
      if (idx !== -1) profiles.value[idx] = updated
      notify('Profile updated')
    } else {
      const created = await PrintProfileService.create(dto)
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

function confirmDelete(profile: PrintProfile) {
  deletingItem.value = profile
  deleteDialog.value = true
}

async function submitDelete() {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await PrintProfileService.remove(deletingItem.value.id)
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
