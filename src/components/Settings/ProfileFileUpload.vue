<template>
  <div class="d-flex align-center ga-2">
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="d-none"
      @change="onFileChange"
    />
    <v-btn
      size="small"
      variant="tonal"
      :loading="uploading"
      prepend-icon="mdi:mdi-upload"
      @click="fileInput?.click()"
    >
      {{ fileName ? 'Replace' : 'Upload .json' }}
    </v-btn>
    <span v-if="fileName" class="text-body-2 text-medium-emphasis text-truncate" style="max-width: 260px">
      {{ fileName }}
    </span>
    <span v-else class="text-body-2 text-disabled">No file uploaded</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ProfileFileService } from '@/backend/build-order-workflow.service'

const props = defineProps<{
  path: string | null | undefined
  type: 'process' | 'machine' | 'filament'
}>()

const emit = defineEmits<{
  uploaded: [path: string]
  error: [msg: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const fileName = computed(() => {
  if (!props.path) return ''
  return props.path.split(/[\\/]/).pop() ?? ''
})

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const result = await ProfileFileService.upload(props.type, file)
    emit('uploaded', result.path)
  } catch (err: any) {
    emit('error', err?.response?.data?.error ?? 'Upload failed')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>
