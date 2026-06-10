import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';

import { Public } from 'src/common/decorators';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { VendorKitchenService } from './vendor-kitchen.service';
import { ExportDumpRecipesCsvDto } from './dto/export-dump-recipes-csv.dto';

@ApiTags('Vendor Kitchen')
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'access-token',
  required: true,
  description:
    '**Staging:** `access-token: Bearer <userkms_jwt>` (do not use `Authorization` — nginx returns "Please sign in to continue"). **Local:** `Authorization: Bearer <token>` also works.',
})
@Controller('vendor-kitchen')
export class VendorKitchenController {
  constructor(private readonly vendorKitchenService: VendorKitchenService) {}

  @Post('recipes/bulk-upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Recipe bulk-upload CSV (max 5MB)' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Upload recipe CSV to meal-vendors (KMS userkms)',
    description:
      'Proxies to be-meal-vendors kitchen bulk-upload. Recipes are created under vendor kms@delicut.io. Requires userkms JWT. On **staging**, send header `access-token: Bearer <token>` (not `Authorization`).',
  })
  async bulkUploadRecipes(@UploadedFile() file: any) {
    try {
      return await this.vendorKitchenService.proxyBulkUpload(file);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof ValidationError) handleValidationError(error);
      handleUnexpectedError(error);
    }
  }

  @Get('recipes/bulk-upload/template/json')
  @ApiOperation({
    summary: 'Get vendor bulk-upload CSV template as JSON (KMS userkms)',
  })
  async getBulkUploadTemplateJson() {
    try {
      return await this.vendorKitchenService.proxyBulkUploadTemplateJson();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handleUnexpectedError(error);
    }
  }

  @Get('recipes/bulk-upload/template')
  @ApiOperation({
    summary: 'Download vendor bulk-upload CSV template (KMS userkms)',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async downloadBulkUploadTemplate(@Res() res: Response): Promise<void> {
    try {
      const { csv, filename } = await this.vendorKitchenService.proxyBulkUploadTemplateCsv();
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  @Public()
  @Post('dump-recipes/export-csv')
  @ApiOperation({
    summary: 'Export dump_recipes to vendor bulk-upload CSV (download)',
    description:
      'Reads Dump_Recipes for the given menu date(s), runs aggregation (unwind recipes × protein_category `balance`|`low`), uses dish_name/description/images from matching `protein_category_info`, and returns vendor bulk-upload CSV.',
  })
  async downloadDumpRecipesCsv(
    @Body() dto: ExportDumpRecipesCsvDto,
    @Res() res: Response
  ): Promise<void> {
    try {
      const result = await this.vendorKitchenService.exportDumpRecipesToVendorCsv(dto);
      const filename = `vendor-recipes-${result.dates_found.join('_') || 'export'}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(result.csv);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  @Public()
  @Post('dump-recipes/export-csv/preview')
  @ApiOperation({
    summary: 'Preview dump_recipes → vendor CSV (JSON)',
    description:
      'Same conversion as export-csv but returns CSV text plus row/dish counts in JSON (no file download).',
  })
  async previewDumpRecipesCsv(@Body() dto: ExportDumpRecipesCsvDto) {
    try {
      const result = await this.vendorKitchenService.exportDumpRecipesToVendorCsv(dto);
      return {
        status: true,
        message: message.vendor_kitchen.DUMP_CSV_EXPORT,
        data: {
          dates_found: result.dates_found,
          dates_missing: result.dates_missing,
          dish_count: result.dish_count,
          row_count: result.row_count,
          headers: result.headers,
          sample_csv: result.csv,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof ValidationError) handleValidationError(error);
      handleUnexpectedError(error);
    }
  }

  @Public()
  @Get('dump-recipes/export-csv')
  @ApiOperation({
    summary: 'Export dump_recipes CSV for earliest menu date (download)',
    description:
      'Requires `menu_id` only. Exports vendor bulk-upload CSV from the **earliest** Dump_Recipes document for that menu (no `date` query param).',
  })
  @ApiQuery({
    name: 'menu_id',
    required: true,
    example: '66828660a623464b0adb150b',
    description: 'Recipe_Menu id — export uses the first (oldest) dump date for this menu',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async downloadDumpRecipesCsvByQuery(
    @Query('menu_id') menu_id: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      if (!menu_id?.trim()) {
        throw new HttpException('Query parameter `menu_id` is required', 400);
      }
      const result = await this.vendorKitchenService.exportDumpRecipesToVendorCsv({
        menu_id,
      });
      const filename = `vendor-recipes-${result.dates_found[0] ?? 'export'}.csv`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(result.csv);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  private sendError(res: Response, error: unknown): void {
    if (error instanceof HttpException) {
      res.status(error.getStatus()).json({
        status: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
