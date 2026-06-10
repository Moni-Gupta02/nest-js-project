import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AxiosError } from 'axios';
import { Model, Types } from 'mongoose';
import * as moment from 'moment-timezone';
import { firstValueFrom } from 'rxjs';

import { DumpRecipesDocument } from 'src/common/schema/dump_recipes';
import { getBetweenDay } from 'src/common/utils/utils';
import {
  dumpRecipesToVendorCsv,
  DumpToVendorCsvResult,
} from './utils/dump-recipe-to-vendor-csv.util';
import { buildDumpRecipesVendorExportPipeline } from './utils/dump-recipes-export.pipeline';
import { ExportDumpRecipesCsvDto } from './dto/export-dump-recipes-csv.dto';

@Injectable()
export class VendorKitchenService {
  private readonly vendorServiceBaseUrl = String(
    process.env.VENDOR_SERVICE_HTTP_URL ?? 'http://localhost:3008',
  ).replace(/\/$/, '');

  constructor(
    @InjectModel('Dump_Recipes')
    private readonly dumpRecipesModel: Model<DumpRecipesDocument>,
    private readonly httpService: HttpService,
  ) {}

  private kitchenApiHeaders(
    extra?: Record<string, string>,
  ): Record<string, string> {
    const apiKey = String(process.env.KITCHEN_VENDOR_API_KEY ?? '').trim();
    if (!apiKey) {
      throw new HttpException(
        'KITCHEN_VENDOR_API_KEY is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { 'x-kitchen-api-key': apiKey, ...extra };
  }

  private kitchenRecipesUrl(path: string): string {
    return `${this.vendorServiceBaseUrl}/api/v1/kitchen/recipes${path}`;
  }

  async proxyBulkUploadTemplateJson(): Promise<unknown> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          this.kitchenRecipesUrl('/bulk-upload/template/json'),
          {
            headers: this.kitchenApiHeaders(),
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.rethrowVendorServiceError(error);
    }
  }

  async proxyBulkUploadTemplateCsv(): Promise<{
    csv: string;
    filename: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.kitchenRecipesUrl('/bulk-upload/template'), {
          headers: this.kitchenApiHeaders(),
          responseType: 'arraybuffer',
        }),
      );
      const disposition = String(response.headers['content-disposition'] ?? '');
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? 'recipe-bulk-upload-template.csv';
      const csv = Buffer.from(response.data).toString('utf-8');
      return { csv, filename };
    } catch (error) {
      this.rethrowVendorServiceError(error);
    }
  }

  async proxyBulkUpload(file: any): Promise<unknown> {
    if (!file?.buffer?.length) {
      throw new HttpException(
        'CSV file is required (multipart field `file`)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const form = new FormData();
    const filename = file.originalname ?? 'upload.csv';
    const contentType = file.mimetype ?? 'text/csv';
    form.append(
      'file',
      new Blob([file.buffer], { type: contentType }),
      filename,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.kitchenRecipesUrl('/bulk-upload'), form, {
          headers: this.kitchenApiHeaders(),
          maxBodyLength: 5 * 1024 * 1024,
          maxContentLength: 5 * 1024 * 1024,
        }),
      );
      return response.data;
    } catch (error) {
      this.rethrowVendorServiceError(error);
    }
  }

  private rethrowVendorServiceError(error: unknown): never {
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status ?? HttpStatus.BAD_GATEWAY;
      const body = error.response.data;
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : error.message;
      throw new HttpException(
        typeof body === 'object' && body !== null
          ? body
          : { status: false, message },
        status,
      );
    }
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(
      error instanceof Error ? error.message : 'Vendor service request failed',
      HttpStatus.BAD_GATEWAY,
    );
  }

  async exportDumpRecipesToVendorCsv(
    dto: ExportDumpRecipesCsvDto,
  ): Promise<
    DumpToVendorCsvResult & { dates_found: string[]; dates_missing: string[] }
  > {
    const imageBaseUrl =
      process.env.VENDOR_CSV_IMAGE_BASE_URL ??
      process.env.RMS_IMAGE_BASE_URL ??
      'https://example.com';

    const datesToExport = await this.resolveExportDates(dto);

    const datesFound: string[] = [];
    const datesMissing: string[] = [];
    const dateRanges: Date[] = [];

    for (const dateInput of datesToExport) {
      const range = await getBetweenDay(this.normalizeDateForQuery(dateInput));
      const filter: Record<string, unknown> = { date: range };
      if (dto.menu_id && Types.ObjectId.isValid(dto.menu_id)) {
        filter.menu_id = new Types.ObjectId(dto.menu_id);
      }

      const exists = await this.dumpRecipesModel.exists(filter).exec();
      const label = this.formatDateLabel(dateInput);
      if (!exists) {
        datesMissing.push(label);
        continue;
      }
      datesFound.push(label);
      dateRanges.push(range.$gte as Date, range.$lte as Date);
    }

    if (datesFound.length === 0) {
      throw new HttpException(
        'No dump recipes found for the given date(s). Run menu live / dump first.',
        HttpStatus.NOT_FOUND,
      );
    }

    const rangeStart = new Date(
      Math.min(...dateRanges.map((d) => d.getTime())),
    );
    const rangeEnd = new Date(Math.max(...dateRanges.map((d) => d.getTime())));

    const aggFilter: {
      date: { $gte: Date; $lte: Date };
      menu_id?: Types.ObjectId;
    } = {
      date: { $gte: rangeStart, $lte: rangeEnd },
    };
    if (dto.menu_id && Types.ObjectId.isValid(dto.menu_id)) {
      aggFilter.menu_id = new Types.ObjectId(dto.menu_id);
    }

    const pipeline = buildDumpRecipesVendorExportPipeline(aggFilter);
    const projected = (await this.dumpRecipesModel
      .aggregate(pipeline)
      .exec()) as Record<string, unknown>[];

    if (projected.length === 0) {
      throw new HttpException(
        'No recipes matched export filters (protein_category balance or low).',
        HttpStatus.NOT_FOUND,
      );
    }

    const result = dumpRecipesToVendorCsv(projected, imageBaseUrl);

    return {
      ...result,
      dates_found: datesFound,
      dates_missing: datesMissing,
    };
  }

  /** When `dates` omitted, use earliest Dump_Recipes row for `menu_id`. */
  private async resolveExportDates(
    dto: ExportDumpRecipesCsvDto,
  ): Promise<string[]> {
    if (dto.dates?.length) {
      return dto.dates;
    }

    if (!dto.menu_id?.trim() || !Types.ObjectId.isValid(dto.menu_id)) {
      throw new HttpException(
        'Query/body `menu_id` is required when `dates` are not provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const earliest = await this.dumpRecipesModel
      .findOne({ menu_id: new Types.ObjectId(dto.menu_id) })
      .sort({ date: 1 })
      .select('date')
      .lean()
      .exec();

    if (!earliest?.date) {
      throw new HttpException(
        'No dump recipes found for this menu_id. Run menu live / dump first.',
        HttpStatus.NOT_FOUND,
      );
    }

    return [moment(earliest.date).format('MM/DD/YYYY')];
  }

  private formatDateLabel(dateInput: string): string {
    const m = moment(
      dateInput,
      ['MM/DD/YYYY', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss.SSSZ', moment.ISO_8601],
      true,
    );
    return m.isValid() ? m.format('YYYY-MM-DD') : String(dateInput);
  }

  /** Normalize to MM/DD/YYYY for getBetweenDay (same as menu live). */
  private normalizeDateForQuery(dateInput: string): string {
    const m = moment(
      dateInput,
      ['MM/DD/YYYY', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss.SSSZ', moment.ISO_8601],
      true,
    );
    return m.isValid() ? m.format('MM/DD/YYYY') : dateInput;
  }
}
