<template>
  <v-card>
    <v-card-text>
      <div class="d-flex align-center mb-4">
        <h2 class="text-h6">Plate Optimizer</h2>
        <v-spacer />
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!dirty"
          @click="save"
          prepend-icon="mdi:mdi-content-save"
        >
          Save
        </v-btn>
      </div>

      <v-alert color="info" variant="tonal" density="compact" class="mb-4">
        <div class="text-body-2">
          The plate optimizer groups accepted orders into print plates. Hold windows control
          how long the optimizer waits before committing plates for partially-filled slots.
          Set to <strong>0 ms</strong> to commit immediately regardless of fill level.
        </div>
      </v-alert>

      <v-row v-if="loaded">
        <v-col cols="12" sm="4">
          <v-text-field
            v-model.number="form.holdWindowHighMs"
            label="Hold window — High priority (ms)"
            type="number"
            min="0"
            density="compact"
            hint="Priority ≥ 70"
            persistent-hint
            @update:model-value="dirty = true"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-text-field
            v-model.number="form.holdWindowNormalMs"
            label="Hold window — Normal priority (ms)"
            type="number"
            min="0"
            density="compact"
            hint="Priority 30–69 (default: 300000 = 5 min)"
            persistent-hint
            @update:model-value="dirty = true"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-text-field
            v-model.number="form.holdWindowLowMs"
            label="Hold window — Low priority (ms)"
            type="number"
            min="0"
            density="compact"
            hint="Priority < 30 (default: 900000 = 15 min)"
            persistent-hint
            @update:model-value="dirty = true"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <div class="text-body-2 mb-1">Fill threshold: {{ Math.round(form.fillThreshold * 100) }}%</div>
          <v-slider
            v-model="form.fillThreshold"
            min="0"
            max="1"
            step="0.05"
            thumb-label
            color="primary"
            :thumb-size="20"
            @update:model-value="dirty = true"
          >
            <template #thumb-label="{ modelValue }">{{ Math.round(modelValue * 100) }}%</template>
          </v-slider>
          <div class="text-caption text-medium-emphasis">
            Commit a plate when it's at least this full (0% = always commit, 100% = only when full).
          </div>
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model.number="form.defaultMaxPerPlate"
            label="Default max parts per plate"
            type="number"
            min="1"
            density="compact"
            hint="Used when a part has no specific maxPerPlate set"
            persistent-hint
            @update:model-value="dirty = true"
          />
        </v-col>
      </v-row>

      <div v-if="!loaded" class="d-flex justify-center pa-8">
        <v-progress-circular indeterminate />
      </div>

      <v-alert v-if="saveSuccess" color="success" variant="tonal" class="mt-3" density="compact">
        Settings saved.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { OptimizerSettingsService, type OptimizerSettings } from '@/backend/optimizer-settings.service'

const loaded = ref(false)
const saving = ref(false)
const dirty = ref(false)
const saveSuccess = ref(false)

const form = ref<OptimizerSettings>({
  holdWindowHighMs: 0,
  holdWindowNormalMs: 300000,
  holdWindowLowMs: 900000,
  fillThreshold: 0.3,
  defaultMaxPerPlate: 6,
})

onMounted(async () => {
  try {
    form.value = await OptimizerSettingsService.get()
  } catch (e) {
    console.error('Failed to load optimizer settings', e)
  } finally {
    loaded.value = true
  }
})

async function save() {
  saving.value = true
  saveSuccess.value = false
  try {
    form.value = await OptimizerSettingsService.update(form.value)
    dirty.value = false
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e) {
    console.error('Failed to save optimizer settings', e)
  } finally {
    saving.value = false
  }
}
</script>
