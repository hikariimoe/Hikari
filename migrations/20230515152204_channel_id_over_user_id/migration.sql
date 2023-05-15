/*
  Warnings:

  - You are about to drop the column `user_id` on the `memories` table. All the data in the column will be lost.
  - Added the required column `channel_id` to the `memories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "memories" DROP COLUMN "user_id",
ADD COLUMN     "channel_id" TEXT NOT NULL;
