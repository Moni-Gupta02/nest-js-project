import { Test, TestingModule } from '@nestjs/testing';
import { ReportCalenderService } from './report-calender.service';

describe('ReportCalenderService', () => {
  let service: ReportCalenderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportCalenderService],
    }).compile();

    service = module.get<ReportCalenderService>(ReportCalenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
