-- DropForeignKey
ALTER TABLE `compratelaitem` DROP FOREIGN KEY `CompraTelaItem_compraId_fkey`;

-- DropIndex
DROP INDEX `CompraTelaItem_compraId_fkey` ON `compratelaitem`;

-- AlterTable
ALTER TABLE `compratelaitem` MODIFY `compraId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `CompraTelaItem` ADD CONSTRAINT `CompraTelaItem_compraId_fkey` FOREIGN KEY (`compraId`) REFERENCES `CompraProveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
