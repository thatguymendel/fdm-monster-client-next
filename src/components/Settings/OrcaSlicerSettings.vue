<template>
  <v-card>
    <v-card-text>
      <div class="d-flex align-center mb-4">
        <h2 class="text-h6">OrcaSlicer Integration</h2>
        <v-spacer />
        <v-chip v-if="loaded" :color="configured ? 'success' : 'warning'" size="small" variant="tonal">
          {{ configured ? 'Configured' : 'Not Configured' }}
        </v-chip>
      </div>

      <v-alert color="info" variant="tonal" density="compact" class="mb-4">
        <div class="text-body-2">
          <strong>Remote mode</strong> (recommended): Run
          <code>node tools/slicer-proxy.js --binary "C:\...\orca-slicer.exe"</code>
          on your Windows machine, then set the Remote URL below to
          <code>http://&lt;windows-ip&gt;:4002</code>.
          The Pi will send files to Windows for slicing.
        </div>
      </v-alert>

      <v-form @submit.prevent="saveConfig">
        <v-btn-toggle v-model="mode" mandatory density="compact" class="mb-4">
          <v-btn value="local" size="small">Local (same machine)</v-btn>
          <v-btn value="remote" size="small">Remote (Windows proxy)</v-btn>
        </v-btn-toggle>

        <v-text-field
          v-if="mode === 'local'"
          v-model="binaryPath"
          label="OrcaSlicer binary path"
          placeholder="C:\Program Files\OrcaSlicer\orca-slicer.exe"
          variant="outlined"
          density="compact"
          hint="Full path to the orca-slicer executable on this machine"
          persistent-hint
          class="mb-4"
        />

        <v-text-field
          v-if="mode === 'remote'"
          v-model="remoteUrl"
          label="Proxy URL"
          placeholder="http://192.168.0.10:4002"
          variant="outlined"
          density="compact"
          hint="URL of the slicer-proxy.js server running on your Windows machine"
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
            :disabled="mode === 'local' ? !binaryPath : !remoteUrl"
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
          OrcaSlicer found. Version: <strong>{{ testResult.version ?? 'unknown' }}</strong>
        </span>
        <span v-else>{{ testResult.error ?? 'Connection failed' }}</span>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { SlicerConfigService, type SlicerTestResult } from '@/backend/build-order-workflow.service'

const mode = ref<'local' | 'remote'>('remote')
const binaryPath = ref('')
const remoteUrl = ref('')
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
    const resp = await SlicerConfigService.getConfig()
    configured.value = resp.configured
    if (resp.config) {
      mode.value = resp.config.mode
      timeoutMs.value = resp.config.timeoutMs ?? null
      if (resp.config.mode === 'local') binaryPath.value = resp.config.binaryPath
      else remoteUrl.value = resp.config.remoteUrl
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
    const config = mode.value === 'local'
      ? { mode: 'local' as const, binaryPath: binaryPath.value, timeoutMs: timeoutMs.value ?? undefined }
      : { mode: 'remote' as const, remoteUrl: remoteUrl.value, timeoutMs: timeoutMs.value ?? undefined }
    const resp = await SlicerConfigService.setConfig(config)
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
    testResult.value = await SlicerConfigService.testConnection()
  } catch (_) {
    testResult.value = { ok: false, error: 'Request failed' }
  } finally {
    testing.value = false
  }
}

onMounted(loadConfig)
</script>
