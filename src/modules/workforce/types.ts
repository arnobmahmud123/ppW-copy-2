export type WorkforceRecentWorkOrder = {
  id: string
  workOrderNumber: string | null
  title: string
  status: string
  dueDate: string | null
  addressLine1: string
  city: string
  state: string
  serviceType: string
  assignedContractorName?: string | null
}

export type CoordinatorConsoleItem = {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  avatarUrl: string | null
  totalAssignedWorkOrders: number
  openWorkOrders: number
  overdueWorkOrders: number
  fieldCompleteQueue: number
  officeApprovedQueue: number
  sentToClientCount: number
  dueThisWeek: number
  propertiesCount: number
  contractorTouches: number
  serviceTypes: string[]
  latestActivityAt: string | null
  recentWorkOrders: WorkforceRecentWorkOrder[]
}

export type CoordinatorConsoleSummary = {
  totalCoordinators: number
  activeCoordinators: number
  totalOpenWorkOrders: number
  totalOverdueWorkOrders: number
  totalInvoiceReadyWorkOrders: number
}

export type ContractorMatrixItem = {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  avatarUrl: string | null
  createdAt: string
  activeOrders: number
  totalAssignedOrders: number
  completedOrders: number
  overdueOrders: number
  fieldCompleteQueue: number
  officeApprovedQueue: number
  sentToClientCount: number
  statesCovered: string[]
  citiesCovered: string[]
  serviceTypes: string[]
  efficiencyScore: number
  accuracyScore: number
  capacityUsage: number
  capacityLabel: "Light" | "Balanced" | "Near capacity" | "Overloaded"
  rating: number | null
  recentWorkOrders: WorkforceRecentWorkOrder[]
}

export type ContractorMatrixSummary = {
  totalContractors: number
  activeContractors: number
  totalActiveOrders: number
  averageEfficiencyScore: number
  averageAccuracyScore: number
}
