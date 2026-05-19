<template>
  <v-card>
    <v-card-text>
      <div class="d-flex align-center mb-4">
        <h2 class="text-h6">PrusaSlicer Integration</h2>
        <v-spacer />
        <v-chip v-if="loaded" :color="configured ? 'success' : 'warning'" size="small" variant="tonal">
          {{ configured ? 'Configured' : 'Not Configured' }}
        </v-chip>
      </div>

      <v-alert color="info" variant="tonal" density="compact" class="mb-4">
        <div class="text-body-2">
          Run PrusaSlicer locally on the Pi (ARM64 AppImage). First check your Pi architecture with
          <code>uname -m</code> — it must say <strong>aarch64</strong>. Then download the ARM64 AppImage from the
          PrusaSlicer GitHub releases page and install it to <code>/usr/local/bin/prusa-slicer</code>.
        </div>
      </v-alert>

      <v-form @submit.prevent="saveConfig">
        <v-text-field
          v-model="binaryPath"
          label="PrusaSlicer binary path"
          placeholder="/usr/local/bin/prusa-slicer"
          variant="outlined"
          density="compact"
          hint="Full path to the prusa-slicer executable on the Pi"
          persistent-hint
          class="mb-4"
        />

        <v-text-field
          v-model.number="timeoutMs"
          label="Slice timeout (ms)"
          type="number"
          variant="outlined"
          density="compact"
          hint="Max time to wait for slicing (default: 600000 = 10 min)"
          persistent-hint
          class="mb-4"
        />

        <div class="d-flex ga-3 flex-wrap">
          <v-btn
            color="primary"
            type="submit"
            :loading="saving"
            :disabled="!binaryPath"
            prepend-icon="save"
          >
            Save
          </v-btn>
          <v-btn
            variant="tonal"
            :loading="testing"
            :disabled="!configured"
            prepend-icon="play_circle"
            @click="testConn"
          >
            Test Connection
          </v-btn>
        </div>
      </v-form>

      <v-alert
        v-if="testResult"
        :color="testResult.ok ? 'success' : 'error'"
        variant="tonal"
        class="mt-4"
        :prepend-icon="testResult.ok ? 'check_circle' : 'error'"
      >
        <span v-if="testResult.ok">
          PrusaSlicer found. Version: <strong>{{ testResult.version ?? 'unknown' }}</strong>
        </span>
        <span v-else>{{ testResult.error ?? 'Connection failed' }}</span>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PrusaSlicerService, type SlicerTestResult } from '@/backend/build-order-workflow.service'

const binaryPath = ref('')
const timeoutMs = ref<number | null>(null)
const configured = ref(false)
const loaded = ref(false)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref<SlicerTestResult | null>(null)

async function loadConfig() {
  loading.value = true
  try {
    const resp = await PrusaSlicerService.getConfig()
    configured.value = resp.configured
    if (resp.config) {
      binaryPath.value = resp.config.binaryPath
      timeoutMs.value = resp.config.timeoutMs ?? null
    }
  } catch (_) {
    // non-critical
  } finally {
    loading.value = false
    loaded.value = true
  }
}

async function saveConfig() {
  saving.value = true
  testResult.value = null
  try {
    const resp = await PrusaSlicerService.setConfig({
      binaryPath: binaryPath.value,
      timeoutMs: timeoutMs.value ?? undefined,
    })
    configured.value = resp.configured
  } catch (_) {
    // ignore
  } finally {
    saving.value = false
  }
}

async function testConn() {
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await PrusaSlicerService.testConnection()
  } catch (_) {
    testResult.value = { ok: false, error: 'Request failed' }
  } finally {
    testing.value = false
  }
}

onMounted(loadConfig)
</script>
