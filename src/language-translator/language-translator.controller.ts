import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { LanguageTranslatorService } from './language-translator.service';
import {
  StoreTranslationDto,
  TranslateDto,
  UpdateTextDto,
} from './dto/create-language-translator.dto';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';

@ApiTags('Language Translation')
@Controller('language-translator')
export class LanguageTranslatorController {
  constructor(private readonly translationService: LanguageTranslatorService) {}

  @Public()
  @Post('translate')
  async translateText(@Body() translateDto: UpdateTextDto) {
    try {
      const result = await this.translationService.translateText(
        translateDto.text,
        translateDto.targetLanguage,
      );
      return {
        message: 'language translate successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  // 2. API for storing text and translated text
  @Public()
  @Post('store-translate-text')
  async storeTranslation(@Body() createTranslationDto: TranslateDto) {
    try {
      const result =
        await this.translationService.handleTranslation(createTranslationDto);

      return {
        message: 'Translated language Added successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  // 3. API for listing translations
  @Public()
  @Get('all-translations')
  @ApiQuery({
    name: 'search',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    required: false,
  })
  async listTranslations(
    @Query('limit') limit: string,
    @Query('page') page: string,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.translationService.listTranslations(
        page,
        limit,
        search,
      );
      return {
        message: 'Translated languages get successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  // 4. API for getting translation details by ID
  @Public()
  @Get(':id')
  async getTranslationDetails(@Param('id') id: string) {
    return await this.translationService.getTranslations(id);
  }

  // 5. API for updating translation by ID
  @Public()
  @Patch(':id')
  async updateTranslation(
    @Param('id') id: string,
    @Body() updateTranslationDto: StoreTranslationDto,
  ) {
    return await this.translationService.updateTranslation(
      id,
      updateTranslationDto,
    );
  }
  @Public()
  @Post('bulk-translate-arabic')
  async translateToArabic() {
    try {
      const result = await this.translationService.translateToArabic();
      return {
        message: 'language translate successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Public()
  @Post('bulk-translate-keys') //update frontend keys
  async translateToArabicKey() {
    try {
      const result = await this.translationService.generateTranslations();
      return {
        message: 'language translate successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Public()
  @Post('bulk-translate-recipes') //update frontend keys
  async updateAllDishesWithTranslations() {
    try {
      const result =
        await this.translationService.updateAllDishesWithTranslations();
      return {
        message: 'language translate successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Public()
  @Post('bulk-ingredient-translate') //update frontend keys
  async updateAllIngredientWithTranslations() {
    try {
      const result =
        await this.translationService.updateIngredientArabicTranslations();
      return {
        message: 'language translate successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
