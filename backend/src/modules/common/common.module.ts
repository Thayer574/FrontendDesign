import { Module } from '@nestjs/common';
import { HealthController } from './health/controller/health.controller';
import { DbModule } from '../db/db.module';
import { LoggerService } from './logging/services/logger.service';
import { LoggingInterceptor } from './logging/interceptors/logging.interceptor';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [DbModule, CacheModule],
    controllers: [HealthController],
    providers: [LoggerService, LoggingInterceptor],
    exports: [LoggerService, LoggingInterceptor],
})
export class CommonModule {}
