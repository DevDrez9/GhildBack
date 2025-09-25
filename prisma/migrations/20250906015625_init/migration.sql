-- CreateTable
CREATE TABLE `ConfigWeb` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombreSitio` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `colorPrimario` VARCHAR(191) NOT NULL,
    `colorSecundario` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImagenBanner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `titulo` VARCHAR(191) NULL,
    `subtitulo` VARCHAR(191) NULL,
    `enlace` VARCHAR(191) NULL,
    `configWebId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tienda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `dominio` VARCHAR(191) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `configWebId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `esPrincipal` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Tienda_dominio_key`(`dominio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Categoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subcategoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `categoriaId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Producto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `precio` DECIMAL(65, 30) NOT NULL,
    `precioOferta` DECIMAL(65, 30) NULL DEFAULT 0,
    `enOferta` BOOLEAN NOT NULL DEFAULT false,
    `esNuevo` BOOLEAN NOT NULL DEFAULT false,
    `esDestacado` BOOLEAN NOT NULL DEFAULT false,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `stockMinimo` INTEGER NOT NULL DEFAULT 5,
    `sku` VARCHAR(191) NULL,
    `imagen_url` VARCHAR(191) NULL,
    `categoriaId` INTEGER NOT NULL,
    `subcategoriaId` INTEGER NULL,
    `tiendaId` INTEGER NOT NULL,
    `proveedorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Producto_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImagenProducto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `productoId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Carrito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cliente` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `notas` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'pendiente',
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CarritoItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `productoId` INTEGER NOT NULL,
    `carritoId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NULL,
    `rol` ENUM('ADMIN', 'MANAGER', 'USER', 'COSTURERO') NOT NULL DEFAULT 'USER',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsuarioTienda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UsuarioTienda_usuarioId_tiendaId_key`(`usuarioId`, `tiendaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Venta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroVenta` VARCHAR(191) NOT NULL,
    `cliente` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADA', 'EN_PROCESO', 'ENVIADA', 'ENTREGADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `total` DECIMAL(65, 30) NOT NULL,
    `subtotal` DECIMAL(65, 30) NOT NULL,
    `impuestos` DECIMAL(65, 30) NULL,
    `metodoPago` ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'DIGITAL') NULL,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sucursalId` INTEGER NULL,

    UNIQUE INDEX `Venta_numeroVenta_key`(`numeroVenta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VentaItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `precio` DECIMAL(65, 30) NOT NULL,
    `productoId` INTEGER NOT NULL,
    `ventaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventarioTienda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `tiendaId` INTEGER NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `stockMinimo` INTEGER NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventarioTienda_productoId_tiendaId_key`(`productoId`, `tiendaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventarioSucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `stockMinimo` INTEGER NOT NULL DEFAULT 5,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventarioSucursal_productoId_sucursalId_key`(`productoId`, `sucursalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransferenciaInventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'EN_TRANSITO', 'COMPLETADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `motivo` VARCHAR(191) NULL,
    `origenTipo` ENUM('FABRICA', 'SUCURSAL') NOT NULL,
    `origenId` INTEGER NOT NULL,
    `destinoTipo` ENUM('FABRICA', 'SUCURSAL') NOT NULL,
    `destinoId` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TransferenciaInventario_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoInventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('ENTRADA_COMPRA', 'ENTRADA_PRODUCCION', 'SALIDA_VENTA', 'AJUSTE_FABRICA', 'AJUSTE_SUCURSAL', 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA') NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `usuarioId` INTEGER NULL,
    `compraId` INTEGER NULL,
    `ventaId` INTEGER NULL,
    `trabajoFinalizadoId` INTEGER NULL,
    `transferenciaId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `stockAnterior` INTEGER NULL,
    `stockNuevo` INTEGER NULL,
    `inventarioTiendaId` INTEGER NULL,
    `inventarioSucursalId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Proveedor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `contacto` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `ruc` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Proveedor_ruc_key`(`ruc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProveedorTienda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proveedorId` INTEGER NOT NULL,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProveedorTienda_proveedorId_tiendaId_key`(`proveedorId`, `tiendaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompraProveedor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroCompra` VARCHAR(191) NOT NULL,
    `proveedorId` INTEGER NOT NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADA', 'EN_CAMINO', 'RECIBIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `total` DECIMAL(65, 30) NOT NULL,
    `subtotal` DECIMAL(65, 30) NOT NULL,
    `impuestos` DECIMAL(65, 30) NULL,
    `fechaEntrega` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompraProveedor_numeroCompra_key`(`numeroCompra`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompraItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `precio` DECIMAL(65, 30) NOT NULL,
    `productoId` INTEGER NOT NULL,
    `compraId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estado` VARCHAR(191) NOT NULL,
    `nombreComercial` VARCHAR(191) NOT NULL,
    `tipoTela` VARCHAR(191) NOT NULL,
    `composicion` VARCHAR(191) NOT NULL,
    `gramaje` DOUBLE NOT NULL,
    `acabado` VARCHAR(191) NULL,
    `rendimiento` DOUBLE NULL,
    `colores` VARCHAR(191) NOT NULL,
    `nota` VARCHAR(191) NULL,
    `proveedorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParametrosFisicosTela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `anchoTela` DOUBLE NOT NULL,
    `tubular` BOOLEAN NOT NULL DEFAULT false,
    `notasTela` VARCHAR(191) NULL,
    `telaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ParametrosFisicosTela_telaId_key`(`telaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventarioTela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proveedorId` INTEGER NOT NULL,
    `telaId` INTEGER NOT NULL,
    `cantidadRollos` INTEGER NOT NULL,
    `presentacion` VARCHAR(191) NOT NULL,
    `tipoTela` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `precioKG` DECIMAL(65, 30) NOT NULL,
    `pesoGrupo` DOUBLE NOT NULL,
    `importe` DECIMAL(65, 30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompraTelaItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NOT NULL,
    `precioKG` DECIMAL(65, 30) NOT NULL,
    `telaId` INTEGER NOT NULL,
    `compraId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Costurero` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO', 'VACACIONES') NOT NULL DEFAULT 'ACTIVO',
    `fechaInicio` DATETIME(3) NOT NULL,
    `nota` VARCHAR(191) NULL,
    `usuarioId` INTEGER NULL,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParametrosTela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigoReferencia` VARCHAR(191) NOT NULL,
    `nombreModelo` VARCHAR(191) NOT NULL,
    `tipoTelaRecomendada` VARCHAR(191) NOT NULL,
    `estadoPrenda` VARCHAR(191) NOT NULL,
    `fotoReferenciaUrl` VARCHAR(191) NULL,
    `cantidadEstandarPorLote` INTEGER NOT NULL,
    `tabla` VARCHAR(191) NULL,
    `tallasDisponibles` VARCHAR(191) NOT NULL,
    `consumoTelaPorTalla` JSON NOT NULL,
    `consumoTelaPorLote` DOUBLE NOT NULL,
    `tiempoFabricacionPorUnidad` DOUBLE NOT NULL,
    `tiempoTotalPorLote` DOUBLE NOT NULL,
    `productoId` INTEGER NULL,
    `telaId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ParametrosTela_codigoReferencia_key`(`codigoReferencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrabajoEnProceso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigoTrabajo` VARCHAR(191) NOT NULL,
    `parametrosTelaId` INTEGER NOT NULL,
    `costureroId` INTEGER NULL,
    `estado` ENUM('PENDIENTE', 'EN_PROCESO', 'PAUSADO', 'COMPLETADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `cantidad` INTEGER NOT NULL,
    `fechaInicio` DATETIME(3) NULL,
    `fechaFinEstimada` DATETIME(3) NULL,
    `fechaFinReal` DATETIME(3) NULL,
    `notas` VARCHAR(191) NULL,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TrabajoEnProceso_codigoTrabajo_key`(`codigoTrabajo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrabajoFinalizado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trabajoEnProcesoId` INTEGER NOT NULL,
    `fechaFinalizacion` DATETIME(3) NOT NULL,
    `cantidadProducida` INTEGER NOT NULL,
    `calidad` ENUM('EXCELENTE', 'BUENA', 'REGULAR', 'DEFECTUOSO') NOT NULL DEFAULT 'EXCELENTE',
    `notas` VARCHAR(191) NULL,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TrabajoFinalizado_trabajoEnProcesoId_key`(`trabajoEnProcesoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `responsable` VARCHAR(191) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `tiendaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImagenBanner` ADD CONSTRAINT `ImagenBanner_configWebId_fkey` FOREIGN KEY (`configWebId`) REFERENCES `ConfigWeb`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tienda` ADD CONSTRAINT `fk_tienda_config` FOREIGN KEY (`configWebId`) REFERENCES `ConfigWeb`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Categoria` ADD CONSTRAINT `Categoria_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subcategoria` ADD CONSTRAINT `Subcategoria_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `Categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `fk_producto_categoria` FOREIGN KEY (`categoriaId`) REFERENCES `Categoria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `fk_producto_subcategoria` FOREIGN KEY (`subcategoriaId`) REFERENCES `Subcategoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `fk_producto_tienda` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `fk_producto_proveedor` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImagenProducto` ADD CONSTRAINT `ImagenProducto_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Carrito` ADD CONSTRAINT `Carrito_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarritoItem` ADD CONSTRAINT `CarritoItem_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarritoItem` ADD CONSTRAINT `CarritoItem_carritoId_fkey` FOREIGN KEY (`carritoId`) REFERENCES `Carrito`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioTienda` ADD CONSTRAINT `UsuarioTienda_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioTienda` ADD CONSTRAINT `UsuarioTienda_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VentaItem` ADD CONSTRAINT `VentaItem_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VentaItem` ADD CONSTRAINT `VentaItem_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventarioTienda` ADD CONSTRAINT `fk_inv_tienda_producto` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventarioTienda` ADD CONSTRAINT `fk_inv_tienda_tienda` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventarioSucursal` ADD CONSTRAINT `fk_inv_sucursal_producto` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventarioSucursal` ADD CONSTRAINT `fk_inv_sucursal_sucursal` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventarioSucursal` ADD CONSTRAINT `fk_inv_sucursal_tienda` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferenciaInventario` ADD CONSTRAINT `fk_transferencia_producto` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferenciaInventario` ADD CONSTRAINT `fk_transferencia_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoInventario` ADD CONSTRAINT `fk_movimiento_producto` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoInventario` ADD CONSTRAINT `fk_movimiento_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoInventario` ADD CONSTRAINT `fk_movimiento_compra` FOREIGN KEY (`compraId`) REFERENCES `CompraProveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoInventario` ADD CONSTRAINT `fk_movimiento_venta` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoInventario` ADD CONSTRAINT `fk_movimiento_trabajo` FOREIGN KEY (`trabajoFinalizadoId`) REFERENCES `TrabajoFinalizado`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoInventario` ADD CONSTRAINT `fk_movimiento_transferencia` FOREIGN KEY (`transferenciaId`) REFERENCES `TransferenciaInventario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoInventario` ADD CONSTRAINT `fk_movimiento_inv_tienda` FOREIGN KEY (`inventarioTiendaId`) REFERENCES `InventarioTienda`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoInventario` ADD CONSTRAINT `fk_movimiento_inv_sucursal` FOREIGN KEY (`inventarioSucursalId`) REFERENCES `InventarioSucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProveedorTienda` ADD CONSTRAINT `ProveedorTienda_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProveedorTienda` ADD CONSTRAINT `ProveedorTienda_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraProveedor` ADD CONSTRAINT `CompraProveedor_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraItem` ADD CONSTRAINT `CompraItem_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraItem` ADD CONSTRAINT `CompraItem_compraId_fkey` FOREIGN KEY (`compraId`) REFERENCES `CompraProveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tela` ADD CONSTRAINT `Tela_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParametrosFisicosTela` ADD CONSTRAINT `ParametrosFisicosTela_telaId_fkey` FOREIGN KEY (`telaId`) REFERENCES `Tela`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventarioTela` ADD CONSTRAINT `InventarioTela_proveedorId_fkey` FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventarioTela` ADD CONSTRAINT `InventarioTela_telaId_fkey` FOREIGN KEY (`telaId`) REFERENCES `Tela`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraTelaItem` ADD CONSTRAINT `CompraTelaItem_telaId_fkey` FOREIGN KEY (`telaId`) REFERENCES `Tela`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraTelaItem` ADD CONSTRAINT `CompraTelaItem_compraId_fkey` FOREIGN KEY (`compraId`) REFERENCES `CompraProveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Costurero` ADD CONSTRAINT `Costurero_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Costurero` ADD CONSTRAINT `Costurero_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParametrosTela` ADD CONSTRAINT `ParametrosTela_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParametrosTela` ADD CONSTRAINT `ParametrosTela_telaId_fkey` FOREIGN KEY (`telaId`) REFERENCES `Tela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrabajoEnProceso` ADD CONSTRAINT `TrabajoEnProceso_parametrosTelaId_fkey` FOREIGN KEY (`parametrosTelaId`) REFERENCES `ParametrosTela`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrabajoEnProceso` ADD CONSTRAINT `TrabajoEnProceso_costureroId_fkey` FOREIGN KEY (`costureroId`) REFERENCES `Costurero`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrabajoEnProceso` ADD CONSTRAINT `TrabajoEnProceso_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrabajoFinalizado` ADD CONSTRAINT `TrabajoFinalizado_trabajoEnProcesoId_fkey` FOREIGN KEY (`trabajoEnProcesoId`) REFERENCES `TrabajoEnProceso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrabajoFinalizado` ADD CONSTRAINT `TrabajoFinalizado_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sucursal` ADD CONSTRAINT `fk_sucursal_tienda` FOREIGN KEY (`tiendaId`) REFERENCES `Tienda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
