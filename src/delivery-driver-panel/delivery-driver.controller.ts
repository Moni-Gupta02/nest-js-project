import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Res,
} from '@nestjs/common';

import { DeliveryDriverService } from './delivery-driver.service';
import { Response } from 'express';
import {
    CreateDriverDto,
    CreateHelperDto,
    EditActiveDriverDto,
    EditDriverDto,
    EditHelperDto,
    GetDriversDto,
    GetHelpersDto,
    AllocateDriversDto,
    CheckAllocationDto,
    GetDeliveriesAllocationDetailsDto,
    UnassignedToAssignDto,
    CompleteAllocationDto,
    GetOwnDeliveryForDriversDto
} from './dto/delivery-driver.dto';

// import { Public } from 'src/common/decorators';

// @Public()
@Controller('panel')
export class DeliveryDriverController {
    constructor(
        private readonly deliveryDriverService: DeliveryDriverService,
    ) { }

    // ========================= DRIVERS =========================

    @Get('drivers')
    async getDrivers(@Query() query: GetDriversDto) {
        return this.deliveryDriverService.getDrivers(query);
    }

    @Post('drivers')
    async createDriver(@Body() body: CreateDriverDto) {
        return this.deliveryDriverService.createDriver(body);
    }

    @Patch('drivers/:id')
    async editDriver(
        @Param('id') id: string,
        @Body() body: EditDriverDto,
    ) {
        return this.deliveryDriverService.editDriver(id, body);
    }

    @Patch('drivers/:id/active')
    async editActiveDriver(
        @Param('id') id: string,
        @Body() body: EditActiveDriverDto,
    ) {
        return this.deliveryDriverService.editActiveDriver(id, body);
    }

    @Delete('drivers/:id')
    async deleteDriver(@Param('id') id: string) {
        return this.deliveryDriverService.deleteDriver(id);
    }

    // ========================= HELPERS =========================

    @Get('helpers')
    async getHelpers(@Query() query: GetHelpersDto) {
        return this.deliveryDriverService.getHelpers(query);
    }

    @Post('helpers')
    async createHelper(@Body() body: CreateHelperDto) {
        return this.deliveryDriverService.createHelper(body);
    }

    @Patch('helpers/:id')
    async editHelper(
        @Param('id') id: string,
        @Body() body: EditHelperDto,
    ) {
        return this.deliveryDriverService.editHelper(id, body);
    }

    @Patch('helpers/:id/active')
    async editActiveHelper(
        @Param('id') id: string,
        @Body() body: EditActiveDriverDto,
    ) {
        return this.deliveryDriverService.editActiveHelper(id, body);
    }

    @Delete('helpers/:id')
    async deleteHelper(@Param('id') id: string) {
        return this.deliveryDriverService.deleteHelper(id);
    }

    @Post('allocate-drivers')
    async allocateDrivers(@Body() body: AllocateDriversDto) {
        return this.deliveryDriverService.allocateDrivers(body);
    }

    @Get('check-allocation')
    async checkForAllocationOrNot(@Query() query: CheckAllocationDto) {
        return this.deliveryDriverService.checkForAllocationOrNot(query);
    }

    @Get('get-deliveries-allocation-details')
    async getDeliveriesAllocationDetails(@Query() query: GetDeliveriesAllocationDetailsDto) {
        return this.deliveryDriverService.getDeliveriesAllocationDetails(query);
    }

    @Post('assign-deliveries')
    async unassignedToAssign(@Body() body: UnassignedToAssignDto) {
        return this.deliveryDriverService.unassignedToAssign(body);
    }

    @Post('complete-allocation')
    async completeAllocation(@Body() body: CompleteAllocationDto) {
        return this.deliveryDriverService.completeAllocation(body);
    }

    @Post('own-delivery-for-drivers')
    async getOwnDeliveryForDrivers(
        @Body() body: GetOwnDeliveryForDriversDto,
    ) {
        return this.deliveryDriverService.getOwnDeliveryForDrivers(body);
    }

    @Get('driver-report-csv')
    async downloadDriverReportCsv(
        @Query('date') date: string,
        @Query('driver_id') driverId: string,
        @Res() res: Response,
    ) {
        return this.deliveryDriverService.downloadDriverReportCsv(date, driverId, res);
    }
}