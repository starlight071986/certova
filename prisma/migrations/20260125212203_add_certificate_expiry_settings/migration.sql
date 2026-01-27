-- CreateEnum
CREATE TYPE "CertificateExpiryType" AS ENUM ('NEVER', 'FIXED_DATE', 'PERIOD_DAYS', 'PERIOD_MONTHS', 'PERIOD_YEARS');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "certificateExpiryDate" TIMESTAMP(3),
ADD COLUMN     "certificateExpiryType" "CertificateExpiryType" NOT NULL DEFAULT 'PERIOD_YEARS',
ADD COLUMN     "certificateExpiryValue" INTEGER;

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "certificateNumberPrefix" TEXT NOT NULL DEFAULT 'LH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
