/*
  Warnings:

  - A unique constraint covering the columns `[playerNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "background" TEXT NOT NULL DEFAULT 'clasico',
ADD COLUMN     "confiabilidad" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "playerNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_playerNumber_key" ON "User"("playerNumber");
