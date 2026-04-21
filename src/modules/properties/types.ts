export type PropertyListItem = {
  propertyKey: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  frontImageUrl: string | null
  totalWorkOrders: number
  openWorkOrders: number
  completedWorkOrders: number
  overdueWorkOrders: number
  invoiceReadyWorkOrders: number
  totalInvoices: number
  totalPhotos: number
  latestUpdateAt: string
  nextDueDate: string | null
  clients: string[]
  contractors: string[]
  serviceTypes: string[]
  latestWorkOrder: {
    id: string
    workOrderNumber: string | null
    title: string
    status: string
  } | null
}

export type PropertyGalleryItem = {
  id: string
  url: string
  category: string
  createdAt: string
  workOrderId: string
  workOrderNumber: string | null
}

export type PropertyTimelineEvent = {
  id: string
  type: "WORK_ORDER" | "ASSIGNMENT" | "FIELD_COMPLETE" | "INVOICE" | "MESSAGE"
  title: string
  description: string
  at: string
  workOrderId: string
  workOrderNumber: string | null
}

export type PropertyWorkOrderHistoryRow = {
  id: string
  workOrderNumber: string | null
  title: string
  status: string
  serviceType: string
  dueDate: string | null
  fieldComplete: string | null
  updatedAt: string
  photoCount: number
  messageCount: number
  clientName: string
  contractorName: string | null
  coordinatorName: string | null
  processorName: string | null
  invoiceStatus: string | null
  invoiceAmount: number | null
}

export type PropertyDetailResponse = {
  property: {
    propertyKey: string
    addressLine1: string
    addressLine2: string | null
    city: string
    state: string
    postalCode: string
    frontImageUrl: string | null
    latestUpdateAt: string
    lockCode: string | null
    lockLocation: string | null
    keyCode: string | null
    gateCode: string | null
    lotSize: string | null
    gpsLat: number | null
    gpsLon: number | null
  }
  summary: {
    totalWorkOrders: number
    openWorkOrders: number
    completedWorkOrders: number
    overdueWorkOrders: number
    invoiceReadyWorkOrders: number
    totalInvoices: number
    totalInvoiceAmount: number
    totalPhotos: number
  }
  compliance: {
    inspectionWorkOrders: number
    propertiesWithAccessCodes: boolean
    frontImageCoverage: number
    inspectionPhotoCoverage: number
    beforeDuringAfterCoverage: number
    overdueComplianceItems: number
    openInspectionMessages: number
    latestInspectionAt: string | null
    checklist: Array<{
      id: string
      label: string
      status: "COMPLETE" | "PARTIAL" | "MISSING" | "WARNING"
      detail: string
    }>
  }
  finance: {
    bidCount: number
    completionCount: number
    estimatedRevenue: number
    estimatedContractorCost: number
    estimatedProfit: number
    estimatedMarginPercent: number
    invoicedRevenue: number
    averageInvoice: number
    topVendors: Array<{
      name: string
      activeWorkOrders: number
      estimatedSpend: number
      billedRevenue: number
    }>
  }
  gallery: PropertyGalleryItem[]
  timeline: PropertyTimelineEvent[]
  workOrders: PropertyWorkOrderHistoryRow[]
}
