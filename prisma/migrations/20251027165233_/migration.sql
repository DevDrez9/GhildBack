/*
  Warnings:

  - The `stock` column on the `inventariosucursal` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `stock` column on the `inventariotienda` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cantidad` column on the `movimientoinventario` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `stockAnterior` column on the `movimientoinventario` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `stockNuevo` column on the `movimientoinventario` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cantidad` column on the `transferenciainventario` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE `inventariosucursal` DROP COLUMN `stock`,
    ADD COLUMN `stock` JSON NOT NULL;

-- AlterTable
ALTER TABLE `inventariotienda` DROP COLUMN `stock`,
    ADD COLUMN `stock` JSON NOT NULL;

-- AlterTable
ALTER TABLE `movimientoinventario` DROP COLUMN `cantidad`,
    ADD COLUMN `cantidad` JSON NOT NULL,
    DROP COLUMN `stockAnterior`,
    ADD COLUMN `stockAnterior` JSON NULL,
    DROP COLUMN `stockNuevo`,
    ADD COLUMN `stockNuevo` JSON NULL;

-- AlterTable
ALTER TABLE `transferenciainventario` DROP COLUMN `cantidad`,
    ADD COLUMN `cantidad` JSON NOT NULL;
