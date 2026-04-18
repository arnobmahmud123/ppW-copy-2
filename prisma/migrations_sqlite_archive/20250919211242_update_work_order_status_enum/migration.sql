-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "dueDate" DATETIME,
    "tasks" TEXT,
    "workOrderNumber" TEXT,
    "coordinator" TEXT,
    "processor" TEXT,
    "gpsLat" REAL,
    "gpsLon" REAL,
    "lockCode" TEXT,
    "lockLocation" TEXT,
    "keyCode" TEXT,
    "gateCode" TEXT,
    "lotSize" TEXT,
    "assignedDate" DATETIME,
    "startDate" DATETIME,
    "estCompletion" DATETIME,
    "fieldComplete" DATETIME,
    "contractorName" TEXT,
    "contractorEmail" TEXT,
    "contractorPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "assignedContractorId" TEXT,
    "assignedCoordinatorId" TEXT,
    "assignedProcessorId" TEXT,
    CONSTRAINT "WorkOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_assignedContractorId_fkey" FOREIGN KEY ("assignedContractorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_assignedCoordinatorId_fkey" FOREIGN KEY ("assignedCoordinatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_assignedProcessorId_fkey" FOREIGN KEY ("assignedProcessorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrder" ("addressLine1", "addressLine2", "assignedContractorId", "assignedCoordinatorId", "assignedDate", "assignedProcessorId", "city", "clientId", "contractorEmail", "contractorName", "contractorPhone", "coordinator", "createdAt", "creatorId", "description", "dueDate", "estCompletion", "fieldComplete", "gateCode", "gpsLat", "gpsLon", "id", "keyCode", "lockCode", "lockLocation", "lotSize", "postalCode", "processor", "serviceType", "startDate", "state", "status", "tasks", "title", "updatedAt", "workOrderNumber") SELECT "addressLine1", "addressLine2", "assignedContractorId", "assignedCoordinatorId", "assignedDate", "assignedProcessorId", "city", "clientId", "contractorEmail", "contractorName", "contractorPhone", "coordinator", "createdAt", "creatorId", "description", "dueDate", "estCompletion", "fieldComplete", "gateCode", "gpsLat", "gpsLon", "id", "keyCode", "lockCode", "lockLocation", "lotSize", "postalCode", "processor", "serviceType", "startDate", "state", "status", "tasks", "title", "updatedAt", "workOrderNumber" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
