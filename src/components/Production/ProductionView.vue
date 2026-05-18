<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Production</h1>
    </div>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="orders">Build Orders</v-tab>
      <v-tab value="plates">Planned Plates</v-tab>
    </v-tabs>

    <v-window v-model="tab">

      <!-- ─── BUILD ORDERS TAB ─────────────────────────────────────────────── -->
      <v-window-item value="orders">
        <div class="d-flex align-center ga-2 mb-3">
          <v-btn color="primary" prepend-icon="mdi:mdi-plus" @click="openIntakeDialog">
            New Order
          </v-btn>
          <v-select
            v-model="orderStatusFilter"
            label="Filter by status"
            :items="orderStatusItems"
            density="compact"
            style="max-width: 220px"
            clearable
            hide-details
            @update:model-value="fetchOrders"
          />
          <v-btn icon variant="text" :loading="loadingOrders" @click="fetchOrders">
            <v-icon>mdi:mdi-refresh</v-icon>
          </v-btn>
        </div>

        <v-data-table
          :headers="orderHeaders"
          :items="orders"
          :loading="loadingOrders"
          item-value="id"
          hover
        >
          <template #item.status="{ item }">
            <v-chip :color="orderStatusColor(item.status)" size="small" variant="tonal">
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.dynamicPriority="{ item }">
            <v-progress-linear
              :model-value="item.dynamicPriority"
              :color="item.dynamicPriority >= 70 ? 'error' : item.dynamicPriority >= 30 ? 'warning' : 'success'"
              rounded
              height="10"
              style="min-width: 80px"
            />
            <span class="text-caption ml-1">{{ Math.round(item.dynamicPriority) }}</span>
          </template>

          <template #item.requiredBy="{ item }">
            {{ item.requiredBy ? new Date(item.requiredBy).toLocaleDateString() : '—' }}
          </template>

          <template #item.lines="{ item }">
            {{ item.lines?.length ?? 0 }} line(s)
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex ga-1">
              <v-btn
                v-if="item.status === 'RECEIVED'"
                size="small"
                variant="tonal"
                color="success"
                @click="acceptOrder(item)"
              >
                Accept
              </v-btn>
              <v-btn
                v-if="item.status === 'RECEIVED'"
                size="small"
                variant="tonal"
                color="error"
                @click="confirmRejectOrder(item)"
              >
                Reject
              </v-btn>
              <v-btn
                icon
                size="small"
                variant="text"
                @click="viewOrder(item)"
              >
                <v-icon>mdi:mdi-eye</v-icon>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-window-item>

      <!-- ─── PLANNED PLATES TAB ───────────────────────────────────────────── -->
      <v-window-item value="plates">
        <div class="d-flex align-center ga-2 mb-3">
          <v-select
            v-model="plateStatusFilter"
            label="Filter by status"
            :items="plateStatusItems"
            density="compact"
            style="max-width: 220px"
            clearable
            hide-details
            @update:model-value="fetchPlates"
          />
          <v-btn icon variant="text" :loading="loadingPlates" @click="fetchPlates">
            <v-icon>mdi:mdi-refresh</v-icon>
          </v-btn>
        </div>

        <v-data-table
          :headers="plateHeaders"
          :items="plates"
          :loading="loadingPlates"
          item-value="id"
          hover
        >
          <template #item.status="{ item }">
            <v-chip :color="plateStatusColor(item.status)" size="small" variant="tonal">
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.printProfile="{ item }">
            {{ item.printProfile?.name ?? `Profile #${item.printProfileId}` }}
          </template>

          <template #item.filamentProfile="{ item }">
            <div v-if="item.filamentProfile" class="d-flex align-center ga-1">
              <div
                v-if="item.filamentProfile.colorHex"
                class="color-dot"
                :style="{ backgroundColor: item.filamentProfile.colorHex }"
              />
              {{ item.filamentProfile.name }}
            </div>
            <span v-else>Profile #{{ item.filamentProfileId }}</span>
          </template>

          <template #item.items="{ item }">
            {{ item.items?.length ?? 0 }} part(s)
          </template>

          <template #item.createdAt="{ item }">
            {{ new Date(item.createdAt).toLocaleString() }}
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex ga-1">
              <v-btn
                v-if="item.status === 'PLANNING'"
                size="small"
                variant="tonal"
                color="primary"
                @click="forceSlicePlate(item)"
              >
                Force Slice
              </v-btn>
              <v-btn
                v-if="!['PRINTING', 'DONE', 'CANCELLED'].includes(item.status)"
                icon
                size="small"
                variant="text"
                color="error"
                @click="confirmCancelPlate(item)"
              >
                <v-icon>mdi:mdi-cancel</v-icon>
              </v-btn>
              <v-btn icon size="small" variant="text" @click="viewPlate(item)">
                <v-icon>mdi:mdi-eye</v-icon>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-window-item>
    </v-window>

    <!-- ─── INTAKE BUILD ORDER DIALOG ─────────────────────────────────────── -->
    <v-dialog v-model="intakeDialog" max-width="680">
      <v-card>
        <v-card-title class="pt-4 px-6">New Build Order</v-card-title>
        <v-card-text class="px-6">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="orderForm.externalOrderId"
                label="External Order ID (optional)"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="orderForm.requiredBy"
                label="Required by (date)"
                type="date"
                density="compact"
              />
            </v-col>
          </v-row>

          <div class="text-subtitle-2 mb-2 mt-2">Lines</div>
          <div
            v-for="(line, idx) in orderForm.lines"
            :key="idx"
            class="d-flex ga-2 mb-2 align-center"
          >
            <v-autocomplete
              v-model="line.externalPartId"
              label="Part"
              :items="partAutocompleteItems"
              item-title="label"
              item-value="externalPartId"
              density="compact"
              hide-details
              style="flex: 2"
              clearable
              auto-select-first
            />
            <v-text-field
              v-model.number="line.quantity"
              label="Qty"
              type="number"
              density="compact"
              hide-details
              style="flex: 0 0 70px"
            />
            <v-text-field
              v-model="line.assemblyGroup"
              label="Assembly group"
              density="compact"
              hide-details
              style="flex: 1"
            />
            <v-btn icon size="small" variant="text" color="error" @click="removeLine(idx)">
              <v-icon>mdi:mdi-close</v-icon>
            </v-btn>
          </div>
          <v-btn variant="text" prepend-icon="mdi:mdi-plus" size="small" @click="addLine">
            Add line
          </v-btn>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="intakeDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingOrder"
            :disabled="orderForm.lines.length === 0"
            @click="submitOrder"
          >
            Submit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── VIEW ORDER DIALOG ──────────────────────────────────────────────── -->
    <v-dialog v-model="viewOrderDialog" max-width="640">
      <v-card v-if="selectedOrder">
        <v-card-title class="pt-4 px-6 d-flex align-center">
          Order #{{ selectedOrder.id }}
          <v-chip class="ml-3" :color="orderStatusColor(selectedOrder.status)" size="small" variant="tonal">
            {{ selectedOrder.status }}
          </v-chip>
        </v-card-title>
        <v-card-text class="px-6">
          <div class="text-body-2 mb-1" v-if="selectedOrder.externalOrderId">
            External ID: <strong>{{ selectedOrder.externalOrderId }}</strong>
          </div>
          <div class="text-body-2 mb-1" v-if="selectedOrder.requiredBy">
            Required by: <strong>{{ new Date(selectedOrder.requiredBy).toLocaleDateString() }}</strong>
          </div>
          <div class="text-body-2 mb-3">
            Priority: <strong>{{ Math.round(selectedOrder.dynamicPriority) }}/100</strong>
          </div>

          <v-table density="compact">
            <thead>
              <tr>
                <th>Part ID</th>
                <th>Qty</th>
                <th>Done</th>
                <th>Assembly Group</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in selectedOrder.lines" :key="line.id">
                <td>{{ line.externalPartId }}</td>
                <td>{{ line.quantity }}</td>
                <td>{{ line.completedQuantity }}</td>
                <td>{{ line.assemblyGroup ?? '—' }}</td>
                <td>
                  <v-icon :color="line.printPartId ? 'success' : 'error'" size="small">
                    {{ line.printPartId ? 'check_circle' : 'cancel' }}
                  </v-icon>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="viewOrderDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── REJECT ORDER DIALOG ────────────────────────────────────────────── -->
    <v-dialog v-model="rejectDialog" max-width="420">
      <v-card>
        <v-card-title>Reject Order?</v-card-title>
        <v-card-text>
          <v-text-field v-model="rejectReason" label="Reason (optional)" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="submitReject">Reject</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── VIEW PLATE DIALOG ──────────────────────────────────────────────── -->
    <v-dialog v-model="viewPlateDialog" max-width="600">
      <v-card v-if="selectedPlate">
        <v-card-title class="pt-4 px-6 d-flex align-center">
          Plate #{{ selectedPlate.id }}
          <v-chip class="ml-3" :color="plateStatusColor(selectedPlate.status)" size="small" variant="tonal">
            {{ selectedPlate.status }}
          </v-chip>
        </v-card-title>
        <v-card-text class="px-6">
          <div class="text-body-2 mb-1">
            Profile: <strong>{{ selectedPlate.printProfile?.name ?? `#${selectedPlate.printProfileId}` }}</strong>
          </div>
          <div class="text-body-2 mb-1">
            Filament: <strong>{{ selectedPlate.filamentProfile?.name ?? `#${selectedPlate.filamentProfileId}` }}</strong>
          </div>
          <div class="text-body-2 mb-3">
            Created: <strong>{{ new Date(selectedPlate.createdAt).toLocaleString() }}</strong>
          </div>

          <v-table density="compact">
            <thead>
              <tr>
                <th>Part</th>
                <th>Qty</th>
                <th>Set</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedPlate.items" :key="item.id">
                <td>{{ item.printPart?.externalPartId ?? `Part #${item.printPartId}` }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ item.setIndex != null ? item.setIndex : '—' }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="viewPlateDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── CANCEL PLATE CONFIRM ───────────────────────────────────────────── -->
    <v-dialog v-model="cancelPlateDialog" max-width="420">
      <v-card>
        <v-card-title>Cancel Plate?</v-card-title>
        <v-card-text>Cancel Plate #{{ cancellingPlate?.id }}?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelPlateDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="submitCancelPlate">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── SNACKBAR ───────────────────────────────────────────────────────── -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import {
  BuildOrderService,
  PrintPartService,
  PlannedPlateService,
  type BuildOrder,
  type BuildOrderStatus,
  type PrintPart,
  type PlannedPlate,
  type PlannedPlateStatus,
  type CreateBuildOrderLineDto,
} from '@/backend/build-order-workflow.service'

// ─── Tab ─────────────────────────────────────────────────────────────────────

const tab = ref('orders')

// ─── Snackbar ─────────────────────────────────────────────────────────────────

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

function notify(msg: string, color = 'success') {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

// ─── Build Orders ─────────────────────────────────────────────────────────────

const orders = ref<BuildOrder[]>([])
const loadingOrders = ref(false)
const orderStatusFilter = ref<BuildOrderStatus | undefined>(undefined)

const orderStatusItems = [
  'RECEIVED', 'ACCEPTED', 'PLANNING', 'IN_PROGRESS',
  'COMPLETED', 'PARTIALLY_COMPLETED', 'REJECTED', 'FAILED',
]

const orderHeaders = [
  { title: 'ID', key: 'id', width: 60 },
  { title: 'External ID', key: 'externalOrderId' },
  { title: 'Status', key: 'status' },
  { title: 'Priority', key: 'dynamicPriority', width: 140 },
  { title: 'Required By', key: 'requiredBy' },
  { title: 'Lines', key: 'lines' },
  { title: 'Actions', key: 'actions', sortable: false },
]

function orderStatusColor(status: BuildOrderStatus): string {
  const map: Record<BuildOrderStatus, string> = {
    RECEIVED: 'blue',
    ACCEPTED: 'teal',
    PLANNING: 'orange',
    IN_PROGRESS: 'purple',
    COMPLETED: 'success',
    PARTIALLY_COMPLETED: 'warning',
    REJECTED: 'error',
    FAILED: 'error',
  }
  return map[status] ?? 'grey'
}

async function fetchOrders() {
  loadingOrders.value = true
  try {
    orders.value = await BuildOrderService.list(orderStatusFilter.value)
  } catch (e) {
    notify('Failed to load build orders', 'error')
  } finally {
    loadingOrders.value = false
  }
}

async function acceptOrder(order: BuildOrder) {
  try {
    const updated = await BuildOrderService.accept(order.id)
    const idx = orders.value.findIndex(o => o.id === order.id)
    if (idx !== -1) orders.value[idx] = updated
    notify('Order accepted')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to accept order', 'error')
  }
}

const rejectDialog = ref(false)
const rejectingOrder = ref<BuildOrder | null>(null)
const rejectReason = ref('')

function confirmRejectOrder(order: BuildOrder) {
  rejectingOrder.value = order
  rejectReason.value = ''
  rejectDialog.value = true
}

async function submitReject() {
  if (!rejectingOrder.value) return
  try {
    const updated = await BuildOrderService.reject(rejectingOrder.value.id, rejectReason.value || undefined)
    const idx = orders.value.findIndex(o => o.id === rejectingOrder.value!.id)
    if (idx !== -1) orders.value[idx] = updated
    notify('Order rejected')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to reject order', 'error')
  } finally {
    rejectDialog.value = false
  }
}

const viewOrderDialog = ref(false)
const selectedOrder = ref<BuildOrder | null>(null)

function viewOrder(order: BuildOrder) {
  selectedOrder.value = order
  viewOrderDialog.value = true
}

// ─── Intake Dialog ────────────────────────────────────────────────────────────

const intakeDialog = ref(false)
const savingOrder = ref(false)

interface OrderFormLine {
  externalPartId: string
  quantity: number
  assemblyGroup: string
}

const orderForm = ref<{
  externalOrderId: string
  requiredBy: string
  lines: OrderFormLine[]
}>({
  externalOrderId: '',
  requiredBy: '',
  lines: [],
})

function openIntakeDialog() {
  orderForm.value = { externalOrderId: '', requiredBy: '', lines: [] }
  addLine()
  intakeDialog.value = true
}

function addLine() {
  orderForm.value.lines.push({ externalPartId: '', quantity: 1, assemblyGroup: '' })
}

function removeLine(idx: number) {
  orderForm.value.lines.splice(idx, 1)
}

async function submitOrder() {
  savingOrder.value = true
  try {
    const lines: CreateBuildOrderLineDto[] = orderForm.value.lines
      .filter(l => l.externalPartId.trim())
      .map(l => ({
        externalPartId: l.externalPartId.trim(),
        quantity: l.quantity,
        assemblyGroup: l.assemblyGroup.trim() || undefined,
      }))

    const order = await BuildOrderService.intake({
      externalOrderId: orderForm.value.externalOrderId.trim() || undefined,
      requiredBy: orderForm.value.requiredBy || undefined,
      lines,
    })
    orders.value.unshift(order)
    intakeDialog.value = false
    notify('Build order created')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to create order', 'error')
  } finally {
    savingOrder.value = false
  }
}

// ─── Parts (kept for intake autocomplete) ────────────────────────────────────

const parts = ref<PrintPart[]>([])

async function fetchParts() {
  try {
    parts.value = await PrintPartService.list()
  } catch (_) {
    // non-critical; autocomplete just stays empty
  }
}

const partAutocompleteItems = computed(() =>
  parts.value.map(p => ({ externalPartId: p.externalPartId, label: `${p.name} — ${p.externalPartId}` }))
)

// ─── Planned Plates ───────────────────────────────────────────────────────────

const plates = ref<PlannedPlate[]>([])
const loadingPlates = ref(false)
const plateStatusFilter = ref<PlannedPlateStatus | undefined>(undefined)

const plateStatusItems = [
  'PLANNING', 'READY_TO_SLICE', 'SLICING', 'SLICE_FAILED', 'QUEUED', 'PRINTING', 'DONE', 'CANCELLED',
]

const plateHeaders = [
  { title: 'ID', key: 'id', width: 60 },
  { title: 'Status', key: 'status' },
  { title: 'Print Profile', key: 'printProfile' },
  { title: 'Filament', key: 'filamentProfile' },
  { title: 'Parts', key: 'items' },
  { title: 'Created', key: 'createdAt' },
  { title: 'Actions', key: 'actions', sortable: false },
]

function plateStatusColor(status: PlannedPlateStatus): string {
  const map: Record<PlannedPlateStatus, string> = {
    PLANNING: 'blue-grey',
    READY_TO_SLICE: 'blue',
    SLICING: 'orange',
    SLICE_FAILED: 'error',
    QUEUED: 'teal',
    PRINTING: 'purple',
    DONE: 'success',
    CANCELLED: 'grey',
  }
  return map[status] ?? 'grey'
}

async function fetchPlates() {
  loadingPlates.value = true
  try {
    plates.value = await PlannedPlateService.list(plateStatusFilter.value)
  } catch (e) {
    notify('Failed to load plates', 'error')
  } finally {
    loadingPlates.value = false
  }
}

async function forceSlicePlate(plate: PlannedPlate) {
  try {
    const updated = await PlannedPlateService.forceSlice(plate.id)
    const idx = plates.value.findIndex(p => p.id === plate.id)
    if (idx !== -1) plates.value[idx] = updated
    notify('Plate queued for slicing')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to force-slice plate', 'error')
  }
}

const viewPlateDialog = ref(false)
const selectedPlate = ref<PlannedPlate | null>(null)

function viewPlate(plate: PlannedPlate) {
  selectedPlate.value = plate
  viewPlateDialog.value = true
}

const cancelPlateDialog = ref(false)
const cancellingPlate = ref<PlannedPlate | null>(null)

function confirmCancelPlate(plate: PlannedPlate) {
  cancellingPlate.value = plate
  cancelPlateDialog.value = true
}

async function submitCancelPlate() {
  if (!cancellingPlate.value) return
  try {
    const updated = await PlannedPlateService.cancel(cancellingPlate.value.id)
    const idx = plates.value.findIndex(p => p.id === cancellingPlate.value!.id)
    if (idx !== -1) plates.value[idx] = updated
    notify('Plate cancelled')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to cancel plate', 'error')
  } finally {
    cancelPlateDialog.value = false
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([fetchOrders(), fetchParts(), fetchPlates()])
})
</script>

<style scoped>
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}
</style>
