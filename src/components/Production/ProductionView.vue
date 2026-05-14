<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Production</h1>
      <v-spacer />
      <v-btn
        variant="tonal"
        prepend-icon="mdi:mdi-play"
        :loading="triggering"
        @click="triggerDispatch"
      >
        Trigger Dispatch
      </v-btn>
    </div>

    <!-- Dispatch status cards -->
    <v-row class="mb-2">
      <v-col cols="4">
        <v-card variant="tonal" color="orange">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-uppercase">Queued</div>
              <div class="text-h4 font-weight-bold">{{ dispatchStatus.queued }}</div>
            </div>
            <v-icon size="36">mdi:mdi-clock-outline</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="4">
        <v-card variant="tonal" color="green">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-uppercase">Printing</div>
              <div class="text-h4 font-weight-bold">{{ dispatchStatus.printing }}</div>
            </div>
            <v-icon size="36">mdi:mdi-printer</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="4">
        <v-card variant="tonal" color="error">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-uppercase">Dispatch Failed</div>
              <div class="text-h4 font-weight-bold">{{ dispatchStatus.dispatchFailed }}</div>
            </div>
            <v-icon size="36">mdi:mdi-alert-circle-outline</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="requests">Build Requests</v-tab>
      <v-tab value="skus">SKU Catalog</v-tab>
    </v-tabs>

    <v-window v-model="tab">

      <!-- BUILD REQUESTS TAB -->
      <v-window-item value="requests">
        <div class="d-flex align-center ga-2 mb-3">
          <v-btn color="primary" prepend-icon="mdi:mdi-plus" @click="openIntakeDialog">
            New Request
          </v-btn>
          <v-select
            v-model="statusFilter"
            label="Filter by status"
            :items="statusFilterItems"
            density="compact"
            style="max-width: 200px"
            clearable
            hide-details
            @update:model-value="fetchRequests"
          />
          <v-btn icon variant="text" :loading="loadingRequests" @click="fetchRequests">
            <v-icon>mdi:mdi-refresh</v-icon>
          </v-btn>
        </div>

        <v-data-table
          :headers="requestHeaders"
          :items="requests"
          :loading="loadingRequests"
          item-value="id"
          hover
        >
          <template #item.status="{ item }">
            <v-tooltip v-if="item.statusReason" :text="item.statusReason" location="top">
              <template #activator="{ props }">
                <v-chip v-bind="props" :color="statusColor(item.status)" size="small">
                  {{ item.status }}
                  <v-icon end size="x-small">mdi:mdi-information-outline</v-icon>
                </v-chip>
              </template>
            </v-tooltip>
            <v-chip v-else :color="statusColor(item.status)" size="small">
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>

          <template #item.actions="{ item }">
            <v-btn
              v-if="item.status === 'RECEIVED'"
              size="small"
              color="success"
              variant="tonal"
              class="mr-1"
              :loading="actioning === item.id"
              @click="acceptRequest(item)"
            >
              Accept
            </v-btn>
            <v-btn
              v-if="item.status === 'RECEIVED'"
              size="small"
              color="error"
              variant="tonal"
              :loading="actioning === item.id"
              @click="openRejectDialog(item)"
            >
              Reject
            </v-btn>
            <v-btn
              v-if="item.status === 'QUEUED' || item.status === 'DISPATCH_FAILED'"
              size="small"
              color="primary"
              variant="tonal"
              :loading="actioning === item.id"
              @click="dispatchRequest(item)"
            >
              Dispatch Now
            </v-btn>
          </template>
        </v-data-table>
      </v-window-item>

      <!-- SKU CATALOG TAB -->
      <v-window-item value="skus">
        <v-btn color="primary" prepend-icon="mdi:mdi-plus" class="mb-3" @click="openSkuDialog">
          Add SKU
        </v-btn>

        <v-data-table
          :headers="skuHeaders"
          :items="skus"
          :loading="loadingSkus"
          item-value="id"
          hover
          expand-on-click
        >
          <template #item.active="{ item }">
            <v-chip :color="item.active ? 'success' : 'grey'" size="small">
              {{ item.active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>

          <template #item.parts="{ item }">
            {{ item.parts?.length ?? 0 }} part(s)
          </template>

          <template #item.actions="{ item }">
            <v-btn icon size="small" variant="text" @click.stop="openAddPartDialog(item)">
              <v-tooltip activator="parent" location="top">Add Part</v-tooltip>
              <v-icon>mdi:mdi-puzzle-plus</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="error" @click.stop="confirmDeleteSku(item)">
              <v-icon>mdi:mdi-delete</v-icon>
            </v-btn>
          </template>

          <template #expanded-row="{ item }">
            <tr>
              <td :colspan="skuHeaders.length" class="pa-3 bg-grey-lighten-5">
                <div v-if="!item.parts?.length" class="text-grey text-caption">No parts yet</div>
                <v-table v-else density="compact">
                  <thead>
                    <tr>
                      <th>Part Name</th>
                      <th>Material</th>
                      <th>Color</th>
                      <th>Nozzle</th>
                      <th>Qty/Build</th>
                      <th>Gcode</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="part in item.parts" :key="part.id">
                      <td>{{ part.partName }}</td>
                      <td>{{ part.requiredMaterial.toUpperCase() }}</td>
                      <td>{{ part.requiredColorName }}</td>
                      <td>{{ part.requiredNozzleMm ? `${part.requiredNozzleMm}mm` : 'Any' }}</td>
                      <td>{{ part.quantityPerBuild }}</td>
                      <td>
                        <v-chip v-if="part.fileStorageId" color="success" size="x-small">Ready</v-chip>
                        <v-chip v-else-if="part.stlFileStorageId" color="orange" size="x-small">STL only</v-chip>
                        <v-chip v-else color="error" size="x-small">No file</v-chip>
                      </td>
                      <td class="d-flex align-center ga-1">
                        <v-tooltip text="Upload gcode file" location="top">
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              icon
                              size="x-small"
                              variant="text"
                              color="primary"
                              :loading="uploadingPartId === part.id"
                              @click="triggerGcodeUpload(item, part)"
                            >
                              <v-icon>mdi:mdi-upload</v-icon>
                            </v-btn>
                          </template>
                        </v-tooltip>
                        <v-btn icon size="x-small" variant="text" color="error" @click="deletePart(item, part)">
                          <v-icon>mdi:mdi-delete</v-icon>
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-window-item>
    </v-window>

    <!-- Intake Dialog -->
    <v-dialog v-model="intakeDialog" max-width="480">
      <v-card>
        <v-card-title class="pt-4 px-6">New Build Request</v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="intakeForm.externalSkuId" label="SKU ID (e.g. WIDGET-RED-LG)" required />
          <v-text-field v-model="intakeForm.externalOrderId" label="Order ID (optional)" />
          <v-text-field v-model.number="intakeForm.quantity" label="Quantity" type="number" required />
          <v-text-field v-model.number="intakeForm.priority" label="Priority (0 = normal)" type="number" />
          <v-text-field v-model="intakeForm.requestedBy" label="Requested By (optional)" />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="intakeDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="submitIntake">Submit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reject Dialog -->
    <v-dialog v-model="rejectDialog" max-width="400">
      <v-card>
        <v-card-title class="pt-4 px-6">Reject Request #{{ rejectingRequest?.id }}</v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="rejectReason" label="Reason" required />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="saving" @click="doReject">Reject</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add SKU Dialog -->
    <v-dialog v-model="skuDialog" max-width="480">
      <v-card>
        <v-card-title class="pt-4 px-6">Add SKU</v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="skuForm.externalSkuId" label="External SKU ID (from Shopify)" required />
          <v-text-field v-model="skuForm.name" label="Name" required />
          <v-textarea v-model="skuForm.description" label="Description" rows="2" />
          <v-checkbox v-model="skuForm.active" label="Active" />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="skuDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveSku">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Part Dialog -->
    <v-dialog v-model="partDialog" max-width="480">
      <v-card>
        <v-card-title class="pt-4 px-6">Add Part to {{ addingPartToSku?.name }}</v-card-title>
        <v-card-text class="px-6">
          <v-text-field v-model="partForm.partName" label="Part Name" required />
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="partForm.requiredMaterial"
                label="Material"
                :items="['pla', 'petg', 'abs', 'tpu', 'asa', 'pa', 'pc']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="partForm.requiredColorName" label="Color Name (lowercase)" required />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="partForm.requiredNozzleMm"
                label="Nozzle (mm, blank = any)"
                type="number"
                clearable
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="partForm.quantityPerBuild"
                label="Qty per Build"
                type="number"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="partDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="savePart">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <input
      ref="gcodeFileInput"
      type="file"
      accept=".gcode,.gco,.g,.bgcode,.3mf"
      style="display:none"
      @change="onGcodeFileSelected"
    />

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import {
  BuildRequestService,
  SkuService,
  DispatchService,
  type BuildRequest,
  type Sku,
  type SkuPart,
  type DispatchStatus,
} from '@/backend/production.service'

// ── State ──────────────────────────────────────────────────────────────────
const tab = ref('requests')
const loadingRequests = ref(false)
const loadingSkus = ref(false)
const saving = ref(false)
const triggering = ref(false)
const actioning = ref<number | null>(null)

const requests = ref<BuildRequest[]>([])
const skus = ref<Sku[]>([])
const dispatchStatus = ref<DispatchStatus>({ queued: 0, dispatchFailed: 0, printing: 0 })
const statusFilter = ref<string | null>(null)

const intakeDialog = ref(false)
const rejectDialog = ref(false)
const skuDialog = ref(false)
const partDialog = ref(false)

const rejectingRequest = ref<BuildRequest | null>(null)
const rejectReason = ref('')
const addingPartToSku = ref<Sku | null>(null)
const uploadingPartId = ref<number | null>(null)
const gcodeFileInput = ref<HTMLInputElement | null>(null)
const uploadTarget = ref<{ sku: Sku; part: SkuPart } | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const statusFilterItems = [
  'RECEIVED', 'ACCEPTED', 'QUEUED', 'SLICING', 'PRINTING',
  'COMPLETED', 'PARTIALLY_COMPLETED', 'REJECTED', 'DISPATCH_FAILED', 'SLICE_FAILED',
]

const intakeForm = ref({ externalSkuId: '', externalOrderId: '', quantity: 1, priority: 0, requestedBy: '' })
const skuForm = ref({ externalSkuId: '', name: '', description: '', active: true })
const partForm = ref({ partName: '', requiredMaterial: 'pla', requiredColorName: '', requiredNozzleMm: null as number | null, quantityPerBuild: 1 })

// ── Table headers ──────────────────────────────────────────────────────────
const requestHeaders = [
  { title: 'ID', key: 'id', width: '60px' },
  { title: 'Order ID', key: 'externalOrderId' },
  { title: 'Qty', key: 'quantity', width: '60px' },
  { title: 'Status', key: 'status' },
  { title: 'Priority', key: 'priority', width: '80px' },
  { title: 'Created', key: 'createdAt' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

const skuHeaders = [
  { title: 'External SKU', key: 'externalSkuId' },
  { title: 'Name', key: 'name' },
  { title: 'Status', key: 'active' },
  { title: 'Parts', key: 'parts', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchRequests() {
  loadingRequests.value = true
  try {
    requests.value = await BuildRequestService.list(0, 50, statusFilter.value ?? undefined)
  } finally {
    loadingRequests.value = false
  }
}

async function fetchSkus() {
  loadingSkus.value = true
  try {
    skus.value = await SkuService.list()
  } finally {
    loadingSkus.value = false
  }
}

async function fetchDispatchStatus() {
  try {
    dispatchStatus.value = await DispatchService.getStatus()
  } catch {
    // non-critical
  }
}

onMounted(() => {
  fetchRequests()
  fetchSkus()
  fetchDispatchStatus()
})

// ── Build Request actions ──────────────────────────────────────────────────
function openIntakeDialog() {
  intakeForm.value = { externalSkuId: '', externalOrderId: '', quantity: 1, priority: 0, requestedBy: '' }
  intakeDialog.value = true
}

async function submitIntake() {
  saving.value = true
  try {
    await BuildRequestService.intake({
      externalSkuId: intakeForm.value.externalSkuId,
      externalOrderId: intakeForm.value.externalOrderId || null,
      quantity: intakeForm.value.quantity,
      priority: intakeForm.value.priority,
      requestedBy: intakeForm.value.requestedBy || null,
    })
    notify('Build request created')
    intakeDialog.value = false
    await fetchRequests()
  } catch {
    notify('Failed to create request', 'error')
  } finally {
    saving.value = false
  }
}

async function acceptRequest(req: BuildRequest) {
  actioning.value = req.id
  try {
    await BuildRequestService.accept(req.id)
    notify(`Request #${req.id} accepted`)
    await fetchRequests()
    await fetchDispatchStatus()
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      const reason = err.response.data?.error ?? 'Request was rejected'
      notify(`Rejected: ${reason}`, 'warning')
    } else {
      notify('Failed to accept request', 'error')
    }
    await fetchRequests()
  } finally {
    actioning.value = null
  }
}

function openRejectDialog(req: BuildRequest) {
  rejectingRequest.value = req
  rejectReason.value = ''
  rejectDialog.value = true
}

async function doReject() {
  if (!rejectingRequest.value) return
  saving.value = true
  try {
    await BuildRequestService.reject(rejectingRequest.value.id, rejectReason.value)
    notify(`Request #${rejectingRequest.value.id} rejected`)
    rejectDialog.value = false
    await fetchRequests()
  } catch {
    notify('Failed to reject request', 'error')
  } finally {
    saving.value = false
  }
}

async function dispatchRequest(req: BuildRequest) {
  actioning.value = req.id
  try {
    await DispatchService.dispatchRequest(req.id)
    notify(`Dispatching request #${req.id}`)
    await fetchRequests()
    await fetchDispatchStatus()
  } catch {
    notify('Dispatch failed', 'error')
  } finally {
    actioning.value = null
  }
}

async function triggerDispatch() {
  triggering.value = true
  try {
    await DispatchService.trigger()
    notify('Dispatch cycle triggered')
    await fetchDispatchStatus()
    await fetchRequests()
  } catch {
    notify('Failed to trigger dispatch', 'error')
  } finally {
    triggering.value = false
  }
}

// ── SKU actions ────────────────────────────────────────────────────────────
function openSkuDialog() {
  skuForm.value = { externalSkuId: '', name: '', description: '', active: true }
  skuDialog.value = true
}

async function saveSku() {
  saving.value = true
  try {
    await SkuService.create({
      externalSkuId: skuForm.value.externalSkuId,
      name: skuForm.value.name,
      description: skuForm.value.description || null,
      active: skuForm.value.active,
    })
    notify('SKU created')
    skuDialog.value = false
    await fetchSkus()
  } catch {
    notify('Failed to create SKU', 'error')
  } finally {
    saving.value = false
  }
}

async function confirmDeleteSku(sku: Sku) {
  if (!confirm(`Delete SKU "${sku.name}"?`)) return
  try {
    await SkuService.remove(sku.id)
    notify('SKU deleted')
    await fetchSkus()
  } catch {
    notify('Failed to delete SKU', 'error')
  }
}

function openAddPartDialog(sku: Sku) {
  addingPartToSku.value = sku
  partForm.value = { partName: '', requiredMaterial: 'pla', requiredColorName: '', requiredNozzleMm: null, quantityPerBuild: 1 }
  partDialog.value = true
}

async function savePart() {
  if (!addingPartToSku.value) return
  saving.value = true
  try {
    await SkuService.addPart(addingPartToSku.value.id, {
      partName: partForm.value.partName,
      requiredMaterial: partForm.value.requiredMaterial,
      requiredColorName: partForm.value.requiredColorName,
      requiredNozzleMm: partForm.value.requiredNozzleMm ?? undefined,
      quantityPerBuild: partForm.value.quantityPerBuild,
    })
    notify('Part added')
    partDialog.value = false
    await fetchSkus()
  } catch {
    notify('Failed to add part', 'error')
  } finally {
    saving.value = false
  }
}

async function deletePart(sku: Sku, part: SkuPart) {
  if (!confirm(`Delete part "${part.partName}"?`)) return
  try {
    await SkuService.removePart(sku.id, part.id)
    notify('Part deleted')
    await fetchSkus()
  } catch {
    notify('Failed to delete part', 'error')
  }
}

// ── Gcode upload ───────────────────────────────────────────────────────────
function triggerGcodeUpload(sku: Sku, part: SkuPart) {
  uploadTarget.value = { sku, part }
  gcodeFileInput.value?.click()
}

async function onGcodeFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !uploadTarget.value) return
  const { sku, part } = uploadTarget.value
  uploadingPartId.value = part.id
  try {
    await SkuService.uploadPartGcode(sku.id, part.id, file)
    notify(`Gcode uploaded for "${part.partName}"`)
    await fetchSkus()
  } catch {
    notify('Failed to upload gcode', 'error')
  } finally {
    uploadingPartId.value = null
    input.value = ''
    uploadTarget.value = null
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function statusColor(status: string): string {
  const map: Record<string, string> = {
    RECEIVED: 'blue',
    ACCEPTED: 'cyan',
    QUEUED: 'orange',
    SLICING: 'purple',
    PRINTING: 'green',
    COMPLETED: 'success',
    PARTIALLY_COMPLETED: 'warning',
    REJECTED: 'grey',
    DISPATCH_FAILED: 'error',
    SLICE_FAILED: 'error',
  }
  return map[status] ?? 'grey'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function notify(text: string, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>
