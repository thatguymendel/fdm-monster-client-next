<template>
  <div class="controls-tab pa-3 d-flex flex-column ga-4">

    <!-- Temperatures -->
    <div>
      <div class="text-overline text-medium-emphasis mb-2">Temperatures</div>
      <div class="d-flex flex-column ga-2">
        <!-- Hotend row -->
        <div class="d-flex align-center ga-3">
          <v-icon size="16" color="orange-darken-2">local_fire_department</v-icon>
          <span class="text-body-2 temp-label">Hotend</span>
          <span class="text-body-1 font-weight-bold">
            {{ hotendActual !== null ? `${hotendActual}°` : '—' }}
          </span>
          <span class="text-caption text-medium-emphasis">
            / {{ hotendTarget !== null ? `${hotendTarget}°` : '—' }}
          </span>
          <v-spacer />
          <v-text-field
            v-model.number="setHotendTemp"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
            suffix="°C"
            style="max-width:100px"
            :min="0"
            :max="300"
          />
          <v-btn
            size="small"
            variant="outlined"
            :disabled="!isOperational"
            :loading="settingHotend"
            @click="applyHotendTemp"
          >
            Set
          </v-btn>
        </div>

        <!-- Bed row -->
        <div class="d-flex align-center ga-3">
          <v-icon size="16" color="blue-darken-1">mdi:mdi-heating-coil</v-icon>
          <span class="text-body-2 temp-label">Bed</span>
          <span class="text-body-1 font-weight-bold">
            {{ bedActual !== null ? `${bedActual}°` : '—' }}
          </span>
          <span class="text-caption text-medium-emphasis">
            / {{ bedTarget !== null ? `${bedTarget}°` : '—' }}
          </span>
          <v-spacer />
          <v-text-field
            v-model.number="setBedTemp"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
            suffix="°C"
            style="max-width:100px"
            :min="0"
            :max="120"
          />
          <v-btn
            size="small"
            variant="outlined"
            :disabled="!isOperational"
            :loading="settingBed"
            @click="applyBedTemp"
          >
            Set
          </v-btn>
        </div>

        <!-- Cool-down shortcut -->
        <div>
          <v-btn
            size="x-small"
            variant="text"
            color="medium-emphasis"
            :disabled="!isOperational"
            @click="coolDown"
          >
            <v-icon start size="14">ac_unit</v-icon>
            Cool Down (turn off heaters)
          </v-btn>
        </div>
      </div>
    </div>

    <v-divider />

    <!-- Movement -->
    <div>
      <div class="text-overline text-medium-emphasis mb-2">Movement</div>

      <!-- Step size -->
      <div class="d-flex align-center ga-2 mb-3">
        <span class="text-caption text-medium-emphasis">Step:</span>
        <v-btn-toggle v-model="multiplier" mandatory density="compact" variant="outlined" divided>
          <v-btn :value="0.1">0.1</v-btn>
          <v-btn :value="1">1</v-btn>
          <v-btn :value="10">10</v-btn>
          <v-btn :value="100">100</v-btn>
        </v-btn-toggle>
        <span class="text-caption text-medium-emphasis">mm</span>
      </div>

      <div class="d-flex align-start ga-4">
        <!-- XY grid -->
        <div>
          <div class="text-caption text-medium-emphasis mb-1">X / Y</div>
          <div class="jog-xy">
            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(-1, 1, 0)"><v-icon>north_west</v-icon></v-btn>
            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(0, 1, 0)"><v-icon>north</v-icon></v-btn>
            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(1, 1, 0)"><v-icon>north_east</v-icon></v-btn>

            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(-1, 0, 0)"><v-icon>west</v-icon></v-btn>
            <v-btn class="jog-btn jog-home" variant="outlined" :disabled="!isOperational" @click="homeAxes(['x', 'y'])"><v-icon>home</v-icon></v-btn>
            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(1, 0, 0)"><v-icon>east</v-icon></v-btn>

            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(-1, -1, 0)"><v-icon>south_west</v-icon></v-btn>
            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(0, -1, 0)"><v-icon>south</v-icon></v-btn>
            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(1, -1, 0)"><v-icon>south_east</v-icon></v-btn>
          </div>
        </div>

        <!-- Z column -->
        <div>
          <div class="text-caption text-medium-emphasis mb-1">Z</div>
          <div class="jog-z">
            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(0, 0, 1)"><v-icon>north</v-icon></v-btn>
            <v-btn class="jog-btn jog-home" variant="outlined" :disabled="!isOperational" @click="homeAxes(['z'])"><v-icon>home</v-icon></v-btn>
            <v-btn class="jog-btn" variant="tonal" :disabled="!isOperational" @click="jog(0, 0, -1)"><v-icon>south</v-icon></v-btn>
          </div>
        </div>

        <!-- Home all -->
        <div class="d-flex align-end" style="align-self:flex-end">
          <v-btn :disabled="!isOperational" variant="outlined" size="small" prepend-icon="home" @click="homeAxes(['x', 'y', 'z'])">
            All
          </v-btn>
        </div>
      </div>
    </div>

    <v-divider />

    <!-- Feed rate + Flow rate -->
    <div class="d-flex flex-column ga-2">
      <div class="d-flex align-center ga-2">
        <span class="text-body-2 rate-label">Feed rate</span>
        <v-slider v-model="feedRate" :min="10" :max="200" :step="5" thumb-label hide-details density="compact" class="flex-grow-1" />
        <span class="text-body-2 font-weight-bold rate-value">{{ feedRate }}%</span>
        <v-btn size="small" variant="outlined" :disabled="!isOperational" :loading="settingFeedRate" @click="applyFeedRate">Set</v-btn>
      </div>
      <div class="d-flex align-center ga-2">
        <span class="text-body-2 rate-label">Flow rate</span>
        <v-slider v-model="flowRate" :min="75" :max="125" :step="1" thumb-label hide-details density="compact" class="flex-grow-1" />
        <span class="text-body-2 font-weight-bold rate-value">{{ flowRate }}%</span>
        <v-btn size="small" variant="outlined" :disabled="!isOperational" :loading="settingFlowRate" @click="applyFlowRate">Set</v-btn>
      </div>
    </div>

    <v-divider />

    <!-- Extrusion -->
    <div>
      <div class="text-overline text-medium-emphasis mb-2">Extrusion</div>
      <div class="d-flex align-center ga-2 mb-2 flex-wrap">
        <v-text-field
          v-model.number="extrudeAmount"
          type="number"
          label="Amount (mm)"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width:120px"
          :min="1"
          :max="200"
        />
        <v-text-field
          v-model.number="extrudeSpeed"
          type="number"
          label="Speed (mm/min)"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width:140px"
          :min="1"
          :max="2000"
        />
      </div>
      <div class="d-flex ga-2">
        <v-btn
          color="primary"
          variant="outlined"
          size="small"
          :disabled="!isOperational"
          :loading="extruding"
          @click="doExtrude(1)"
        >
          <v-icon start>arrow_downward</v-icon>
          Extrude
        </v-btn>
        <v-btn
          variant="outlined"
          size="small"
          :disabled="!isOperational"
          :loading="extruding"
          @click="doExtrude(-1)"
        >
          <v-icon start>arrow_upward</v-icon>
          Retract
        </v-btn>
      </div>
    </div>

    <v-divider />

    <!-- Fan -->
    <div>
      <div class="text-overline text-medium-emphasis mb-2">Fan</div>
      <div class="d-flex align-center ga-2 mb-2">
        <v-slider
          v-model="fanSpeed"
          :min="0"
          :max="100"
          :step="5"
          thumb-label
          hide-details
          density="compact"
          class="flex-grow-1"
        />
        <span class="text-body-2 font-weight-bold rate-value">{{ fanSpeed }}%</span>
      </div>
      <div class="d-flex ga-2">
        <v-btn
          size="small"
          variant="tonal"
          :disabled="!isOperational"
          :loading="settingFan"
          @click="applyFan"
        >
          <v-icon start>air</v-icon>
          Apply Fan
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          :disabled="!isOperational"
          :loading="settingFan"
          @click="fanOff"
        >
          Fan Off
        </v-btn>
      </div>
    </div>

    <v-divider />

    <!-- Motors / misc -->
    <div>
      <div class="text-overline text-medium-emphasis mb-2">Motors</div>
      <v-btn
        variant="outlined"
        size="small"
        :disabled="!isOperational"
        :loading="motorsOff"
        @click="doMotorsOff"
      >
        <v-icon start>power_off</v-icon>
        Disable Motors
      </v-btn>
    </div>

    <v-alert v-if="!isOperational" type="info" variant="tonal" density="compact" class="mt-2">
      Connect the printer to use controls.
    </v-alert>

  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { usePrinterStateStore } from '@/store/printer-state.store'
import { PrintersService } from '@/backend'

const props = defineProps<{ printerId: number }>()

const printerStateStore = usePrinterStateStore()

const isOperational = computed(() => printerStateStore.isPrinterOperational(props.printerId))

const temps = computed(() => {
  const events = printerStateStore.printerEventsById[props.printerId]
  return events?.current?.payload?.temps?.[0] ?? null
})
const hotendActual = computed(() => temps.value?.tool0?.actual ?? null)
const hotendTarget = computed(() => temps.value?.tool0?.target ?? null)
const bedActual = computed(() => temps.value?.bed?.actual ?? null)
const bedTarget = computed(() => temps.value?.bed?.target ?? null)

// ── Temperature set ───────────────────────────────────────────────────────────

const setHotendTemp = ref<number>(200)
const setBedTemp = ref<number>(60)
const settingHotend = ref(false)
const settingBed = ref(false)

async function applyHotendTemp() {
  settingHotend.value = true
  try {
    await PrintersService.sendGcode(props.printerId, `M104 S${setHotendTemp.value}`)
  } finally {
    settingHotend.value = false
  }
}

async function applyBedTemp() {
  settingBed.value = true
  try {
    await PrintersService.sendGcode(props.printerId, `M140 S${setBedTemp.value}`)
  } finally {
    settingBed.value = false
  }
}

async function coolDown() {
  await PrintersService.sendGcode(props.printerId, 'M104 S0\nM140 S0')
}

// ── Movement ──────────────────────────────────────────────────────────────────

const multiplier = ref<number>(10)

async function jog(x: number, y: number, z: number) {
  await PrintersService.sendPrinterJogCommand(props.printerId, {
    x: x * multiplier.value,
    y: y * multiplier.value,
    z: z * multiplier.value,
  })
}

async function homeAxes(axes: string[]) {
  await PrintersService.sendPrinterHomeCommand(props.printerId, axes)
}

// ── Feed / flow rate ──────────────────────────────────────────────────────────

const feedRate = ref(100)
const flowRate = ref(100)
const settingFeedRate = ref(false)
const settingFlowRate = ref(false)

async function applyFeedRate() {
  settingFeedRate.value = true
  try {
    await PrintersService.setFeedRate(props.printerId, feedRate.value)
  } finally {
    settingFeedRate.value = false
  }
}

async function applyFlowRate() {
  settingFlowRate.value = true
  try {
    await PrintersService.setFlowRate(props.printerId, flowRate.value)
  } finally {
    settingFlowRate.value = false
  }
}

// ── Extrusion ─────────────────────────────────────────────────────────────────

const extrudeAmount = ref(10)
const extrudeSpeed = ref(150)
const extruding = ref(false)

async function doExtrude(direction: 1 | -1) {
  extruding.value = true
  try {
    const e = direction * extrudeAmount.value
    await PrintersService.sendGcode(
      props.printerId,
      `G91\nG1 E${e} F${extrudeSpeed.value}\nG90`
    )
  } finally {
    extruding.value = false
  }
}

// ── Fan ───────────────────────────────────────────────────────────────────────

const fanSpeed = ref(100)
const settingFan = ref(false)

async function applyFan() {
  settingFan.value = true
  try {
    const s = Math.round(fanSpeed.value * 2.55)
    await PrintersService.sendGcode(props.printerId, `M106 S${s}`)
  } finally {
    settingFan.value = false
  }
}

async function fanOff() {
  settingFan.value = true
  try {
    await PrintersService.sendGcode(props.printerId, 'M107')
  } finally {
    settingFan.value = false
  }
}

// ── Motors ────────────────────────────────────────────────────────────────────

const motorsOff = ref(false)

async function doMotorsOff() {
  motorsOff.value = true
  try {
    await PrintersService.sendGcode(props.printerId, 'M18')
  } finally {
    motorsOff.value = false
  }
}
</script>

<style scoped>
.controls-tab {
  overflow-y: auto;
}

.temp-label {
  min-width: 52px;
}

.jog-xy {
  display: grid;
  grid-template-columns: repeat(3, 52px);
  grid-template-rows: repeat(3, 52px);
  gap: 4px;
}

.jog-z {
  display: grid;
  grid-template-columns: 52px;
  grid-template-rows: repeat(3, 52px);
  gap: 4px;
}

.jog-btn {
  width: 52px !important;
  min-width: 52px !important;
  height: 52px !important;
  padding: 0 !important;
}

.rate-label {
  min-width: 60px;
}

.rate-value {
  min-width: 44px;
  text-align: right;
}
</style>
