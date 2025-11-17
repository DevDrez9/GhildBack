/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `Producto` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `producto` ADD COLUMN `tallas` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Producto_sku_key` ON `Producto`(`sku`);
