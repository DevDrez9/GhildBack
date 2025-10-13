import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

export class FilterProductoTrabajoDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    tiendaId?: number;
}