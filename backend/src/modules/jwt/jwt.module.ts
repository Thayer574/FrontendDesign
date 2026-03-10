import { Module } from "@nestjs/common";
import { JwtModule as NestJwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtService } from "./jwt.service";

// Type for JWT duration strings (e.g., "7d", "15m", "1h")
type JwtDuration = string;

@Module({
  imports: [
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>("JWT_SECRET");
        const accessExp = configService.get<JwtDuration>("JWT_ACCESS_EXP");
        const refreshExp = configService.get<JwtDuration>("JWT_REFRESH_EXP");

        if (!secret) {
          throw new Error(
            "JWT_SECRET is not defined in the environment variables",
          );
        }
        if (!accessExp) {
          throw new Error(
            "JWT_ACCESS_EXP is not defined in the environment variables",
          );
        }
        if (!refreshExp) {
          throw new Error(
            "JWT_REFRESH_EXP is not defined in the environment variables",
          );
        }

        // Validate JWT duration format
        const validateDuration = (duration: string, varName: string): void => {
          const durationRegex = /^(\d+)([smhd])$/;
          if (!durationRegex.test(duration)) {
            throw new Error(
              `${varName} must be in format like "15m", "7d", "1h", "30s"`,
            );
          }
        };

        validateDuration(accessExp, "JWT_ACCESS_EXP");
        validateDuration(refreshExp, "JWT_REFRESH_EXP");

        return {
          secret,
          signOptions: {
            algorithm: "HS256",
            expiresIn: accessExp,
          },
        };
      },
    }),
  ],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
