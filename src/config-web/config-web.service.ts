import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateConfigWebDto } from './dto/create-config-web.dto';
import { UpdateConfigWebDto } from './dto/update-config-web.dto';
import { PrismaService } from 'src/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';


@Injectable()
export class ConfigWebService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createConfigWebDto: CreateConfigWebDto) {
    const { banners, ...configData } = createConfigWebDto;

    return this.prisma.configWeb.create({
      data: {
        ...configData,
        banners: banners ? {
          create: banners
        } : undefined
      },
      include: {
        banners: true
      }
    });
  }

  async findAll() {
    return this.prisma.configWeb.findMany({
      include: {
        banners: {
          orderBy: {
            orden: 'asc'
          }
        }
      }
    });
  }

  async findOne(id: number) {
    const configWeb = await this.prisma.configWeb.findUnique({
      where: { id },
      include: {
        banners: {
          orderBy: {
            orden: 'asc'
          }
        }
      }
    });

    if (!configWeb) {
      throw new NotFoundException(`ConfigWeb con ID ${id} no encontrado`);
    }

    return configWeb;
  }

  async update(id: number, updateConfigWebDto: UpdateConfigWebDto) {
    await this.findOne(id); // Verificar que existe

    const { banners, ...configData } = updateConfigWebDto;

    return this.prisma.configWeb.update({
      where: { id },
      data: {
        ...configData,
        ...(banners && {
          banners: {
            deleteMany: {}, // Eliminar banners existentes
            create: banners // Crear nuevos banners
          }
        })
      },
      include: {
        banners: true
      }
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Verificar que existe

    return this.prisma.configWeb.delete({
      where: { id }
    });
  }

  // Banner methods
  async addBanner(configWebId: number, createBannerDto: CreateBannerDto) {
    await this.findOne(configWebId); // Verificar que la config existe

    return this.prisma.imagenBanner.create({
      data: {
        ...createBannerDto,
        configWebId
      }
    });
  }

  async updateBanner(bannerId: number, updateBannerDto: UpdateBannerDto) {
    const banner = await this.prisma.imagenBanner.findUnique({
      where: { id: bannerId }
    });

    if (!banner) {
      throw new NotFoundException(`Banner con ID ${bannerId} no encontrado`);
    }

    return this.prisma.imagenBanner.update({
      where: { id: bannerId },
      data: updateBannerDto
    });
  }

  async removeBanner(bannerId: number) {
    const banner = await this.prisma.imagenBanner.findUnique({
      where: { id: bannerId }
    });

    if (!banner) {
      throw new NotFoundException(`Banner con ID ${bannerId} no encontrado`);
    }

    return this.prisma.imagenBanner.delete({
      where: { id: bannerId }
    });
  }

  async getBanners(configWebId: number) {
    await this.findOne(configWebId); // Verificar que la config existe

    return this.prisma.imagenBanner.findMany({
      where: { configWebId },
      orderBy: { orden: 'asc' }
    });
  }
}