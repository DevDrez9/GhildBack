import { Decimal } from '@prisma/client/runtime/library';

export class DecimalUtil {
  static toNumber(value: any): number {
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return 0;
  }

  static toDecimal(value: any): Decimal {
    if (value instanceof Decimal) {
      return value;
    }
    return new Decimal(Number(value) || 0);
  }
}