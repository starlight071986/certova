/*
  Warnings:

  - You are about to drop the column `downloadUrl` on the `Certificate` table. All the data in the column will be lost.
  - Added the required column `completedAt` to the `Certificate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseTitle` to the `Certificate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instructorName` to the `Certificate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'MATCHING';

-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_courseId_fkey";

-- AlterTable
ALTER TABLE "Certificate" DROP COLUMN "downloadUrl",
ADD COLUMN     "completedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "courseDescription" TEXT,
ADD COLUMN     "courseTitle" TEXT NOT NULL,
ADD COLUMN     "instructorName" TEXT NOT NULL,
ADD COLUMN     "pdfData" BYTEA,
ALTER COLUMN "courseId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
