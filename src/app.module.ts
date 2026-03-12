import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaService } from './prisma.service';
import { ConfigWebModule } from './config-web/config-web.module';
import { UsuarioModule } from './usuario/usuario.module';
import { AuthModule } from './auth/auth.module';
import { TiendaModule } from './tienda/tienda.module';
import { SucursalModule } from './sucursal/sucursal.module';
import { ProductoModule } from './producto/producto.module';
import { CategoriaModule } from './categoria/categoria.module';
import { SubcategoriaModule } from './subcategoria/subcategoria.module';
import { VentaModule } from './venta/venta.module';
import { CarritoModule } from './carrito/carrito.module';
import { ProveedorModule } from './proveedor/proveedor.module';
import { TelaModule } from './tela/tela.module';
import { CompraTelaItemModule } from './compra-tela-item/compra-tela-item.module';
import { CompraProveedorModule } from './compra-proveedor/compra-proveedor.module';
import { InventarioTiendaModule } from './inventario-tienda/inventario-tienda.module';
import { InventarioSucursalModule } from './inventario-sucursal/inventario-sucursal.module';
import { TransferenciaInventarioModule } from './transferencia-inventario/transferencia-inventario.module';
import { ParametrosFisicosTelaModule } from './parametros-fisicos-tela/parametros-fisicos-tela.module';
import { CostureroModule } from './produccion/costurero/costurero.module';
import { ParametrosTelaModule } from './produccion/parametros-tela/parametros-tela.module';
import { TrabajosModule } from './produccion/trabajos/trabajos.module';
import { TrabajosFinalizadosModule } from './produccion/trabajos-finalizados/trabajos-finalizados.module';
import { ConfigModule } from '@nestjs/config';
import { InventarioTelaModule } from './inventario-tela/inventario-tela.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ActivityLogService } from './activity-log/activity-log.service';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { ActivityLogInterceptor } from './activity-log/activity-log.interceptor';


@Module({

  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    ActivityLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
  ],
  imports: [ConfigWebModule, UsuarioModule, AuthModule, TiendaModule, SucursalModule, ProductoModule, CategoriaModule, SubcategoriaModule, VentaModule, CarritoModule, ProveedorModule, TelaModule, CompraTelaItemModule, CompraProveedorModule, InventarioTiendaModule, InventarioSucursalModule, TransferenciaInventarioModule, ParametrosFisicosTelaModule, CostureroModule, ParametrosTelaModule, TrabajosModule, TrabajosFinalizadosModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    InventarioTelaModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Apunta a 'public'
      serveRoot: '/', // Sirve desde la raíz de la URL
    }),
    ActivityLogModule,],
})
export class AppModule { }
