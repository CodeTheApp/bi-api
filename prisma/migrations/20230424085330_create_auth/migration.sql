-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "tenantId" TEXT,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "updatedAt" DATETIME
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "userId" TEXT,
    "tenantId" TEXT,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("createdAt", "deletedAt", "description", "id", "title", "updatedAt") SELECT "createdAt", "deletedAt", "description", "id", "title", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_id_key" ON "Project"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_name_key" ON "Tenant"("name");
