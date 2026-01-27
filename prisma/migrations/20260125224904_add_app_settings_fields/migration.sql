/*
  Warnings:

  - You are about to drop the column `certificateNumberPrefix` on the `AppSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AppSettings" DROP COLUMN "certificateNumberPrefix",
ADD COLUMN     "courseNumberPrefix" TEXT NOT NULL DEFAULT 'LH',
ADD COLUMN     "imprintUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "privacyPolicyUrl" TEXT,
ADD COLUMN     "siteTitle" TEXT NOT NULL DEFAULT 'Certova';
