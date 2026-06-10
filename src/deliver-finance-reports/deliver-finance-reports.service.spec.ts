import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DeliverFinanceReportsService } from './deliver-finance-reports.service';
import { Order } from '../order/schemas/order.schema';
import { Master } from '../common/schema/masterData.schema';
import { Customer } from '../customer/schemas/customer.schema';
import { Cart } from '../cart/Schemas/cart.schema';
import { LeadStageHistory } from './schemas/lead-stage-history.schema';
import { NotificationMasterService } from '../notification_master/notification_master.service';
import { HttpService } from '@nestjs/axios';

describe('DeliverFinanceReportsService', () => {
  let service: DeliverFinanceReportsService;
  const orderModel = { findOne: jest.fn() };
  const masterModel = {};
  const customerModel = {};
  const cartModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
  const leadStageHistoryModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliverFinanceReportsService,
        { provide: HttpService, useValue: {} },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(Master.name), useValue: masterModel },
        { provide: getModelToken(Customer.name), useValue: customerModel },
        { provide: getModelToken(Cart.name), useValue: cartModel },
        {
          provide: getModelToken(LeadStageHistory.name),
          useValue: leadStageHistoryModel,
        },
        {
          provide: NotificationMasterService,
          useValue: { sendNotificationMessage: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DeliverFinanceReportsService>(
      DeliverFinanceReportsService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns lead funnel stages from history tracking config', () => {
    const result = service.getLeadFunnelStages();
    expect(result.status).toBe(true);
    expect(result.data.stages).toHaveLength(5);
    expect(result.data.mql_sub_stages).toHaveLength(3);
    expect(result.data.tracking.source_collection).toBe('leadstagehistories');
  });

  it('writes history only when stage changes', async () => {
    cartModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'cart123',
        customer_id: '6a157d9841f37cc54335c96b',
        lead_stage_code: 'RNR',
      }),
    });
    orderModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    cartModel.updateOne.mockResolvedValue({ acknowledged: true });
    leadStageHistoryModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    leadStageHistoryModel.create.mockResolvedValue({});

    await service.updateOpenLeadStage(
      {
        cart_id: 'cart123',
        stage_code: 'MQL',
      },
      { _id: 'user1', name: 'Tester', email: 't@test.com' },
    );

    expect(cartModel.updateOne).toHaveBeenCalledTimes(1);
    expect(leadStageHistoryModel.create).toHaveBeenCalledTimes(1);

    leadStageHistoryModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ to_stage: 'MQL', sub_stage: null }),
      }),
    });

    await service.updateOpenLeadStage(
      {
        cart_id: 'cart123',
        stage_code: 'MQL',
      },
      { _id: 'user1', name: 'Tester', email: 't@test.com' },
    );

    expect(cartModel.updateOne).toHaveBeenCalledTimes(1);
    expect(leadStageHistoryModel.create).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid sub_stage on manual lead update', async () => {
    await expect(
      service.updateOpenLeadStage(
        {
          cart_id: 'cart123',
          stage_code: 'MQL',
          sub_stage: 'INVALID_SUB_STAGE',
        },
        { _id: 'user1', name: 'Tester', email: 't@test.com' },
      ),
    ).rejects.toThrow('Invalid sub_stage');
  });

  it('rejects sub_stage when stage_code is not MQL', async () => {
    cartModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'cart123',
        customer_id: '6a157d9841f37cc54335c96b',
        lead_stage_code: 'RNR',
        createdAt: new Date(),
      }),
    });
    orderModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    leadStageHistoryModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.updateOpenLeadStage(
        {
          cart_id: 'cart123',
          stage_code: 'RNR',
          sub_stage: 'CALL_AFTER_1_DAY',
        },
        { _id: 'user1', name: 'Tester', email: 't@test.com' },
      ),
    ).rejects.toThrow('sub_stage is applicable only when stage_code is MQL');
  });
});
