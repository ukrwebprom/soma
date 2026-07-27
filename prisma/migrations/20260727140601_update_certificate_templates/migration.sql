/*
  Warnings:

  - You are about to drop the column `design` on the `certificate_templates` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `certificate_templates` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `certificate_templates` table. All the data in the column will be lost.
  - You are about to drop the column `reward_title` on the `certificate_templates` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `certificate_templates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `certificate_templates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `certificate_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `certificate_templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "certificate_templates_slug_key";

-- DropIndex
DROP INDEX "certificate_templates_status_idx";

-- AlterTable
ALTER TABLE "certificate_templates" DROP COLUMN "design",
DROP COLUMN "metadata",
DROP COLUMN "name",
DROP COLUMN "reward_title",
DROP COLUMN "slug",
ADD COLUMN     "code" VARCHAR(64) NOT NULL,
ADD COLUMN     "title" VARCHAR(150) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_code_key" ON "certificate_templates"("code");
