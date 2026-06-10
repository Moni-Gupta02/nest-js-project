import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AWBDocument } from 'src/pickup-orders/schemas/awb.schema';
import { DriverStepper } from 'src/driver/schemas/driver-stepper.schema';
import { DriverBagManagementDocument } from './schema/driver-bag-management.schema';
import * as moment from 'moment';
const bcrypt = require('bcrypt');

import {
    CreateDriverDto,
    CreateHelperDto,
    GetDriversDto,
    GetHelpersDto,
    EditActiveDriverDto,
    EditDriverDto,
    EditHelperDto,
    AllocateDriversDto,
    CheckAllocationDto,
    GetDeliveriesAllocationDetailsDto,
    UnassignedToAssignDto,
    CompleteAllocationDto,
    GetOwnDeliveryForDriversDto
} from './dto/delivery-driver.dto';

import { User } from './schema/users.schema';

@Injectable()
export class DeliveryDriverService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel('driver_stepper')
        private readonly driverStepperModel: Model<DriverStepper>,
        @InjectModel('awbs')
        private readonly awbModel: Model<AWBDocument>,
        @InjectModel('driver_bag_management')
        private readonly driverBagModel: Model<DriverBagManagementDocument>,
    ) { }

    private startOfDay(date: string | Date): Date {
        return new Date(
            moment(new Date(date))
                .startOf('day')
                .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        );
    }

    private endOfDay(date: string | Date): Date {
        return new Date(
            moment(new Date(date))
                .endOf('day')
                .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        );
    }

    private mapPhase(phase: string): string {
        if (phase === 'MP' || phase === 'mp') return 'mp';
        if (phase === 'NDD' || phase === 'ndd') return 'ndd';
        return 'bag_pick';
    }

    private getPackageDetails(data: any) {
        const deliveryItems = data?.delivery_item || data?.delivery_items || [];

        if (!Array.isArray(deliveryItems) || deliveryItems.length === 0) {
            return {
                noOfPackages: data?.no_of_package || 1,
                packageDetails: data?.package_details || '',
            };
        }

        return {
            noOfPackages: deliveryItems.length,
            packageDetails: deliveryItems
                .map((item: any) => item?.meal_type || item?.name || item?.type)
                .filter(Boolean)
                .join(', '),
        };
    }

    async allocateDrivers(body: AllocateDriversDto) {
        try {
            const { date, forceContinue = false } = body;
            const phase = this.mapPhase(body.phase);

            const startDate = this.startOfDay(date);
            const endDate = this.endOfDay(date);

            const stepperData: any = await this.driverStepperModel
                .findOne({
                    date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                })
                .lean();

            if (!stepperData) {
                throw new BadRequestException('Driver stepper data not found for this date');
            }

            const isMpStep3Done =
                stepperData?.mp?.step3 === true || stepperData?.mp?.step3 === 'true';

            const isNddStep3Done =
                stepperData?.ndd?.step3 === true || stepperData?.ndd?.step3 === 'true';

            if (!isMpStep3Done || !isNddStep3Done) {
                return {
                    success: false,
                    message: 'Please Complete The Steps For Both MP and NDD Before Allocation!',
                };
            }

            const driverManagementData: any[] = await this.driverBagModel
                .find({
                    delivery_date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                })
                .lean();

            await this.awbModel.updateMany(
                {
                    transcorp_date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    vendor: 'own',
                    active: true,
                    is_finalized: true,
                },
                {
                    $set: {
                        is_drived_finalized: false,
                    },
                },
            );

            const driverData: any[] = await this.userModel
                .find(
                    {
                        role: 'driver',
                        'details.active': true,
                    },
                    {
                        name: 1,
                        email: 1,
                        details: 1,
                        role: 1,
                        scanner_pin: 1,
                    },
                )
                .lean();

            const driverListPayload = driverData.map((driver: any) => ({
                driver_id: driver?._id,
                max_deliveries: driver?.details?.max_deliveries || 0,
                available_deliveries: driver?.details?.max_deliveries || 0,
            }));

            const getAwbData: any[] = await this.awbModel
                .find({
                    transcorp_date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    vendor: 'own',
                    active: true,
                    is_finalized: true,
                })
                .sort({ 'refund_bag_details.city': -1 })
                .lean();

            for (const driver of driverData) {
                const driverIndex = driverListPayload.findIndex(
                    (driverItm: any) =>
                        String(driverItm?.driver_id) === String(driver?._id),
                );

                const bulkOps: any[] = [];
                const partialOps: any[] = [];

                let deliveryCount = parseInt(driver?.details?.max_deliveries) || 0;
                const selectedAreas = driver?.details?.selected_area || [];

                for (const selectedArea of selectedAreas) {
                    const partialAwb = getAwbData.filter((awb: any) => {
                        const timeSlotIndex = driver?.details?.time_slot?.findIndex(
                            (timeItm: any) =>
                                timeItm?.value === awb?.refund_bag_details?.slot,
                        );

                        return (
                            timeSlotIndex !== -1 &&
                            awb?.refund_bag_details?.city === selectedArea?.city &&
                            awb?.refund_bag_details?.area === selectedArea?.area
                        );
                    });

                    for (const awbItem of partialAwb) {
                        if (deliveryCount <= 0) break;

                        const driverDataIndex = driverManagementData.findIndex(
                            (driverBag: any) => driverBag?.awb === awbItem?.awb,
                        );

                        if (
                            driverDataIndex === -1 ||
                            ['Unassigned', 'Assigned'].includes(
                                driverManagementData?.[driverDataIndex]?.status,
                            )
                        ) {
                            const packageDetails = this.getPackageDetails(
                                awbItem?.refund_bag_details,
                            );

                            bulkOps.push({
                                updateOne: {
                                    filter: { awb: awbItem?.awb },
                                    update: {
                                        $setOnInsert: {
                                            awb: awbItem?.awb,
                                        },
                                        $set: {
                                            type:
                                                awbItem?.type === 'mp' || awbItem?.type === 'ndd'
                                                    ? 'delivery'
                                                    : 'pick_up',
                                            delivery_date: this.startOfDay(
                                                awbItem?.transcorp_date,
                                            ),
                                            area: awbItem?.refund_bag_details?.area,
                                            city: awbItem?.refund_bag_details?.city,
                                            slot: awbItem?.refund_bag_details?.slot,
                                            address: awbItem?.refund_bag_details?.address,
                                            status: 'Assigned',
                                            helper: driver?.details?.helper,
                                            helper_id: driver?.details?.helper_id,
                                            assign_driver: driver?._id,
                                            vendor: 'own',
                                            order_type: awbItem?.type,
                                            customerDetails:
                                                awbItem?.refund_bag_details?.customerDetails,
                                            order_number:
                                                awbItem?.refund_bag_details?.order_number,
                                            internal_code:
                                                awbItem?.refund_bag_details?.bag_type ===
                                                    'Paper Bag'
                                                    ? 'P' +
                                                    awbItem?.refund_bag_details
                                                        ?.internal_code
                                                    : awbItem?.refund_bag_details
                                                        ?.internal_code,
                                            customer_name:
                                                awbItem?.refund_bag_details?.customer_name,
                                            customer_mobile:
                                                awbItem?.refund_bag_details?.customer_mobile,
                                            no_of_package: packageDetails.noOfPackages,
                                            package_details:
                                                packageDetails.packageDetails,
                                            country:
                                                awbItem?.refund_bag_details?.country,
                                            after_time:
                                                awbItem?.refund_bag_details?.after_time,
                                            before_time:
                                                awbItem?.refund_bag_details?.before_time,
                                            delivery_notes:
                                                awbItem?.refund_bag_details
                                                    ?.delivery_notes,
                                            is_allocation_complete: false,
                                            instruction:
                                                awbItem?.refund_bag_details
                                                    ?.instruction || [],
                                        },
                                    },
                                    upsert: true,
                                },
                            });
                        }

                        if (driverIndex !== -1) {
                            driverListPayload[driverIndex].available_deliveries -= 1;
                        }

                        deliveryCount--;

                        const awbIndex = getAwbData.findIndex(
                            (data: any) => data.awb === awbItem?.awb,
                        );

                        if (awbIndex !== -1) {
                            getAwbData[awbIndex].is_drived_finalized = true;

                            partialOps.push({
                                updateOne: {
                                    filter: { awb: awbItem?.awb },
                                    update: {
                                        $set: {
                                            is_drived_finalized: true,
                                        },
                                    },
                                },
                            });
                        }
                    }
                }

                const chunkSize = 30;

                for (let i = 0; i < bulkOps.length; i += chunkSize) {
                    const chunk = bulkOps.slice(i, i + chunkSize);
                    if (chunk.length > 0) {
                        await this.driverBagModel.bulkWrite(chunk);
                    }
                }

                for (let i = 0; i < partialOps.length; i += chunkSize) {
                    const chunk = partialOps.slice(i, i + chunkSize);
                    if (chunk.length > 0) {
                        await this.awbModel.bulkWrite(chunk);
                    }
                }
            }

            const getNotFinalizedAwb = getAwbData.filter(
                (awb: any) => awb.is_drived_finalized === false,
            );

            const unassignOps: any[] = [];
            const unassignAwbOps: any[] = [];

            for (const unItm of getNotFinalizedAwb) {
                const driverDataIndex = driverManagementData.findIndex(
                    (driver: any) => driver?.awb === unItm?.awb,
                );

                if (
                    driverDataIndex === -1 ||
                    ['Unassigned', 'Assigned'].includes(
                        driverManagementData?.[driverDataIndex]?.status,
                    )
                ) {
                    const packageDetails = this.getPackageDetails(
                        unItm?.refund_bag_details,
                    );

                    unassignOps.push({
                        updateOne: {
                            filter: { awb: unItm?.awb },
                            update: {
                                $setOnInsert: {
                                    awb: unItm?.awb,
                                },
                                $set: {
                                    type:
                                        unItm?.type === 'mp' || unItm?.type === 'ndd'
                                            ? 'delivery'
                                            : 'pick_up',
                                    delivery_date: this.startOfDay(
                                        unItm?.transcorp_date,
                                    ),
                                    area: unItm?.refund_bag_details?.area,
                                    city: unItm?.refund_bag_details?.city,
                                    slot: unItm?.refund_bag_details?.slot,
                                    address: unItm?.refund_bag_details?.address,
                                    status: 'Unassigned',
                                    helper: null,
                                    helper_id: null,
                                    assign_driver: null,
                                    order_type: unItm?.type,
                                    vendor: 'own',
                                    customerDetails:
                                        unItm?.refund_bag_details?.customerDetails,
                                    order_number:
                                        unItm?.refund_bag_details?.order_number,
                                    internal_code:
                                        unItm?.refund_bag_details?.bag_type ===
                                            'Paper Bag'
                                            ? 'P' +
                                            unItm?.refund_bag_details
                                                ?.internal_code
                                            : unItm?.refund_bag_details
                                                ?.internal_code,
                                    customer_name:
                                        unItm?.refund_bag_details?.customer_name,
                                    customer_mobile:
                                        unItm?.refund_bag_details?.customer_mobile,
                                    no_of_package: packageDetails.noOfPackages,
                                    package_details: packageDetails.packageDetails,
                                    country: unItm?.refund_bag_details?.country,
                                    after_time:
                                        unItm?.refund_bag_details?.after_time,
                                    before_time:
                                        unItm?.refund_bag_details?.before_time,
                                    delivery_notes:
                                        unItm?.refund_bag_details?.delivery_notes,
                                    is_allocation_complete: false,
                                    instruction:
                                        unItm?.refund_bag_details?.instruction || [],
                                },
                            },
                            upsert: true,
                        },
                    });
                }

                unassignAwbOps.push({
                    updateOne: {
                        filter: { awb: unItm?.awb },
                        update: {
                            $set: {
                                is_drived_finalized: true,
                            },
                        },
                    },
                });
            }

            const chunkSize = 30;

            for (let i = 0; i < unassignOps.length; i += chunkSize) {
                const chunk = unassignOps.slice(i, i + chunkSize);
                if (chunk.length > 0) {
                    await this.driverBagModel.bulkWrite(chunk);
                }
            }

            for (let i = 0; i < unassignAwbOps.length; i += chunkSize) {
                const chunk = unassignAwbOps.slice(i, i + chunkSize);
                if (chunk.length > 0) {
                    await this.awbModel.bulkWrite(chunk);
                }
            }

            const awbNotDriverFinalized = await this.awbModel.countDocuments({
                transcorp_date: {
                    $gte: startDate,
                    $lte: endDate,
                },
                vendor: 'own',
                active: true,
                is_drived_finalized: false,
                is_finalized: true,
                $or: [{ type: 'mp' }, { type: 'bag_pick' }],
            });

            if (awbNotDriverFinalized > 0 && !forceContinue) {
                return {
                    success: false,
                    warning: true,
                    message:
                        'Still few are not finalized for drivers report. Send forceContinue=true to proceed to step 4.',
                    awbNotDriverFinalized,
                };
            }

            await this.driverStepperModel.updateOne(
                { _id: stepperData._id },
                {
                    $set: {
                        drivers_data: driverListPayload,
                        mp: {
                            step1: true,
                            step2: true,
                            step3: true,
                            step4: true,
                        },
                        ndd: {
                            step1: true,
                            step2: true,
                            step3: true,
                            step4: true,
                        },
                    },
                },
            );

            return {
                success: true,
                message: 'Drivers allocated successfully',
                phase,
                awbNotDriverFinalized,
                drivers_data: driverListPayload,
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            throw new InternalServerErrorException(
                error?.message || 'Failed to allocate drivers',
            );
        }
    }

    private getDefaultPermissions() {
        return {
            dashboard: {
                overall_sales: false,
                visitors: false,
                auto_selection_engine: false,
                order_graph: false,
                durations: false,
                cancellation: false,
            },
            customer: { list: false, edit: false, show: false, export: false },
            order: { list: false, edit: false, show: false },
            leads: { list: false, create: false, edit: false, delete: false, show: false },
            abandonedCart: { list: false, show: false },
            failedOrders: { list: false, show: false },
            rating_report: { show: false, export: false },
            user: { list: false, create: false, edit: false, delete: false },
            delivery_slot: { list: false, edit: false },
            category: { list: false, create: false, edit: false, delete: false },
            ingredient: { list: false, create: false, edit: false, delete: false },
            master_data: { list: false, show: false, edit: false },
            dish_type: { list: false, create: false, edit: false, delete: false },
            cuisine: { list: false, create: false, edit: false, delete: false },
            packaging_material: { list: false, create: false, edit: false, delete: false },
            variant: { list: false, create: false, edit: false, delete: false },
            allergens: { list: false, create: false, edit: false, delete: false },
            barcode_place: { list: false, create: false, edit: false, delete: false },
            recipes: { list: false, create: false, edit: false, delete: false, duplicate: false },
            translation: { list: false, create: false, edit: false, delete: false },
            subscription_price: { list: false, edit: false },
            subscription_fix_price: { list: false, edit: false },
            coupon: { list: false, create: false, edit: false, delete: false, show: false },
            address: { list: false, edit: false, delete: false, show: false },
            notification_master: { list: false, create: false, edit: false, delete: false, show: false },
            logger: { list: false, delete: false, show: false },
            notification_history: { list: false, delete: false, show: false },
            admin_history: { list: false },
            blog: { list: false, create: false, edit: false, delete: false, show: false },
            blog_tag: { list: false, create: false, edit: false, delete: false },
            blog_category: { list: false, create: false, edit: false, delete: false },
            author: { list: false, create: false, edit: false, delete: false },
            web_stories: { list: false, create: false, edit: false, delete: false },
            webStories_category: { list: false, create: false, edit: false, delete: false },
            food_recipe: { list: false, create: false, edit: false, delete: false },
            delivery_locations: { list: false, create: false, edit: false, delete: false },
            who_we_serve: { list: false, create: false, edit: false, delete: false },
            bag_live_status: { list: false, create: false, edit: false, delete: false, export: false },
            transcorp_report: { edit: false, export: false },
            customer_holding_report: { show: false, export: false },
            deposit_refund_report: { show: false },
            bag_analytics: { show: false },
            calender: { show: false },
            kitchen_summary_report: { show: false, export: false },
            kitchen_production_report: { show: false, export: false },
            plating_summary_report: { show: false, export: false },
            portioning_report: { show: false, export: false },
            barcode_report: { show: false, export: false },
            finance_report: { show: false, export: false },
            avoid_ingredient: { show: false, export: false },
            sitemap_url: { list: false, create: false, edit: false, delete: false },
            faq: { list: false, create: false, edit: false, delete: false },
            faq_category: { list: false, create: false, edit: false, delete: false },
            meta_script: { list: false, create: false, edit: false, delete: false },
            newsletter: { list: false },
            task_management: { customer_support: false, accounts: false },
            survey: { show: false },
            driver_panel: { show: false, export: false },
            vehicle: { list: false, create: false, edit: false, delete: false },
            driver: { list: false, create: false, edit: false, delete: false },
            helper: { list: false, create: false, edit: false, delete: false },
        };
    }

    async getDrivers(query: GetDriversDto) {
        try {
            const { search = '', section, active, page = '1', limit = '30' } = query;

            const pageNumber = Number(page);
            const limitNumber = Number(limit);

            if (pageNumber < 1) throw new BadRequestException('Page must be greater than 0');
            if (limitNumber < 1) throw new BadRequestException('Limit must be greater than 0');

            const filter: any = {
                role: 'driver',
                name: { $regex: search.trim(), $options: 'i' },
            };

            if (section) filter['details.section'] = section;
            if (active !== undefined) filter['details.active'] = active === 'true';

            const skip = (pageNumber - 1) * limitNumber;

            const [drivers, total] = await Promise.all([
                this.userModel
                    .find(filter, {
                        name: 1,
                        email: 1,
                        role: 1,
                        details: 1,
                        scanner_pin: 1,
                        createdAt: 1,
                    })
                    .skip(skip)
                    .limit(limitNumber)
                    .lean(),
                this.userModel.countDocuments(filter),
            ]);

            return {
                success: true,
                message: 'Drivers fetched successfully',
                data: drivers.map((driver: any) => ({
                    _id: driver._id,
                    name: driver.name || '',
                    email: driver.email || '',
                    role: driver.role || '',
                    details: driver.details || {},
                    mobile: driver?.details?.mobile || '',
                    helper: driver?.details?.helper || null,
                    helper_id: driver?.details?.helper_id || null,
                    vehicle: driver?.details?.vehicle || '',
                    section: driver?.details?.section || '',
                    time_slot: driver?.details?.time_slot || [],
                    max_deliveries: driver?.details?.max_deliveries || 0,
                    selected_area: driver?.details?.selected_area || [],
                    active: driver?.details?.active || false,
                    scanner_pin: driver?.scanner_pin || '',
                })),
                pagination: {
                    total,
                    page: pageNumber,
                    limit: limitNumber,
                    totalPages: Math.ceil(total / limitNumber),
                },
            };
        } catch (error: any) {
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(error?.message || 'Failed to fetch drivers');
        }
    }

    async getHelpers(query: GetHelpersDto) {
        try {
            const { search = '', active, page = '1', limit = '30' } = query;

            const pageNumber = Number(page);
            const limitNumber = Number(limit);

            if (pageNumber < 1) throw new BadRequestException('Page must be greater than 0');
            if (limitNumber < 1) throw new BadRequestException('Limit must be greater than 0');

            const filter: any = {
                role: 'helper',
                name: { $regex: search.trim(), $options: 'i' },
            };

            if (active !== undefined) filter['details.active'] = active === 'true';

            const skip = (pageNumber - 1) * limitNumber;

            const [helpers, total] = await Promise.all([
                this.userModel
                    .find(filter, {
                        name: 1,
                        email: 1,
                        role: 1,
                        details: 1,
                        scanner_pin: 1,
                        createdAt: 1,
                    })
                    .skip(skip)
                    .limit(limitNumber)
                    .lean(),
                this.userModel.countDocuments(filter),
            ]);

            return {
                success: true,
                message: 'Helpers fetched successfully',
                data: helpers.map((helper: any) => ({
                    _id: helper._id,
                    name: helper.name || '',
                    email: helper.email || '',
                    role: helper.role || '',
                    details: helper.details || {},
                    mobile: helper?.details?.mobile || '',
                    active: helper?.details?.active || false,
                    scanner_pin: helper?.scanner_pin || '',
                })),
                pagination: {
                    total,
                    page: pageNumber,
                    limit: limitNumber,
                    totalPages: Math.ceil(total / limitNumber),
                },
            };
        } catch (error: any) {
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException(error?.message || 'Failed to fetch helpers');
        }
    }

    async createDriver(body: CreateDriverDto) {
        try {
            const { personal_details, selected_area } = body;

            if (!personal_details?.name?.trim()) {
                throw new BadRequestException('Please Enter Name!');
            }

            if (!personal_details?.mobile?.toString()?.trim()) {
                throw new BadRequestException('Please Enter Mobile Number!');
            }

            if (!personal_details?.section?.trim()) {
                throw new BadRequestException('Please Enter Section!');
            }

            if (!personal_details?.time_slot?.length) {
                throw new BadRequestException('Please Enter Time Slot!');
            }

            if (!personal_details?.vehicle?.trim()) {
                throw new BadRequestException('Please Enter Vehicle!');
            }

            const scannerPin = personal_details.scanner_pin?.toString();

            if (!scannerPin || Number(scannerPin) < 100000 || Number(scannerPin) > 999999) {
                throw new BadRequestException('Please Enter 6 Digit Pin!');
            }

            if (
                personal_details.max_deliveries === undefined ||
                personal_details.max_deliveries === null ||
                Number(personal_details.max_deliveries) < 0
            ) {
                throw new BadRequestException('Please Enter Correct Max Deliveries!');
            }

            if (!selected_area?.length) {
                throw new BadRequestException('Please Add Atleast 1 Area!');
            }

            const existingPin = await this.userModel.findOne({ scanner_pin: scannerPin });
            if (existingPin) {
                throw new ConflictException('Existing Pin!');
            }

            const encryptedPassword = await bcrypt.hash('driver123', 10);

            const payload = {
                email: 'driver@delicut.ae',
                encryptedPassword,
                name: personal_details.name || '--',
                role: 'driver',
                group: [],
                details: {
                    name: personal_details.name,
                    mobile: personal_details.mobile?.toString(),
                    section: personal_details.section,
                    time_slot: personal_details.time_slot || [],
                    scanner_pin: scannerPin,
                    helper: personal_details.helper || null,
                    helper_id: personal_details.helper_id || null,
                    vehicle: personal_details.vehicle,
                    max_deliveries: Number(personal_details.max_deliveries),
                    selected_area,
                    active: true,
                },
                scanner_pin: scannerPin,
                ...this.getDefaultPermissions(),
            };

            const createdDriver = await this.userModel.collection.insertOne(payload);

            return {
                success: true,
                message: 'Driver Created Successfully!',
                data: createdDriver,
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof ConflictException
            ) {
                throw error;
            }

            if (error?.code === 11000) {
                throw new ConflictException('Existing Pin!');
            }

            throw new InternalServerErrorException(error?.message || 'Failed to create driver');
        }
    }

    async createHelper(body: CreateHelperDto) {
        try {
            if (!body?.name?.trim()) {
                throw new BadRequestException('Please Enter Name!');
            }

            if (!body?.mobile?.toString()?.trim()) {
                throw new BadRequestException('Please Enter Mobile Number!');
            }

            const scannerPin = body.scanner_pin?.toString();

            if (!scannerPin || Number(scannerPin) < 100000 || Number(scannerPin) > 999999) {
                throw new BadRequestException('Please Enter 6 Digit Pin!');
            }

            const existingPin = await this.userModel.findOne({ scanner_pin: scannerPin });
            if (existingPin) {
                throw new ConflictException('Existing Pin!');
            }

            const encryptedPassword = await bcrypt.hash('helper123', 10);

            const pinData = await this.userModel.findOne({
                scanner_pin: scannerPin,
            });

            if (pinData) {
                return {
                    message: 'Existing Pin!',
                };
            }

            const payload = {
                email: 'helper@delicut.ae',
                encryptedPassword,
                name: body.name || '--',
                role: 'helper',
                group: [],
                details: {
                    name: body.name || '--',
                    mobile: body.mobile?.toString(),
                    scanner_pin: scannerPin,
                    active: true,
                },
                scanner_pin: scannerPin,
                ...this.getDefaultPermissions(),
            };

            //console.log('FINAL PAYLOAD BEFORE CREATE:', JSON.stringify(payload, null, 2));

            const userInput = await this.userModel.collection.insertOne(payload);

            return {
                success: true,
                message: 'Helper Created Successfully!',
                data: userInput.insertedId,
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof ConflictException
            ) {
                throw error;
            }

            if (error?.code === 11000) {
                throw new ConflictException('Existing Pin!');
            }

            throw new InternalServerErrorException(error?.message || 'Failed to create helper');
        }
    }

    async editDriver(id: string, body: EditDriverDto) {
        try {
            if (!id) {
                throw new BadRequestException('Driver id is required');
            }

            const existingDriver: any = await this.userModel.findOne({
                _id: id,
                role: 'driver',
            });

            if (!existingDriver) {
                throw new NotFoundException('Driver not found');
            }

            const updatePayload: Record<string, unknown> = {};
            const { personal_details, selected_area } = body;

            if (personal_details) {
                if (personal_details.name !== undefined) {
                    if (!personal_details.name.trim()) {
                        throw new BadRequestException('Please Enter Name!');
                    }
                    updatePayload.name = personal_details.name;
                    updatePayload['details.name'] = personal_details.name;
                }

                if (personal_details.mobile !== undefined) {
                    if (!personal_details.mobile.toString().trim()) {
                        throw new BadRequestException('Please Enter Mobile Number!');
                    }
                    updatePayload['details.mobile'] = personal_details.mobile.toString();
                }

                if (personal_details.section !== undefined) {
                    if (!personal_details.section.trim()) {
                        throw new BadRequestException('Please Enter Section!');
                    }
                    updatePayload['details.section'] = personal_details.section;
                }

                if (personal_details.time_slot !== undefined) {
                    if (!personal_details.time_slot.length) {
                        throw new BadRequestException('Please Enter Time Slot!');
                    }
                    updatePayload['details.time_slot'] = personal_details.time_slot;
                }

                if (personal_details.vehicle !== undefined) {
                    if (!personal_details.vehicle.trim()) {
                        throw new BadRequestException('Please Enter Vehicle!');
                    }
                    updatePayload['details.vehicle'] = personal_details.vehicle;
                }

                if (personal_details.max_deliveries !== undefined) {
                    if (Number(personal_details.max_deliveries) < 0) {
                        throw new BadRequestException('Please Enter Correct Max Deliveries!');
                    }
                    updatePayload['details.max_deliveries'] = Number(
                        personal_details.max_deliveries,
                    );
                }

                if (personal_details.helper !== undefined) {
                    updatePayload['details.helper'] = personal_details.helper;
                }

                if (personal_details.helper_id !== undefined) {
                    updatePayload['details.helper_id'] = personal_details.helper_id;
                }

                if (personal_details.scanner_pin !== undefined) {
                    const scannerPin = personal_details.scanner_pin.toString();

                    if (
                        !scannerPin ||
                        Number(scannerPin) < 100000 ||
                        Number(scannerPin) > 999999
                    ) {
                        throw new BadRequestException('Please Enter 6 Digit Pin!');
                    }

                    const existingPin = await this.userModel.findOne({
                        scanner_pin: scannerPin,
                        _id: { $ne: id },
                    });

                    if (existingPin) {
                        throw new ConflictException('Existing Pin!');
                    }

                    updatePayload.scanner_pin = scannerPin;
                    updatePayload['details.scanner_pin'] = scannerPin;
                }

                if (personal_details.active !== undefined) {
                    updatePayload['details.active'] = personal_details.active;
                }
            }

            if (selected_area !== undefined) {
                if (!selected_area.length) {
                    throw new BadRequestException('Please Add Atleast 1 Area!');
                }
                updatePayload['details.selected_area'] = selected_area;
            }

            if (!Object.keys(updatePayload).length) {
                throw new BadRequestException('No fields to update');
            }

            const updatedDriver = await this.userModel.findOneAndUpdate(
                { _id: id, role: 'driver' },
                { $set: updatePayload },
                { new: true },
            );

            return {
                success: true,
                message: 'Driver updated successfully',
                data: updatedDriver,
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof ConflictException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            if (error?.code === 11000) {
                throw new ConflictException('Existing Pin!');
            }

            throw new InternalServerErrorException(
                error?.message || 'Failed to update driver',
            );
        }
    }

    async editActiveDriver(id: string, body: EditActiveDriverDto) {
        try {
            if (!id) {
                throw new BadRequestException('Driver id is required');
            }

            if (body?.details?.active === undefined) {
                throw new BadRequestException('details.active is required');
            }

            const updatedDriver = await this.userModel.findOneAndUpdate(
                {
                    _id: id,
                    role: 'driver',
                },
                {
                    $set: {
                        'details.active': body.details.active,
                    },
                },
                {
                    new: true,
                },
            );

            if (!updatedDriver) {
                throw new NotFoundException('Driver not found');
            }

            return {
                success: true,
                message: 'Driver updated successfully',
                data: updatedDriver,
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            throw new InternalServerErrorException(
                error?.message || 'Failed to update driver',
            );
        }
    }

    async deleteDriver(id: string) {
        try {
            if (!id) {
                throw new BadRequestException('Driver id is required');
            }

            const deletedDriver = await this.userModel.findOneAndDelete({
                _id: id,
                role: 'driver',
            });

            if (!deletedDriver) {
                throw new NotFoundException('Driver not found');
            }

            return {
                success: true,
                message: 'Driver deleted successfully',
                data: {
                    _id: deletedDriver._id,
                    name: deletedDriver.name,
                },
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            throw new InternalServerErrorException(error?.message || 'Failed to delete driver');
        }
    }

    async editHelper(id: string, body: EditHelperDto) {
        try {
            if (!id) {
                throw new BadRequestException('Helper id is required');
            }

            const existingHelper: any = await this.userModel.findOne({
                _id: id,
                role: 'helper',
            });

            if (!existingHelper) {
                throw new NotFoundException('Helper not found');
            }

            const updatePayload: any = {};

            if (body.name !== undefined) {
                if (!body.name.trim()) {
                    throw new BadRequestException('Please Enter Name!');
                }

                updatePayload.name = body.name;
                updatePayload['details.name'] = body.name;
            }

            if (body.mobile !== undefined) {
                if (!body.mobile.toString().trim()) {
                    throw new BadRequestException('Please Enter Mobile Number!');
                }

                updatePayload['details.mobile'] = body.mobile.toString();
            }

            if (body.scanner_pin !== undefined) {
                const scannerPin = body.scanner_pin.toString();

                if (!scannerPin || Number(scannerPin) < 100000 || Number(scannerPin) > 999999) {
                    throw new BadRequestException('Please Enter 6 Digit Pin!');
                }

                const existingPin = await this.userModel.findOne({
                    scanner_pin: scannerPin,
                    _id: { $ne: id },
                });

                if (existingPin) {
                    throw new ConflictException('Existing Pin!');
                }

                updatePayload.scanner_pin = scannerPin;
                updatePayload['details.scanner_pin'] = scannerPin;
            }

            if (body.active !== undefined) {
                updatePayload['details.active'] = body.active;
            }

            const updatedHelper = await this.userModel.findOneAndUpdate(
                { _id: id, role: 'helper' },
                { $set: updatePayload },
                { new: true },
            );

            return {
                success: true,
                message: 'Helper updated successfully',
                data: updatedHelper,
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof ConflictException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            if (error?.code === 11000) {
                throw new ConflictException('Existing Pin!');
            }

            throw new InternalServerErrorException(error?.message || 'Failed to update helper');
        }
    }

    async editActiveHelper(id: string, body: EditActiveDriverDto) {
        try {
            if (!id) {
                throw new BadRequestException('Helper id is required');
            }

            if (body?.details?.active === undefined) {
                throw new BadRequestException('details.active is required');
            }

            const updatedHelper = await this.userModel.findOneAndUpdate(
                { _id: id, role: 'helper' },
                {
                    $set: {
                        'details.active': body.details.active,
                    },
                },
                { new: true },
            );

            if (!updatedHelper) {
                throw new NotFoundException('Helper not found');
            }

            return {
                success: true,
                message: 'Helper updated successfully',
                data: updatedHelper,
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            throw new InternalServerErrorException(error?.message || 'Failed to update helper');
        }
    }

    async deleteHelper(id: string) {
        try {
            if (!id) {
                throw new BadRequestException('Helper id is required');
            }

            const deletedHelper = await this.userModel.findOneAndDelete({
                _id: id,
                role: 'helper',
            });

            if (!deletedHelper) {
                throw new NotFoundException('Helper not found');
            }

            return {
                success: true,
                message: 'Helper deleted successfully',
                data: {
                    _id: deletedHelper._id,
                    name: deletedHelper.name,
                },
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            throw new InternalServerErrorException(error?.message || 'Failed to delete helper');
        }
    }

    async checkForAllocationOrNot(query: CheckAllocationDto) {
        try {
            const { date } = query;

            const startDate = this.startOfDay(date);
            const endDate = this.endOfDay(date);

            const getAllocatedDataCount = await this.driverBagModel.countDocuments({
                delivery_date: {
                    $gte: startDate,
                    $lte: endDate,
                },
                is_allocation_complete: true,
            });

            return {
                success: true,
                message: 'Allocation status fetched successfully',
                getAllocatedDataCount,
                isAllocated: getAllocatedDataCount > 0,
            };
        } catch (error: any) {
            throw new InternalServerErrorException(
                error?.message || 'Failed to check allocation status',
            );
        }
    }

    async getDeliveriesAllocationDetails(query: GetDeliveriesAllocationDetailsDto) {
        try {
            const { date, phase, section } = query;

            const startDate = this.startOfDay(date);
            const endDate = this.endOfDay(date);
            const mappedPhase = this.mapPhase(phase);

            const phaseFilter = {
                order_type: mappedPhase,
            };

            const unassignedData = await this.driverBagModel
                .find({
                    delivery_date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    vendor: 'own',
                    status: 'Unassigned',
                    ...phaseFilter,
                })
                .populate({
                    path: 'assign_driver',
                    select: '_id name details',
                })
                .populate({
                    path: 'helper_id',
                    select: '_id name details',
                })
                .lean();

            const assignedData = await this.driverBagModel.aggregate([
                {
                    $match: {
                        delivery_date: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                        vendor: 'own',
                        status: 'Assigned',
                        ...phaseFilter,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'assign_driver',
                        foreignField: '_id',
                        as: 'assign_driver_details',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'helper_id',
                        foreignField: '_id',
                        as: 'helper_details',
                    },
                },
                {
                    $match: {
                        'assign_driver_details.details.section': section,
                    },
                },
                {
                    $group: {
                        _id: '$assign_driver',
                        totalAssigned: { $sum: 1 },
                        documents: { $push: '$$ROOT' },
                    },
                },
            ]);

            /**
             * IMPORTANT:
             * Left side tabs should show ALL active drivers of selected section,
             * not only drivers who have assigned deliveries.
             */
            const drivers = await this.userModel
                .find(
                    {
                        role: 'driver',
                        'details.active': true,
                        'details.section': section,
                    },
                    {
                        name: 1,
                        details: 1,
                    },
                )
                .lean();

            const buildStats = (deliveries: any[]) => {
                const deliveriesCount = deliveries.filter((item: any) =>
                    ['mp', 'ndd'].includes(item?.order_type),
                ).length;

                const pickupsCount = deliveries.filter(
                    (item: any) => !['mp', 'ndd'].includes(item?.order_type),
                ).length;

                const areaCount = [
                    ...new Set(
                        deliveries
                            .map((item: any) => item?.area)
                            .filter(Boolean),
                    ),
                ].length;

                return {
                    deliveriesCount,
                    pickupsCount,
                    areaCount,
                };
            };

            const tabs: any[] = [
                {
                    title: 'Unassigned',
                    driver_id: null,
                    vehicleNo: '',
                    helper: '',
                    helper_id: null,
                    active: true,
                    max_deliveries: 0,
                    mobile: '',
                    section,
                    time_slot: [],
                    deliveries: unassignedData,
                    ...buildStats(unassignedData),
                },
            ];

            drivers.forEach((driver: any) => {
                tabs.push({
                    title: driver?.details?.name || driver?.name || '',
                    driver_id: driver?._id,
                    vehicleNo: driver?.details?.vehicle || '',
                    helper: driver?.details?.helper || '',
                    helper_id: driver?.details?.helper_id || null,
                    active: driver?.details?.active || false,
                    max_deliveries: driver?.details?.max_deliveries || 0,
                    mobile: driver?.details?.mobile || '',
                    section: driver?.details?.section || '',
                    time_slot: driver?.details?.time_slot || [],
                    deliveries: [],
                    deliveriesCount: 0,
                    pickupsCount: 0,
                    areaCount: 0,
                });
            });

            assignedData.forEach((group: any) => {
                const driverIndex = tabs.findIndex(
                    (tab: any) => String(tab.driver_id) === String(group._id),
                );

                if (driverIndex !== -1) {
                    const deliveries = group?.documents || [];

                    tabs[driverIndex].deliveries = deliveries;

                    const stats = buildStats(deliveries);
                    tabs[driverIndex].deliveriesCount = stats.deliveriesCount;
                    tabs[driverIndex].pickupsCount = stats.pickupsCount;
                    tabs[driverIndex].areaCount = stats.areaCount;
                }
            });

            return {
                success: true,
                message: 'Own deliveries fetched successfully',
                // unassignedData,
                // assignedData,
                tabs,
            };
        } catch (error: any) {
            throw new InternalServerErrorException(
                error?.message || 'Failed to fetch own deliveries list task',
            );
        }
    }

    async unassignedToAssign(body: UnassignedToAssignDto) {
        try {
            const { date, items } = body;

            if (!items?.length) {
                throw new BadRequestException('items are required');
            }

            const startDate = this.startOfDay(date);
            const endDate = this.endOfDay(date);

            const driverIds = items
                .map((item) => item.driver_id)
                .filter(Boolean);

            const drivers = await this.userModel
                .find(
                    {
                        _id: { $in: driverIds },
                        role: 'driver',
                    },
                    {
                        name: 1,
                        details: 1,
                    },
                )
                .lean();

            const driverMap = new Map(
                drivers.map((driver: any) => [String(driver._id), driver]),
            );

            const bulkOps: any[] = [];
            const driversPayload: any[] = [];

            for (const item of items) {
                const driver: any = item.driver_id
                    ? driverMap.get(String(item.driver_id))
                    : null;

                if (item.driver_id && !driver) {
                    throw new BadRequestException(
                        `Driver not found: ${item.driver_id}`,
                    );
                }

                bulkOps.push({
                    updateOne: {
                        filter: {
                            _id: item.delivery_id,
                        },
                        update: {
                            $set: {
                                assign_driver: driver?._id || null,
                                helper: driver?.details?.helper || null,
                                helper_id: driver?.details?.helper_id || null,
                                status: driver ? 'Assigned' : 'Unassigned',
                                is_allocation_complete: false,
                            },
                        },
                    },
                });

                if (driver?._id) {
                    const index = driversPayload.findIndex(
                        (driverItem: any) =>
                            String(driverItem._id) === String(driver._id),
                    );

                    if (index === -1) {
                        driversPayload.push({
                            _id: driver._id,
                            extra_deliveries: 1,
                        });
                    } else {
                        driversPayload[index].extra_deliveries += 1;
                    }
                }
            }

            if (bulkOps.length > 0) {
                await this.driverBagModel.bulkWrite(bulkOps);
            }

            const stepperData: any = await this.driverStepperModel
                .findOne({
                    date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                })
                .lean();

            if (stepperData) {
                const driversData = stepperData?.drivers_data || [];

                driversPayload.forEach((driverItem: any) => {
                    const index = driversData.findIndex(
                        (stepperItem: any) =>
                            String(stepperItem?.driver_id) ===
                            String(driverItem?._id),
                    );

                    if (index !== -1) {
                        driversData[index].extra_deliveries =
                            driverItem.extra_deliveries;
                    }
                });

                await this.driverStepperModel.findByIdAndUpdate(stepperData._id, {
                    $set: {
                        drivers_data: driversData,
                    },
                });
            }

            return {
                success: true,
                message: 'Deliveries assignment updated successfully',
                updatedCount: bulkOps.length,
                driversPayload,
            };
        } catch (error: any) {
            if (error instanceof BadRequestException) throw error;

            throw new InternalServerErrorException(
                error?.message || 'Failed to assign deliveries',
            );
        }
    }

    async completeAllocation(body: CompleteAllocationDto) {
        try {
            const { date } = body;

            const startDate = this.startOfDay(date);
            const endDate = this.endOfDay(date);

            const alreadyCompletedCount = await this.driverBagModel.countDocuments({
                delivery_date: {
                    $gte: startDate,
                    $lte: endDate,
                },
                is_allocation_complete: true,
            });

            if (alreadyCompletedCount > 0) {
                throw new BadRequestException(
                    'Allocation is already completed for this date',
                );
            }

            await this.driverBagModel.updateMany(
                {
                    delivery_date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
                {
                    $set: {
                        is_allocation_complete: true,
                    },
                },
            );

            return {
                success: true,
                message: 'Allocation completed successfully',
            };
        } catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException(
                error?.message || 'Failed to complete allocation',
            );
        }
    }

    async getOwnDeliveryForDrivers(body: GetOwnDeliveryForDriversDto) {
        try {
            const {
                date,
                phase,
                search = '',
                driver_ids = [],
            } = body;

            const startDate = this.startOfDay(date);
            const endDate = this.endOfDay(date);
            const mappedPhase = this.mapPhase(phase);
            const searchText = search.trim();

            const query: any = {
                delivery_date: {
                    $gte: startDate,
                    $lte: endDate,
                },
                vendor: 'own',
                is_allocation_complete: true,
                order_type: mappedPhase,
            };

            const orQuery: any[] = [];

            if (driver_ids?.length > 0) {
                orQuery.push({
                    assign_driver: {
                        $in: driver_ids.map((id: string) => new Types.ObjectId(id)),
                    },
                });
            }

            if (searchText) {
                orQuery.push(
                    { customer_name: { $regex: searchText, $options: 'i' } },
                    { customer_mobile: { $regex: searchText, $options: 'i' } },
                    { helper: { $regex: searchText, $options: 'i' } },
                    { internal_code: { $regex: searchText, $options: 'i' } },
                );
            }

            if (orQuery.length > 0) {
                query.$or = orQuery;
            }

            const deliveryManagementData = await this.driverBagModel
                .find(query)
                .populate({
                    path: 'assign_driver',
                    select: '_id name details',
                })
                .populate({
                    path: 'helper_id',
                    select: '_id name details',
                })
                .lean();

            const notAllocationCompleteCount =
                await this.driverBagModel.countDocuments({
                    delivery_date: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    vendor: 'own',
                    is_allocation_complete: false,
                });

            return {
                success: true,
                message: 'Own delivery data fetched successfully',
                deliveryManagementData,
                notAllocationCompleteCount,
                bucketUrl: process.env.BUCKET_URL,
            };
        } catch (error: any) {
            throw new InternalServerErrorException(
                error?.message || 'Failed to fetch own delivery data',
            );
        }
    }

    async downloadDriverReportCsv(date: string, driverId: string, res: any) {
        try {
            const startDate = this.startOfDay(date);
            const endDate = this.endOfDay(date);

            const query: any = {
                delivery_date: {
                    $gte: startDate,
                    $lte: endDate,
                },
                is_allocation_complete: true,
            };

            if (driverId && driverId !== '') {
                query.assign_driver = new Types.ObjectId(driverId);
            }

            const data = await this.driverBagModel
                .find(query)
                .populate({
                    path: 'assign_driver',
                    select: '_id name details',
                })
                .lean();

            const escapeCsv = (value: any) => {
                if (value === null || value === undefined) return '';
                const str = String(value).replace(/"/g, '""');
                return `"${str}"`;
            };

            const formatDate = (value: any) => {
                if (!value) return '';
                return moment(value).format('MM/DD/YYYY');
            };

            const headers = [
                'Delivery Date',
                'AWB',
                'Order No',
                'ICODE',
                'After',
                'Before',
                'Customer Name',
                'Customer Mobile',
                'Address',
                'Area',
                'Package',
                'Delivery Note',
                'Assigned Driver',
            ];

            const rows = data.map((item: any) => [
                formatDate(item?.delivery_date),
                item?.awb || '',
                item?.order_number || '',
                item?.internal_code || '',
                item?.after_time || '',
                item?.before_time || '',
                item?.customer_name || '',
                item?.customer_mobile || '',
                item?.address || '',
                item?.area || '',
                item?.package_details || '',
                item?.delivery_notes || '',
                item?.assign_driver?.name ||
                item?.assign_driver?.details?.name ||
                'Unassigned',
            ]);

            const csv = [
                headers.map(escapeCsv).join(','),
                ...rows.map((row) => row.map(escapeCsv).join(',')),
            ].join('\n');

            let driverName = 'All_Drivers';

            if (driverId && driverId !== '') {
                const driverData: any = data?.find(
                    (item: any) => item?.assign_driver,
                );

                driverName =
                    driverData?.assign_driver?.name ||
                    driverData?.assign_driver?.details?.name ||
                    'Driver';
            }

            driverName = driverName.replace(/\s+/g, '_');

            const fileName = `${driverName}_Driver_Report_${moment(date).format(
                'Do_MMM_YYYY',
            )}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${fileName}"`,
            );

            return res.send(csv);
        } catch (error: any) {
            throw new InternalServerErrorException(
                error?.message || 'Failed to download driver report CSV',
            );
        }
    }
}