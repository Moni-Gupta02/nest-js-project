import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { message } from 'src/common/assets';
import { Permissions } from 'src/common/decorators/permission.decorator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';

@ApiTags('History')
@ApiBearerAuth('access-token')
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}
  @Get('/list')
  @Permissions({ resource: 'history', actions: 'list' })
  async history(@Query('modelName') modelName: string) {
    const historyData = await this.historyService.listHistory(modelName);

    return {
      status: true,
      data: historyData,
      message: message.history.HISTORY_LIST,
    };
  }

  @Get('last-updated/:entityId')
  @Permissions({ resource: 'public', actions: 'read' })
  @ApiOperation({
    summary: 'Get last updated user, time, and changes for an entity',
  })
  @ApiResponse({ status: 200, description: 'Last update found.' })
  @ApiResponse({ status: 404, description: 'No updates found for entity ID.' })
  async getLastUpdated(@Param('entityId') entityId: string) {
    try {
      const lastUpdate = await this.historyService.getLastUpdated(entityId);
      if (!lastUpdate) {
        throw new NotFoundException(
          `No updates found for entity ID: ${entityId}`,
        );
      }
      return {
        message: message.GET_DETAILS,
        data: lastUpdate,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  // @Post('/create')
  // @Permissions({ resource: 'history', actions: 'create' })
  // async create(@Body() createHistory: CreateHistoryDTO) {
  //   const historyData = await this.historyService.create(createHistory);

  //   return {
  //     status: true,
  //     data: historyData,
  //     message: message.history.HISTORY_CREATED,
  //   };
  // }
}
