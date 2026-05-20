<template>
  <v-container fluid>
    <!-- Back nav -->
    <div class="d-flex align-center mb-4 ga-2">
      <v-btn variant="text" prepend-icon="mdi:mdi-arrow-left" @click="router.push('/production')">
        Production
      </v-btn>
      <v-icon size="small" color="medium-emphasis">mdi:mdi-chevron-right</v-icon>
      <span class="text-body-1 text-medium-emphasis">Order #{{ orderId }}</span>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate />
    </div>

    <template v-else-if="order">
      <!-- ─── Header band ──────────────────────────────────────────────────── -->
      <v-card class="mb-4">
        <v-card-text>
          <div class="d-flex align-center flex-wrap ga-3 mb-3">
            <div>
              <div class="text-h6">
                {{ order.externalOrderId ? `Order ${order.externalOrderId}` : `Order #${order.id}` }}
              </div>
              <div class="text-caption text-medium-emphasis">
                Source: {{ order.source || '—' }}
                <span v-if="order.requiredBy"> · Due {{ new Date(order.requiredBy).toLocaleDateString() }}</span>
              </div>
            </div>
            <v-spacer />
            <v-chip :color="orderStatusColor(order.status)" variant="tonal">
              {{ order.status }}
            </v-chip>
          </div>

          <!-- Priority + completion -->
          <div class="d-flex align-center ga-4 flex-wrap mb-3">
            <div style="min-width: 180px">
              <div class="text-caption text-medium-emphasis mb-1">Priority</div>
              <div class="d-flex align-center ga-1">
                <v-progress-linear
                  :model-value="order.dynamicPriority"
                  :color="order.dynamicPriority >= 70 ? 'error' : order.dynamicPriority >= 30 ? 'warning' : 'success'"
                  rounded
                  height="8"
                  style="min-width: 80px"
                />
                <span class="text-caption">{{ Math.round(order.dynamicPriority) }}</span>
              </div>
            </div>
            <div style="min-width: 200px">
              <div class="text-caption text-medium-emphasis mb-1">
                Completion — {{ totalCompleted }} / {{ totalOrdered }} parts
              </div>
              <v-progress-linear
                :model-value="totalOrdered > 0 ? (totalCompleted / totalOrdered) * 100 : 0"
                color="success"
                rounded
                height="8"
              />
            </div>
          </div>

          <!-- Action buttons -->
          <div class="d-flex ga-2 flex-wrap">
            <v-btn
              v-if="order.status === 'RECEIVED'"
              variant="tonal"
              color="primary"
              size="small"
              :loading="actioning"
              @click="acceptOrder"
            >
              Accept
            </v-btn>
            <v-btn
              v-if="order.status === 'RECEIVED'"
              variant="tonal"
              color="error"
              size="small"
              @click="rejectDialog = true"
            >
              Reject
            </v-btn>
            <v-btn
              v-if="order.status === 'ACCEPTED' || order.status === 'PLANNING'"
              variant="tonal"
              color="teal"
              size="small"
              :loading="actioning"
              @click="forcePlan"
            >
              Force Plan
            </v-btn>
            <v-btn
              v-if="!['COMPLETED', 'REJECTED', 'FAILED', 'RECEIVED'].includes(order.status)"
              variant="tonal"
              color="error"
              size="small"
              @click="rejectDialog = true"
            >
              Cancel Order
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- ─── Tabs ─────────────────────────────────────────────────────────── -->
      <v-tabs v-model="activeTab" class="mb-1">
        <v-tab value="overview">Overview</v-tab>
        <v-tab value="lines">Lines ({{ order.lines?.length ?? 0 }})</v-tab>
        <v-tab value="plates">
          Plates
          <v-chip
            v-if="activePlateCount > 0"
            size="x-small"
            color="primary"
            variant="tonal"
            class="ml-1"
          >
            {{ activePlateCount }}
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-tabs-window v-model="activeTab">
        <!-- ── Overview ──────────────────────────────────────────────────── -->
        <v-tabs-window-item value="overview">
          <v-card>
            <v-card-text>
              <v-row>
                <v-col cols="12" sm="6">
                  <div class="stat-row">
                    <span class="stat-label">Status</span>
                    <v-chip :color="orderStatusColor(order.status)" size="small" variant="tonal">
                      {{ order.status }}
                    </v-chip>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Source</span>
                    <span>{{ order.source || '—' }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Priority</span>
                    <span>{{ Math.round(order.dynamicPriority) }} / 100</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Lines</span>
                    <span>{{ order.lines?.length ?? 0 }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Est. print time</span>
                    <span>{{ order.estimatedTotalPrintHours ? `${order.estimatedTotalPrintHours.toFixed(1)}h` : '—' }}</span>
                  </div>
                  <div v-if="order.webhookCallbackUrl" class="stat-row">
                    <span class="stat-label">Webhook</span>
                    <span class="text-caption text-truncate" style="max-width: 260px">{{ order.webhookCallbackUrl }}</span>
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="stat-row">
                    <span class="stat-label">Created</span>
                    <span>{{ formatDate(order.createdAt) }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Accepted</span>
                    <span>{{ order.acceptedAt ? formatDate(order.acceptedAt) : '—' }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Required by</span>
                    <span>{{ order.requiredBy ? new Date(order.requiredBy).toLocaleDateString() : '—' }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Completed</span>
                    <span>{{ order.completedAt ? formatDate(order.completedAt) : '—' }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Failed</span>
                    <span>{{ order.failedAt ? formatDate(order.failedAt) : '—' }}</span>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-tabs-window-item>

        <!-- ── Lines ─────────────────────────────────────────────────────── -->
        <v-tabs-window-item value="lines">
          <v-card>
            <v-data-table
              :headers="lineHeaders"
              :items="order.lines ?? []"
              item-value="id"
              hide-default-footer
              :items-per-page="-1"
            >
              <template #item.name="{ item }">
                <span class="font-weight-medium">{{ item.printPart?.name ?? '—' }}</span>
              </template>

              <template #item.qty="{ item }">
                <span>
                  <span class="font-weight-medium">{{ item.completedQuantity }}</span>
                  <span class="text-medium-emphasis"> / {{ item.quantity }}</span>
                </span>
              </template>

              <template #item.status="{ item }">
                <v-chip
                  :color="lineStatusColor(item)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ lineStatusLabel(item) }}
                </v-chip>
              </template>
            </v-data-table>
          </v-card>
        </v-tabs-window-item>

        <!-- ── Plates ────────────────────────────────────────────────────── -->
        <v-tabs-window-item value="plates">
          <v-card>
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <span class="text-body-2 text-medium-emphasis">
                  {{ plates.length }} plate(s) for this order
                </span>
                <v-spacer />
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  :loading="loadingPlates"
                  @click="fetchPlates"
                >
                  <v-icon>mdi:mdi-refresh</v-icon>
                </v-btn>
              </div>

              <div v-if="loadingPlates" class="pa-4 text-center">
                <v-progress-circular indeterminate size="24" />
              </div>

              <div v-else-if="!plates.length" class="text-medium-emphasis text-body-2 pa-2">
                <v-icon size="small" class="mr-1">mdi:mdi-clock-outline</v-icon>
                No plates yet — accept the order and use Force Plan to create plates immediately,
                or wait for the optimizer (runs every 5 minutes).
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
        </v-tabs-window-item>
      </v-tabs-window>
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

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMsg }}
    </v-snackbar>
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

// ─── State ────────────────────────────────────────────────────────────────────

const loading = ref(false)
const loadingPlates = ref(false)
const actioning = ref(false)
const order = ref<BuildOrder | null>(null)
const plates = ref<PlannedPlate[]>([])
const forcingSlice = ref(new Set<number>())
const activeTab = ref('overview')
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')
const rejectDialog = ref(false)
const rejectReason = ref('')

// ─── Computed ─────────────────────────────────────────────────────────────────

const totalOrdered = computed(() =>
  (order.value?.lines ?? []).reduce((s, l) => s + l.quantity, 0)
)
const totalCompleted = computed(() =>
  (order.value?.lines ?? []).reduce((s, l) => s + l.completedQuantity, 0)
)
const activePlateCount = computed(() =>
  plates.value.filter(p => !['DONE', 'CANCELLED'].includes(p.status)).length
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notify(msg: string, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
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

// ─── Data loading ─────────────────────────────────────────────────────────────

async function fetchOrder() {
  loading.value = true
  try {
    order.value = await BuildOrderService.get(orderId)
  } catch {
    notify('Failed to load order', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchPlates() {
  loadingPlates.value = true
  try {
    plates.value = await PlannedPlateService.listForOrder(orderId)
  } catch {
    notify('Failed to load plates', 'error')
  } finally {
    loadingPlates.value = false
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

async function acceptOrder() {
  if (!order.value) return
  actioning.value = true
  try {
    order.value = await BuildOrderService.accept(order.value.id)
    notify('Order accepted')
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to accept', 'error')
  } finally {
    actioning.value = false
  }
}

async function forcePlan() {
  if (!order.value) return
  actioning.value = true
  try {
    order.value = await BuildOrderService.forcePlan(order.value.id)
    notify('Order force-planned — plates created')
    await fetchPlates()
    activeTab.value = 'plates'
  } catch (e: any) {
    notify(e?.response?.data?.error ?? 'Failed to force plan', 'error')
  } finally {
    actioning.value = false
  }
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
  } finally {
    actioning.value = false
  }
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
    const next = new Set(forcingSlice.value)
    next.delete(plate.id)
    forcingSlice.value = next
  }
}

// ─── Table headers ────────────────────────────────────────────────────────────

const lineHeaders = [
  { title: 'Part Name', key: 'name', sortable: false },
  { title: 'External Part ID', key: 'externalPartId' },
  { title: 'Qty (done / ordered)', key: 'qty', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
]

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await fetchOrder()
  await fetchPlates()
})
</script>

<style scoped>
.stat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
}
.stat-label {
  min-width: 130px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
