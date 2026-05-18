export class ServerApi {
  static readonly base = "/api/v2"
  static readonly firstTimeSetupRoute = `${ServerApi.base}/first-time-setup`
  static readonly completeFirstTimeSetupRoute = `${ServerApi.firstTimeSetupRoute}/complete`
  static readonly printerRoute = `${ServerApi.base}/printer`
  static readonly printerBatchRoute = `${ServerApi.printerRoute}/batch`
  static readonly printerTestConnectionRoute = `${ServerApi.printerRoute}/test-connection`
  static readonly printerSettingsRoute = `${ServerApi.base}/printer-settings`
  static readonly floorRoute = `${ServerApi.base}/floor`
  static readonly batchRoute = `${ServerApi.base}/batch`
  static readonly batchGetLastPrintedFilesRoute = `${ServerApi.batchRoute}/reprint/list`
  static readonly batchReprintFilesRoute = `${ServerApi.batchRoute}/reprint/execute`
  static readonly printJobsRoute = `${ServerApi.base}/print-jobs`
  static readonly printJobsSearchRoute = `${ServerApi.printJobsRoute}/search`
  static readonly printJobsSearchPagedRoute = `${ServerApi.printJobsRoute}/search-paged`
  static readonly printQueueRoute = `${ServerApi.base}/print-queue`
  static readonly printerRemoteFilesRoute = `${ServerApi.base}/printer-files`
  static readonly printerTagRoute = `${ServerApi.base}/printer-tag`
  static readonly createTagRoute = `${ServerApi.base}/printer-tag`
  static readonly userRoute = `${ServerApi.base}/user`
  static readonly rolesRoute = `${ServerApi.base}/user/roles`
  static readonly userProfileRoute = `${ServerApi.userRoute}/profile`
  static readonly settingsRoute = `${ServerApi.base}/settings`
  static readonly settingsSensitiveRoute = `${ServerApi.settingsRoute}/sensitive`
  static readonly updateLoginRequiredRoute = `${ServerApi.settingsRoute}/login-required`
  static readonly updateRegistrationEnabledRoute = `${ServerApi.settingsRoute}/registration-enabled`
  static readonly updateCredentialSettings = `${ServerApi.settingsRoute}/credential`
  static readonly updateFrontendSettingsRoute = `${ServerApi.settingsRoute}/frontend`
  static readonly updateTimeoutSettingRoute = `${ServerApi.settingsRoute}/timeout`
  static readonly serverSentryDiagnosticsSettingRoute = `${ServerApi.settingsRoute}/sentry-diagnostics`
  static readonly updateExperimentalMoonrakerSupportRoute = `${ServerApi.settingsRoute}/experimental-moonraker-support`
  static readonly updateExperimentalThumbnailSupportRoute = `${ServerApi.settingsRoute}/experimental-thumbnail-support`
  static readonly updateExperimentalPrusaLinkSupportRoute = `${ServerApi.settingsRoute}/experimental-prusa-link-support`
  static readonly updateExperimentalBambuSupportRoute = `${ServerApi.settingsRoute}/experimental-bambu-support`
  static readonly slicerApiKeyRoute = `${ServerApi.settingsRoute}/slicer-api-key`
  static readonly regenerateSlicerApiKeyRoute = `${ServerApi.slicerApiKeyRoute}/regenerate`
  static readonly apiKeysRoute = `${ServerApi.base}/api-keys`
  static readonly apiKeyRoute = (id: number) => `${ServerApi.apiKeysRoute}/${id}`

  static readonly deleteTagRoute = (id: number) => `${ServerApi.base}/printer-tag/${id}`

  static readonly updateTagNameRoute = (id: number) =>
    `${ServerApi.base}/printer-tag/${id}/name`

  static readonly updateTagColorRoute = (id: number) =>
    `${ServerApi.base}/printer-tag/${id}/color`

  static readonly addPrinterToTagRoute = (id: number) =>
    `${ServerApi.base}/printer-tag/${id}/printer`

  static readonly deletePrinterFromTagRoute = ServerApi.addPrinterToTagRoute

  static readonly getPrinterRoute = (id: number) => `${ServerApi.printerRoute}/${id}`
  static readonly postPrinterDisabledReasonRoute = (id: number) =>
    `${ServerApi.printerRoute}/${id}/disabled-reason`
  static readonly getPrinterLoginDetailsRoute = (id: number) =>
    `${ServerApi.getPrinterRoute(id)}/login-details`
  static readonly restartOctoPrintRoute = (id: number) =>
    `${ServerApi.getPrinterRoute(id)}/restart-octoprint`

  static readonly refreshSocketRoute = (id: number) =>
    `${ServerApi.getPrinterRoute(id)}/refresh-socket`
  static readonly getPrinterSettingsRoute = (id: number) =>
    `${ServerApi.printerSettingsRoute}/${id}`
  static readonly syncPrinterNameSettingRoute = (id: number) =>
    `${ServerApi.getPrinterSettingsRoute(id)}/sync-printername`
  static readonly getFloorRoute = (id: number) => `${ServerApi.floorRoute}/${id}`
  static readonly addOrRemovePrinterFromFloorRoute = (id: number) =>
    `${ServerApi.getFloorRoute(id)}/printer`
  static readonly sendQuickStopM112Route = (id: number) =>
    `${ServerApi.printerRoute}/${id}/send-emergency-m112`
  static readonly updatePrinterFloorNameRoute = (id: number) =>
    `${ServerApi.getFloorRoute(id)}/name`
  static readonly updatePrinterFloorOrderRoute = (id: number) =>
    `${ServerApi.getFloorRoute(id)}/floor-order`
  static readonly printerFilesClearRoute = (id: number) =>
    `${ServerApi.printerRemoteFilesRoute}/${id}/clear`
  static readonly printerFilesStartPrintRoute = (id: number) =>
    `${ServerApi.printerRemoteFilesRoute}/${id}/print`;
  static readonly printerFilesUploadRoute = (id: number) =>
    `${ServerApi.printerRemoteFilesRoute}/${id}/upload`
  static readonly printerFilesUploadFromStorageRoute = (id: number) =>
    `${ServerApi.printerRemoteFilesRoute}/${id}/upload-from-storage`
  static readonly printerEnabledRoute = (id: number) => `${ServerApi.getPrinterRoute(id)}/enabled`
  static readonly printerSerialConnectRoute = (id: number) =>
    `${ServerApi.getPrinterRoute(id)}/serial-connect`
  static readonly printerJogCommandRoute = (id: number) => `${ServerApi.getPrinterRoute(id)}/jog`
  static readonly printerHomeCommandRoute = (id: number) => `${ServerApi.getPrinterRoute(id)}/home`
  static readonly printerFeedRateRoute = (id: number) => `${ServerApi.getPrinterRoute(id)}/feed-rate`
  static readonly printerFlowRateRoute = (id: number) => `${ServerApi.getPrinterRoute(id)}/flow-rate`
  static readonly printerGcodeRoute = (id: number) => `${ServerApi.getPrinterRoute(id)}/gcode`
  static readonly printerSerialDisconnectRoute = (id: number) =>
    `${ServerApi.getPrinterRoute(id)}/serial-disconnect`

  static readonly printerJobRoute = (id: number) => `${ServerApi.getPrinterRoute(id)}/job`
  static readonly printerStopJobRoute = (id: number) => `${ServerApi.printerJobRoute(id)}/stop`
  static readonly printerPauseJobRoute = (id: number) => `${ServerApi.printerJobRoute(id)}/pause`
  static readonly printerResumeJobRoute = (id: number) => `${ServerApi.printerJobRoute(id)}/resume`

  static readonly userChangeUsernameRoute = (id: number) =>
    `${ServerApi.userRoute}/${id}/change-username`
  static readonly userChangePasswordRoute = (id: number) =>
    `${ServerApi.userRoute}/${id}/change-password`
  static readonly userDeleteRoute = (id: number) => `${ServerApi.userRoute}/${id}`
  static readonly userSetVerifiedRoute = (id: number) =>
    `${ServerApi.userRoute}/${id}/set-verified`
  static readonly userSetRootUserRoute = (id: number) =>
    `${ServerApi.userRoute}/${id}/set-root-user`
  static readonly userSetUserRolesRoute = (id: number) =>
    `${ServerApi.userRoute}/${id}/set-user-roles`

  // Build order workflow
  static readonly printProfilesRoute = `${ServerApi.base}/print-profiles`
  static readonly printProfileRoute = (id: number) => `${ServerApi.printProfilesRoute}/${id}`

  static readonly filamentProfilesRoute = `${ServerApi.base}/filament-profiles`
  static readonly filamentProfileRoute = (id: number) => `${ServerApi.filamentProfilesRoute}/${id}`

  static readonly printPartsRoute = `${ServerApi.base}/print-parts`
  static readonly printPartRoute = (id: number) => `${ServerApi.printPartsRoute}/${id}`
  static readonly printPartsBulkRoute = `${ServerApi.printPartsRoute}/bulk`

  static readonly buildOrdersRoute = `${ServerApi.base}/build-orders`
  static readonly buildOrderRoute = (id: number) => `${ServerApi.buildOrdersRoute}/${id}`
  static readonly buildOrderAcceptRoute = (id: number) => `${ServerApi.buildOrderRoute(id)}/accept`
  static readonly buildOrderRejectRoute = (id: number) => `${ServerApi.buildOrderRoute(id)}/reject`

  static readonly plannedPlatesRoute = `${ServerApi.base}/planned-plates`
  static readonly plannedPlateRoute = (id: number) => `${ServerApi.plannedPlatesRoute}/${id}`
  static readonly plannedPlateForceSliceRoute = (id: number) => `${ServerApi.plannedPlateRoute(id)}/force-slice`
  static readonly plannedPlateCancelRoute = (id: number) => `${ServerApi.plannedPlateRoute(id)}/cancel`

  static readonly slicerConfigRoute = `${ServerApi.base}/slicer-config`
  static readonly slicerConfigTestRoute = `${ServerApi.slicerConfigRoute}/test`
}
