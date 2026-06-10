import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StoreTranslationDto,
  TranslateDto,
} from './dto/create-language-translator.dto';
import { Translate } from 'src/translation/schemas/translation.schema';
import { v2 } from '@google-cloud/translate';
import { RecipeDocument } from 'src/recipes/schemas/recipe.schema';
import { IngredientDocument } from 'src/ingredient/schemas/ingredient.schema';

@Injectable()
export class LanguageTranslatorService {
  private key: string;
  private projectId: string;
  constructor(
    @InjectModel('translations')
    private translationModel: Model<Translate>,
    @InjectModel('Recipes_Detail')
    private RecipeDetailModel: Model<RecipeDocument>,
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
  ) {
    (this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID),
      (this.key = process.env.GOOGLE_CLOUD_PRIVATE_KEY);
  }
  async translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      const translateClient = new v2.Translate({
        projectId: this.projectId,
        key: this.key,
      });

      const [translation] = await translateClient.translate(text, {
        from: 'en',
        to: targetLanguage,
      });

      return translation;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async handleTranslation(translateDto: TranslateDto) {
    const { key, text, data, language, description } = translateDto;

    // Check if translations exist for this key
    const existingEnTranslations = await this.translationModel.find({
      key,
      language: 'en',
    });
    const existingTranslations = await this.translationModel.find({
      key,
      language,
    });
    // If no translations exist, create English entry first
    if (existingEnTranslations.length === 0) {
      // Create English entry using the source text
      const englishTranslation = new this.translationModel({
        key,
        data: text, // Original text becomes English entry
        language: 'en',
        description,
      });
      await englishTranslation.save();
    }

    if (existingTranslations.length !== 0) {
      throw new BadRequestException(
        `Translation for key "${key}" in language "${language}" already exists.`,
      );
    }

    // Translate text to target language
    // const translatedText = await this.translateText(data, language);

    // Create new translation for target language
    const newTranslation = new this.translationModel({
      key: key,
      data: data,
      language: language,
      description: description || null,
    });

    await newTranslation.save();

    // Return all translations for this key
    return newTranslation;
  }
  async listTranslations(
    page: string = '1',
    limit: string = '10',
    search: string = '',
  ) {
    const skip = (+page - 1) * +limit;

    // Combine search filter with language field existence check
    const filter: any = {
      language: { $exists: true }, // Only return documents with 'language' field
      ...(search
        ? {
            $or: [
              { key: new RegExp(search, 'i') },
              { text: new RegExp(search, 'i') },
              { translatedText: new RegExp(search, 'i') },
            ],
          }
        : {}),
    };

    const data = await this.translationModel
      .find(filter)
      .skip(skip)
      .limit(+limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.translationModel.countDocuments(filter).exec();

    return {
      list: data,
      count: total,
      currentPage: page,
      totalPages: Math.ceil(total / Number(limit)),
    };
  }
  async getTranslations(id: string) {
    return await this.translationModel.findById(id);
  }

  async updateTranslation(
    id: string,
    updateTranslationDto: StoreTranslationDto,
  ) {
    const { data, language } = updateTranslationDto;

    // Get the translation to be updated
    const existingTranslation = await this.translationModel.findById(id);
    if (!existingTranslation) {
      throw new BadRequestException('Translation not found');
    }

    // If updating English translation
    if (language === 'en') {
      // Update English version
      await this.translationModel.findByIdAndUpdate(id, updateTranslationDto);

      // Auto-update all other languages that use this key
      const relatedTranslations = await this.translationModel.find({
        key: existingTranslation.key,
        language: { $ne: 'en' },
      });

      for (const translation of relatedTranslations) {
        const translatedText = await this.translateText(
          data,
          translation.language,
        );
        await this.translationModel.findByIdAndUpdate(translation._id, {
          data: translatedText,
        });
      }

      return await this.translationModel.find({ key: existingTranslation.key });
    }

    // If updating non-English translation
    // Check if the provided data matches English text
    const englishTranslation = await this.translationModel.findOne({
      key: existingTranslation.key,
      language: 'en',
    });

    if (englishTranslation && data === englishTranslation.data) {
      // Auto-translate instead of using provided text
      const translatedText = await this.translateText(data, language);
      return await this.translationModel.findByIdAndUpdate(
        id,
        { ...updateTranslationDto, data: translatedText },
        { new: true },
      );
    }

    // For manual updates of non-English translations
    return await this.translationModel.findByIdAndUpdate(
      id,
      updateTranslationDto,
      { new: true },
    );
  }

  async translateToArabic(): Promise<void> {
    try {
      const englishTranslations = await this.translationModel.find({
        language: 'en',
      });

      // Process translations concurrently with a limit of 5 concurrent operations
      const chunks = englishTranslations.reduce((acc, _, i) => {
        if (i % 5 === 0) acc.push(englishTranslations.slice(i, i + 5));
        return acc;
      }, [] as any[]);

      for (const chunk of chunks) {
        await Promise.allSettled(
          chunk.map(async (engTrans) => {
            try {
              if (!engTrans.key) {
                console.warn('Invalid translation key found, skipping...');
                return;
              }

              const existingArabicTrans = await this.translationModel
                .findOne({
                  key: engTrans.key,
                  language: 'ar',
                })
                .lean();

              if (existingArabicTrans) {
                return `Arabic translation for ${engTrans.key} already exists.`;
              }

              let translatedText = engTrans.data; // Default to English text if translation fails
              try {
                const translateClient = new v2.Translate({
                  projectId: this.projectId,
                  key: this.key,
                });

                const [translation] = await translateClient.translate(
                  engTrans.data,
                  {
                    from: 'en',
                    to: 'ar',
                  },
                );

                console.log('-------', { translatedText, translation });
                if (translation) {
                  translatedText = translation;
                } else {
                  console.warn(
                    `Translation unavailable for ${engTrans.key}, using original text.`,
                  );
                }
              } catch (translateError) {
                if (translateError.message?.includes('Too Many Requests')) {
                  // Wait longer for rate limit errors
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  console.warn(
                    `Rate limit hit for ${engTrans}, using original text.`,
                  );
                } else {
                  console.warn(
                    `Translation failed for ${engTrans.key}, using original text:`,
                    translateError,
                  );
                }
              }

              // Create and save new translation
              await this.translationModel.create({
                key: engTrans.key,
                data: translatedText || 'NO_TRANSLATION', // Ensure data is never empty
                description: '',
                language: 'ar',
                createdAt: new Date(),
                updatedAt: new Date(),
                __v: 0,
              });

              return `Processed ${engTrans.key} to Arabic. ${translatedText !== engTrans.data ? 'Translated successfully.' : 'Used original text.'}`;
            } catch (error) {
              console.error(`Error processing ${engTrans.key}:`, error);
              // Save with placeholder text instead of empty string
              try {
                await this.translationModel.create({
                  key: engTrans.key,
                  data: 'NO_TRANSLATION',
                  description: '',
                  language: 'ar',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  __v: 0,
                });
                return `Saved placeholder translation for ${engTrans.key} due to error.`;
              } catch (saveError) {
                throw new Error(
                  `Failed to save translation for ${engTrans.key}: ${saveError.message}`,
                );
              }
            }
          }),
        );

        // Increased delay between chunks for rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log('Translation process completed successfully.');
    } catch (error) {
      console.error('Translation process failed:', error);
      throw error;
    }
  }
  private keyValueData = {
    ACCOUNT: 'Account',
    GREETING_MORNING: 'Good Morning, ',
    GREETING_AFTERNOON: 'Good Afternoon, ',
  };
  private async translateKey(
    text: string,
    targetLanguage: string,
  ): Promise<string> {
    try {
      const translateClient = new v2.Translate({
        projectId: this.projectId,
        key: this.key,
      });
      const [translation] = await translateClient.translate(text, {
        from: 'en',
        to: targetLanguage,
      });
      return translation;
    } catch (error) {
      console.error(`Translation failed for text: ${text}`, error);
      return text; // Return original text in case of failure
    }
  }

  async generateTranslations() {
    const translationPromises = Object.entries(this.keyValueData).map(
      async ([key, value]) => {
        // Ensure value is not an empty string
        if (!value || value.trim() === '') {
          console.warn(
            `Skipping translation for key ${key} due to empty value`,
          );
          return { key, message: 'Translation skipped - empty value' };
        }

        try {
          // Check if the English translation exists
          let existingTranslation = await this.translationModel.findOne({
            key,
            language: 'en',
          });

          if (existingTranslation) {
            // Update the existing English translation
            existingTranslation.data = value;
            await existingTranslation.save();
          } else {
            // Create a new English translation if it doesn't exist
            existingTranslation = await this.translationModel.create({
              language: 'en',
              key,
              data: value,
            });
          }

          // Check if Arabic translation exists
          const arabicTranslation = await this.translationModel.findOne({
            key,
            language: 'ar',
          });

          if (!arabicTranslation) {
            // Translate and create Arabic entry if it doesn't exist
            const translatedText = await this.translateKey(value, 'ar');
            await this.translationModel.create({
              language: 'ar',
              key,
              data: translatedText || value, // Fallback to original value if translation fails
            });
          }

          return { key, message: 'Translation updated/created successfully' };
        } catch (error) {
          console.error(`Translation failed for key: ${key}`, error);
          return {
            key,
            message: 'Translation failed',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    );

    const results = await Promise.all(translationPromises);
    return results;
  }

  // Example of using this function in a controller or service
  async updateDishWithTranslations(dish) {
    // Deep clone to avoid modifying the original object
    const updatedDish = JSON.parse(JSON.stringify(dish));

    // Process each protein category
    if (
      updatedDish.protein_category &&
      Array.isArray(updatedDish.protein_category)
    ) {
      for (const category of updatedDish.protein_category) {
        // Translate dish name
        if (category.dish_name) {
          category.dish_name_tl = {
            en: category.dish_name,
            ar: await this.translateText(category.dish_name, 'ar'),
          };
        }

        // Translate description
        if (category.description) {
          category.description_tl = {
            en: category.description,
            ar: await this.translateText(category.description, 'ar'),
          };
        }
        console.log({
          dish_name_tl: category.dish_name_tl,
          description_tl: category.description_tl,
        });
      }
    }

    return updatedDish;
  }

  // Example implementation for updating MongoDB collection
  async updateAllDishesWithTranslations() {
    // Get all documents - fetch all fields to ensure nothing is lost
    const dishes = await this.RecipeDetailModel.find({});

    // Track statistics
    const stats = {
      totalProcessed: dishes.length,
      updatedCount: 0,
      failedIds: [],
    };

    // Process dishes in batches to avoid memory issues with large collections
    const BATCH_SIZE = 10;
    const batches = [];

    for (let i = 0; i < dishes.length; i += BATCH_SIZE) {
      batches.push(dishes.slice(i, i + BATCH_SIZE));
    }

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);

      // Create an array of promises for this batch
      const batchPromises = batch.map(async (dish) => {
        try {
          // For each protein category, only update the translation fields
          if (dish.protein_category && Array.isArray(dish.protein_category)) {
            for (const category of dish.protein_category) {
              // Only translate if not already translated
              if (
                category.dish_name &&
                (!category.dish_name_tl || !category.dish_name_tl.ar)
              ) {
                category.dish_name_tl = {
                  en: category.dish_name,
                  ar: await this.translateText(category.dish_name, 'ar'),
                };
              }

              if (
                category.description &&
                (!category.description_tl || !category.description_tl.ar)
              ) {
                category.description_tl = {
                  en: category.description,
                  ar: await this.translateText(category.description, 'ar'),
                };
              }
            }

            // Update only the protein_category field in the database
            await this.RecipeDetailModel.updateOne(
              { _id: dish._id },
              { $set: { protein_category: dish.protein_category } },
            );

            stats.updatedCount++;
            return { success: true, dish_name: dish.dish_name };
          } else {
            return {
              success: false,
              dish_name: dish.dish_name,
              error: 'No protein_category field',
            };
          }
        } catch (error) {
          stats.failedIds.push(dish._id);
          return {
            success: false,
            dish_name: dish.dish_name,
            error: error.message,
          };
        }
      });

      // Wait for all operations in the current batch to complete
      const results = await Promise.all(batchPromises);

      // Log results from this batch
      results.forEach((result) => {
        if (result.success) {
          console.log(`Updated dish: ${result.dish_name}`);
        } else {
          console.error(
            `Failed to update dish ${result.dish_name}: ${result.error}`,
          );
        }
      });
    }

    // Calculate final stats
    return {
      totalProcessed: stats.totalProcessed,
      updatedCount: stats.updatedCount,
      failedCount: stats.failedIds.length,
      success: stats.updatedCount === stats.totalProcessed,
      failedIds: stats.failedIds,
    };
  }

  async updateIngredientArabicTranslations() {
    try {
      console.log('Starting batch translation process...');

      // Get all ingredients in one query - only fetch what we need
      const ingredients = await this.ingredientModel.find(
        {},
        { name_of_customers: 1 },
      );

      // Prepare a batch of ingredients that need translation
      const ingredientsToTranslate = ingredients.filter((ingredient) => {
        return ingredient.name_of_customers; // Only include if name exists
      });

      console.log(
        `Found ${ingredientsToTranslate.length} ingredients with names to potentially translate`,
      );

      if (ingredientsToTranslate.length === 0) {
        console.log('No ingredients need translation. Process complete.');
        return;
      }

      // Process translations in parallel batches
      const BATCH_SIZE = 25; // Adjust based on rate limits of your translation API
      const batches = [];

      for (let i = 0; i < ingredientsToTranslate.length; i += BATCH_SIZE) {
        batches.push(ingredientsToTranslate.slice(i, i + BATCH_SIZE));
      }

      console.log(`Processing translations in ${batches.length} batches`);

      // Track updates for bulk operation
      const bulkOps = [];
      let translatedCount = 0;

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(
          `Processing batch ${i + 1}/${batches.length} (${batch.length} items)`,
        );

        // Process all translations in a batch concurrently
        const translations = await Promise.all(
          batch.map(async (ingredient) => {
            const name = ingredient.name_of_customers;
            const translation = await this.translateText(name, 'ar');
            return { ingredient, translation };
          }),
        );

        // Prepare bulk operations from successful translations
        translations.forEach(({ ingredient, translation }) => {
          if (translation) {
            bulkOps.push({
              updateOne: {
                filter: { _id: ingredient._id },
                update: {
                  $set: {
                    name_of_customers_tl: {
                      en: ingredient.name_of_customers,
                      ar: translation,
                    },
                  },
                },
              },
            });
            translatedCount++;
          }
        });
      }

      // Execute bulk update if we have operations
      if (bulkOps.length > 0) {
        const result = await this.ingredientModel.bulkWrite(bulkOps);
        console.log(`Successfully updated ${result.modifiedCount} ingredients`);
      }

      console.log(
        `Translation process completed. Translated ${translatedCount} ingredients.`,
      );
    } catch (error) {
      console.error('Error in batch ingredient translation:', error);
      throw error;
    }
  }
}
