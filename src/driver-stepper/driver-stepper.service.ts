import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
const moment = require('moment');

@Injectable()
export class DriverStepperService {
  constructor(
    @InjectModel('driver_stepper')
    private stepperModel: Model<any>,
  ) { }

  async checkStepper(dateInput: string) {
    const date = new Date(
      moment(new Date(dateInput))
        .startOf('day')
        .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
    );

    const defaultData = {
      date,
      mp: { step1: true, step2: false, step3: false, step4: false },
      ndd: { step1: true, step2: false, step3: false, step4: false },
      pick_up: { step1: true, step2: true, step3: false, step4: false },
    };

    // BEST APPROACH (atomic + no duplicate)
    const stepperData = await this.stepperModel.findOneAndUpdate(
      { date },
      { $setOnInsert: defaultData },
      {
        new: true,
        upsert: true,
        projection: { _id: 0, date: 1, mp: 1, ndd: 1, pick_up: 1 },
      },
    );

    return {
      status: 'success',
      data: stepperData,
    };
  }
}