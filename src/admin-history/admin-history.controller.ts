import { Controller, Get, Query } from '@nestjs/common';
import { AdminHistoryService } from './admin-history.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetAdminHistoryDto } from './dto/create-admin-history.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('Admin History')
@Controller('admin-history')
export class AdminHistoryController {
  constructor(private readonly adminHistoryService: AdminHistoryService) {}

  @Permissions({ resource: 'admin_history', actions: 'list' })
  @Get('list')
  @ApiOperation({ summary: 'Get admin panel history' })
  async getAdminHistory(@Query() query: GetAdminHistoryDto) {
    try {
      const result = await this.adminHistoryService.getHistory(query);
      return {
        message: 'Get Admin History',
        data: result,
        status: true,
      };
    } catch (err) {
      console.log(err);
    }
  }
}
