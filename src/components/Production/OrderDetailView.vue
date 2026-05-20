<template>
  <v-container fluid>
    <!-- Back nav -->
    <div class="d-flex align-center mb-3">
      <v-btn variant="text" size="small" prepend-icon="mdi:mdi-arrow-left" @click="router.push('/production')">
        Production
      </v-btn>
    </div>

    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate />
    </div>

    <template v-else-if="order">

      <!-- ─── Header ──────────────────────────────────────────────────────── -->
      <v-card class="mb-3">
        <v-card-text>

          <!-- Row 1: Title + status + actions -->
          <div class="d-flex align-center flex-wrap ga-2 mb-4">
            <span class="text-h6 font-weight-medium">
              {{ order.externalOrderId ? `Order ${order.externalOrderId}` : `Order #${order.id}` }}
            </span>
            <v-chip :color="orderStatusColor(order.status)" size="small" variant="tonal">
              {{ order.status }}
            </v-chip>
            <v-spacer />
            <v-btn v-if="order.status === 'RECEIVED'" variant="tonal" color="primary" size="small" :loading="actioning" @click="acceptOrder">Accept</v-btn>
            <v-btn v-if="order.status === 'RECEIVED'" variant="tonal" color="error" size="small" @click="rejectDialog = true">Reject</v-btn>
            <v-btn v-if="order.status === 'ACCEPTED' || order.status === 'PLANNING'" variant="tonal" color="teal" size="small" :loading="actioning" @click="forcePlan">Force Plan</v-btn>
            <v-btn v-if="!['COMPLETED', 'REJECTED', 'FAILED', 'RECEIVED'].includes(order.status)" variant="tonal" color="error" size="small" @click="rejectDialog = true">Cancel</v-btn>
          </div>

          <!-- Row 2: 4-column key stats -->
          <div class="header-grid mb-4">
            <!-- Source -->
            <div class="header-cell">
              <div class="cell-label">SOURCE</div>
              <div class="cell-value">{{ order.source || '—' }}</div>
            </div>

            <!-- Due date -->
            <div class="header-cell">
              <div class="cell-label">DUE DATE</div>
              <div class="cell-value">
                {{ order.requiredBy ? new Date(order.requiredBy).toLocaleDateString() : '—' }}
              </div>
            </div>

            <!-- Priority -->
            <div class="header-cell">
              <div class="cell-label">PRIORITY</div>
              <div class="d-flex align-center ga-2 mt-1">
                <v-progress-linear
                  :model-value="order.dynamicPriority"
                  :color="order.dynamicPriority >= 70 ? 'error' : order.dynamicPriority >= 30 ? 'warning' : 'success'"
                  rounded height="6" style="min-width: 60px; max-width: 100px"
                />
                <span class="text-body-2 font-weight-medium">{{ Math.round(order.dynamicPriority) }}</span>
              </div>
            </div>

            <!-- Completion -->
            <div class="header-cell">
              <div class="cell-label">COMPLETION</div>
              <div class="d-flex align-center ga-2 mt-1">
                <v-progress-linear
                  :model-value="totalOrdered > 0 ? (totalCompleted / totalOrdered) * 100 : 0"
                  color="success" rounded height="6" style="min-width: 60px; max-width: 100px"
                />
                <span class="text-body-2 font-weight-medium" style="white-space: nowrap">
                  {{ totalCompleted }} / {{ totalOrdered }}
                </span>
              </div>
            </div>
          </div>

          <!-- Row 3: Timestamps (smaller, muted) -->
          <div class="d-flex flex-wrap ga-x-6 ga-y-1">
            <div class="timestamp-cell">
              <span class="cell-label">CREATED</span>
              <span class="text-body-2 text-medium-emphasis ml-2">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div v-if="order.acceptedAt" class="timestamp-cell">
              <span class="cell-label">ACCEPTED</span>
              <span class="text-body-2 text-medium-emphasis ml-2">{{ formatDate(order.acceptedAt) }}</span>
            </div>
            <div v-if="order.completedAt" class="timestamp-cell">
              <span class="cell-label">COMPLETED</span>
              <span class="text-body-2 text-medium-emphasis ml-2">{{ formatDate(order.completedAt) }}</span>
            </div>
            <div v-if="order.failedAt" class="timestamp-cell">
              <span class="cell-label">FAILED</span>
              <span class="text-body-2 text-medium-emphasis ml-2">{{ formatDate(order.failedAt) }}</span>
            </div>
            <div v-if="order.estimatedTotalPrintHours" class="timestamp-cell">
              <span class="cell-label">EST. TIME</span>
              <span class="text-body-2 text-medium-emphasis ml-2">{{ order.estimatedTotalPrintHours.toFixed(1) }}h</span>
            </div>
          </div>

        </v-card-text>
      </v-card>

      <!-- ─── Lines ────────────────────────────────────────────────────────── -->
      <v-card class="mb-3">
        <v-card-text class="pb-1">
          <div class="text-caption text-medium-emphasis font-weight-bold mb-2" style="letter-spacing:.05em">
            LINES ({{ order.lines?.length ?? 0 }})
          </div>
        </v-card-text>
        <v-data-table
          :headers="lineHeaders"
          :items="order.lines ?? []"
          item-value="id"
          density="compact"
          hide-default-footer
          :items-per-page="-1"
        >
          <template #item.name="{ item }">
            <span class="font-weight-medium">{{ item.printPart?.name ?? '—' }}</span>
          </template>
          <template #item.qty="{ item }">
            <span class="font-weight-medium">{{ item.completedQuantity }}</span>
            <span class="text-medium-emphasis"> / {{ item.quantity }}</span>
          </template>
          <template #item.status="{ item }">
            <v-chip :color="lineStatusColor(item)" size="x-small" variant="tonal">
              {{ lineStatusLabel(item) }}
            </v-chip>
          </template>
        </v-data-table>
      </v-card>

      <!-- ─── Plates ───────────────────────────────────────────────────────── -->
      <v-card>
        <v-card-text>
          <div class="d-flex align-center mb-2">
            <span class="text-caption text-medium-emphasis font-weight-bold" style="letter-spacing:.05em">
              PLATES ({{ plates.length }})
            </span>
            <v-spacer />
            <v-btn icon variant="text" size="x-small" :loading="loadingPlates" @click="fetchPlates">
              <v-icon size="16">mdi:mdi-refresh</v-icon>
            </v-btn>
          </div>

          <div v-if="loadingPlates" class="pa-4 text-center">
            <v-progress-circular indeterminate size="24" />
          </div>
          <div v-else-if="!plates.length" class="text-medium-emphasis text-body-2 py-2">
            <v-icon size="small" class="mr-1">mdi:mdi-clock-outline</v-icon>
            No plates yet — accept the order and use Force Plan to create plates,
            or the optimizer will run automatically every 5 minutes.
          </div>
          <div v-else>
            <PlateRow
              v-for="plate in plates"
              :key="plate.id"
              :plate="plate"
              :loading="forcingSlice.has(plate.id)"
              @force-slice="forceSlice"
            />
          </div>
        </v-card-text>
      </v-card>

    </template>

    <div v-else class="pa-8 text-center text-medium-emphasis">
      Order not found.
    </div>

    <!-- ─── Reject/Cancel dialog ─────────────────────────────────────────── -->
    <v-dialog v-model="rejectDialog" max-width="420">
      <v-card>
        <v-card-title>{{ order?.status === 'RECEIVED' ? 'Reject Order?' : 'Cancel Order?' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="rejectReason" label="Reason (optional)" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="actioning" @click="submitReject">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarMsg }}</v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BuildOrderService,
  PlannedPlateService,
  type BuildOrder,
  type BuildOrderStatus,
  type BuildOrderLine,
  type PlannedPlate,
} from '@/backend/build-order-workflow.service'
import PlateRow from '@/components/Production/PlateRow.vue'

const route = useRoute()
const router = useRouter()
const orderId = Number(route.params.id)

const loading = ref(false)
const loadingPlates = ref(false)
const actioning = ref(false)
const order = ref<BuildOrder | null>(null)
const plates = ref<PlannedPlate[]>([])
const forcingSlice = ref(new Set<number>())
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')
const rejectDialog = ref(false)
const rejectReason = ref('')

const totalOrdered = computed(() => (order.value?.lines ?? []).reduce((s, l) => s + l.quantity, 0))
const totalCompleted = computed(() => (order.value?.lines ?? []).reduce((s, l) => s + l.completedQuantity, 0))

function notify(msg: string, color = 'success') {
  snackbarMsg.value = msg; snackbarColor.value = color; snackbar.value = true
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function orderStatusColor(status: BuildOrderStatus): string {
  const map: Record<BuildOrderStatus, string> = {
    RECEIVED: 'blue', ACCEPTED: 'teal', PLANNING: 'orange', IN_PROGRESS: 'purple',
    COMPLETED: 'success', PARTIALLY_COMPLETED: 'warning', REJECTED: 'error', FAILED: 'error',
  }
  return map[status] ?? 'grey'
}

function lineStatusColor(line: BuildOrderLine): string {
  if (line.completedQuantity >= line.quantity) return 'success'
  if (line.completedQuantity > 0) return 'orange'
  return 'blue-grey'
}

function lineStatusLabel(line: BuildOrderLine): string {
  if (line.completedQuantity >= line.quantity) return 'Done'
  if (line.completedQuantity > 0) return 'In progress'
  return 'Pending'
}

async function fetchOrder() {
  loading.value = true
  try { order.value = await BuildOrderService.get(orderId) }
  catch { notify('Failed to load order', 'error') }
  finally { loading.value = false }
}

async function fetchPlates() {
  loadingPlates.value = true
  try { plates.value = await PlannedPlateService.listForOrder(orderId) }
  catch { notify('Failed to load plates', 'error') }
  finally { loadingPlates.value = false }
}

async function acceptOrder() {
  if (!order.value) return
  actioning.value = true
  try { order.value = await BuildOrderService.accept(order.value.id); notify('Order accepted') }
  catch (e: any) { notify(e?.response?.data?.error ?? 'Failed to accept', 'error') }
  finally { actioning.value = false }
}

async function forcePlan() {
  if (!order.value) return
  actioning.value = true
  try {
    order.value = await BuildOrderService.forcePlan(order.value.id)
    notify('Force-planned — plates created')
    await fetchPlates()
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to force plan', 'error')
  } finally { actioning.value = false }
}

async function submitReject() {
  if (!order.value) return
  actioning.value = true
  try {
    order.value = await BuildOrderService.reject(order.value.id, rejectReason.value || undefined)
    notify('Order cancelled')
    rejectDialog.value = false
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to cancel', 'error')
  } finally { actioning.value = false }
}

async function forceSlice(plate: PlannedPlate) {
  forcingSlice.value = new Set([...forcingSlice.value, plate.id])
  try {
    await PlannedPlateService.forceSlice(plate.id)
    notify(`Plate #${plate.id} queued for slicing`)
    await fetchPlates()
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to queue plate', 'error')
  } finally {
    const next = new Set(forcingSlice.value); next.delete(plate.id); forcingSlice.value = next
  }
}

const lineHeaders = [
  { title: 'Part Name', key: 'name', sortable: false },
  { title: 'External Part ID', key: 'externalPartId' },
  { title: 'Done / Ordered', key: 'qty', sortable: false, width: 130 },
  { title: 'Status', key: 'status', sortable: false, width: 110 },
]

onMounted(async () => {
  await fetchOrder()
  await fetchPlates()
})
</script>

<style scoped>
.header-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0 24px;
}

@media (max-width: 600px) {
  .header-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;
  }
}

.header-cell {
  display: flex;
  flex-direction: column;
}

.cell-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin-bottom: 2px;
}

.cell-value {
  font-size: 0.95rem;
  font-weight: 500;
}

.timestamp-cell {
  display: flex;
  align-items: baseline;
}
</style>
