-- AlterTable
ALTER TABLE "certificate_templates" ADD COLUMN     "cover_landscape_url" TEXT,
ADD COLUMN     "cover_portrait_url" TEXT,
ADD COLUMN     "instruction_text" TEXT,
ADD COLUMN     "logo_url" TEXT;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "cover_landscape_url" TEXT,
ADD COLUMN     "cover_portrait_url" TEXT,
ADD COLUMN     "instruction_text" TEXT,
ADD COLUMN     "logo_url" TEXT;
