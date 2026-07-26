-- CreateEnum
CREATE TYPE "CertificateTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "reward_title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "terms" TEXT,
    "validity_days" INTEGER NOT NULL,
    "design" JSONB,
    "metadata" JSONB,
    "status" "CertificateTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_templates_organization_id_status_idx" ON "certificate_templates"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_organization_id_slug_key" ON "certificate_templates"("organization_id", "slug");

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
