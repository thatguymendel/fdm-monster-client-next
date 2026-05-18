<template>
  <v-card>
    <v-card-text>
      <div class="d-flex align-center mb-4">
        <h2 class="text-h6">OrcaSlicer Integration</h2>
        <v-spacer />
        <v-chip
          v-if="loaded"
          :color="configured ? 'success' : 'warning'"
          size="small"
          variant="tonal"
        >
          {{ configured ? 'Configured' : 'Not Configured' }}
        </v-chip>
      </div>

      <p class="text-body-2 text-medium-emphasis mb-4">
        Configure the path to the OrcaSlicer binary used for auto-slicing planned plates.
        The binary must be accessible from the machine running FDM Monster.
      </p>

      <v-form @submit.prevent="saveConfig">
        <v-text-field
          v-model="binaryPath"
          label="OrcaSlicer binary path"
          placeholder="C:\Program Files\OrcaSlicer\orca-slicer.exe"
          variant="outlined"
          density="compact"
          :loading="loading"
          hint="Full path to the orca-slicer executable"
          persistent-hint
          class="mb-4"
        />

        <v-text-field
          v-model.number="timeoutMs"
          label="Slice timeout (ms)"
          type="number"
          variant="outlined"
          density="compact"
          hint="Max time to wait for slicing to complete (default: 300000 = 5 min)"
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
          OrcaSlicer found. Version: <strong>{{ testResult.version ?? 'unknown' }}</strong>
        </span>
        <span v-else>
          {{ testResult.error ?? 'Connection failed' }}
        </span>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { SlicerConfigService, type SlicerTestResult } from '@/backend/build-order-workflow.service'

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
    const resp = await SlicerConfigService.getConfig()
    configured.value = resp.configured
    if (resp.config) {
      binaryPath.value = resp.config.binaryPath
      timeoutMs.value = resp.config.timeoutMs ?? null
    }
  } catch (_) {
    // not critical
  } finally {
    loading.value = false
    loaded.value = true
  }
}

async function saveConfig() {
  saving.value = true
  testResult.value = null
  try {
    const resp = await SlicerConfigService.setConfig({
      mode: 'local',
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
    testResult.value = await SlicerConfigService.testConnection()
  } catch (_) {
    testResult.value = { ok: false, error: 'Request failed' }
  } finally {
    testing.value = false
  }
}

onMounted(loadConfig)
</script>
