/*
  Warnings:

  - You are about to drop the column `organization_id` on the `certificate_templates` table. All the data in the column will be lost.
  - You are about to drop the `organizations` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `certificate_templates` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "certificate_templates" DROP CONSTRAINT "certificate_templates_organization_id_fkey";

-- DropIndex
DROP INDEX "certificate_templates_organization_id_slug_key";

-- DropIndex
DROP INDEX "certificate_templates_organization_id_status_idx";

-- AlterTable
ALTER TABLE "certificate_templates" DROP COLUMN "organization_id";

-- DropTable
DROP TABLE "organizations";

-- DropEnum
DROP TYPE "OrganizationStatus";

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_slug_key" ON "certificate_templates"("slug");

-- CreateIndex
CREATE INDEX "certificate_templates_status_idx" ON "certificate_templates"("status");
