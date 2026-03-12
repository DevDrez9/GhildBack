import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: {
    usuarioId?: number;
    metodo: string;
    ruta: string;
    accion?: string;
    statusCode: number;
    detalles?: any;
    ip?: string;
  }) {
    // Evitamos guardar logs sin contexto útil y lo ejecutamos en background para no bloquear
    setImmediate(async () => {
      try {
        await this.prisma.activityLog.create({
          data: {
            ...data,
            detalles: data.detalles ? JSON.parse(JSON.stringify(data.detalles)) : null,
          },
        });
      } catch (error) {
        this.logger.error(`Error saving activity log: ${error.message}`, error.stack);
      }
    });
  }
}
