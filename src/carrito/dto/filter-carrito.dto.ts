import { IsEnum, IsOptional } from 'class-validator';

// Define los estados válidos que se pueden buscar
export enum CarritoEstado {
    NUEVO = 'nuevo',
    PENDIENTE = 'pendiente',
    TERMINADO = 'terminado',
    TODOS = 'todos' // Valor para indicar que no hay filtro de estado
}

export class FilterCarritoDto {
    @IsOptional()
    @IsEnum(CarritoEstado)
    estado?: CarritoEstado;
}