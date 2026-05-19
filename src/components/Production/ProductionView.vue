<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Production</h1>
    </div>

    <!-- ─── Slicer status bar ────────────────────────────────────────────────── -->
    <div class="d-flex align-center ga-3 mb-3 flex-wrap">
      <v-chip
        :color="slicerStatus?.configured ? 'success' : 'warning'"
        size="small"
        variant="tonal"
        prepend-icon="mdi:mdi-printer-3d-nozzle"
      >
        Slicer: {{ slicerStatus?.configured ? (slicerStatus.config?.mode === 'remote' ? 'Connected (remote)' : 'Connected (local)') : 'Not configured' }}
      </v-chip>
      <v-chip
        v-if="slicerStatus?.configured"
        color="orange"
        size="small"
        variant="tonal"
        prepend-icon="mdi:mdi-cog-sync"
      >
        Slicing: {{ slicerStatus?.platesSlicing ?? 0 }}
      </v-chip>
      <v-chip
        v-if="slicerStatus?.configured"
        color="blue"
        size="small"
        variant="tonal"
        prepend-icon="mdi:mdi-clipboard-list"
      >
        Queued: {{ slicerStatus?.platesReadyToSlice ?? 0 }}
      </v-chip>
      <v-chip
        v-if="!slicerStatus?.configured"
        color="warning"
        size="small"
        variant="tonal"
        prepend-icon="mdi:mdi-alert"
      >
        Configure slicer in Settings → OrcaSlicer
      </v-chip>
    </div>

    <!-- ─── Toolbar ───────────────────────────────────────────────────────────── -->
    <div class="d-flex align-center ga-2 mb-3 flex-wrap">
      <v-select
        v-model="orderStatusFilter"
        label="Filter by status"
        :items="orderStatusItems"
        density="compact"
        style="max-width: 200px"
        clearable
        hide-details
        @update:model-value="fetchOrders"
      />
      <v-btn icon variant="text" :loading="loadingOrders" @click="fetchOrders">
        <v-icon>mdi:mdi-refresh</v-icon>
      </v-btn>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi:mdi-plus" @click="openIntakeDialog">
        New Order
      </v-btn>
    </div>

    <!-- ─── Orders table (expandable) ────────────────────────────────────────── -->
    <v-data-table
      v-model:expanded="expanded"
      :headers="orderHeaders"
      :items="orders"
      :loading="loadingOrders"
      item-value="id"
      show-expand
      hover
      @update:expanded="onExpand"
    >
      <template #item.status="{ item }">
        <v-chip :color="orderStatusColor(item.status)" size="small" variant="tonal">
          {{ item.status }}
        </v-chip>
      </template>

      <template #item.dynamicPriority="{ item }">
        <div class="d-flex align-center ga-1">
          <v-progress-linear
            :model-value="item.dynamicPriority"
            :color="item.dynamicPriority >= 70 ? 'error' : item.dynamicPriority >= 30 ? 'warning' : 'success'"
            rounded
            height="8"
            style="min-width: 60px"
          />
          <span class="text-caption">{{ Math.round(item.dynamicPriority) }}</span>
        </div>
      </template>

      <template #item.requiredBy="{ item }">
        {{ item.requiredBy ? new Date(item.requiredBy).toLocaleDateString() : '—' }}
      </template>

      <template #item.lines="{ item }">
        <span class="text-caption">{{ item.lines?.length ?? 0 }} line(s)</span>
        <v-chip
          v-if="item.lines?.some(l => !l.printPartId)"
          color="warning"
          size="x-small"
          variant="tonal"
          class="ml-1"
        >
          unresolved
        </v-chip>
      </template>

      <template #item.actions="{ item }">
        <div class="d-flex ga-1 justify-end">
          <v-btn
            v-if="item.status === 'RECEIVED'"
            size="small"
            variant="tonal"
            color="primary"
            @click.stop="acceptOrder(item)"
          >
            Accept
          </v-btn>
          <v-btn
            v-if="item.status === 'RECEIVED'"
            size="small"
            variant="tonal"
            color="error"
            @click.stop="confirmRejectOrder(item)"
          >
            Reject
          </v-btn>
          <v-btn
            v-if="item.status === 'ACCEPTED' || item.status === 'PLANNING'"
            size="small"
            variant="tonal"
            color="teal"
            :loading="forcingPlan.has(item.id)"
            @click.stop="forcePlanOrder(item)"
          >
            Force Plan
          </v-btn>
          <v-btn
            v-if="!['COMPLETED', 'REJECTED', 'FAILED', 'RECEIVED'].includes(item.status)"
            icon
            size="small"
            variant="text"
            color="error"
            @click.stop="confirmRejectOrder(item)"
          >
            <v-icon>mdi:mdi-cancel</v-icon>
          </v-btn>
        </div>
      </template>

      <!-- ─── Expanded row: plates for this order ──────────────────────────── -->
      <template #expanded-row="{ item, columns }">
        <tr>
          <td :colspan="columns.length" class="pa-0">
            <div class="plate-panel">
              <div v-if="loadingPlatesFor.has(item.id)" class="pa-4 text-center text-medium-emphasis">
                <v-progress-circular indeterminate size="20" class="mr-2" />
                Loading plates...
              </div>

              <div v-else-if="!orderPlates.get(item.id)?.length" class="pa-4 text-medium-emphasis text-body-2">
                <v-icon size="small" class="mr-1">mdi:mdi-clock-outline</v-icon>
                No plates yet — plate optimizer runs every 5 minutes for ACCEPTED orders.
                <v-btn
                  v-if="item.status === 'ACCEPTED'"
                  variant="text"
                  size="small"
                  color="primary"
                  class="ml-1"
                  :loading="refreshingPlates.has(item.id)"
                  @click="refreshPlates(item.id)"
                >
                  Check now
                </v-btn>
              </div>

              <div v-else class="pa-2">
                <div
                  v-for="plate in orderPlates.get(item.id)"
                  :key="plate.id"
                  class="plate-row d-flex align-center ga-3 pa-2 rounded mb-1"
                >
                  <span class="text-caption text-medium-emphasis" style="min-width: 60px">
                    Plate #{{ plate.id }}
                  </span>

                  <v-chip :color="plateStatusColor(plate.status)" size="small" variant="tonal">
                    {{ plate.status.replace(/_/g, ' ') }}
                  </v-chip>

                  <span class="text-body-2 text-medium-emphasis">
                    {{ plate.printProfile?.name ?? `Profile #${plate.printProfileId}` }}
                    ·
                    {{ plate.filamentProfile?.name ?? `Filament #${plate.filamentProfileId}` }}
                  </span>

                  <span class="text-caption text-medium-emphasis">
                    {{ plate.items?.length ?? 0 }} part(s)
                  </span>

                  <v-chip
                    v-if="plate.status === 'SLICE_FAILED'"
                    color="error"
                    size="x-small"
                    variant="tonal"
                    :title="plate.statusReason"
                    style="max-width: 200px; overflow: hidden; text-overflow: ellipsis"
                  >
                    {{ plate.statusReason ?? 'Slice failed' }}
                  </v-chip>

                  <v-spacer />

                  <v-btn
                    v-if="plate.status === 'PLANNING' || plate.status === 'SLICE_FAILED'"
                    size="small"
                    variant="tonal"
                    color="primary"
                    :loading="forcingSlice.has(plate.id)"
                    @click="forceSlice(plate, item.id)"
                  >
                    {{ plate.status === 'SLICE_FAILED' ? 'Retry Slice' : 'Force Slice Now' }}
                  </v-btn>

                  <v-progress-circular
                    v-if="plate.status === 'SLICING'"
                    indeterminate
                    size="18"
                    color="orange"
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      </template>
    </v-data-table>

    <!-- ─── INTAKE BUILD ORDER DIALOG ────────────────────────────────────────── -->
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

    <!-- ─── REJECT / CANCEL ORDER DIALOG ──────────────────────────────────────── -->
    <v-dialog v-model="rejectDialog" max-width="420">
      <v-card>
        <v-card-title>{{ rejectingOrder?.status === 'RECEIVED' ? 'Reject Order?' : 'Cancel Order?' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="rejectReason" label="Reason (optional)" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="rejectingLoading" @click="submitReject">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── SNACKBAR ──────────────────────────────────────────────────────────── -->
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
  SlicerConfigService,
  type BuildOrder,
  type BuildOrderStatus,
  type PrintPart,
  type PlannedPlate,
  type PlannedPlateStatus,
  type CreateBuildOrderLineDto,
  type SlicerConfigResponse,
} from '@/backend/build-order-workflow.service'

// ─── Snackbar ─────────────────────────────────────────────────────────────────

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

function notify(msg: string, color = 'success') {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

// ─── Orders ───────────────────────────────────────────────────────────────────

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
  { title: 'Priority', key: 'dynamicPriority', width: 160 },
  { title: 'Required By', key: 'requiredBy' },
  { title: 'Lines', key: 'lines' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
  { title: '', key: 'data-table-expand', width: 48 },
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
  } catch {
    notify('Failed to load build orders', 'error')
  } finally {
    loadingOrders.value = false
  }
}

// ─── Plates per order (lazy loaded on expand) ─────────────────────────────────

const expanded = ref<number[]>([])
const orderPlates = ref(new Map<number, PlannedPlate[]>())
const loadingPlatesFor = ref(new Set<number>())
const refreshingPlates = ref(new Set<number>())
const forcingSlice = ref(new Set<number>())

async function fetchPlatesForOrder(orderId: number) {
  loadingPlatesFor.value = new Set([...loadingPlatesFor.value, orderId])
  try {
    const plates = await PlannedPlateService.listForOrder(orderId)
    orderPlates.value = new Map([...orderPlates.value, [orderId, plates]])
  } catch {
    notify(`Failed to load plates for order ${orderId}`, 'error')
  } finally {
    const next = new Set(loadingPlatesFor.value)
    next.delete(orderId)
    loadingPlatesFor.value = next
  }
}

function onExpand(expandedIds: number[]) {
  for (const id of expandedIds) {
    if (!orderPlates.value.has(id)) {
      fetchPlatesForOrder(id)
    }
  }
}

async function refreshPlates(orderId: number) {
  refreshingPlates.value = new Set([...refreshingPlates.value, orderId])
  try {
    const plates = await PlannedPlateService.listForOrder(orderId)
    orderPlates.value = new Map([...orderPlates.value, [orderId, plates]])
  } catch {
    notify('Failed to refresh plates', 'error')
  } finally {
    const next = new Set(refreshingPlates.value)
    next.delete(orderId)
    refreshingPlates.value = next
  }
}

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

async function forceSlice(plate: PlannedPlate, orderId: number) {
  forcingSlice.value = new Set([...forcingSlice.value, plate.id])
  try {
    await PlannedPlateService.forceSlice(plate.id)
    notify(`Plate #${plate.id} queued for slicing`)
    await refreshPlates(orderId)
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to queue plate', 'error')
  } finally {
    const next = new Set(forcingSlice.value)
    next.delete(plate.id)
    forcingSlice.value = next
  }
}

// ─── Accept / Reject ─────────────────────────────────────────────────────────

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
const rejectingLoading = ref(false)

function confirmRejectOrder(order: BuildOrder) {
  rejectingOrder.value = order
  rejectReason.value = ''
  rejectDialog.value = true
}

async function submitReject() {
  if (!rejectingOrder.value) return
  rejectingLoading.value = true
  try {
    const updated = await BuildOrderService.reject(rejectingOrder.value.id, rejectReason.value || undefined)
    const idx = orders.value.findIndex(o => o.id === rejectingOrder.value!.id)
    if (idx !== -1) orders.value[idx] = updated
    notify('Order cancelled')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to cancel order', 'error')
  } finally {
    rejectingLoading.value = false
    rejectDialog.value = false
  }
}

// ─── Intake dialog ────────────────────────────────────────────────────────────

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
}>({ externalOrderId: '', requiredBy: '', lines: [] })

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
    notify(`Order #${order.id} created${order.status === 'ACCEPTED' ? ' and accepted' : ''}`)
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to create order', 'error')
  } finally {
    savingOrder.value = false
  }
}

// ─── Parts (for intake autocomplete) ─────────────────────────────────────────

const parts = ref<PrintPart[]>([])

async function fetchParts() {
  try {
    parts.value = await PrintPartService.list()
  } catch (_) {}
}

const partAutocompleteItems = computed(() =>
  parts.value.map(p => ({ externalPartId: p.externalPartId, label: `${p.name} — ${p.externalPartId}` }))
)

// ─── Slicer status ────────────────────────────────────────────────────────────

const slicerStatus = ref<SlicerConfigResponse | null>(null)

async function fetchSlicerStatus() {
  try {
    slicerStatus.value = await SlicerConfigService.getConfig()
  } catch (_) {}
}

// ─── Force Plan ───────────────────────────────────────────────────────────────

const forcingPlan = ref(new Set<number>())

async function forcePlanOrder(order: BuildOrder) {
  forcingPlan.value = new Set([...forcingPlan.value, order.id])
  try {
    const updated = await BuildOrderService.forcePlan(order.id)
    const idx = orders.value.findIndex(o => o.id === order.id)
    if (idx !== -1) orders.value[idx] = updated
    // Refresh plates for this order if it was expanded
    if (expanded.value.includes(order.id)) {
      await fetchPlatesForOrder(order.id)
    }
    notify(`Order #${order.id} force-planned — plates created`)
    await fetchSlicerStatus()
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to force plan order', 'error')
  } finally {
    const next = new Set(forcingPlan.value)
    next.delete(order.id)
    forcingPlan.value = next
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(() => {
  fetchOrders()
  fetchParts()
  fetchSlicerStatus()
})
</script>

<style scoped>
.plate-panel {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-left: 3px solid rgba(var(--v-theme-primary), 0.3);
}
.plate-row {
  background: rgba(var(--v-theme-surface), 0.8);
}
</style>
