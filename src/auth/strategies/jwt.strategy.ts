import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';



@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'fallback_secret_key'), // ← Usa ConfigService
    });
  }

  async validate(payload: any) {
    return { 
      id: payload.sub, // ← Mejor usar "id" en lugar de "userId" para consistencia
      email: payload.email,
      rol: payload.rol 
    };
  }
}