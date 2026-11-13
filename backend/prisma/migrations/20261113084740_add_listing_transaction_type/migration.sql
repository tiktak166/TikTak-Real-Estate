-- CreateEnum
CREATE TYPE "ListingTransaction" AS ENUM ('RENT', 'SALE');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "transactionType" "ListingTransaction" NOT NULL DEFAULT 'SALE';

-- CreateIndex
CREATE INDEX "Listing_transactionType_status_idx" ON "Listing"("transactionType", "status");
