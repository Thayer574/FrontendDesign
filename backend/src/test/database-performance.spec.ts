import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/common/entities/user.entity';
import { Note } from '../modules/notes/entities/note.entity';
import { CalendarEvent } from '../modules/calendar/entities/calendar-event.entity';
import { WidgetPlacement } from '../modules/widgets/entities/widget-placement.entity';

describe('Database Performance Tests', () => {
  let userRepo: Repository<User>;
  let noteRepo: Repository<Note>;
  let calendarRepo: Repository<CalendarEvent>;
  let widgetRepo: Repository<WidgetPlacement>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'margin_test',
          autoLoadEntities: true,
          synchronize: true, // Only for tests
          logging: false,
        }),
        TypeOrmModule.forFeature([User, Note, CalendarEvent, WidgetPlacement]),
      ],
    }).compile();

    userRepo = module.get('UserRepository');
    noteRepo = module.get('NoteRepository');
    calendarRepo = module.get('CalendarEventRepository');
    widgetRepo = module.get('WidgetPlacementRepository');
  });

  describe('Index Performance Tests', () => {
    it('should efficiently query JSONB metadata with GIN index', async () => {
      const startTime = performance.now();

      await noteRepo
        .createQueryBuilder('note')
        .where("note.metadata @> :metadata", {
          metadata: JSON.stringify({ category: 'work' })
        })
        .getMany();

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`JSONB query took ${duration}ms`);
      expect(duration).toBeLessThan(100); // Should be very fast with GIN index
    });

    it('should efficiently query calendar date ranges', async () => {
      const startTime = performance.now();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await calendarRepo
        .createQueryBuilder('event')
        .where('event.startAt >= :startDate', { startDate })
        .andWhere('event.endAt <= :endDate', { endDate })
        .getMany();

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Date range query took ${duration}ms`);
      expect(duration).toBeLessThan(50); // Should be fast with composite index
    });

    it('should efficiently query widget positions', async () => {
      const startTime = performance.now();

      await widgetRepo
        .createQueryBuilder('widget')
        .where('widget.x BETWEEN :minX AND :maxX', { minX: 100, maxX: 500 })
        .andWhere('widget.y BETWEEN :minY AND :maxY', { minY: 100, maxY: 300 })
        .getMany();

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Spatial query took ${duration}ms`);
      expect(duration).toBeLessThan(25); // Should be very fast with position index
    });
  });

  describe('Connection Pool Tests', () => {
    it('should handle concurrent queries efficiently', async () => {
      const queries = Array.from({ length: 20 }, () =>
        userRepo.find({ take: 10 })
      );

      const startTime = performance.now();
      await Promise.all(queries);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`20 concurrent queries took ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should handle concurrency well
    });
  });

  describe('Data Type Performance', () => {
    it('should efficiently handle timestamptz comparisons', async () => {
      const startTime = performance.now();

      await calendarRepo
        .createQueryBuilder('event')
        .where('event.createdAt > :date', {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000)
        })
        .getMany();

      const endTime = performance.now();
      console.log(`Timestamp query took ${endTime - startTime}ms`);
    });

    it('should efficiently query enum fields', async () => {
      const startTime = performance.now();

      await userRepo.find({
        where: { role: 'admin' }
      });

      const endTime = performance.now();
      console.log(`Enum query took ${endTime - startTime}ms`);
    });
  });
});