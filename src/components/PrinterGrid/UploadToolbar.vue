<script setup lang="ts">
import { computed } from "vue";
import { useDialog } from "@/shared/dialog.composable";
import { DialogName } from "@/components/Generic/Dialogs/dialog.constants";
import { convertMultiPrinterFileToQueue } from "@/utils/uploads-state.utils";
import { PrinterDto } from "@/models/printers/printer.model";
import { PrintersService, PrinterRemoteFileService } from "@/backend";
import { usePrinterStore } from "@/store/printer.store";
import { usePrinterStateStore } from "@/store/printer-state.store";
import { useUploadsStore } from "@/store/uploads.store";
import { useSnackbar } from "@/shared/snackbar.composable";
import { formatFileSize } from "@/utils/file-size.util";
import { useDispatchFileStore } from "@/store/dispatch-file.store";

const printersStore = usePrinterStore()
const printerStateStore = usePrinterStateStore()
const uploadsStore = useUploadsStore()
const snackbar = useSnackbar()
const dispatchFileStore = useDispatchFileStore()

const fileUpload = ref<HTMLInputElement | null>(null)
const hasPrintersSelected = computed(
  () => printersStore.selectedPrinters.length > 0
)
const selectedPrinters = computed(() => printersStore.selectedPrinters)

const filesSelected = () => {
  if (fileUpload.value?.files?.[0]) {
    dispatchFileStore.setLocalFile(fileUpload.value.files[0])
  } else {
    dispatchFileStore.clearAll()
  }
}
const deselectFile = () => {
  if (fileUpload.value) {
    fileUpload.value.value = ''
  }
  dispatchFileStore.clearAll()
}
const batchReprintFiles = async () => {
  const printerIds = printersStore.selectedPrinters?.map((p) => p.id) ?? []
  const output = await useDialog(DialogName.BatchReprintDialog).handleAsync(
    printerIds as any
  )
  console.log('[PrinterGridView] Dialog completed', output)
}
const uploadFile = async (startPrint: boolean) => {
  const selectedPrintersValue = selectedPrinters.value
  const accessiblePrinters = selectedPrintersValue.filter((p) =>
    printerStateStore.isApiResponding(p.id)
  )

  if (!dispatchFileStore.hasFile) return

  const incompleteListCount = selectedPrintersValue.length - accessiblePrinters.length
  if (incompleteListCount > 0) {
    snackbar.openInfoMessage({
      title: `${incompleteListCount} printers inaccessible`,
      subtitle: 'These were skipped from uploading.'
    })
  }

  if (dispatchFileStore.isSlicerFile && dispatchFileStore.slicerFile) {
    const { fileStorageId } = dispatchFileStore.slicerFile
    await Promise.all(
      accessiblePrinters.map((p) =>
        PrinterRemoteFileService.uploadFromStorage(p.id, fileStorageId, startPrint).catch((e) => {
          console.error(`Failed to dispatch slicer file to printer ${p.name}:`, e)
          snackbar.openErrorMessage({ title: `Failed to dispatch to ${p.name}` })
        })
      )
    )
  } else if (dispatchFileStore.localFile) {
    const uploads = convertMultiPrinterFileToQueue(
      accessiblePrinters,
      dispatchFileStore.localFile,
      startPrint
    )
    uploadsStore.queueUploads(uploads)
    if (fileUpload.value) {
      fileUpload.value.value = ''
    }
  }

  clearSelectedPrinters()
}
const deselectPrinter = (printer: PrinterDto) => {
  printersStore.toggleSelectedPrinter(printer)
}
const clearSelectedPrinters = () => {
  printersStore.clearSelectedPrinters()
}

const openPrinter = (printer: PrinterDto) => {
  PrintersService.openPrinterURL(printer.printerURL)
}
</script>

<template>
  <v-banner
    v-drop-upload="{ printers: selectedPrinters }"
  >
    <v-row style="margin-bottom: -5px">
      <v-col style="padding: 5px 0 0 15px">
        <v-chip-group class="d-inline-block">
          <v-chip
            v-if="selectedPrinters.length === 0"
            size="small"
          >
            No selected printers
          </v-chip>
          <v-chip
            v-for="selectedPrinter in selectedPrinters"
            :key="selectedPrinter.id"
            closable
            color="primary"
            size="small"
            @click="openPrinter(selectedPrinter)"
            @click:close="deselectPrinter(selectedPrinter)"
          >
            {{ selectedPrinter.name }}
          </v-chip>
        </v-chip-group>
      </v-col>
      <v-col
        align="right"
        style="padding: 0"
      >
        <v-chip-group
          v-if="dispatchFileStore.hasFile"
          class="float-end"
        >
          <v-chip
            closable
            :color="dispatchFileStore.isSlicerFile ? 'secondary' : undefined"
            @click:close="deselectFile()"
          >
            <v-icon v-if="dispatchFileStore.isSlicerFile" size="small" class="mr-1">mdi:mdi-printer-3d</v-icon>
            {{ dispatchFileStore.displayName }}
            <strong v-if="dispatchFileStore.localFile" class="pl-1">
              {{ formatFileSize(dispatchFileStore.localFile.size) }}
            </strong>
          </v-chip>
        </v-chip-group>
        <br />
        <v-btn
          :disabled="!hasPrintersSelected"
          color="primary"
          variant="elevated"
          size="small"
          @click="batchReprintFiles()"
        >
          <v-icon class="pr-2" size="small">refresh</v-icon>
          Batch reprint
        </v-btn>
        <v-btn
          :disabled="selectedPrinters.length === 0"
          class="ml-2"
          variant="elevated"
          size="small"
          @click="clearSelectedPrinters()"
        >
          <v-icon class="pr-2" size="small">delete</v-icon>
          Clear all ({{ selectedPrinters.length }})
        </v-btn>
        <v-btn
          class="ml-2"
          variant="elevated"
          size="small"
          @click="fileUpload?.click()"
        >
          Select gcode file
        </v-btn>
        <v-btn
          :disabled="!dispatchFileStore.hasFile"
          class="ml-2"
          color="success"
          variant="elevated"
          size="small"
          @click="uploadFile(false)"
        >
          Upload only
        </v-btn>
        <v-btn
          :disabled="!dispatchFileStore.hasFile"
          class="ml-2 mr-5"
          color="success"
          variant="elevated"
          size="small"
          @click="uploadFile(true)"
        >
          Upload and print
        </v-btn>
        <input
          ref="fileUpload"
          :multiple="false"
          accept=".gcode,.3mf,.bgcode"
          style="display: none"
          type="file"
          @change="filesSelected()"
        />
      </v-col>
    </v-row>
  </v-banner>
</template>
