-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "redeemed_by_operator_id" UUID;

-- CreateTable
CREATE TABLE "operators" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "pin_lookup" VARCHAR(64) NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operators_pin_lookup_key" ON "operators"("pin_lookup");

-- CreateIndex
CREATE INDEX "certificates_redeemed_by_operator_id_idx" ON "certificates"("redeemed_by_operator_id");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_redeemed_by_operator_id_fkey" FOREIGN KEY ("redeemed_by_operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
