/*
  Warnings:

  - Added the required column `talla` to the `VentaItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ventaitem` ADD COLUMN `talla` VARCHAR(191) NOT NULL;
