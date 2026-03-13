import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { ValidationPipe } from "@nestjs/common";
import { LoggerService } from "./modules/common/logging/services/logger.service";
import { LoggingInterceptor } from "./modules/common/logging/interceptors/logging.interceptor";
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get<LoggerService>(LoggerService);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggingInterceptor(logger));
  // Since Logging is in one file, break line twice to make it more visible in the logs when the application starts/restarts
  logger.log("\n\nApplication starting...", "Bootstrap");

  /**
   * Enable cookie parsing middleware to read HttpOnly cookies for authentication. This allows the JwtAuthGuard to extract tokens from cookies as well as Authorization headers.
   * Note: The JwtAuthGuard will look for the access token in the HttpOnly cookie
   * CORS must also be configured to allow credentials (cookies) to be sent from the frontend.
   * See
   * @see JwtAuthGuard implementation for details on how tokens are extracted and verified.
   */
  app.use(cookieParser());

  /**
   * Security middleware with Helmet - sets various HTTP headers to improve security
   * Configured for development with relaxed CSP to allow Swagger UI to function
   * In production, CSP should be tightened based on actual frontend requirements
   */
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          imgSrc: ["'self'", "data:", "https:"], // Allow data URIs and HTTPS images for Swagger
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API usage
      hsts: { maxAge: 31536000, includeSubDomains: true }, // HTTPS Strict Transport Security
      noSniff: true, // Prevent MIME type sniffing
      xssFilter: true, // Enable XSS protection
      referrerPolicy: { policy: "no-referrer" }, // Don't send referrer information
    }),
  );

  /**
   * Enable CORS for e - SECURITY WARNING
   * TODO: In production, CORS MUST be restricted to specific trusted origins:
   * app.enableCors({
   *   origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
   *   credentials: true
   * });
   */
  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties not in a DTO
      transform: true, // auto-transforms types (e.g., Convert string -> number if DTO wants number).
      stopAtFirstError: true, // Return after the first validation error instead of returning all errors
    }),
  );

  // Swagger / OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle("BigBrother API")
    .setDescription("BigBrother platform API")
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access-token",
    )
    .build();

  const document: OpenAPIObject = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 5200;
  const ip = "0.0.0.0";
  await app.listen(port, ip);
  logger.log(`Server running on http://${ip}:${port}`, "Bootstrap");
  logger.log(`Swagger docs available on http://${ip}:${port}/api`, "Bootstrap");
}

bootstrap().catch((err: unknown) => {
  const logger = new LoggerService();
  // Safely ensure type of err before accessing stack as some errors may not be Error instances
  const stack = err instanceof Error ? err.stack : "Unknown error";
  logger.error("Fatal error during bootstrap", stack, "Bootstrap");
  process.exit(1);
});
