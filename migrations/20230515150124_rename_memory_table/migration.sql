/*
  Warnings:

  - You are about to drop the `Memory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Memory";

-- CreateTable
CREATE TABLE "memories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);
