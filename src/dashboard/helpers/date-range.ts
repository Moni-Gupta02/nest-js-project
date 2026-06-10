import * as moment from 'moment';

export type DashboardDateRange = {
  startDate: string;
  endDate: string;
  start: Date;
  end: Date;
};

export function parseDashboardQuery(
  startDate: string,
  endDate: string,
): DashboardDateRange {
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }
  return {
    startDate,
    endDate,
    start: moment(new Date(startDate)).startOf('day').toDate(),
    end: moment(new Date(endDate)).endOf('day').toDate(),
  };
}

export function deliveryDateGte(start: Date): Date {
  return new Date(moment(start).startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'));
}

export function deliveryDateLte(end: Date): Date {
  return new Date(moment(end).startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'));
}
