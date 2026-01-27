/*
  Warnings:

  - A unique constraint covering the columns `[customerNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'ENROLLMENT', 'REFUND', 'ADMIN_ADJUST', 'BONUS');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "creditCost" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "customerNumber" TEXT;

-- CreateTable
CREATE TABLE "CreditHistory" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "courseTitle" TEXT,

    CONSTRAINT "CreditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_customerNumber_key" ON "User"("customerNumber");

-- AddForeignKey
ALTER TABLE "CreditHistory" ADD CONSTRAINT "CreditHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
