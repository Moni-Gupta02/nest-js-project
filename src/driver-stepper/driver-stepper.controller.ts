import { Controller, Get, Query } from '@nestjs/common';
import { DriverStepperService } from './driver-stepper.service';
import { CheckStepperDto } from './dto/check-stepper.dto';
import { Public } from '../common/decorators';

@Public()
@Controller('driver-stepper')
export class DriverStepperController {
  constructor(private readonly service: DriverStepperService) {}

  @Get('check')
  checkStepper(@Query() dto: CheckStepperDto) {
    return this.service.checkStepper(dto.date);
  }
}