import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const reportType = searchParams.get("type") || "overview"
    const exportData = searchParams.get("export") === "true"

    // Build date filter
    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (exportData) {
      return await exportReportData(reportType, dateFilter)
    }

    switch (reportType) {
      case "overview":
        return await getOverviewReport(dateFilter)
      case "financial":
        return await getFinancialReport(dateFilter)
      case "operational":
        return await getOperationalReport(dateFilter)
      case "contractor-performance":
        return await getContractorPerformanceReport(dateFilter)
      case "monthly-trends":
        return await getMonthlyTrendsReport(dateFilter)
      default:
        return await getOverviewReport(dateFilter)
    }
  } catch (error) {
    console.error("Error fetching report data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getOverviewReport(dateFilter: any) {
  const [
    totalWorkOrders,
    completedWorkOrders,
    totalRevenue,
    activeContractors,
    monthlyStats
  ] = await Promise.all([
    // Total work orders
    prisma.workOrder.count({
      where: dateFilter
    }),
    
    // Completed work orders
    prisma.workOrder.count({
      where: {
        ...dateFilter,
        status: { in: ["COMPLETED", "CLOSED"] }
      }
    }),
    
    // Total revenue from paid invoices
    prisma.invoice.aggregate({
      where: {
        ...dateFilter,
        status: "PAID"
      },
      _sum: {
        clientTotal: true
      }
    }),
    
    // Active contractors (users with role CONTRACTOR)
    prisma.user.count({
      where: {
        role: "CONTRACTOR"
      }
    }),
    
    // Monthly stats for the last 6 months
    getMonthlyStats(dateFilter)
  ])

  return NextResponse.json({
    totalWorkOrders,
    completedWorkOrders,
    totalRevenue: totalRevenue._sum.clientTotal || 0,
    activeContractors,
    monthlyStats
  })
}

async function getFinancialReport(dateFilter: any) {
  const [
    revenueData,
    invoiceStats,
    outstandingInvoices
  ] = await Promise.all([
    // Revenue by status
    prisma.invoice.groupBy({
      by: ["status"],
      where: dateFilter,
      _sum: {
        clientTotal: true
      },
      _count: {
        id: true
      }
    }),
    
    // Invoice statistics
    prisma.invoice.aggregate({
      where: dateFilter,
      _sum: {
        clientTotal: true
      },
      _avg: {
        clientTotal: true
      },
      _count: {
        id: true
      }
    }),
    
    // Outstanding invoices
    prisma.invoice.findMany({
      where: {
        ...dateFilter,
        status: { in: ["SENT", "OVERDUE"] }
      },
      include: {
        workOrder: {
          select: {
            title: true,
            client: {
              select: {
                name: true,
                company: true
              }
            }
          }
        }
      },
      orderBy: {
        invoiceDate: "desc"
      }
    })
  ])

  return NextResponse.json({
    revenueData,
    invoiceStats,
    outstandingInvoices
  })
}

async function getOperationalReport(dateFilter: any) {
  const [
    workOrderStats,
    statusBreakdown,
    serviceTypeBreakdown,
    averageCompletionTime
  ] = await Promise.all([
    // Work order statistics
    prisma.workOrder.aggregate({
      where: dateFilter,
      _count: {
        id: true
      }
    }),
    
    // Status breakdown
    prisma.workOrder.groupBy({
      by: ["status"],
      where: dateFilter,
      _count: {
        id: true
      }
    }),
    
    // Service type breakdown
    prisma.workOrder.groupBy({
      by: ["serviceType"],
      where: dateFilter,
      _count: {
        id: true
      }
    }),
    
    // Average completion time (for completed orders)
    getAverageCompletionTime(dateFilter)
  ])

  return NextResponse.json({
    workOrderStats,
    statusBreakdown,
    serviceTypeBreakdown,
    averageCompletionTime
  })
}

async function getContractorPerformanceReport(dateFilter: any) {
  const contractorStats = await prisma.workOrder.groupBy({
    by: ["assignedContractorId"],
    where: {
      ...dateFilter,
      assignedContractorId: { not: null }
    },
    _count: {
      id: true
    },
    _avg: {
      // We'll need to calculate completion time differently
    }
  })

  // Get contractor details and calculate performance metrics
  const contractorPerformance = await Promise.all(
    contractorStats.map(async (stat) => {
      const contractor = await prisma.user.findUnique({
        where: { id: stat.assignedContractorId! },
        select: {
          id: true,
          name: true,
          email: true,
          company: true
        }
      })

      const completedOrders = await prisma.workOrder.count({
        where: {
          assignedContractorId: stat.assignedContractorId,
          ...dateFilter,
          status: { in: ["COMPLETED", "CLOSED"] }
        }
      })

      const totalOrders = stat._count.id
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

      return {
        contractor,
        totalOrders,
        completedOrders,
        completionRate: Math.round(completionRate * 100) / 100
      }
    })
  )

  return NextResponse.json({
    contractorPerformance: contractorPerformance.sort((a, b) => b.completionRate - a.completionRate)
  })
}

async function getMonthlyTrendsReport(dateFilter: any) {
  return NextResponse.json({
    monthlyStats: await getMonthlyStats(dateFilter)
  })
}

async function getMonthlyStats(dateFilter: any) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const monthlyData = await prisma.workOrder.groupBy({
    by: ["createdAt"],
    where: {
      ...dateFilter,
      createdAt: {
        gte: sixMonthsAgo
      }
    },
    _count: {
      id: true
    }
  })

  // Group by month and calculate revenue
  const monthlyStats: any[] = []
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  for (let i = 0; i < 6; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    const monthWorkOrders = monthlyData.filter(item => {
      const itemDate = new Date(item.createdAt)
      return itemDate.getFullYear() === date.getFullYear() && 
             itemDate.getMonth() === date.getMonth()
    })

    const workOrderCount = monthWorkOrders.reduce((sum, item) => sum + item._count.id, 0)
    
    // Get revenue for this month
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    const monthRevenue = await prisma.invoice.aggregate({
      where: {
        invoiceDate: {
          gte: monthStart,
          lte: monthEnd
        },
        status: "PAID"
      },
      _sum: {
        clientTotal: true
      }
    })

    monthlyStats.push({
      month: months[date.getMonth()],
      workOrders: workOrderCount,
      revenue: monthRevenue._sum.clientTotal || 0
    })
  }

  return monthlyStats
}

async function getAverageCompletionTime(dateFilter: any) {
  const completedOrders = await prisma.workOrder.findMany({
    where: {
      ...dateFilter,
      status: { in: ["COMPLETED", "CLOSED"] },
      fieldComplete: { not: null },
      assignedDate: { not: null }
    },
    select: {
      assignedDate: true,
      fieldComplete: true
    }
  })

  if (completedOrders.length === 0) return 0

  const totalDays = completedOrders.reduce((sum, order) => {
    if (order.assignedDate && order.fieldComplete) {
      const diffTime = order.fieldComplete.getTime() - order.assignedDate.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      return sum + diffDays
    }
    return sum
  }, 0)

  return Math.round((totalDays / completedOrders.length) * 100) / 100
}

async function exportReportData(reportType: string, dateFilter: any) {
  let csvData = ""
  let filename = ""

  switch (reportType) {
    case "financial":
      const financialData = await getFinancialReportData(dateFilter)
      csvData = generateFinancialCSV(financialData)
      filename = "financial-report"
      break
    case "operational":
      const operationalData = await getOperationalReportData(dateFilter)
      csvData = generateOperationalCSV(operationalData)
      filename = "operational-report"
      break
    case "contractor-performance":
      const contractorData = await getContractorPerformanceReportData(dateFilter)
      csvData = generateContractorPerformanceCSV(contractorData)
      filename = "contractor-performance-report"
      break
    default:
      const overviewData = await getOverviewReportData(dateFilter)
      csvData = generateOverviewCSV(overviewData)
      filename = "overview-report"
  }

  return new Response(csvData, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}

async function getFinancialReportData(dateFilter: any) {
  const invoices = await prisma.invoice.findMany({
    where: dateFilter,
    include: {
      workOrder: {
        select: {
          title: true,
          client: {
            select: {
              name: true,
              company: true
            }
          }
        }
      }
    },
    orderBy: {
      invoiceDate: "desc"
    }
  })

  return invoices
}

async function getOperationalReportData(dateFilter: any) {
  const workOrders = await prisma.workOrder.findMany({
    where: dateFilter,
    include: {
      client: {
        select: {
          name: true,
          company: true
        }
      },
      assignedContractor: {
        select: {
          name: true,
          company: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  return workOrders
}

async function getContractorPerformanceReportData(dateFilter: any) {
  const contractorStats = await prisma.workOrder.groupBy({
    by: ["assignedContractorId"],
    where: {
      ...dateFilter,
      assignedContractorId: { not: null }
    },
    _count: {
      id: true
    }
  })

  const contractorPerformance = await Promise.all(
    contractorStats.map(async (stat) => {
      const contractor = await prisma.user.findUnique({
        where: { id: stat.assignedContractorId! },
        select: {
          id: true,
          name: true,
          email: true,
          company: true
        }
      })

      const completedOrders = await prisma.workOrder.count({
        where: {
          assignedContractorId: stat.assignedContractorId,
          ...dateFilter,
          status: { in: ["COMPLETED", "CLOSED"] }
        }
      })

      return {
        contractor,
        totalOrders: stat._count.id,
        completedOrders,
        completionRate: stat._count.id > 0 ? (completedOrders / stat._count.id) * 100 : 0
      }
    })
  )

  return contractorPerformance
}

async function getOverviewReportData(dateFilter: any) {
  const workOrders = await prisma.workOrder.findMany({
    where: dateFilter,
    include: {
      client: {
        select: {
          name: true,
          company: true
        }
      },
      assignedContractor: {
        select: {
          name: true,
          company: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  return workOrders
}

function generateFinancialCSV(invoices: any[]) {
  const headers = [
    "Invoice Number",
    "Client Name",
    "Client Company",
    "Work Order Title",
    "Invoice Date",
    "Status",
    "Amount",
    "Created At"
  ]

  const rows = invoices.map(invoice => [
    invoice.invoiceNumber,
    invoice.workOrder.client.name,
    invoice.workOrder.client.company || "",
    invoice.workOrder.title,
    invoice.invoiceDate.toISOString().split('T')[0],
    invoice.status,
    invoice.clientTotal,
    invoice.createdAt.toISOString().split('T')[0]
  ])

  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(",")).join("\n")
}

function generateOperationalCSV(workOrders: any[]) {
  const headers = [
    "Work Order ID",
    "Title",
    "Client Name",
    "Client Company",
    "Contractor Name",
    "Service Type",
    "Status",
    "Created Date",
    "Due Date",
    "Assigned Date",
    "Field Complete Date"
  ]

  const rows = workOrders.map(wo => [
    wo.id,
    wo.title,
    wo.client.name,
    wo.client.company || "",
    wo.assignedContractor?.name || "",
    wo.serviceType,
    wo.status,
    wo.createdAt.toISOString().split('T')[0],
    wo.dueDate ? wo.dueDate.toISOString().split('T')[0] : "",
    wo.assignedDate ? wo.assignedDate.toISOString().split('T')[0] : "",
    wo.fieldComplete ? wo.fieldComplete.toISOString().split('T')[0] : ""
  ])

  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(",")).join("\n")
}

function generateContractorPerformanceCSV(contractorPerformance: any[]) {
  const headers = [
    "Contractor Name",
    "Contractor Email",
    "Company",
    "Total Orders",
    "Completed Orders",
    "Completion Rate (%)"
  ]

  const rows = contractorPerformance.map(perf => [
    perf.contractor?.name || "Unknown",
    perf.contractor?.email || "",
    perf.contractor?.company || "",
    perf.totalOrders,
    perf.completedOrders,
    Math.round(perf.completionRate * 100) / 100
  ])

  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(",")).join("\n")
}

function generateOverviewCSV(workOrders: any[]) {
  return generateOperationalCSV(workOrders)
}
