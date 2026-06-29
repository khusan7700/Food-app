/*
  Warnings:

  - You are about to drop the column `stripePaymentIntentId` on the `orders` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('READY', 'APPROVED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "stripePaymentIntentId";

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tid" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'READY',
    "amount" INTEGER NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
