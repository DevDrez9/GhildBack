// src/config-web/config-web.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

import { CreateConfigWebDto } from './dto/create-config-web.dto';
import { UpdateConfigWebDto } from './dto/update-config-web.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

// --- Importaciones de Node.js y UUID ---
import * as fs from 'fs/promises'; 
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
// ----------------------------------------

@Injectable()
export class ConfigWebService {
  constructor(private readonly prisma: PrismaService) {}

  // --- FUNCIÓN HELPER PARA PROCESAR BASE64 (Reutilizada) ---
   private async saveBase64Image(base64String: string, subDir: string = ''): Promise<string> {
    // ... (Tu implementación de saveBase64Image es la misma) ...
    // ... (Incluye la extracción de MIME, validación, escritura de archivo y retorno de URL) ...

    const parts = base64String.split(';base64,');
    if (parts.length !== 2) {
      throw new Error('Formato Base64 inválido. Debe contener el encabezado.');
    }
    
    const mimeTypePart = parts[0].split(':');
    const mimeType = mimeTypePart.pop(); 

    if (!mimeType) {
        throw new Error('Tipo MIME no encontrado en la metadata de la imagen Base64.');
    }

    const mimeTypeParts = mimeType.split('/');
    const extension = mimeTypeParts.length > 1 ? mimeTypeParts[1] : null;

    if (!extension) {
        throw new Error(`Extensión no válida para el tipo MIME proporcionado: ${mimeType}.`);
    }
    
    const base64Data = parts[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const uniqueFileName = `${uuidv4()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subDir); 
    const filePath = path.join(uploadDir, uniqueFileName);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, imageBuffer);

    return path.join('/uploads', subDir, uniqueFileName); 
  }
  // --------------------------------------------------------

  // --- FUNCIÓN HELPER PARA PROCESAR EL ARREGLO DE BANNERS (Reutilizada) ---
  private async processBanners(banners: CreateBannerDto[]): Promise<any[]> {
    const bannerPromises = banners.map(async (bannerDto) => {
      const inputUrl = bannerDto.url;
      let finalUrl = inputUrl; // Por defecto, usamos la URL de entrada

      // **COMPROBACIÓN CLAVE:** Si la URL comienza con 'data:', es Base64
      if (inputUrl && inputUrl.startsWith('data:')) {
        // Solo llamar a saveBase64Image si es Base64
        finalUrl = await this.saveBase64Image(inputUrl, 'banners');
      }
      
      return {
        ...bannerDto,
        url: finalUrl, // Si era Base64, se reemplaza; si era URL, se mantiene
      };
    });
    return Promise.all(bannerPromises);
  }
  // ------------------------------------------------------------------------

  // --- MÉTODO CREATE (Ajustado para logoUrl) ---
 async create(createConfigWebDto: CreateConfigWebDto) {
    // 1. Desestructuramos también imagenQr
    const { banners = [], logoUrl, imagenQr, ...configData } = createConfigWebDto;

    let bannerDataForPrisma: any[] = [];
    if (banners.length > 0) {
      bannerDataForPrisma = await this.processBanners(banners);
    }
    
    // Procesamiento de LOGO
    let processedLogoUrl = logoUrl;
    if (logoUrl && logoUrl.startsWith('data:')) {
      processedLogoUrl = await this.saveBase64Image(logoUrl, 'logos'); 
    }

    // Procesamiento de IMAGEN QR (NUEVO)
    let processedImagenQr = imagenQr;
    if (imagenQr && imagenQr.startsWith('data:')) {
      // Guardamos en una carpeta 'qrs' para mantener el orden
      processedImagenQr = await this.saveBase64Image(imagenQr, 'qrs'); 
    }

    return this.prisma.configWeb.create({
      data: {
        ...configData,
        logoUrl: processedLogoUrl,
        imagenQr: processedImagenQr, // Agregamos el campo procesado
        banners: bannerDataForPrisma.length > 0 ? {
          create: bannerDataForPrisma
        } : undefined
      },
      include: {
        banners: true
      }
    });
  }

  // ... (findAll, findOne, remove - No necesitan cambios)

  // --- MÉTODO UPDATE (Ajustado para logoUrl) ---
 async update(id: number, updateConfigWebDto: UpdateConfigWebDto) {
    await this.findOne(id); 

    // 1. Desestructuramos también imagenQr
    const { banners = [], logoUrl, imagenQr, ...configData } = updateConfigWebDto;

    let bannerDataForPrisma: any[] = [];
    if (banners.length > 0) {
        bannerDataForPrisma = await this.processBanners(banners);
    }
    
    // Procesamiento de LOGO
    let processedLogoUrl = logoUrl;
    if (logoUrl && logoUrl.startsWith('data:')) {
      processedLogoUrl = await this.saveBase64Image(logoUrl, 'logos');
    }

    // Procesamiento de IMAGEN QR (NUEVO)
    let processedImagenQr = imagenQr;
    if (imagenQr && imagenQr.startsWith('data:')) {
      processedImagenQr = await this.saveBase64Image(imagenQr, 'qrs');
    }

    // Construimos el objeto de actualización
    const dataToUpdate: any = {
        ...configData,
        // Actualiza logoUrl solo si viene en el DTO
        ...(logoUrl !== undefined && { logoUrl: processedLogoUrl }),
        
        // Actualiza imagenQr solo si viene en el DTO (NUEVO)
        ...(imagenQr !== undefined && { imagenQr: processedImagenQr }),
        
        ...(banners.length > 0 && {
          banners: {
            deleteMany: {},
            create: bannerDataForPrisma
          }
        })
    };
    
    return this.prisma.configWeb.update({
      where: { id },
      data: dataToUpdate,
      include: {
        banners: true
      }
    });
  }
  // --- Banner methods (addBanner, updateBanner, removeBanner, getBanners - Ya ajustados) ---

  async addBanner(configWebId: number, createBannerDto: CreateBannerDto) {
    await this.findOne(configWebId); 
    
    let finalUrl = createBannerDto.url;
    // **COMPROBACIÓN CLAVE:**
    if (createBannerDto.url && createBannerDto.url.startsWith('data:')) {
      finalUrl = await this.saveBase64Image(createBannerDto.url, 'banners');
    }

    return this.prisma.imagenBanner.create({
      data: {
        ...createBannerDto,
        url: finalUrl,
        configWebId
      }
    });
  }

  async updateBanner(bannerId: number, updateBannerDto: UpdateBannerDto) {
    // ... (Verificación de existencia)

    let dataToUpdate = { ...updateBannerDto };

    // **COMPROBACIÓN CLAVE:** Solo procesar si 'url' existe y es Base64
    if (updateBannerDto.url && updateBannerDto.url.startsWith('data:')) {
      const finalUrl = await this.saveBase64Image(updateBannerDto.url, 'banners');
      dataToUpdate.url = finalUrl;
    }

    return this.prisma.imagenBanner.update({
      where: { id: bannerId },
      data: dataToUpdate
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
     await this.findOne(configWebId);
 
     return this.prisma.imagenBanner.findMany({
       where: { configWebId },
       orderBy: { orden: 'asc' }
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
}