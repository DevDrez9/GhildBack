/*
  Warnings:

  - You are about to drop the column `telaId` on the `parametrosfisicostela` table. All the data in the column will be lost.
  - The values [COSTURERO] on the enum `Usuario_rol` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[nombre]` on the table `ParametrosFisicosTela` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clienteId` to the `Carrito` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `ParametrosFisicosTela` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `parametrosfisicostela` DROP FOREIGN KEY `ParametrosFisicosTela_telaId_fkey`;

-- DropForeignKey
ALTER TABLE `parametrostela` DROP FOREIGN KEY `ParametrosTela_telaId_fkey`;

-- DropForeignKey
ALTER TABLE `tela` DROP FOREIGN KEY `Tela_proveedorId_fkey`;

-- DropIndex
DROP INDEX `ParametrosFisicosTela_telaId_key` ON `parametrosfisicostela`;

-- DropIndex
DROP INDEX `ParametrosTela_telaId_fkey` ON `parametrostela`;

-- DropIndex
DROP INDEX `Proveedor_ruc_key` ON `proveedor`;

-- DropIndex
DROP INDEX `Tela_proveedorId_fkey` ON `tela`;

-- AlterTable
ALTER TABLE `carrito` ADD COLUMN `clienteId` INTEGER NOT NULL,
    ADD COLUMN `precio` DECIMAL(65, 30) NULL,
    MODIFY `cliente` VARCHAR(191) NULL,
    MODIFY `estado` VARCHAR(191) NOT NULL DEFAULT 'nuevo';

-- AlterTable
ALTER TABLE `carritoitem` ADD COLUMN `precio` DECIMAL(65, 30) NULL,
    ADD COLUMN `talla` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `parametrosfisicostela` DROP COLUMN `telaId`,
    ADD COLUMN `descripcion` VARCHAR(191) NULL,
    ADD COLUMN `nombre` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `proveedor` ADD COLUMN `ciudad` VARCHAR(191) NULL,
    ADD COLUMN `nit` VARCHAR(191) NULL,
    ADD COLUMN `pais` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `tela` ADD COLUMN `parametrosFisicosId` INTEGER NULL,
    MODIFY `estado` VARCHAR(191) NULL,
    MODIFY `colores` VARCHAR(191) NULL,
    MODIFY `proveedorId` INTEGER NULL;

-- AlterTable
ALTER TABLE `trabajoenproceso` ADD COLUMN `pesoTotal` DOUBLE NULL;

-- AlterTable
ALTER TABLE `trabajofinalizado` ADD COLUMN `costo` DECIMAL(65, 30) NULL;

-- AlterTable
ALTER TABLE `usuario` ADD COLUMN `telefono` VARCHAR(191) NULL,
    MODIFY `rol` ENUM('ADMIN', 'MANAGER', 'USER', 'CLIENTE') NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE `UsuarioSucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UsuarioSucursal_usuarioId_sucursalId_key`(`usuarioId`, `sucursalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `ParametrosFisicosTela_nombre_key` ON `ParametrosFisicosTela`(`nombre`);

-- AddForeignKey
ALTER TABLE `Carrito` ADD CONSTRAINT `Carrito_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioSucursal` ADD CONSTRAINT `UsuarioSucursal_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioSucursal` ADD CONSTRAINT `UsuarioSucursal_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tela` ADD CONSTRAINT `Tela_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tela` ADD CONSTRAINT `Tela_parametrosFisicosId_fkey` FOREIGN KEY (`parametrosFisicosId`) REFERENCES `ParametrosFisicosTela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParametrosTela` ADD CONSTRAINT `ParametrosTela_telaId_fkey` FOREIGN KEY (`telaId`) REFERENCES `InventarioTela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
