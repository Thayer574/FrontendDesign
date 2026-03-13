import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DbService } from '../../../db/db.service';
import { CacheService } from '../../../cache/cache.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DbService,
          useValue: {
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: CacheService,
          useValue: {
            ping: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return healthy cache status when ping succeeds', async () => {
    const result = await controller.getHealth();
    expect(result.cache.status).toBe('healthy');
  });

  it('should return unhealthy cache status when ping fails', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DbService,
          useValue: { healthCheck: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: CacheService,
          useValue: { ping: jest.fn().mockResolvedValue(false) },
        },
      ],
    }).compile();

    const unhealthyController = module.get<HealthController>(HealthController);
    const result = await unhealthyController.getHealth();
    expect(result.cache.status).toBe('unhealthy');
  });
});
