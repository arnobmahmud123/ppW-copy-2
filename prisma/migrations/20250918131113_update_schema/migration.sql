/*
  Warnings:

  - You are about to drop the column `amountCents` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `issuedAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Invoice` table. All the data in the column will be lost.
  - Added the required column `invoiceDate` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileAttachment" ADD COLUMN "requirementId" TEXT;
ALTER TABLE "FileAttachment" ADD COLUMN "taskId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "bidId" TEXT;
ALTER TABLE "Message" ADD COLUMN "taskId" TEXT;

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "price" REAL NOT NULL,
    "total" REAL NOT NULL,
    "adjPrice" REAL NOT NULL DEFAULT 0,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "finalTotal" REAL NOT NULL,
    "comments" TEXT,
    "flatFee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentToClientDate" DATETIME,
    "completeDate" DATETIME,
    "noCharge" BOOLEAN NOT NULL DEFAULT false,
    "clientTotal" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripePaymentId" TEXT,
    CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("clientId", "createdAt", "id", "status", "stripeInvoiceId", "stripePaymentId", "updatedAt", "workOrderId") SELECT "clientId", "createdAt", "id", "status", "stripeInvoiceId", "stripePaymentId", "updatedAt", "workOrderId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_workOrderId_key" ON "Invoice"("workOrderId");
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
    "status" TEXT NOT NULL DEFAULT 'NEW',
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
INSERT INTO "new_WorkOrder" ("addressLine1", "addressLine2", "assignedContractorId", "city", "clientId", "createdAt", "creatorId", "description", "dueDate", "id", "postalCode", "serviceType", "state", "status", "title", "updatedAt") SELECT "addressLine1", "addressLine2", "assignedContractorId", "city", "clientId", "createdAt", "creatorId", "description", "dueDate", "id", "postalCode", "serviceType", "state", "status", "title", "updatedAt" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
