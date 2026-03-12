import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from './activity-log.service';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    constructor(private readonly activityLogService: ActivityLogService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();

        const { method, url, body, ip } = request;
        const user = request.user; // Assuming JWT or Passport populates this

        // Lista de métodos a registrar. Ignoramos GET, HEAD, OPTIONS
        const methodsToLog = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (!methodsToLog.includes(method)) {
            return next.handle();
        }

        // Obtenemos el nombre del handler (la función del controlador original)
        const handlerName = context.getHandler().name;

        // Removemos data sensible si la hubiera en el body
        const bodyClone = { ...body };
        if (bodyClone.password) delete bodyClone.password;
        if (bodyClone.token) delete bodyClone.token;

        return next.handle().pipe(
            tap({
                next: () => {
                    this.activityLogService.createLog({
                        usuarioId: user?.id || null,
                        metodo: method,
                        ruta: url,
                        accion: handlerName,
                        statusCode: response.statusCode,
                        detalles: Object.keys(bodyClone).length > 0 ? bodyClone : null,
                        ip,
                    });
                },
                error: (error) => {
                    // También podemos loggear cuando hay un error, guardando el status code real si lo tiene, o 500
                    const statusCode = error.status || 500;
                    this.activityLogService.createLog({
                        usuarioId: user?.id || null,
                        metodo: method,
                        ruta: url,
                        accion: handlerName,
                        statusCode,
                        detalles: { ...(Object.keys(bodyClone).length > 0 ? bodyClone : {}), error: error.message },
                        ip,
                    });
                },
            }),
        );
    }
}
