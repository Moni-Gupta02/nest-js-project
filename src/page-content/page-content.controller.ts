import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PageContentService } from './page-content.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateDeliveryLocationDto,
  OptionalListFilterDto,
  UpdateDeliveryLocationDto,
} from './dto/delivery-location.dto';
import {
  CreateWhoWeServeDto,
  UpdateWhoWeServeDto,
} from './dto/who-we-serve.dto';
import { Public } from 'src/common/decorators';

@ApiTags('Page Content')
@Controller('page-content')
export class PageContentController {
  constructor(private readonly pageContentService: PageContentService) {}

  // Delivery Locations CRUD
  @Public()
  @Post('/delivery-locations')
  @ApiOperation({ summary: 'Create a delivery location' })
  async createDeliveryLocation(
    @Body() createDeliveryLocationDto: CreateDeliveryLocationDto,
  ) {
    return this.pageContentService.createDeliveryLocation(
      createDeliveryLocationDto,
    );
  }
  @Public()
  @Get('/delivery-locations/list')
  @ApiOperation({ summary: 'Get a list of delivery locations' })
  async findAllDeliveryLocations(@Query() query: OptionalListFilterDto) {
    const deliveryLocations =
      await this.pageContentService.findAllDeliveryLocations(query);
    return {
      message: 'Delivery locations retrieved successfully',
      data: deliveryLocations,
      status: true,
    };
  }
  @Public()
  @Get('/delivery-locations/:id')
  @ApiOperation({ summary: 'Get delivery location by ID' })
  async findOneDeliveryLocation(@Param('id') id: string) {
    return this.pageContentService.findOneDeliveryLocation(id);
  }
  @Public()
  @Patch('/delivery-locations/:id')
  @ApiOperation({ summary: 'Update delivery location' })
  async updateDeliveryLocation(
    @Param('id') id: string,
    @Body() updateDeliveryLocationDto: UpdateDeliveryLocationDto,
  ) {
    return this.pageContentService.updateDeliveryLocation(
      id,
      updateDeliveryLocationDto,
    );
  }
  @Public()
  @Delete('/delivery-locations/:id')
  @ApiOperation({ summary: 'Delete delivery location' })
  async deleteDeliveryLocation(@Param('id') id: string) {
    return this.pageContentService.deleteDeliveryLocation(id);
  }

  // Who We Serve CRUD
  @Public()
  @Post('/who-we-serve')
  @ApiOperation({ summary: 'Create who we serve entry' })
  async createWhoWeServe(@Body() createWhoWeServeDto: CreateWhoWeServeDto) {
    return this.pageContentService.createWhoWeServe(createWhoWeServeDto);
  }
  @Public()
  @Get('/who-we-serve/list')
  @ApiOperation({ summary: 'Get a list of who we serve entries' })
  async findAllWhoWeServe(@Query() query: OptionalListFilterDto) {
    const whoWeServe = await this.pageContentService.findAllWhoWeServe(query);
    return {
      message: 'Who we serve entries retrieved successfully',
      data: whoWeServe,
      status: true,
    };
  }
  @Public()
  @Get('/who-we-serve/:id')
  @ApiOperation({ summary: 'Get who we serve entry by ID' })
  async findOneWhoWeServe(@Param('id') id: string) {
    return this.pageContentService.findOneWhoWeServe(id);
  }
  @Public()
  @Patch('/who-we-serve/:id')
  @ApiOperation({ summary: 'Update who we serve entry' })
  async updateWhoWeServe(
    @Param('id') id: string,
    @Body() updateWhoWeServeDto: UpdateWhoWeServeDto,
  ) {
    return this.pageContentService.updateWhoWeServe(id, updateWhoWeServeDto);
  }
  @Public()
  @Delete('/who-we-serve/:id')
  @ApiOperation({ summary: 'Delete who we serve entry' })
  async deleteWhoWeServe(@Param('id') id: string) {
    return this.pageContentService.deleteWhoWeServe(id);
  }
}
