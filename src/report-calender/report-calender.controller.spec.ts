import { Test, TestingModule } from '@nestjs/testing';
import { ReportCalenderController } from './report-calender.controller';
import { ReportCalenderService } from './report-calender.service';

describe('ReportCalenderController', () => {
  let controller: ReportCalenderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportCalenderController],
      providers: [ReportCalenderService],
    }).compile();

    controller = module.get<ReportCalenderController>(ReportCalenderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
