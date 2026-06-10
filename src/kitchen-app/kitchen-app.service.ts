import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Recipe } from 'src/recipes/schemas/recipe.schema';
import { KitchenAppRecipe } from './Schemas/kitchen-app.entity';
import { handleUnexpectedError, setRounded } from 'src/common/utils/utils';
import * as puppeteer from 'puppeteer';
import { ComponentDocument } from 'src/component/Schemas/component.schema';
import { IngredientDocument } from 'src/ingredient/schemas/ingredient.schema';
import * as moment from 'moment-timezone';
import * as path from 'path';
import * as os from 'os';
import { CreateRecipePortionDto } from './dto/create-kitchen-app.dto';
import { GetRecipePortionDto } from './dto/get-kitchen-app.dto';
import { DeliveryDocument } from 'src/delivery/schemas/delivery.schema';
import { DumpRecipesDocument } from 'src/common/schema/dump_recipes';
import { SupplierDocument } from 'src/supplier/schemas/supplier.schemas';
import { RecipeRatingDocument } from 'src/recipe-rating/schemas/recipe-rating.schema';
@Injectable()
export class KitchenAppService {
  constructor(
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<Recipe>,
    @InjectModel('Dump_Recipes')
    private readonly dumpRecipesModel: Model<DumpRecipesDocument>,
    @InjectModel('Kitchen_Recipe_portining')
    private readonly KitchenAppRecipeModel: Model<KitchenAppRecipe>,
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel('Deliveries')
    private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel('Supplier')
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel('Rating')
    private readonly recipeRatingModel: Model<RecipeRatingDocument>,
  ) { }

  async getUniqueProteinTypes(recipeId: string): Promise<any> {
    const result = await this.recipeModel
      .aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(recipeId) } },
        { $unwind: '$composition' },
        { $unwind: '$composition.portioning_balance' },
        {
          $group: {
            _id: null,
            uniqueProteinTypes: {
              $addToSet: '$composition.portioning_balance.protein_type',
            },
          },
        },
        { $project: { _id: 0, uniqueProteinTypes: 1 } },
      ])
      .exec();
    return result.length > 0 ? result[0].uniqueProteinTypes : [];
  }
  convertToKg(qty: number) {
    // return Math.abs(Math.round(qty));
    const formattedQty = Math.abs(Math.round(qty));
    return new Intl.NumberFormat('en-US').format(formattedQty);
  }

  async createPdf(
    getRecipePortionDto: GetRecipePortionDto,
    user: any,
  ): Promise<any> {
    try {
      const FILE_URL = process.env.BUCKET_URL;
      const data: any = await this.getRecipeReport(
        getRecipePortionDto.recipe_id,
        getRecipePortionDto.date,
      );
      let recipePortioning = await this.getDeliveryOrderCount(
        getRecipePortionDto.date,
        getRecipePortionDto.recipe_id,
      );
      // console.log(recipePortioning, '<================recipePortioning');
      if (!recipePortioning) {
        recipePortioning = await this.KitchenAppRecipePortioning(
          getRecipePortionDto.recipe_id,
          getRecipePortionDto.date,
        );
      }

      if (!data || !recipePortioning) {
        // throw new Error('Invalid recipe or recipe portioning data');
        throw new HttpException(
          {
            message: 'Invalid recipe or recipe portioning data.',
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
        // return null;
      }
      const { variants } = recipePortioning;
      const date = moment().tz('Asia/Dubai').format('D MMM YYYY');
      const time = moment().tz('Asia/Dubai').format('h:mm A');

      const tempDir = os.tmpdir();
      const pdfFilePath = path.join(
        tempDir,
        `${data.dish_name.replace(/\s+/g, '_')}.pdf`,
      );

      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      console.log(
        moment(getRecipePortionDto.date, 'MM/DD/YYYY').format('DD MMM YYYY'),
        '---- date',
      );

      const dateTime = moment()
        .tz('Asia/Dubai')
        .isBefore(
          moment(
            new Date(
              moment(getRecipePortionDto.date, 'MM/DD/YYYY').format(
                'DD MMM YYYY',
              ) as any,
            ),
          )
            .tz('Asia/Dubai')
            .subtract(2, 'days')
            .set('hours', 12)
            .set('minutes', 0)
            .set('seconds', 0),
        );

      const status = dateTime ? 'Order Draft' : 'Order closed';
      const headerTemplate = this.generateHeaderTemplate(
        data,
        moment(getRecipePortionDto.date, 'MM/DD/YYYY').format('DD MMM YYYY'),
        date,
        time,
        user?.name,
        status,
      );
      const footerTemplate = this.generateFooterTemplate();

      const groupedIngredients = this.groupIngredients(data.ingredient_list);
      const ingredientsHTML = this.generateGroupedIngredientsHTML(
        groupedIngredients,
        this.convertToKg,
      );

      let newPortionsHTML = '';
      if (data?.portion_data && data?.portion_data?.length > 0) {
        newPortionsHTML = this.generateNewPortionsHTML(
          data?.portion_data,
          variants,
        );
      }
      const portionsHTML = this.generatePortionsHTML(
        variants.reduce((acc, item) => {
          const key = item.protein_category;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(item);
          return acc;
        }, {}),
      );
      const ordersHTML = this.generateOrderHTML(
        variants?.reduce((acc, item) => {
          const key = item.protein_category;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(item);
          return acc;
        }, {}),
      );
      let unitCostHTML = '';
      if (data?.unit_cost && data?.unit_cost.length > 0) {
        unitCostHTML = this.generateUnitCostHTML(
          data?.unit_cost?.reduce((acc, item) => {
            const key = item.protein_category;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(item);
            return acc;
          }, {}),
        );
      }
      let totalCostHTML = '';
      if (data?.total_cost && data?.total_cost.length > 0) {
        totalCostHTML = this.generateTotalCostHTML(
          data?.total_cost?.reduce((acc, item) => {
            const key = item.protein_category;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(item);
            return acc;
          }, {}),
          data?.sample_composition || [],
        );
      }
      let newPortionData = '';
      if (data?.portion_data && data?.unit_cost && data?.total_cost) {
        newPortionData = this.generateNewPortionContent(
          newPortionsHTML,
          ordersHTML,
          unitCostHTML,
          totalCostHTML,
          data?.sample_composition || [],
        );
      }
      const compositionSummary = this.generateCompositionSummary(
        data.composition,
        this.convertToKg,
      );

      const groupedSupplier = this.groupSupplier(data.ingredient_list);
      const supplierHtmlContent = this.generateSupplierHTML(
        groupedSupplier,
        this.convertToKg,
      );

      const supplierData = this.generateSupplierContent(supplierHtmlContent);

      const imageUrl =
        data.website_image.length > 0
          ? `${FILE_URL}/${data.website_image[0]}`
          : '';
      console.log('imageUrl: ' + imageUrl, data.website_image);
      const mainHtmlContent = this.generateMainHTMLContent(
        data.dish_name,
        ingredientsHTML,
        portionsHTML,
        compositionSummary,
        imageUrl,
      );

      let combinedHtmlContent = mainHtmlContent;

      // Generate HTML for Supplier ingredients
      combinedHtmlContent += supplierData; // Use `+=` to append the HTML content
      for (const component of data.component_list) {
        const {
          component_name,
          ingredients,
          cooking_method,
          component_type,
          component_yield,
        } = component;

        if (!component_name || !ingredients || !cooking_method) {
          console.warn(
            `Skipping component ${component.component_name} due to missing data.`,
          );
          continue;
        }

        const ingredientHTML = this.generateIngredientsHTML(
          ingredients,
          this.convertToKg,
        );
        const cookingStepsHTML = await this.generateCookingStepsHTML(
          cooking_method,
          FILE_URL,
        );

        const fullContent = this.generateHTMLContent(
          component_name,
          component_type,
          component_yield,
          ingredientHTML,
          cookingStepsHTML,
        );

        combinedHtmlContent += fullContent;
      }
      combinedHtmlContent += newPortionData;
      await page.setContent(combinedHtmlContent, { waitUntil: 'networkidle2' });
      await page.pdf({
        path: pdfFilePath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: headerTemplate,
        footerTemplate: footerTemplate,
        margin: {
          top: '75px',
          bottom: '40px',
          left: '20px',
          right: '20px',
        },
      });

      await browser.close();

      return {
        pdfFilePath,
        filename: `${data.dish_name.replace(/\s+/g, '_')}.pdf`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  generateHeaderTemplate(
    data,
    delivery_date,
    date,
    time,
    user,
    status,
  ): string {
    return `
      <div style="font-size:10px; width:100%;padding-right: 20px; padding-left: 20px; text-align:center;">
      <div class="header-center" style="text-align: center;">
            <h3 style="font-size: 15px; color: #666666; margin: 0; padding-bottom:5px ;">${status}</h3>
          </div>
        <div style="display:flex; justify-content:space-between; width: 100%;">
          <div class="header-left" style="text-align: left;">
            <h1 style="font-size: 20px; color: #000000; margin: 0; padding: 0;">${data.dish_name}</h1>
          </div>
          <div class="header-right" style="text-align: right;">
            <div style="color: #ff6f00; font-size: 12px; margin-bottom: 5px;">Delivery Date : ${delivery_date}</div>
            <div style="font-size: 10px; color: #5d6975;">Printed by ${user || 'Janhar'} on ${date} At ${time}</div>
          </div>
        </div>
        <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 2px 0;">
      </div>
    `;
  }

  generateFooterTemplate(): string {
    return `
      <div style="font-size: 10px; color: #5d6975; text-align: center; width: 100%; padding: 8px 0; background-color: #f2f2f2; border-top: 1px solid #e6e6e6;">
        <span class="pageNumber"></span>/<span class="totalPages"></span>
      </div>
    `;
  }

  generateSupplierHTML(
    ingredientsByType: { [type: string]: any[] },
    convertToKg: (qty: number) => string,
  ): string {
    let supplierHTML = '<h3>Ingredient by Suppliers</h3>';

    // Iterate over each ingredient type and its corresponding array
    for (const [type, ingredients] of Object.entries(ingredientsByType)) {
      if (ingredients.length > 0) {
        // Sort ingredients by total_qty in descending order
        ingredients.sort((a, b) => b.total_qty - a.total_qty);

        supplierHTML += `<div class="avoid-page-break">
        
          <table class="supplier-font-table">
            <thead>
              <tr>
                <td class="supplier-name" colspan="7">${type}</td>
              </tr>
              <tr >
                <td>Ingredient</td>
                <td >Gross Qty</td>
                <td>Cutting Style</td>
                <td >Unit Price</td>
                <td>Unit</td>
                <td >Total Price</td>
                <td>Type</td>
              </tr>
            </thead>
            <tbody>`;

        // Generate rows for each ingredient
        ingredients.forEach((ingredient) => {
          supplierHTML += `<tr>
          <td>${ingredient.ingredient_name}</td>
          <td>${convertToKg(ingredient.total_qty)} g</td>
          <td>${ingredient.remark === '' ? ingredient.cutting_style : `${ingredient.cutting_style} (${ingredient.remark})`}</td>
          <td>${parseFloat(ingredient.unit_price).toFixed(2)}</td>
          <td>${ingredient.unit}</td>
          <td>${(parseFloat(ingredient.unit_price) * (ingredient.total_qty / 1000)).toFixed(2)}</td>
          <td>${ingredient.ingredient_type || 'N/A'}</td>
        </tr>`;
        });
        supplierHTML += `</tbody></table></div></div>`;
      }
    }

    return supplierHTML;
  }

  async generateCookingStepsHTML(
    cooking_method: any[],
    FILE_URL: string,
  ): Promise<any> {
    let cookingStepsHTML = '';
    if (cooking_method.length > 0) {
      cookingStepsHTML = `<table>
        <thead>
          <tr>
            <th>Cooking Steps</th>
            <th>Do's / Don'ts / Expected Outcome</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>`;
      cooking_method.forEach((method) => {
        const imageUrl =
          method.image.length > 0 ? `${FILE_URL}/${method.image[0]}` : '';
        cookingStepsHTML += `<tr>
          <td>${method.step}</td>
          <td>${method.outcome}</td>
          <td>${imageUrl ? `<img src="${imageUrl}" alt="Step Image" style="max-width: 100px;">` : '-'}</td>
        </tr>`;
      });
      cookingStepsHTML += `</tbody></table>`;
    }
    return cookingStepsHTML;
  }

  generateSupplierContent(htmlContent: string): string {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: Arial, sans-serif;
      }
      h2 {
        color: #ff6f00;
        font-weight: 700;
      }
     h3 {
        color: #000000;
     font-weight: 500;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px; /* Added space between tables */
        font-weight: 500;
      }
      th, td {
        padding: 15px;
        text-align: left;
        font-weight: 500;
      }
      th {
        background-color: #f2f2f2;
        font-weight: 500;
      }      
      img {
        max-width: 100px;
      }
      .supplier-font-table td:first-child {
        width: 20%;  /* Component Name column */
      }
       /* Adjust width for the second column */
      .supplier-font-table td:nth-child(2) {
          width: 15%;  /* Second column */
      }
      .supplier-font-table td:nth-child(5) {
          width: 7%;  /* Second column */
      }
      /* Adjust width for remaining columns */
      .supplier-font-table td:not(:first-child):not(:nth-child(2)):not(:nth-child(5)) {
          width: 12.5%;  /* Other columns */
      }
     .supplier-font-table td:nth-child(2),
      .supplier-font-table td:nth-child(4),
      .supplier-font-table td:nth-child(6) {
       text-align: right;
       padding-right: 40px;
      }
      .supplier-font-table td:nth-child(1),
      .supplier-font-table td:nth-child(3),
      .supplier-font-table td:nth-child(5) 
      .supplier-font-table td:nth-child(7) {
        text-align: left;
      }
      .avoid-page-break {
        page-break-inside: avoid; /* Prevents page break inside this element */
      }

    </style>
  </head>
  <body>
  <div class="avoid-page-break">
    <h2>${htmlContent}</h2>
    </div>
    <br /> <!-- Added line space -->
    <br /> <!-- Added line space -->
  </body>
  </html>`;
  }

  generateHTMLContent(
    component_name: string,
    component_type: string,
    component_yield: string,
    ingredientHTML: string,
    cookingStepsHTML: string,
  ): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${component_name} Recipe</title>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
        h2 {
          color: #ff6f00;
        }
      .component-ingredient-font-table td:first-child {
        width: 20%;  /* Component Name column */
      }
       /* Adjust width for the second column */
      .component-ingredient-font-table td:nth-child(2) {
          width: 15%;  /* Second column */
      }
      /* Adjust width for remaining columns */
      .component-ingredient-font-table td:not(:first-child):not(:nth-child(2)) {
          width: 12.5%;  /* Other columns */
      }
     .component-ingredient-font-table td:nth-child(2),
      .component-ingredient-font-table td:nth-child(3) {
       text-align: right;
       padding-right: 40px;
      }
      .component-ingredient-font-table td:nth-child(1),
      .component-ingredient-font-table td:nth-child(4) {
        text-align: left;
      }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        th, td {
          padding: 5px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        img {
          max-width: 100px;
        }
        .avoid-page-break {
          page-break-inside: avoid; /* Prevents page break inside this element */
        }
      
      </style>
    </head>
    <body>
    <div class="avoid-page-break">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>${component_type}: ${component_name}</h2>
        <h3>${component_yield}</h3>
    </div>

     <h4><h4>
    <!-- Wrap ingredientHTML with avoid-page-break class -->
   
      ${ingredientHTML}
      </div>    

       <h4><h4>
      ${cookingStepsHTML}
       <br /> <!-- Added line space -->
    </body>
    </html>`;
  }
  generateIngredientsHTML(
    ingredients: any[],
    convertToKg: (qty: number) => string,
  ): string {
    let ingredientHTML = '';
    if (ingredients.length > 0) {
      // Sort ingredients by total_qty in descending order
      ingredients.sort((a, b) => b.total_qty - a.total_qty);

      ingredientHTML = `<table class="component-ingredient-font-table">
      <thead>
         <tr style="background-color: #ECE1D7;">
          <td>Ingredient</td>
          <td>Gross Qty</td>
          <td>Net Qty</td>
          <td>Cutting Style</td>           
          <td>Type</td>
        </tr>
      </thead>
      <tbody>`;

      ingredients.forEach((ingredient) => {
        ingredientHTML += `<tr>
        <td>${ingredient.ingredient_name}</td>
        <td>${convertToKg(ingredient.total_qty)} g</td>
        <td>${convertToKg(ingredient.net_qty)} g</td>
        <td>${ingredient.remark === '' ? ingredient.cutting_style : `${ingredient.cutting_style} (${ingredient.remark})`}</td>
        <td>${ingredient.ingredient_type || 'N/A'}</td>
      </tr>`;
      });

      ingredientHTML += `</tbody></table>`;
    }
    return ingredientHTML;
  }
  generateMainHTMLContent(
    dish_name: string,
    ingredientsHTML: string,
    portionsHTML: string,
    compositionSummary: string,
    imageUrl: string,
    // date: string,
    // time: string,
  ): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${dish_name}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          font-size : 10px;
          box-sizing: border-box;
        }
        .container {
          padding-bottom: 40px;
        }
        .content-left {
          width: 45%;
          padding-right: 10px;
        }
        .content-right {
          width: 45%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding-left: 10px;
        }
        .content-right img {
          max-width: 40%;
          border-radius: 8px;
        }
        h2 {
          font-size: 18px;
          color: #333;
          font-weight: 700;
          margin: 0;
          margin-bottom: 3px;
        }
         h3 {
          font-size: 15px;
          font-weight: 700;
          margin: 0;
          margin-bottom: 4px;
        }
        table {
          width: 100%;
          font-weight: 700;
          border: 1px solid #ddd;
          margin-bottom: 30px; 
        }
        th, td {
          padding: 5px;
          font-weight: 700;
          text-align: left;
        }
        .text-rgt {
           text-align: right;
        }
        .text-lt {
           text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: 700;
          color: #333;
        }
        tbody tr:nth-child(odd) {
          background-color: #f9f9f9;
        }
        tbody tr:nth-child(even) {
          background-color: #ffffff;
        }
        .ingredient-name{
         background-color: #ECE1D7;
         font-weight: 700;
        }
        .supplier-name{
          background-color: #ECE1D7;
          font-weight: 700;
        }
        .section {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
        }
        .highlight-color{
          margin-top: 8px;
          background-color: #ECE1D7;
          padding: 5px
            }
        .highlight {
          padding: 8px;
          height: max-content;
          margin-bottom: 5px;
          flex: 1;
        }
        .ingredients {
          flex: 1;
          margin-left: 10px;
        }
        footer {
          text-align: center;
          background-color: #f2f2f2;
          padding: 8px 0;
          font-size: 10px;
          color: #5d6975;
          border-top: 1px solid #e6e6e6;
          page-break-inside: avoid;
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
        }
        .align-container {
          display: flex;
          justify-content: space-between;
        }
        .page-break {
          page-break-after: always;
        }
        </style>
    </head>
    <body>
      <div class="container">
    
        <div class="section">
        
          <div class="highlight">
              ${portionsHTML}
              <div class="highlight-color">
              <h3>Composition Summary</h3>
              ${compositionSummary}
               </div>
           <div style="margin-top: 30px; max-width: 500px;  display: flex; justify-content: center; align-items: center; border: 1px solid #ddd; box-shadow: 0 0 5px rgba(0,0,0,0.1); width: 100%; height: 100%;">
    ${imageUrl ? `<img src="${imageUrl}" alt="Dish Image" style="max-width: 500px;width: 100%; height: 100%; object-fit: cover;">` : 'No Image Available'}
</div>

          </div>
          <div class="ingredients">
            <h3>Ingredients by category</h3>
            ${ingredientsHTML}           
          </div>
        </div>
      </div>
    </body>
    </html>`;
  }

  groupIngredients(
    ingredients: Array<{
      ingredient_name: string;
      ingredient_type: string | null;
      supplier: string;
      total_qty: number;
    }>,
  ): Record<string, Array<{ ingredient_name: string; total_qty: number }>> {
    return ingredients.reduce(
      (acc, ingredient) => {
        const type = ingredient.ingredient_type || 'Others';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(ingredient);
        return acc;
      },
      {} as Record<
        string,
        Array<{ ingredient_name: string; total_qty: number }>
      >,
    );
  }

  groupSupplier(
    supplier: Array<{
      ingredient_name: string;
      ingredient_type: string | null;
      supplier: string;
      total_qty: number;
    }>,
  ): Record<
    string,
    Array<{
      ingredient_name: string;
      ingredient_type: string;
      supplier: string;
      total_qty: number;
    }>
  > {
    return supplier.reduce(
      (acc, ingredient) => {
        const type = ingredient.supplier || 'Not Available';
        if (!acc[type]) {
          acc[type] = [];
        }
        if (ingredient.ingredient_type != 'Sub-recipe')
          acc[type].push(ingredient);
        return acc;
      },
      {} as Record<
        string,
        Array<{
          ingredient_name: string;
          ingredient_type: string;
          supplier: string;
          total_qty: number;
        }>
      >,
    );
  }

  generateGroupedIngredientsHTML(
    groupedIngredients: Record<
      string,
      Array<{ ingredient_name: string; total_qty: number }>
    >,
    convertToKg: (qty: number) => string,
  ): string {
    let html = '';
    for (const [type, items] of Object.entries(groupedIngredients)) {
      // Sort items by total_qty in descending order
      items.sort((a, b) => b.total_qty - a.total_qty);

      html += `<div class="ingredient-type">
        <table>
          <tr>
            <td class="ingredient-name">${type}</td>
            <td class="ingredient-name"></td>
          </tr>
          <tbody>`;

      items.forEach((item) => {
        html += `<tr>
          <td>${item.ingredient_name}</td>
          <td class="text-rgt">${convertToKg(item.total_qty)} g</td>
        </tr>`;
      });

      html += `</tbody>
        </table>
      </div>`;
    }
    return html;
  }
  generateGroupedSupplierHTML(
    groupedSupplier: Record<
      string,
      Array<{
        ingredient_name: string;
        ingredient_type: string;
        supplier: string;
        total_qty: number;
      }>
    >,
    convertToKg: (qty: number) => string,
  ): string {
    let html = '';
    for (const [type, items] of Object.entries(groupedSupplier)) {
      // Sort items by total_qty in descending order
      items.sort((a, b) => b.total_qty - a.total_qty);

      html += `<div class="ingredient-type">
        <table>
          <tr>
            <td class="ingredient-name">${type}</td>
            <td class="ingredient-name"></td>
          </tr>
          <tbody>`;

      items.forEach((item) => {
        html += `<tr>
          <td>${item.ingredient_type}</td>
          <td>${item.ingredient_name}</td>
          <td class="text-rgt">${convertToKg(item.total_qty)} g</td>
        </tr>`;
      });

      html += `</tbody>
        </table>
      </div>`;
    }
    return html;
  }
  capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  generatePortionsHTML(
    categories: Record<
      string,
      Array<{ protein_option: string; size: string; count: number }>
    >,
  ): string {
    let html = '';

    // Iterate over all categories
    for (const [category, variants] of Object.entries(categories)) {
      if (!Array.isArray(variants)) continue;
      let dietType = this.capitalizeFirstLetter(category.toString());
      if (dietType == 'Low') {
        dietType = 'Low carb';
      }
      // Create a box for each category
      html += `<div class="category-box">
             <h3>${dietType} orders</h3>
               <table>
                 <thead>
                   <tr>
                     <th>Protein Option</th>
                     <th>XS</th>
                     <th>S</th>
                     <th>M</th>
                     <th>L</th>                    
                     <th>XL</th>
                      <th>STD</th>
                     <th>Total</th>
                   </tr>
                 </thead>
                 <tbody>
                 `;

      const categoryTotal = {
        extra_small: 0,
        small: 0,
        medium: 0,
        large: 0,
        extra_large: 0,
        standard: 0,
        total: 0,
      };

      // Group variants by protein option
      const groupedByProtein = variants.reduce(
        (acc, variant) => {
          if (!acc[variant.protein_option]) {
            acc[variant.protein_option] = {
              extra_small: 0,
              small: 0,
              medium: 0,
              large: 0,
              extra_large: 0,
              standard: 0,
              total: 0,
            };
          }
          acc[variant.protein_option][
            variant.size as
            | 'extra_small'
            | 'small'
            | 'medium'
            | 'large'
            | 'extra_large'
            | 'standard'
          ] += variant.count;
          acc[variant.protein_option].total += variant.count;
          return acc;
        },
        {} as Record<
          string,
          {
            extra_small: number;
            small: number;
            medium: number;
            large: number;
            extra_large: number;
            standard: number;
            total: number;
          }
        >,
      );

      // Add rows for each protein option in the current category
      for (const [protein, sizes] of Object.entries(groupedByProtein)) {
        html += `<tr>
                 <td>${protein}</td>
                 <td>${sizes.extra_small || 0}</td>
                 <td>${sizes.small || 0}</td>
                 <td>${sizes.medium || 0}</td>
                 <td>${sizes.large || 0}</td>                
                 <td>${sizes.extra_large || 0}</td>
                  <td>${sizes.standard || 0}</td>
                 <td>${sizes.total}</td>
               </tr>`;

        categoryTotal.extra_small += sizes.extra_small || 0;
        categoryTotal.small += sizes.small || 0;
        categoryTotal.medium += sizes.medium || 0;
        categoryTotal.large += sizes.large || 0;
        categoryTotal.extra_large += sizes.extra_large || 0;
        categoryTotal.standard += sizes.standard || 0;
        categoryTotal.total += sizes.total;
      }

      // Add a subtotal row for the category
      html += `<tr>
               <td><strong>Subtotal</strong></td>
               <td>${categoryTotal.extra_small}</td>
               <td>${categoryTotal.small}</td>
               <td>${categoryTotal.medium}</td>
               <td>${categoryTotal.large}</td>              
               <td>${categoryTotal.extra_large}</td>
                <td>${categoryTotal.standard}</td>
               <td>${categoryTotal.total}</td>
             </tr>`;

      html += `</tbody>               
             </table>
             <br>
           </div>`;
    }

    return html;
  }
  generateOrderHTML(
    categories: Record<
      string,
      Array<{ protein_option: string; size: string; count: number }>
    >,
  ): string {
    let html = `<h3> Orders </h3>
               <table class="order-font-table">
                <thead>
                 <tr style="background-color: #ECE1D7;">
                    <td>Diet Type</td>
                    <td>Protein Option</td>
                    <td>XS</td>
                    <td>S</td>
                    <td>M</td>
                    <td>L</td>
                    <td>XL</td>
                    <td>STD</td>
                    <td>Total</td>
                  </tr>
                </thead>
                <tbody>`;

    const grandTotal = {
      extra_small: 0,
      small: 0,
      medium: 0,
      large: 0,
      extra_large: 0,
      standard: 0,
      total: 0,
    };

    // Sort diet types alphabetically
    const sortedDietTypes = Object.keys(categories).sort((a, b) =>
      a.localeCompare(b),
    );

    // Iterate over sorted diet types
    for (const dietTypeKey of sortedDietTypes) {
      const variants = categories[dietTypeKey];
      if (!Array.isArray(variants)) continue;

      // Sort protein options alphabetically within the diet type
      variants.sort((a, b) => a.protein_option.localeCompare(b.protein_option));

      let dietType = this.capitalizeFirstLetter(dietTypeKey);
      if (dietType === 'Low') dietType = 'Low Carb';

      const categoryTotal = {
        extra_small: 0,
        small: 0,
        medium: 0,
        large: 0,
        extra_large: 0,
        standard: 0,
        total: 0,
      };

      const groupedByProtein = variants.reduce(
        (acc, variant) => {
          if (!acc[variant.protein_option]) {
            acc[variant.protein_option] = {
              extra_small: 0,
              small: 0,
              medium: 0,
              large: 0,
              extra_large: 0,
              standard: 0,
              total: 0,
            };
          }
          const sizeKey = variant.size as keyof (typeof acc)[string];
          acc[variant.protein_option][sizeKey] += variant.count;
          acc[variant.protein_option].total += variant.count;
          return acc;
        },
        {} as Record<string, typeof categoryTotal>,
      );

      // Add rows for each protein option
      for (const [protein, sizes] of Object.entries(groupedByProtein)) {
        html += `<tr>
                 <td>${dietType}</td>
                 <td>${protein}</td>
                 <td>${sizes.extra_small || 0}</td>
                 <td>${sizes.small || 0}</td>
                 <td>${sizes.medium || 0}</td>
                 <td>${sizes.large || 0}</td>
                 <td>${sizes.extra_large || 0}</td>
                 <td>${sizes.standard || 0}</td>
                 <td>${sizes.total}</td>
               </tr>`;

        // Update category totals
        for (const key in categoryTotal) {
          categoryTotal[key as keyof typeof categoryTotal] +=
            sizes[key as keyof typeof sizes] || 0;
        }
      }

      // Update grand totals
      for (const key in grandTotal) {
        grandTotal[key as keyof typeof grandTotal] +=
          categoryTotal[key as keyof typeof categoryTotal];
      }
    }

    // Add final TOTAL row
    html += `<tr style="background-color: #f2f2f2; font-weight: bold;">
             <td>TOTAL</td>
             <td></td>
             <td>${grandTotal.extra_small}</td>
             <td>${grandTotal.small}</td>
             <td>${grandTotal.medium}</td>
             <td>${grandTotal.large}</td>
             <td>${grandTotal.extra_large}</td>
             <td>${grandTotal.standard}</td>
             <td>${grandTotal.total}</td>
           </tr>`;

    html += `</tbody></table>`;

    return html;
  }

  generateUnitCostHTML(
    categories: Record<
      string,
      Array<{ protein_option: string; size: string; unit_price: number }>
    >,
  ): string {
    let html = `
               <h3> Recipe Unit Cost </h3>
                <table class="cost-font-table">
                <thead>
                  <tr style="background-color: #ECE1D7;">
                    <td>Diet Type</td>
                    <td>Protein Option</td>
                    <td>XS</td>
                    <td>S</td>
                    <td>M</td>
                    <td>L</td>
                    <td>XL</td>
                    <td>STD</td>
                    <td></td>
                  </tr>
                </thead>
                <tbody>`;

    const grandTotal = {
      extra_small: 0,
      small: 0,
      medium: 0,
      large: 0,
      extra_large: 0,
      standard: 0,
    };

    // Sort categories alphabetically
    const sortedCategories = Object.keys(categories).sort((a, b) =>
      a.localeCompare(b),
    );

    // Iterate over sorted categories
    for (const category of sortedCategories) {
      const variants = categories[category];
      if (!Array.isArray(variants)) continue;

      // Sort variants by protein option
      variants.sort((a, b) => a.protein_option.localeCompare(b.protein_option));

      let dietType = this.capitalizeFirstLetter(category);
      if (dietType === 'Low') dietType = 'Low Carb';

      const categoryTotal = {
        extra_small: 0,
        small: 0,
        medium: 0,
        large: 0,
        extra_large: 0,
        standard: 0,
      };

      // Group by protein option and aggregate unit prices
      const groupedByProtein = variants.reduce(
        (acc, variant) => {
          if (!acc[variant.protein_option]) {
            acc[variant.protein_option] = {
              extra_small: 0,
              small: 0,
              medium: 0,
              large: 0,
              extra_large: 0,
              standard: 0,
            };
          }
          const sizeKey = variant.size as keyof (typeof acc)[string];
          acc[variant.protein_option][sizeKey] += variant.unit_price;
          return acc;
        },
        {} as Record<string, typeof categoryTotal>,
      );

      // Add rows for each protein option
      for (const [protein, sizes] of Object.entries(groupedByProtein)) {
        html += `<tr>
                 <td>${dietType}</td>
                 <td>${protein}</td>
                 <td>${sizes.extra_small.toFixed(2) || 0}</td>
                 <td>${sizes.small.toFixed(2) || 0}</td>
                 <td>${sizes.medium.toFixed(2) || 0}</td>
                 <td>${sizes.large.toFixed(2) || 0}</td>
                 <td>${sizes.extra_large.toFixed(2) || 0}</td>
                 <td>${sizes.standard.toFixed(2) || 0}</td>
                 <td></td>
               </tr>`;

        // Update category totals
        for (const key in categoryTotal) {
          categoryTotal[key as keyof typeof categoryTotal] +=
            sizes[key as keyof typeof sizes] || 0;
        }
      }

      // Update grand totals
      for (const key in grandTotal) {
        grandTotal[key as keyof typeof grandTotal] +=
          categoryTotal[key as keyof typeof categoryTotal];
      }
    }

    // Add final TOTAL row
    // html += `<tr style="background-color: #f2f2f2; font-weight: bold;">
    //          <td>TOTAL</td>
    //          <td></td>
    //          <td>${grandTotal.extra_small.toFixed(2)}</td>
    //          <td>${grandTotal.small.toFixed(2)}</td>
    //          <td>${grandTotal.medium.toFixed(2)}</td>
    //          <td>${grandTotal.large.toFixed(2)}</td>
    //          <td>${grandTotal.extra_large.toFixed(2)}</td>
    //          <td>${grandTotal.standard.toFixed(2)}</td>
    //          <td></td>
    //        </tr>`;

    html += `</tbody></table>`;
    return html;
  }

  generateTotalCostHTML(
    categories: Record<
      string,
      Array<{ protein_option: string; size: string; total_price: number }>
    >,
    sampleCompositionData: Array<{
      component_name: string;
      total_qty: number;
      protein_category: string;
      protein_type: string;
      size: string;
      total_price: number;
      ingredients: Array<any>;
    }> = [],
  ): string {
    let html = `
               <h3>Total Costs</h3>
                 <table class="total-cost-font-table">
                <thead>
                 <tr style="background-color: #ECE1D7;">
                    <td>Diet Type</td>
                    <td>Protein Option</td>
                    <td>XS</td>
                    <td>S</td>
                    <td>M</td>
                    <td>L</td>
                    <td>XL</td>
                    <td>STD</td>
                    <td>Total</td>
                  </tr>
                </thead>
                <tbody>`;

    const grandTotal = {
      extra_small: 0,
      small: 0,
      medium: 0,
      large: 0,
      extra_large: 0,
      standard: 0,
      total: 0,
    };

    // Iterate over all categories
    const sortedDietTypes = Object.keys(categories).sort((a, b) =>
      a.localeCompare(b),
    );

    // Iterate over sorted diet types
    for (const dietTypeKey of sortedDietTypes) {
      const variants = categories[dietTypeKey];
      // Sort protein options alphabetically within the diet type
      variants.sort((a, b) => a.protein_option.localeCompare(b.protein_option));
      let dietType = this.capitalizeFirstLetter(dietTypeKey.toString());
      if (dietType === 'Low') dietType = 'Low Carb';

      const categoryTotal = {
        extra_small: 0,
        small: 0,
        medium: 0,
        large: 0,
        extra_large: 0,
        standard: 0,
        total: 0,
      };

      const groupedByProtein = variants.reduce(
        (acc, variant) => {
          if (!acc[variant.protein_option]) {
            acc[variant.protein_option] = {
              extra_small: 0,
              small: 0,
              medium: 0,
              large: 0,
              extra_large: 0,
              standard: 0,
              total: 0,
            };
          }
          const sizeKey = variant.size as keyof (typeof acc)[string];

          // Add base price
          let additionalPrice = variant.total_price;

          // Add sample composition price if matches
          sampleCompositionData.forEach((composition) => {
            // Match by protein_category, protein_type, and size
            if (
              composition.protein_category === dietTypeKey &&
              composition.protein_type === variant.protein_option &&
              composition.size === variant.size
            ) {
              additionalPrice += composition.total_price;
            }
          });

          acc[variant.protein_option][sizeKey] += additionalPrice;
          acc[variant.protein_option].total += additionalPrice;
          return acc;
        },
        {} as Record<string, typeof categoryTotal>,
      );

      // Add rows for each protein option
      for (const [protein, sizes] of Object.entries(groupedByProtein)) {
        html += `<tr>
                 <td>${dietType}</td>
                 <td>${protein}</td>
                 <td>${(sizes.extra_small || 0).toFixed(2)}</td>
                 <td>${(sizes.small || 0).toFixed(2)}</td>
                 <td>${(sizes.medium || 0).toFixed(2)}</td>
                 <td>${(sizes.large || 0).toFixed(2)}</td>
                 <td>${(sizes.extra_large || 0).toFixed(2)}</td>
                 <td>${(sizes.standard || 0).toFixed(2)}</td>
                 <td>${(sizes.total || 0).toFixed(2)}</td>
               </tr>`;

        // Update category totals
        for (const key in categoryTotal) {
          categoryTotal[key as keyof typeof categoryTotal] +=
            sizes[key as keyof typeof sizes] || 0;
        }
      }

      // Update grand totals
      for (const key in grandTotal) {
        grandTotal[key as keyof typeof grandTotal] +=
          categoryTotal[key as keyof typeof categoryTotal];
      }
    }

    // Add final TOTAL row
    html += `<tr style="background-color: #f2f2f2; font-weight: bold;">
             <td>TOTAL</td>
             <td></td>
             <td>${grandTotal.extra_small.toFixed(2)}</td>
             <td>${grandTotal.small.toFixed(2)}</td>
             <td>${grandTotal.medium.toFixed(2)}</td>
             <td>${grandTotal.large.toFixed(2)}</td>
             <td>${grandTotal.extra_large.toFixed(2)}</td>
             <td>${grandTotal.standard.toFixed(2)}</td>
             <td>${grandTotal.total.toFixed(2)}</td>
           </tr>`;

    html += `</tbody></table>`;

    return html;
  }
  generateNewPortionsHTML(portions: any, variants: any): string {
    let html = '';

    // Define a more precise type for the structure of each variant's data
    type VariantData = {
      extra_small: number;
      small: number;
      medium: number;
      large: number;
      extra_large: number;
      standard: number;
      total: number;
    };

    // Helper function to generate HTML for each variant row
    const generateVariantRow = (variantName: string, data: VariantData) => {
      return `
    <tr>
      <td>${variantName}</td>
      <td>${data.extra_small}</td>
      <td>${data.small}</td>
      <td>${data.medium}</td>
      <td>${data.large}</td>
      <td>${data.extra_large}</td>
      <td>${data.standard}</td>
    </tr>
    `;
    };

    // Group variants by protein option, protein category, and variant name
    const groupedByProtein = portions.reduce(
      (acc, variant) => {
        if (!acc[variant.protein_option]) acc[variant.protein_option] = {};
        if (!acc[variant.protein_option][variant.protein_category]) {
          acc[variant.protein_option][variant.protein_category] = {};
        }

        if (
          !acc[variant.protein_option][variant.protein_category][variant.name]
        ) {
          acc[variant.protein_option][variant.protein_category][variant.name] =
          {
            extra_small: 0,
            small: 0,
            medium: 0,
            large: 0,
            extra_large: 0,
            standard: 0,
            total: 0,
          };
        }

        const size = variant.size as keyof VariantData;
        const variantData =
          acc[variant.protein_option][variant.protein_category][variant.name];
        variantData[size] += variant.net_qty;
        variantData.total += variant.net_qty;

        return acc;
      },
      {} as Record<string, Record<string, Record<string, VariantData>>>,
    );

    // Iterate over all protein options
    for (const [proteinOptionKey, proteinOptionValue] of Object.entries(
      groupedByProtein,
    )) {
      const proteinType = this.capitalizeFirstLetter(
        proteinOptionKey.toString(),
      );
      html += `  `;

      // Loop over protein categories in the current protein option
      for (const [categoryKey, categoryValue] of Object.entries(
        proteinOptionValue,
      )) {
        // Subtotal for the current category
        const categorySubtotal = {
          extra_small: 0,
          small: 0,
          medium: 0,
          large: 0,
          extra_large: 0,
          standard: 0,
          total: 0,
        };
        let dietType = this.capitalizeFirstLetter(categoryKey.toString());
        if (dietType === 'Low') dietType = 'Low Carb';
        html += `
        <!-- Properly display the category key -->
      
        <!-- Table starts here -->
        <div class="avoid-page-break">
         <h1 class="portion-name">${proteinType} - ${this.capitalizeFirstLetter(dietType)}</h1>
        <table class="double-font-table">
          <thead>
           <tr style="background-color: #ECE1D7;">
              <td>Component Name</td>
              <td>XS</td>
              <td>S</td>
              <td>M</td>
              <td>L</td>
              <td>XL</td>
              <td>STD</td>
            </tr>
            </tr>
          </thead>
          <tbody>
          `;

        // Add rows for each variant in the protein category
        for (const [variantName, variantData] of Object.entries(
          categoryValue,
        )) {
          const data = variantData as VariantData;
          html += generateVariantRow(variantName, data);

          // Update subtotals
          categorySubtotal.extra_small += data.extra_small;
          categorySubtotal.small += data.small;
          categorySubtotal.medium += data.medium;
          categorySubtotal.large += data.large;
          categorySubtotal.extra_large += data.extra_large;
          categorySubtotal.standard += data.standard;
          categorySubtotal.total += data.total;
        }

        // Add a subtotal row for the category
        html += `
          <tr>
            <td><strong>Total Weight</strong></td>
            <td>${categorySubtotal.extra_small}</td>
            <td>${categorySubtotal.small}</td>
            <td>${categorySubtotal.medium}</td>
            <td>${categorySubtotal.large}</td>
            <td>${categorySubtotal.extra_large}</td>
            <td>${categorySubtotal.standard}</td>
          </tr>
           <tr>
            <td><strong>Total Quantity</strong></td>
            <td>${variants.find(
          (variant) =>
            variant.protein_category == categoryKey &&
            variant.size == 'extra_small' &&
            variant.protein_option == proteinOptionKey,
        )?.count || 0
          }</td>
            <td>${variants.find(
            (variant) =>
              variant.protein_category == categoryKey &&
              variant.size == 'small' &&
              variant.protein_option == proteinOptionKey,
          )?.count || 0
          }</td>
            <td>${variants.find(
            (variant) =>
              variant.protein_category == categoryKey &&
              variant.size == 'medium' &&
              variant.protein_option == proteinOptionKey,
          )?.count || 0
          }</td>
            <td>${variants.find(
            (variant) =>
              variant.protein_category == categoryKey &&
              variant.size == 'large' &&
              variant.protein_option == proteinOptionKey,
          )?.count || 0
          }</td>
            <td>${variants.find(
            (variant) =>
              variant.protein_category == categoryKey &&
              variant.size == 'extra_large' &&
              variant.protein_option == proteinOptionKey,
          )?.count || 0
          }</td>
            <td>${variants.find(
            (variant) =>
              variant.protein_category == categoryKey &&
              variant.size == 'standard' &&
              variant.protein_option == proteinOptionKey,
          )?.count || 0
          }</td>
          </tr>          
        </tbody>
      </table>
      </div>
      </div>

      `;
      }
    }

    return html;
  }

  generateNewPortionContent = (
    portionData: string,
    ordersHTML: string,
    unitCostHTML: string,
    totalCostHTML: string,
    sampleCompositionData: Array<{ component_name: string; total_qty: number; total_price: number }>,
  ): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Portion Data Report</title>
        <style>
          body {
          font-family: Arial, sans-serif;
        }
        h2 {
          color: #ff6f00;
        }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px; /* Added space between tables */
        font-weight: 500;
      }
      th, td {
        padding: 5px;
        text-align: left;
        font-weight: 500;
      }
      th {
        background-color: #f2f2f2;
        font-weight: 500;
      }      
      .cost-font-table {
        table-layout: fixed; /* Ensures equal column spacing */
        width: 100%; /* Table spans full container width */
        border-collapse: collapse; /* Removes gaps between cells */
        border: 1px solid #ddd; /* Table border */
      }
      .cost-font-table th,
      .cost-font-table td {
        text-align: left; /* Left aligns content */
        padding: 8px; /* Adds padding for readability */
      }
      .cost-font-table th {
        background-color: #ECE1D7; /* Header background color */
        font-weight: bold; /* Bold header text */
      }
      .cost-font-table td {
        width: calc(100% / 9); /* Ensures equal width for 9 columns */
        word-wrap: break-word; /* Prevents content overflow */
      }
      .sample-composition-table {
        table-layout: fixed; /* Ensures equal column spacing */
        width: 100%; /* Table spans full container width */
        border-collapse: collapse; /* Removes gaps between cells */
        border: 1px solid #ddd; /* Table border */
      }
      .sample-composition-table th,
      .sample-composition-table td {
        text-align: left; /* Left aligns content */
        padding: 8px; /* Adds padding for readability */
      }
      .sample-composition-table th {
        background-color: #ECE1D7; /* Header background color */
        font-weight: bold; /* Bold header text */
      }
      .sample-composition-table td {
        width: calc(100% / 2); /* Ensures equal width for 2 columns */
        word-wrap: break-word; /* Prevents content overflow */
      }
      .cost-font-table tr:last-child {
        font-weight: bold; /* Highlights TOTAL row */
        background-color: #f2f2f2; /* Light gray background for TOTAL row */
      }
      .order-font-table {
        table-layout: fixed; /* Ensures equal column spacing */
        width: 100%; /* Table spans full container width */
        border-collapse: collapse; /* Removes gaps between cells */
        border: 1px solid #ddd; /* Table border */
      }
      .order-font-table th,
      .order-font-table td {
        text-align: center; /* Centers content */
        padding: 8px; /* Adds padding for readability */
      }
      .order-font-table th {
        background-color: #ECE1D7; /* Header background color */
        font-weight: bold; /* Bold header text */
      }
      .order-font-table td {
        width: calc(100% / 9); /* Ensures equal width for 9 columns */
        word-wrap: break-word; /* Prevents content overflow */
      }
      .order-font-table tr:last-child {
        font-weight: bold; /* Highlights TOTAL row */
        background-color: #f2f2f2; /* Light gray background for TOTAL row */
      }

      .total-cost-font-table {
        table-layout: fixed; /* Ensures equal column spacing */
        width: 100%; /* Table spans full container width */
        border-collapse: collapse; /* Removes gaps between cells */
        border: 1px solid #ddd; /* Table border */
      }
      .total-cost-font-table th,
      .total-cost-font-table td {
        text-align: center; /* Centers content */
        padding: 8px; /* Adds padding for readability */
      }
      .total-cost-font-table th {
        background-color: #ECE1D7; /* Header background color */
        font-weight: bold; /* Bold header text */
      }
      .total-cost-font-table td {
        width: calc(100% / 9); /* Ensures equal width for 9 columns */
        word-wrap: break-word; /* Prevents content overflow */
      }
      .total-cost-font-table tr:last-child {
        font-weight: bold; /* Highlights TOTAL row */
        background-color: #f2f2f2; /* Light gray background for TOTAL row */
      }

      .table-container {
        margin-bottom: 20px; /* Adds spacing below each table */
        page-break-inside: avoid; /* Avoids breaking tables across pages */
      }
      .double-font-table {
        width: 100%;  /* Adjust to fit the container */
        max-width: 1200px;  /* Optional: limit max width */
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      .double-font-table td, 
      .double-font-table th {
        font-size: 150%;  /* Double the font size */
        padding: 8px 15px;  /* Add padding for better spacing */        
        border: 0.75px solid #ccc;  /* Add optional border */
      }
      /* Optional: Adjust first column width */
      .double-font-table td:first-child {
        width: 35%;  /* Component Name column */
        text-align: left; /*
      }
      /* Adjust other columns equally */
       .double-font-table td:not(:first-child) {
        width: 12.5%;  /* Remaining columns */
        text-align: center; /*
      }
    
      .portion-name {
        margin-bottom: 8px; /* Adds spacing below the category title */
        font-weight: bold;
      }
      thead th {
        background-color: #f4f4f4;
      }
        </style>
      </head>
      <body>
        <main>
        <div class="table-container">
        <h2>Portioning Report</h2>
              ${portionData}
          <br /> <!-- Added line space -->
          </div>
          
          <div class="table-container">
          <h2>Sample Composition</h2>
          <table class="sample-composition-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty (g)</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${sampleCompositionData.map(item => `
                <tr>
                  <td>${item.component_name}</td>
                  <td>${item.total_qty}</td>
                  <td>${item.total_price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          </div>
      <div class="table-container">
      <h2>ORDER & COSTS</h2>
      ${ordersHTML}
      ${unitCostHTML}
      ${totalCostHTML}
      </div>
        </main>        
      </body>
    </html>
  `;
  };

  generateCompositionSummary(
    composition: Array<{ name: string; total_qty: number }>,
    convertToKg: (qty: number) => string,
  ): string {
    return composition
      .map((item) => `<p>${item.name}: ${convertToKg(item.total_qty)} g</p>`)
      .join('');
  }

  async getRecipeReport(recipeId: string, date: string): Promise<any> {
    try {
      let recipePortioning = await this.getDeliveryOrderCount(date, recipeId);
      let type = 'dumpRecipesModel';
      let isFromDeliveryOrder = true;
      if (!recipePortioning) {
        recipePortioning = await this.KitchenAppRecipePortioning(
          recipeId,
          date,
        );
        type = 'recipeModel';
        isFromDeliveryOrder = false;
        // console.log(
        //   recipePortioning,
        //   type,
        //   '<================ ManuallY recipePortioning report =================',
        // );
      }
      if (!recipePortioning) {
        return null;
      }
      const { recipe_id, variants } = recipePortioning;
      // console.log(recipe_id, variants, '<================recipe_id');

      const recipeObjectId = new Types.ObjectId(recipe_id);

      const recipeData = await this.getRecipeData(date, recipeObjectId, type);
      const portioningData = await this.getPortionRecipeData(
        date,
        recipeObjectId,
        type,
      );
      if (recipeData.length == 0) {
        return null;
      }
      // console.log('portioningData=======>', portioningData);
      const recipeMetaIds = await this.getrecipeMetaIds(
        date,
        recipeObjectId,
        type,
      );

      const componentMetaData = await this.componentModel.find({
        _id: { $in: recipeMetaIds?.[0]?.componentIds || [] },
      });

      const ingredientMetaData = await this.ingredientModel.find({
        _id: { $in: recipeMetaIds?.[0]?.ingredientIds || [] },
      });

      const supplierMetaData = await this.supplierModel.find({});
      // console.log(ingredientMetaData, componentMetaData, 'ingredientMetaData');
      const variantsMap = new Map();
      for (const variant of variants) {
        // let total_qty = 0;
        // await Promise.all(
        //   recipeData.map(async (component) => {
        // const portioningBalance =
        //   component.composition.portioning_balance.find(
        //     (item: { protein_type: string; type: string }) =>
        //       item.protein_type == variant.protein_option &&
        //       item.type == variant.size,
        //   );
        // console.log('portioningBalance', portioningBalance?.net_qty);
        // total_qty += portioningBalance?.net_qty || 0;
        //   }),
        // );
        // variant.net_qty += total_qty;
        variantsMap.set(
          `${variant.protein_option}-${variant.size}-${variant.protein_category}`,
          variant,
        );
      }
      // console.log('variantsMap', variantsMap);
      interface IngredientData {
        total_qty: number;
        net_qty: number;
        ingredient_type: string;
        cutting_style: string;
        unit_price: number;
        remark: string;
        waste: number;
        supplier: string;
      }

      interface ComponentIngredients {
        ingredients: { [ingredient_name: string]: IngredientData };
        cooking_method: [];
        component_name: string;
        component_type: string;
      }

      const componentWiseIngredients: {
        [componentId: string]: ComponentIngredients;
      } = {};

      const allIngredients: { [ingredient_name: string]: IngredientData } = {};

      const miseEnPlaceIngredients: {
        [ingredient_name: string]: IngredientData;
      } = {};
      const sampleCompositionData = []
      for (const recipe of recipeData) {
        let singleComponent = recipe.composition;
        const component_id = recipe.component_id;
        const portioningBalance = singleComponent.portioning_balance;
        //   singleComponent.portioning_balance.filter(
        //     (item: { protein_category: string }) =>
        //       item.protein_category === 'balance',
        //   ) || [];
        singleComponent.total_qty = portioningBalance.reduce(
          (
            total: number,
            portion: {
              protein_type: any;
              type: any;
              net_qty: number;
              protein_category: any;
            },
          ) => {
            // console.log('portion==>', `${portion.protein_type}-${portion.type}-${portion.protein_category}`);
            const key = `${portion.protein_type}-${portion.type}-${portion.protein_category}`;
            const variant = variantsMap.get(key);
            if (variant) {
              return total + Number(portion.net_qty) * Number(variant.count);
            }
            return total;
          },
          0,
        );

        // Only execute sample composition logic if data comes from getDeliveryOrderCount
        if (isFromDeliveryOrder) {
          let typeSizeRecipe = recipe.meal_category == 'Breakfast' || recipe.meal_category == 'Snack' ? 'standard' : 'medium';
          if (singleComponent.type.includes('Protein - ')) {
            const proteinType = singleComponent.type?.split('Protein - ')[1];
            let balanceItem = singleComponent.portioning_balance.find(
              (item: any) =>
                item.protein_type === proteinType &&
                item.type === typeSizeRecipe &&
                item.protein_category === 'balance' && item.net_qty > 0
            );

            // If not found, try with any diet_type
            if (!balanceItem) {
              balanceItem = singleComponent.portioning_balance.find(
                (item: any) =>
                  item.protein_type === proteinType &&
                  item.type === typeSizeRecipe && item.net_qty > 0
              );
            }

            if (balanceItem) {
              singleComponent.total_qty += balanceItem.net_qty;
            }
          } else {
            let balanceItem = singleComponent.portioning_balance.find(
              (item: any) =>
                item.type === typeSizeRecipe &&
                item.protein_category === 'balance' && item.net_qty > 0
            );

            if (!balanceItem) {
              balanceItem = singleComponent.portioning_balance.find(
                (item: any) =>
                  item.type === typeSizeRecipe && item.net_qty > 0
              );
            }

            if (balanceItem) {
              singleComponent.total_qty += balanceItem.net_qty;
            }
          }
        }
        const subIngredients = await this.calculateIngredientsForComponent(
          component_id,
          1,
          componentMetaData,
          ingredientMetaData,
          'Component',
          supplierMetaData,
        );
        const calculatedWeight =
          (recipe?.component_details?.use_calculated_weight ||
            recipe?.component_details?.manual_weight == 0
            ? Number(recipe?.component_details?.calculated_weight)
            : Number(recipe?.component_details?.manual_weight)) || 1;
        await Promise.all(
          subIngredients.map(async (componentIngredient) => {
            const componentId = componentIngredient.componentId;
            const componentName = componentIngredient.name || null;
            const component_type = componentIngredient.type || null;
            const cookingMethod = componentIngredient.cooking_methods || [];
            const grossQty = componentIngredient.gross_qty;
            const netQty = componentIngredient.net_qty;
            const ingredientType = componentIngredient.ingredient_type;
            const ingredientName = componentIngredient.ingredient_name;
            const ingredientmiseEnPlace = componentIngredient.mise_en_place;
            const ingredientCuttingStyle = componentIngredient.cutting_style
              ? componentIngredient.cutting_style
              : '';
            const ingredientUnitPrice = componentIngredient.unitPrice;
            const ingredientRemark = componentIngredient.remark
              ? componentIngredient.remark
              : '';
            const ingredientWaste = componentIngredient.waste;
            const ingredientSupplier = componentIngredient.supplier;
            if (!componentWiseIngredients[componentId]) {
              componentWiseIngredients[componentId] = {
                ingredients: {},
                cooking_method: cookingMethod,
                component_name: componentName,
                component_type: component_type,
              };
            }
            portioningBalance.forEach(
              (portion: {
                protein_type: any;
                type: any;
                net_qty: any;
                protein_category: any;
              }) => {
                const key = `${portion.protein_type}-${portion.type}-${portion.protein_category}`;
                const variant = variantsMap.get(key);

                const variantCount = Number(variant?.count);
                if (variant && variantCount > 0) {
                  const grossQtyToAdd =
                    (grossQty * variantCount * portion.net_qty) /
                    calculatedWeight;

                  const netQtyToAdd =
                    (netQty * variantCount * portion.net_qty) /
                    calculatedWeight;

                  if (
                    !componentWiseIngredients[componentId].ingredients[
                    ingredientName
                    ]
                  ) {
                    componentWiseIngredients[componentId].ingredients[
                      ingredientName
                    ] = {
                      total_qty: 0,
                      net_qty: 0,
                      supplier: ingredientSupplier,
                      ingredient_type: ingredientType,
                      cutting_style: ingredientCuttingStyle,
                      unit_price: ingredientUnitPrice,
                      remark: ingredientRemark,
                      waste: ingredientWaste,
                    };
                  }

                  componentWiseIngredients[componentId].ingredients[
                    ingredientName
                  ].total_qty += grossQtyToAdd;

                  componentWiseIngredients[componentId].ingredients[
                    ingredientName
                  ].net_qty += netQtyToAdd;

                  if (!allIngredients[ingredientName]) {
                    allIngredients[ingredientName] = {
                      total_qty: 0,
                      net_qty: 0,
                      ingredient_type: ingredientType,
                      cutting_style: ingredientCuttingStyle,
                      unit_price: ingredientUnitPrice,
                      remark: ingredientRemark,
                      waste: ingredientWaste,
                      supplier: ingredientSupplier,
                    };
                  }
                  allIngredients[ingredientName].total_qty += grossQtyToAdd;
                  allIngredients[ingredientName].net_qty += netQtyToAdd;

                  if (ingredientmiseEnPlace) {
                    if (!miseEnPlaceIngredients[ingredientName]) {
                      miseEnPlaceIngredients[ingredientName] = {
                        total_qty: 0,
                        net_qty: 0,
                        ingredient_type: ingredientType,
                        cutting_style: ingredientCuttingStyle,
                        unit_price: ingredientUnitPrice,
                        remark: ingredientRemark,
                        waste: ingredientWaste,
                        supplier: ingredientSupplier,
                      };
                    }
                    miseEnPlaceIngredients[ingredientName].total_qty +=
                      grossQtyToAdd;
                    miseEnPlaceIngredients[ingredientName].net_qty +=
                      netQtyToAdd;
                  }
                }
              },
            );
          }),
        );

        // Add extra portions to ingredients (same logic as component level)
        // Only execute sample composition logic if data comes from getDeliveryOrderCount
        if (isFromDeliveryOrder) {
          let typeSizeRecipe = recipe.meal_category == 'Breakfast' || recipe.meal_category == 'Snack' ? 'standard' : 'medium';
          if (singleComponent.type.includes('Protein - ')) {
            const proteinType = singleComponent.type?.split('Protein - ')[1];
            let balanceItem = singleComponent.portioning_balance.find(
              (item: any) =>
                item.protein_type === proteinType &&
                item.type === typeSizeRecipe &&
                item.protein_category === 'balance' && item.net_qty > 0
            );

            // If not found, try with any diet_type
            if (!balanceItem) {
              balanceItem = singleComponent.portioning_balance.find(
                (item: any) =>
                  item.protein_type === proteinType &&
                  item.type === typeSizeRecipe && item.net_qty > 0
              );
            }

            if (balanceItem) {
              // Collect ingredient details for sample composition
              const componentIngredients = [];

              // Add extra portions to all ingredients in this component
              await Promise.all(
                subIngredients.map(async (componentIngredient) => {
                  const componentId = componentIngredient.componentId;
                  const ingredientName = componentIngredient.ingredient_name;
                  const grossQty = componentIngredient.gross_qty;
                  const netQty = componentIngredient.net_qty;

                  if (componentWiseIngredients[componentId]?.ingredients[ingredientName]) {
                    const extraGrossQty = (grossQty * balanceItem.net_qty) / calculatedWeight;
                    const extraNetQty = (netQty * balanceItem.net_qty) / calculatedWeight;

                    componentWiseIngredients[componentId].ingredients[ingredientName].total_qty += extraGrossQty;
                    componentWiseIngredients[componentId].ingredients[ingredientName].net_qty += extraNetQty;

                    if (allIngredients[ingredientName]) {
                      allIngredients[ingredientName].total_qty += extraGrossQty;
                      allIngredients[ingredientName].net_qty += extraNetQty;
                    }

                    if (componentIngredient.mise_en_place && miseEnPlaceIngredients[ingredientName]) {
                      miseEnPlaceIngredients[ingredientName].total_qty += extraGrossQty;
                      miseEnPlaceIngredients[ingredientName].net_qty += extraNetQty;
                    }

                    // Add to sample composition data if this component matches
                    if (componentId.toString() === component_id.toString()) {
                      componentIngredients.push({
                        ingredient_name: ingredientName,
                        unit_cost: parseFloat((componentIngredient.unitPrice || 0).toFixed(2)),
                        net_qty: parseFloat(extraNetQty.toFixed(2)),
                        gross_qty: parseFloat(extraGrossQty.toFixed(2)),
                      });
                    }
                  }
                })
              );

              // Push to sampleCompositionData
              if (componentIngredients.length > 0) {
                // Calculate total price: sum of (unit_cost * gross_qty / 1000) for all ingredients
                const totalPrice = componentIngredients.reduce((sum, ing) => {
                  return sum + (ing.unit_cost * ing.gross_qty / 1000);
                }, 0);

                sampleCompositionData.push({
                  component_name: recipe.component_details.name,
                  total_qty: balanceItem.net_qty,
                  protein_category: balanceItem.protein_category || 'balance',
                  protein_type: proteinType,
                  size: balanceItem.type,
                  total_price: parseFloat(totalPrice.toFixed(2)),
                  ingredients: componentIngredients
                });
              }
            }
          } else {
            // First try to find any protein_type with medium and balance
            let balanceItem = singleComponent.portioning_balance.find(
              (item: any) =>
                item.type === typeSizeRecipe &&
                item.protein_category === 'balance' && item.net_qty > 0
            );

            // If not found, try medium with any diet_type
            if (!balanceItem) {
              balanceItem = singleComponent.portioning_balance.find(
                (item: any) =>
                  item.type === typeSizeRecipe && item.net_qty > 0
              );

            }

            if (balanceItem) {
              // Collect ingredient details for sample composition
              const componentIngredients = [];

              // Add extra portions to all ingredients in this component
              await Promise.all(
                subIngredients.map(async (componentIngredient) => {
                  const componentId = componentIngredient.componentId;
                  const ingredientName = componentIngredient.ingredient_name;
                  const grossQty = componentIngredient.gross_qty;
                  const netQty = componentIngredient.net_qty;

                  if (componentWiseIngredients[componentId]?.ingredients[ingredientName]) {
                    const extraGrossQty = (grossQty * balanceItem.net_qty) / calculatedWeight;
                    const extraNetQty = (netQty * balanceItem.net_qty) / calculatedWeight;

                    componentWiseIngredients[componentId].ingredients[ingredientName].total_qty += extraGrossQty;
                    componentWiseIngredients[componentId].ingredients[ingredientName].net_qty += extraNetQty;

                    if (allIngredients[ingredientName]) {
                      allIngredients[ingredientName].total_qty += extraGrossQty;
                      allIngredients[ingredientName].net_qty += extraNetQty;
                    }

                    if (componentIngredient.mise_en_place && miseEnPlaceIngredients[ingredientName]) {
                      miseEnPlaceIngredients[ingredientName].total_qty += extraGrossQty;
                      miseEnPlaceIngredients[ingredientName].net_qty += extraNetQty;
                    }

                    // Add to sample composition data if this component matches
                    if (componentId.toString() === component_id.toString()) {
                      componentIngredients.push({
                        ingredient_name: ingredientName,
                        unit_cost: parseFloat((componentIngredient.unitPrice || 0).toFixed(2)),
                        net_qty: parseFloat(extraNetQty.toFixed(2)),
                        gross_qty: parseFloat(extraGrossQty.toFixed(2)),
                      });
                    }
                  }
                })
              );

              // Push to sampleCompositionData
              if (componentIngredients.length > 0) {
                // Calculate total price: sum of (unit_cost * gross_qty / 1000) for all ingredients
                const totalPrice = componentIngredients.reduce((sum, ing) => {
                  return sum + (ing.unit_cost * ing.gross_qty / 1000);
                }, 0);

                sampleCompositionData.push({
                  component_name: recipe.component_details.name,
                  total_qty: balanceItem.net_qty,
                  protein_category: balanceItem.protein_category || 'balance',
                  protein_type: balanceItem.protein_type || null,
                  size: balanceItem.type,
                  total_price: parseFloat(totalPrice.toFixed(2)),
                  ingredients: componentIngredients
                });
              }
            }
          }
        }
      }
      const componentResult = Object.entries(componentWiseIngredients).map(
        ([component_id, data]) => {
          return {
            component_id,
            component_name: data.component_name,
            cooking_method: data.cooking_method,
            component_yield: '',
            component_type: data.component_type,
            ingredients: Object.entries(data.ingredients).map(
              ([ingredient_name, ingredientData]) => ({
                ingredient_name,
                supplier: ingredientData.supplier || '',
                ingredient_type: ingredientData.ingredient_type || null,
                cutting_style: ingredientData.cutting_style,
                unit_price: ingredientData.unit_price,
                unit: 'kg',
                remark: ingredientData.remark,
                total_qty: setRounded(Number(ingredientData.total_qty)),
                net_qty: setRounded(Number(ingredientData.net_qty)),
              }),
            ),
          };
        },
      );

      const allIngredientsResult = Object.entries(allIngredients).map(
        ([ingredient_name, data]) => {
          return {
            ingredient_name,
            supplier: data.supplier || '',
            cutting_style: data.cutting_style || '',
            unit_price: data.unit_price,
            unit: 'kg',
            remark: data.remark || '',
            ingredient_type: data.ingredient_type || null,
            total_qty: setRounded(Number(data.total_qty)) || 0,
            net_qty: setRounded(Number(data.net_qty)) || 0,
          };
        },
      );
      const result = await Promise.all(
        recipeData.map(async (item) => {
          const { composition, component_details } = item;
          const type = composition.type.includes('Protein')
            ? composition.type.split('-')[1]?.trim()
            : composition.type;

          return {
            _id: component_details._id,
            name: component_details.name,
            total_qty: setRounded(composition.total_qty) || 0,
            net_qty: setRounded(composition.net_qty) || 0,
            type,
          };
        }),
      );
      const miseEnPlaceIngredientsResult = Object.entries(
        miseEnPlaceIngredients,
      ).map(([ingredient_name, data]) => {
        return {
          ingredient_name,
          supplier: data.supplier || '',
          ingredient_type: data.ingredient_type || null,
          cutting_style: data?.cutting_style || null,
          unit_price: data.unit_price,
          unit: 'kg',
          remark: data?.remark || '',
          waste: data?.waste || 0,
          total_qty: setRounded(Number(data.total_qty)) || 0,
          net_qty: setRounded(Number(data.net_qty)) || 0,
        };
      });

      await Promise.all(
        componentResult.map((component) => {
          component.component_yield =
            component.component_type == 'Component'
              ? `Yield - ${this.convertToKg(
                result.find((item) => item.name == component.component_name)
                  ?.total_qty,
              )} g`
              : '';
        }),
      );

      // Map the components to the required format
      const portionData = portioningData?.[0]?.variants?.flatMap((item) => {
        // Check if the item has a 'component' field and map over it if it does
        if (item?.components) {
          return item.components.map((component) => ({
            protein_option: item.protein_option,
            size: item.size,
            protein_category: item.protein_category,
            name: component.name,
            net_qty: component.net_qty,
            price: component.price,
          }));
        }
        // If no 'component' field exists, return an empty array (so flatMap skips the item)
        return [];
      });

      // Get unit cost data from recipe_details schema (portioning_balance.price)
      let unitCostExists = false;
      const unitCostData = variants?.map((variant) => {
        // Find the matching price entry from recipe_details.price array (PRIMARY SOURCE)
        const currentRecipeData = recipeData?.[0];
        if (
          currentRecipeData?.price &&
          Array.isArray(currentRecipeData.price)
        ) {
          const priceEntry = currentRecipeData.price.find(
            (price) =>
              price.protein_type === variant.protein_option &&
              price.protein_category === variant.protein_category,
          );

          if (priceEntry?.size_prices?.[variant.size]) {
            unitCostExists = true;
            return {
              protein_option: variant.protein_option,
              size: variant.size,
              protein_category: variant.protein_category,
              unit_price: priceEntry.size_prices[variant.size],
              unit_net_qty: priceEntry.size_weights?.[variant.size] || 0,
            };
          }
        }

        // Fallback to portioning_balance calculation if no price array found
        if (
          currentRecipeData?.composition &&
          Array.isArray(currentRecipeData.composition)
        ) {
          let totalPrice = 0;
          let totalNetQty = 0;

          for (const composition of currentRecipeData.composition) {
            if (
              composition.portioning_balance &&
              Array.isArray(composition.portioning_balance)
            ) {
              const portioningBalance = composition.portioning_balance.find(
                (balance) =>
                  balance.protein_type === variant.protein_option &&
                  balance.type === variant.size &&
                  balance.protein_category === variant.protein_category,
              );

              if (portioningBalance?.price) {
                totalPrice += portioningBalance.price;
                totalNetQty += portioningBalance.net_qty || 0;
              }
            }
          }

          if (totalPrice > 0) {
            unitCostExists = true;
            return {
              protein_option: variant.protein_option,
              size: variant.size,
              protein_category: variant.protein_category,
              unit_price: parseFloat(totalPrice.toFixed(2)),
              unit_net_qty: parseFloat(totalNetQty.toFixed(2)),
            };
          }
        }

        // Fallback to component-based calculation if no portioning_balance found
        const portioningItem = portioningData?.[0]?.variants?.find(
          (item) =>
            item.protein_option === variant.protein_option &&
            item.size === variant.size &&
            item.protein_category === variant.protein_category,
        );

        if (portioningItem?.components) {
          unitCostExists = true;
          const totals = portioningItem.components.reduce(
            (acc, component) => {
              acc.totalPrice += component.price || 0;
              acc.totalNetQty += component.net_qty || 0;
              return acc;
            },
            { totalPrice: 0, totalNetQty: 0 },
          );
          return {
            protein_option: variant.protein_option,
            size: variant.size,
            protein_category: variant.protein_category,
            unit_price: parseFloat(totals.totalPrice.toFixed(2)),
            unit_net_qty: parseFloat(totals.totalNetQty.toFixed(2)),
          };
        }
      });
      let totalCostExists = false;
      const totalCostData = variants?.map((variant) => {
        // Get unit price from recipe_details schema (price array - PRIMARY SOURCE)
        let unitPrice = 0;
        let unitNetQty = 0;

        // Find the matching price entry from recipe_details.price array
        const currentRecipeData = recipeData?.[0];
        if (
          currentRecipeData?.price &&
          Array.isArray(currentRecipeData.price)
        ) {
          const priceEntry = currentRecipeData.price.find(
            (price) =>
              price.protein_type === variant.protein_option &&
              price.protein_category === variant.protein_category,
          );

          if (priceEntry?.size_prices?.[variant.size]) {
            unitPrice = priceEntry.size_prices[variant.size];
            unitNetQty = priceEntry.size_weights?.[variant.size] || 0;
            totalCostExists = true;
          }
        }

        // Fallback to portioning_balance calculation if no price array found
        if (
          unitPrice === 0 &&
          currentRecipeData?.composition &&
          Array.isArray(currentRecipeData.composition)
        ) {
          for (const composition of currentRecipeData.composition) {
            if (
              composition.portioning_balance &&
              Array.isArray(composition.portioning_balance)
            ) {
              const portioningBalance = composition.portioning_balance.find(
                (balance) =>
                  balance.protein_type === variant.protein_option &&
                  balance.type === variant.size &&
                  balance.protein_category === variant.protein_category,
              );

              if (portioningBalance?.price) {
                unitPrice += portioningBalance.price;
                unitNetQty += portioningBalance.net_qty || 0;
                totalCostExists = true;
              }
            }
          }
        }

        // Fallback to component-based calculation if no portioning_balance found
        if (unitPrice === 0) {
          const portioningItem = portioningData?.[0]?.variants?.find(
            (item) =>
              item.protein_option === variant.protein_option &&
              item.size === variant.size &&
              item.protein_category === variant.protein_category,
          );

          if (portioningItem?.components) {
            totalCostExists = true;
            const totals = portioningItem.components.reduce(
              (acc, component) => {
                acc.totalPrice += component.price || 0;
                acc.totalNetQty += component.net_qty || 0;
                return acc;
              },
              { totalPrice: 0, totalNetQty: 0 },
            );
            unitPrice = parseFloat(totals.totalPrice.toFixed(2));
            unitNetQty = parseFloat(totals.totalNetQty.toFixed(2));
          }
        }

        if (totalCostExists) {
          return {
            protein_option: variant.protein_option,
            size: variant.size,
            count: variant.count,
            protein_category: variant.protein_category,
            unit_price: unitPrice,
            unit_net_qty: unitNetQty,
            total_price: parseFloat((unitPrice * variant.count).toFixed(2)),
            total_net_qty: parseFloat((unitNetQty * variant.count).toFixed(2)),
          };
        }
      });
      const response = {
        dish_name: recipeData?.[0]?.dish_name,
        website_image: recipeData?.[0]?.website_image || '',
        ingredient_list: allIngredientsResult,
        mise_en_place_ingredient_list: miseEnPlaceIngredientsResult,
        component_list: componentResult,
        composition: result,
        variants,
        portion_data: portionData,
        unit_cost: unitCostExists ? unitCostData : [],
        total_cost: totalCostExists ? totalCostData : [],
        sample_composition: sampleCompositionData,
      };
      return response;
    } catch (err) {
      console.log(err);
    }
  }

  async calculateGrossWeight(netQty, waste) {
    return waste > 0 ? netQty / (1 - waste / 100) : netQty;
  }

  // Recursive function to calculate ingredient quantities for components (sub-recipes)
  async calculateIngredientsForComponent(
    componentId: any,
    multiplier: number,
    componentMetaData: any,
    ingredientMetaData: any,
    type: string,
    supplierMetaData: any,
  ) {
    // console.log('componentMetaData', componentMetaData);
    // console.log('ingredientMetaData', ingredientMetaData);

    // const component = await this.componentModel.findById(componentId).lean();
    const component = await componentMetaData.find(
      (item: any) => item._id.toString() == componentId.toString(),
    );
    // console.log('component', component);
    const ingredientsList = [];
    if (!component?.composition || component?.composition.length == 0) {
      return ingredientsList;
    }

    for (const comp of component?.composition) {
      if (comp.ingredient_id) {
        // const ingredient = await this.ingredientModel
        //   .findById(comp.ingredient_id)
        //   .lean();
        const ingredient = await ingredientMetaData.find(
          (item: any) => item._id.toString() == comp.ingredient_id.toString(),
        );

        if (ingredient) {
          let IngGrossQty = Number(comp.net_qty);
          // console.log('ingredient waste', ingredient?.waste, ingredient?.name);
          if (ingredient?.waste > 0) {
            // const ingredientSupplier = await ingredient?.supplier_details?.find(
            //   (item: any) => item.supplier_pref == 1 && item.is_active == true,
            // );
            // console.log(
            //   'IngGrossQty',
            //   ingredient.name,
            //   IngGrossQty,
            //   Number(ingredient.waste),
            // );
            IngGrossQty = await this.calculateGrossWeight(
              IngGrossQty,
              Number(ingredient.waste) || 0,
            );
            // console.log('IngGrossQtyafterwaste', IngGrossQty);
          }
          const grossQty = await this.calculateGrossWeight(
            // comp.net_qty,
            IngGrossQty,
            comp.waste || 0,
          );
          // console.log('gross Qty', ingredient.name, grossQty);

          const totalQty = grossQty * multiplier;
          let supplier = {
            company: 'Not Available',
          };
          let unitCost = 0;
          if (ingredient?.supplier_details?.length > 0) {
            const ingredientSupplier = await ingredient?.supplier_details?.find(
              (item: any) => item.supplier_pref == 1 && item.is_active == true,
            );

            if (ingredientSupplier) {
              supplier = await supplierMetaData.find(
                (item: any) =>
                  item._id.toString() ==
                  ingredientSupplier?.supplier.toString(),
              );
              unitCost = Number(
                ingredientSupplier?.single_package?.per_kg_price,
              );
            }
          }

          // console.log(
          //   'sub_recipe_component',
          //   component.name,
          //   type,
          //   component.use_calculated_weight,
          //   component.manual_weight,
          //   component.calculated_weight,
          //   component.cooking_method,
          // );
          ingredientsList.push({
            type: type,
            componentId: componentId,
            cooking_methods: component.cooking_method,
            use_calculated_weight: component.use_calculated_weight,
            manual_weight: component.manual_weight,
            calculated_weight: component.calculated_weight,
            name: component.name,
            ingredient_name: ingredient.name,
            ingredient_type: ingredient.ingredient_type,
            gross_qty: parseFloat(totalQty.toFixed(2)),
            net_qty: Number(comp.net_qty) * multiplier,
            mise_en_place: comp?.mise_en_place || false,
            cutting_style: comp?.cutting_style,
            remark: comp?.remark || '',
            waste: comp?.waste,
            supplier: supplier?.company || '',
            unitPrice: unitCost,
          });
        } else {
          console.log(`Ingredient with ID ${comp.ingredient_id} not found`);
        }
      } else if (comp.component_id) {
        // console.log('sub_recipe_component');
        const nested_component = await componentMetaData.find(
          (item: any) => item._id.toString() == comp.component_id.toString(),
        );
        // console.log('nested_component', nested_component.length);
        if (!nested_component)
          throw new Error(
            `nested_component with ID ${comp.component_id} not found`,
          );
        const calculatedWeight =
          (nested_component?.use_calculated_weight ||
            nested_component?.manual_weight == 0
            ? Number(nested_component?.calculated_weight)
            : Number(nested_component?.manual_weight)) || 1;
        // console.log('calculatedWeight', calculatedWeight);
        const subComponentGrossQty =
          ((await this.calculateGrossWeight(comp.net_qty, comp.waste || 0)) /
            calculatedWeight) *
          multiplier;
        const totalQty =
          (await this.calculateGrossWeight(
            // comp.net_qty,
            Number(comp.net_qty),
            comp.waste || 0,
          )) * multiplier;
        ingredientsList.push({
          type: type,
          componentId: componentId,
          cooking_methods: component.cooking_method,
          use_calculated_weight: component.use_calculated_weight,
          manual_weight: component.manual_weight,
          calculated_weight: component.calculated_weight,
          name: component.name,
          ingredient_name: nested_component.name,
          ingredient_type: 'Sub-recipe',
          gross_qty: parseFloat(totalQty.toFixed(2)),
          net_qty: Number(comp.net_qty) * multiplier,
          mise_en_place: comp?.mise_en_place || false,
          cutting_style: comp?.cutting_style,
          waste: comp?.waste,
        });
        const subIngredients = await this.calculateIngredientsForComponent(
          comp.component_id,
          subComponentGrossQty,
          componentMetaData,
          ingredientMetaData,
          'Sub-recipe',
          supplierMetaData,
        );
        subIngredients.forEach((subIngredient) => {
          ingredientsList.push(subIngredient);
        });
      }
    }

    return ingredientsList;
  }

  async getRecipePortioningSaveReport(
    CreateRecipePortionDto: CreateRecipePortionDto,
  ): Promise<any> {
    const recipeData = await this.KitchenAppRecipePortioning(
      CreateRecipePortionDto.recipe_id,
      CreateRecipePortionDto.date,
    );
    const tempRecipeData = await this.recipeModel.findById(
      CreateRecipePortionDto.recipe_id,
    );
    const allProteins = [
      ...new Set(
        tempRecipeData.composition.flatMap((item) => item.protein_category),
      ),
    ];
    const originalVariants = [...CreateRecipePortionDto.variants];
    const finalVariants = [];
    // CreateRecipePortionDto.variants.forEach((variant) => {
    //   console.log('variant111111111111', variant);
    //   variant.protein_category = 'balance'; // by default balance
    // });
    allProteins.forEach((protein) => {
      originalVariants.forEach((variant) => {
        const newVariant: any = { ...variant };
        newVariant.protein_category = protein || 'balance';
        finalVariants.push(newVariant);
      });
    });
    CreateRecipePortionDto.variants = finalVariants;
    if (!recipeData) {
      await this.KitchenAppRecipeModel.create({
        variants: CreateRecipePortionDto.variants,
        recipe_id: new Types.ObjectId(CreateRecipePortionDto.recipe_id),
        date: new Date(
          moment(CreateRecipePortionDto.date)
            .utcOffset(0, true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toISOString(),
        ),
      });
    } else {
      console.log('Update', CreateRecipePortionDto.variants);
      await this.KitchenAppRecipeModel.updateOne(
        {
          recipe_id: new Types.ObjectId(CreateRecipePortionDto.recipe_id),
          date: new Date(
            moment(CreateRecipePortionDto.date)
              .utcOffset(0, true)
              .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toISOString(),
          ),
        },
        { $set: { variants: CreateRecipePortionDto.variants } },
      );
    }
  }
  async getRecipePortioningData(
    GetRecipePortionDto: GetRecipePortionDto,
  ): Promise<any> {
    return await this.KitchenAppRecipePortioning(
      GetRecipePortionDto.recipe_id,
      GetRecipePortionDto.date,
    );
  }
  async KitchenAppRecipePortioning(
    recipe_id: string,
    date: string,
  ): Promise<any> {
    const portioningData: any = await this.KitchenAppRecipeModel.findOne({
      recipe_id: new Types.ObjectId(recipe_id),
      date: new Date(
        moment(date)
          .utcOffset(0, true)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .toISOString(),
      ),
    });

    return portioningData;
  }

  async getDeliveryOrderCount(date: string, recipeId: string): Promise<any> {
    try {
      const recipeData = await this.recipeModel.findOne(
        {
          _id: new mongoose.Types.ObjectId(recipeId),
        },
        { category_type: 1 },
      );
      // console.log('recipeData', recipeData);
      if (recipeData?.category_type === 'subscription') {
        const orderCount = await this.deliveryModel.aggregate([
          {
            $match: {
              delivery_date: new Date(
                moment(date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              delivery_type: 'subscription',
              not_deliverable: false,
              is_delivery_freezed: false,
            },
          },
          {
            $unwind: {
              path: '$delivery_item',
            },
          },
          {
            $unwind: {
              path: '$delivery_item.selected_meal',
            },
          },
          {
            $match: {
              $or: [
                {
                  'delivery_item.selected_meal._id': recipeId,
                },
                {
                  'delivery_item.selected_meal._id':
                    new mongoose.Types.ObjectId(recipeId),
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                recipe_id: {
                  $toString: '$delivery_item.selected_meal._id',
                },
                protein_option:
                  '$delivery_item.selected_meal.variants.protein_option',
                size: '$delivery_item.selected_meal.variants.size',
                protein_category:
                  '$delivery_item.selected_meal.variants.protein_category',
              },
              count: {
                $sum: 1,
              },
              delivery_date: {
                $first: '$delivery_date',
              },
              component: {
                $first: '$delivery_item.selected_meal.variants.components',
              },
              meal_category: {
                $first: '$delivery_item.selected_meal.meal_category',
              },
              dish_name: {
                $first: '$delivery_item.selected_meal.dish_name',
              },
              recipe_id: {
                $first: '$delivery_item.selected_meal.recipe_id',
              },
            },
          },
          {
            $group: {
              _id: { $toObjectId: '$_id.recipe_id' },
              recipe_id: {
                $first: { $toObjectId: '$_id.recipe_id' },
              },
              date: {
                $first: '$delivery_date',
              },
              variants: {
                $push: {
                  protein_option: '$_id.protein_option',
                  size: '$_id.size',
                  count: '$count',
                  protein_category: '$_id.protein_category',
                  components: '$component',
                },
              },
            },
          },
        ]);
        return orderCount.length > 0 ? orderCount[0] : null;
      } else {
        const orderCount = await this.deliveryModel.aggregate([
          {
            $match: {
              delivery_date: new Date(
                moment(date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              delivery_type: 'NDD',
            },
          },
          {
            $unwind: {
              path: '$delivery_item',
            },
          },
          {
            $match: {
              $or: [
                {
                  'delivery_item.recipe_id': recipeId,
                },
                {
                  'delivery_item.recipe_id': new mongoose.Types.ObjectId(
                    recipeId,
                  ),
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                recipe_id: {
                  $toString: '$delivery_item.recipe_id',
                },
                protein_option: '$delivery_item.variants.protein_option',
                size: '$delivery_item.variants.size',
              },
              dish_qty: {
                $sum: { $multiply: [1, '$delivery_item.qty'] },
              },
              meal_category: {
                $first: '$delivery_item.meal_category',
              },
              dish_name: {
                $first: '$delivery_item.dish_name',
              },
              delivery_date: {
                $first: '$delivery_date',
              },
              recipe_id: {
                $first: '$delivery_item.recipe_id',
              },
              count: {
                $sum: {
                  $multiply: [
                    '$delivery_item.qty',
                    {
                      $cond: {
                        if: {
                          $eq: [
                            { $size: '$delivery_item.packaging_material' },
                            0,
                          ],
                        },
                        then: 1,
                        else: { $size: '$delivery_item.packaging_material' },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            $group: {
              _id: '$_id.recipe_id',
              dish_name: {
                $first: '$dish_name',
              },
              dish_qty: {
                $sum: '$dish_qty',
              },
              recipe_id: {
                $first: '$recipe_id',
              },
              date: {
                $first: '$delivery_date',
              },
              variants: {
                $push: {
                  protein_option: '$_id.protein_option',
                  size: '$_id.size',
                  count: '$count',
                  dish_qty: '$dish_qty',
                  scan_count: 0,
                  status: '',
                },
              },
            },
          },
        ]);
        return orderCount.length > 0 ? orderCount[0] : null;
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  async getDeliveryOrderCountNew(date: string, recipeId: string): Promise<any> {
    try {
      const recipeData = await this.recipeModel.findOne(
        {
          _id: new mongoose.Types.ObjectId(recipeId),
        },
        { category_type: 1 },
      );
      // console.log('recipeData', recipeData);
      if (recipeData?.category_type === 'subscription') {
        const orderCount = await this.deliveryModel.aggregate([
          {
            $match: {
              delivery_date: new Date(
                moment(date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              delivery_type: 'subscription',
              not_deliverable: false,
              is_delivery_freezed: false,
            },
          },
          {
            $unwind: {
              path: '$delivery_item',
            },
          },
          {
            $unwind: {
              path: '$delivery_item.selected_meal',
            },
          },
          {
            $match: {
              $or: [
                {
                  'delivery_item.selected_meal._id': recipeId,
                },
                {
                  'delivery_item.selected_meal._id':
                    new mongoose.Types.ObjectId(recipeId),
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                recipe_id: {
                  $toString: '$delivery_item.selected_meal._id',
                },
                protein_option:
                  '$delivery_item.selected_meal.variants.protein_option',
                size: '$delivery_item.selected_meal.variants.size',
              },
              count: {
                $sum: 1,
              },
              delivery_date: {
                $first: '$delivery_date',
              },
              meal_category: {
                $first: '$delivery_item.selected_meal.meal_category',
              },
              dish_name: {
                $first: '$delivery_item.selected_meal.dish_name',
              },
              recipe_id: {
                $first: '$delivery_item.selected_meal.recipe_id',
              },
            },
          },
          {
            $group: {
              _id: { $toObjectId: '$_id.recipe_id' },
              recipe_id: {
                $first: { $toObjectId: '$_id.recipe_id' },
              },
              date: {
                $first: '$delivery_date',
              },
              variants: {
                $push: {
                  protein_option: '$_id.protein_option',
                  size: '$_id.size',
                  count: '$count',
                  protein_category: 'balance',
                },
              },
            },
          },
        ]);
        return orderCount.length > 0 ? orderCount[0] : null;
      } else {
        const orderCount = await this.deliveryModel.aggregate([
          {
            $match: {
              delivery_date: new Date(
                moment(date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              delivery_type: 'NDD',
            },
          },
          {
            $unwind: {
              path: '$delivery_item',
            },
          },
          {
            $match: {
              $or: [
                {
                  'delivery_item.recipe_id': recipeId,
                },
                {
                  'delivery_item.recipe_id': new mongoose.Types.ObjectId(
                    recipeId,
                  ),
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                recipe_id: {
                  $toString: '$delivery_item.recipe_id',
                },
                protein_option: '$delivery_item.variants.protein_option',
                size: '$delivery_item.variants.size',
              },
              dish_qty: {
                $sum: { $multiply: [1, '$delivery_item.qty'] },
              },
              meal_category: {
                $first: '$delivery_item.meal_category',
              },
              dish_name: {
                $first: '$delivery_item.dish_name',
              },
              delivery_date: {
                $first: '$delivery_date',
              },
              recipe_id: {
                $first: '$delivery_item.recipe_id',
              },
              count: {
                $sum: {
                  $multiply: [
                    '$delivery_item.qty',
                    {
                      $cond: {
                        if: {
                          $eq: [
                            { $size: '$delivery_item.packaging_material' },
                            0,
                          ],
                        },
                        then: 1,
                        else: { $size: '$delivery_item.packaging_material' },
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            $group: {
              _id: '$_id.recipe_id',
              dish_name: {
                $first: '$dish_name',
              },
              dish_qty: {
                $sum: '$dish_qty',
              },
              recipe_id: {
                $first: '$recipe_id',
              },
              date: {
                $first: '$delivery_date',
              },
              variants: {
                $push: {
                  protein_option: '$_id.protein_option',
                  size: '$_id.size',
                  count: '$count',
                  dish_qty: '$dish_qty',
                  scan_count: 0,
                  status: '',
                  protein_category: 'balance',
                },
              },
            },
          },
        ]);
        return orderCount.length > 0 ? orderCount[0] : null;
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  async getPortionRecipeData(
    date: string,
    recipeObjectId: any,
    recipesModel: string,
  ): Promise<any> {
    try {
      let pipeline;
      if (recipesModel == 'recipeModel') {
        pipeline = [
          {
            $match: {
              _id: recipeObjectId,
            },
          },
        ];
      } else {
        pipeline = [
          {
            $match: {
              date: new Date(
                moment(date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
          },
          {
            $unwind: {
              path: '$recipes',
            },
          },
          {
            $match: {
              'recipes._id': recipeObjectId,
            },
          },
          {
            $replaceRoot: {
              newRoot: '$recipes',
            },
          },
        ];
      }

      // console.log(pipeline, 'pipeline');
      // Execute the aggregate query with the dynamic pipeline
      return await this[`${recipesModel}`].aggregate(pipeline);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  async getRecipeData(
    date: string,
    recipeObjectId: any,
    recipesModel: string,
  ): Promise<any> {
    try {
      let pipeline;
      if (recipesModel == 'recipeModel') {
        pipeline = [
          {
            $match: {
              _id: recipeObjectId,
            },
          },
        ];
      } else {
        pipeline = [
          {
            $match: {
              date: new Date(
                moment(date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
          },
          {
            $unwind: {
              path: '$recipes',
            },
          },
          {
            $match: {
              'recipes._id': recipeObjectId,
            },
          },
          {
            $replaceRoot: {
              newRoot: '$recipes',
            },
          },
        ];
      }

      // Example: Append another `$group` stage dynamically
      pipeline.push(
        {
          $unwind: '$composition',
        },
        {
          $lookup: {
            from: 'components',
            localField: 'composition.component_id',
            foreignField: '_id',
            as: 'component_details',
          },
        },
        // {
        //   $match: {
        //     'composition.component_id': new Types.ObjectId(
        //       '668f935b3d6d34934a270bf0',
        //     ),
        //   },
        // },
        {
          $unwind: '$component_details',
        },
        {
          $project: {
            component_details: 1,
            meal_category: 1,
            dish_name: 1,
            website_image: 1,
            component_id: '$composition.component_id',
            'composition.portioning_balance': 1,
            'composition.type': 1,
            cooking_methods: '$component_details.cooking_method',
          },
        },
      );

      // console.log(pipeline, 'pipeline');
      // Execute the aggregate query with the dynamic pipeline
      return await this[`${recipesModel}`].aggregate(pipeline);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  async getrecipeMetaIds(
    date: string,
    recipeObjectId: any,
    recipesModel: string,
  ): Promise<any> {
    try {
      let pipeline;
      if (recipesModel == 'recipeModel') {
        pipeline = [
          {
            $match: {
              _id: recipeObjectId,
            },
          },
        ];
      } else {
        pipeline = [
          {
            $match: {
              date: new Date(
                moment(date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
          },
          {
            $unwind: {
              path: '$recipes',
            },
          },
          {
            $match: {
              'recipes._id': recipeObjectId,
            },
          },
          {
            $replaceRoot: {
              newRoot: '$recipes',
            },
          },
        ];
      }
      // Example: Append another `$group` stage dynamically
      pipeline.push(
        {
          $unwind: {
            path: '$composition',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            componentId: '$composition.component_id',
            ingredientId: '$composition.ingredient_id',
          },
        },
        {
          $graphLookup: {
            from: 'components',
            startWith: '$componentId',
            connectFromField: 'composition.component_id',
            connectToField: '_id',
            as: 'subRecipes',
            maxDepth: 10,
            depthField: 'depth',
          },
        },
        {
          $unwind: {
            path: '$subRecipes',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$subRecipes.composition',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            componentId: '$subRecipes._id',
            ingredientId: '$subRecipes.composition.ingredient_id',
          },
        },
        {
          $group: {
            _id: null,
            componentIds: {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$componentId', null] },
                      { $ne: ['$componentId', ''] },
                    ],
                  },
                  then: '$componentId',
                  else: null,
                },
              },
            },
            ingredientIds: {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$ingredientId', null] },
                      { $ne: ['$ingredientId', ''] },
                    ],
                  },
                  then: '$ingredientId',
                  else: null,
                },
              },
            },
          },
        },
        {
          $project: {
            componentIds: {
              $filter: {
                input: '$componentIds',
                as: 'componentId',
                cond: { $ne: ['$$componentId', null] },
              },
            },
            ingredientIds: {
              $filter: {
                input: '$ingredientIds',
                as: 'ingredientId',
                cond: { $ne: ['$$ingredientId', null] },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            componentIds: 1,
            ingredientIds: 1,
          },
        },
      );
      return await this[`${recipesModel}`].aggregate(pipeline);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  async getKitchenRecipeListData(
    startDate: string,
    endDate: string,
    filter: string,
    // search?: string,
    page: string = '1',
    limit: string = '10',
    sort: string = 'meal_category',
    order: string = '1', /// 1 for ascending, -1 for descending
    meal_category?: string,
    // recipe_id?: string,
  ): Promise<any> {
    try {
      const pipeline: any[] = [
        {
          $match: {
            delivery_date: {
              $gte: new Date(
                moment(startDate)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              $lte: new Date(
                moment(endDate)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
            delivery_type: 'subscription',
            not_deliverable: false,
            is_delivery_freezed: false,
          },
        },
      ];

      if (filter == 'category') {
        pipeline.push(
          {
            $lookup: {
              from: 'orders',
              localField: 'order_id',
              foreignField: '_id',
              as: 'OrderData',
            },
          },
          {
            $addFields: {
              actual_price: {
                $add: [
                  {
                    $arrayElemAt: ['$OrderData.order_total', 0],
                  },
                  {
                    $multiply: [
                      0.05,
                      {
                        $arrayElemAt: ['$OrderData.order_total', 0],
                      },
                    ],
                  },
                ],
              },
              selected_meal: {
                $let: {
                  vars: {
                    firstOrderItem: {
                      $arrayElemAt: ['$OrderData.order_item', 0], // Get the first element from order_item array
                    },
                  },
                  in: {
                    $cond: {
                      if: { $eq: ['$$firstOrderItem.selected_meal', null] }, // Check if selected_meal is null
                      then: [], // Return empty array if null
                      else: {
                        $arrayElemAt: ['$$firstOrderItem.selected_meal', 0],
                      }, // Return first element if not null
                    },
                  },
                },
              },
              final_order_total: {
                $subtract: [
                  {
                    $arrayElemAt: ['$OrderData.order_total', 0],
                  },
                  {
                    $arrayElemAt: ['$OrderData.refundable_deposite', 0],
                  },
                ],
              },
              plan_duration_in_days: {
                $let: {
                  vars: {
                    firstOrderItem: {
                      $arrayElemAt: ['$OrderData.order_item', 0], // Extract the first element of order_item
                    },
                  },
                  in: {
                    $toInt: {
                      // Convert to an integer
                      $arrayElemAt: [
                        '$$firstOrderItem.plan_duration_in_days',
                        0, // Get the first element of plan_duration_in_days array
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            $addFields: {
              discount_percent: {
                $round: [
                  {
                    $divide: [
                      {
                        $subtract: ['$actual_price', '$final_order_total'],
                      },
                      '$actual_price',
                    ],
                  },
                  0,
                ],
              },
            },
          },
          {
            $addFields: {
              breakfast_price: {
                $cond: {
                  if: {
                    $in: ['breakfast', '$selected_meal'],
                  },
                  // Check if "breakfast" exists in selected_meal array
                  then: {
                    $multiply: [
                      25,
                      // Base price
                      '$plan_duration_in_days',
                      {
                        $subtract: [1, '$discount_percent'],
                      }, // Apply discount
                    ],
                  },
                  // Assign discounted price
                  else: 0, // Assign 0 if "breakfast" is not in selected_meal
                },
              },
              morning_snack_price: {
                $cond: {
                  if: {
                    $in: ['morning_snack', '$selected_meal'],
                  },
                  // Check if "breakfast" exists in selected_meal array
                  then: {
                    $multiply: [
                      12,
                      // Base price
                      '$plan_duration_in_days',
                      {
                        $subtract: [1, '$discount_percent'],
                      }, // Apply discount
                    ],
                  },
                  // Assign discounted price
                  else: 0, // Assign 0 if "breakfast" is not in selected_meal
                },
              },
              evening_snack_price: {
                $cond: {
                  if: {
                    $in: ['evening_snack', '$selected_meal'],
                  },
                  // Check if "breakfast" exists in selected_meal array
                  then: {
                    $multiply: [
                      12,
                      // Base price
                      '$plan_duration_in_days',
                      {
                        $subtract: [1, '$discount_percent'],
                      }, // Apply discount
                    ],
                  },
                  // Assign discounted price
                  else: 0, // Assign 0 if "breakfast" is not in selected_meal
                },
              },
              both_meal: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $in: ['lunch', '$selected_meal'],
                      },
                      // Check if "evening_snack" exists in selected_meal
                      {
                        $in: ['dinner', '$selected_meal'],
                      }, // Check if "morning_snack" exists in selected_meal
                    ],
                  },
                  then: true,
                  // Return true if both exist
                  else: false, // Return false if either doesn't exist
                },
              },
              lunch_exist: {
                $cond: {
                  if: {
                    $in: ['lunch', '$selected_meal'], // Check if "evening_snack" exists in selected_meal
                  },
                  then: true,
                  // Return true if both exist
                  else: false, // Return false if either doesn't exist
                },
              },
              dinner_exist: {
                $cond: {
                  if: {
                    $in: ['lunch', '$selected_meal'], // Check if "evening_snack" exists in selected_meal
                  },
                  then: true,
                  // Return true if both exist
                  else: false, // Return false if either doesn't exist
                },
              },
            },
          },
          {
            $addFields: {
              all_meal_price: {
                $subtract: [
                  '$final_order_total',
                  {
                    $add: [
                      '$breakfast_price',
                      '$morning_snack_price',
                      '$evening_snack_price',
                    ],
                  },
                ],
              },
            },
          },
          {
            $addFields: {
              lunch_price: {
                $cond: {
                  if: {
                    $eq: ['$both_meal', true],
                  },
                  // Check if both_meal is true
                  then: {
                    $divide: ['$all_meal_price', 2],
                  },
                  // If true, divide all_meal_price by 2 for lunch
                  else: {
                    $cond: {
                      if: {
                        $in: ['lunch', '$selected_meal'],
                      },
                      // Check if lunch exists in selected_meal
                      then: '$all_meal_price',
                      // If lunch exists, assign all_meal_price to lunch_price
                      else: 0, // If lunch does not exist, assign 0
                    },
                  },
                },
              },
              dinner_price: {
                $cond: {
                  if: {
                    $eq: ['$both_meal', true],
                  },
                  // Check if both_meal is true
                  then: {
                    $divide: ['$all_meal_price', 2],
                  },
                  // If true, divide all_meal_price by 2 for dinner
                  else: {
                    $cond: {
                      if: {
                        $in: ['dinner', '$selected_meal'],
                      },
                      // Check if dinner exists in selected_meal
                      then: '$all_meal_price',
                      // If dinner exists, assign all_meal_price to dinner_price
                      else: 0, // If dinner does not exist, assign 0
                    },
                  },
                },
              },
            },
          },
          {
            $unwind: {
              path: '$delivery_item',
            },
          },
          {
            $project: {
              dish_name: {
                $ifNull: [
                  '$delivery_item.selected_meal.internal_dish_name',
                  '$delivery_item.selected_meal.dish_name',
                ],
              },
              recipe_id: {
                $toString: '$delivery_item.selected_meal.recipe_id',
              },
              customer_id: 1,
              order_id: 1,
              breakfast_price: 1,
              morning_snack_price: 1,
              evening_snack_price: 1,
              lunch_price: 1,
              dinner_price: 1,
              plan_duration_in_days: 1,
              meal_type: '$delivery_item.meal_type',
              meal_category: '$delivery_item.selected_meal.meal_category',
              rating_id: '$delivery_item.selected_meal.rating_id',
              delivery_date: 1,
              variants: '$delivery_item.selected_meal.variants.protein_option',
              protein_category:
                '$delivery_item.selected_meal.variants.protein_category',
              size: '$delivery_item.selected_meal.variants.size',
              meal_price: '$delivery_item.selected_meal.variants.components',
            },
          },
          {
            $addFields: {
              customer_price: {
                $switch: {
                  branches: [
                    {
                      // If meal_type is "lunch", use lunch_price divided by plan_duration_in_days
                      case: {
                        $eq: ['$meal_type', 'lunch'],
                      },
                      then: {
                        $divide: ['$lunch_price', '$plan_duration_in_days'],
                      },
                    },
                    {
                      // If meal_type is "dinner", use dinner_price divided by plan_duration_in_days
                      case: {
                        $eq: ['$meal_type', 'dinner'],
                      },
                      then: {
                        $divide: ['$dinner_price', '$plan_duration_in_days'],
                      },
                    },
                    {
                      // If meal_type is "breakfast", use breakfast_price divided by plan_duration_in_days
                      case: {
                        $eq: ['$meal_type', 'breakfast'],
                      },
                      then: {
                        $divide: ['$breakfast_price', '$plan_duration_in_days'],
                      },
                    },
                    {
                      // If meal_type is "morning_snack", use morning_snack_price divided by plan_duration_in_days
                      case: {
                        $eq: ['$meal_type', 'morning_snack'],
                      },
                      then: {
                        $divide: [
                          '$morning_snack_price',
                          '$plan_duration_in_days',
                        ],
                      },
                    },
                    {
                      // If meal_type is "evening_snack", use evening_snack_price divided by plan_duration_in_days
                      case: {
                        $eq: ['$meal_type', 'evening_snack'],
                      },
                      then: {
                        $divide: [
                          '$evening_snack_price',
                          '$plan_duration_in_days',
                        ],
                      },
                    },
                  ],
                  default: 0, // Default to 0 if none of the conditions match
                },
              },
            },
          },
          {
            $lookup: {
              from: 'ratings',
              localField: 'rating_id',
              foreignField: '_id',
              as: 'ratingData',
            },
          },
          {
            $project: {
              dish_name: 1,
              meal_category: 1,
              meal_type: 1,
              variants: 1,
              size: 1,
              recipe_id: 1,
              customer_price: 1,
              protein_category: 1,
              rating_id: 1,
              customer_id: 1,
              price: {
                $reduce: {
                  input: '$meal_price',
                  initialValue: 0,
                  in: {
                    $add: ['$$value', '$$this.price'],
                  },
                },
              },
              discount_percent: 1,
              delivery_date: 1,
              customer_rating_count: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: '$ratingData',
                      },
                      0,
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
              rating_count: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: '$ratingData',
                      },
                      0,
                    ],
                  },
                  then: {
                    $arrayElemAt: ['$ratingData.rating', 0],
                  },
                  else: 0,
                },
              },
              rating_review: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: '$ratingData',
                      },
                      0,
                    ],
                  },
                  then: {
                    $size: {
                      $arrayElemAt: ['$ratingData.review', 0],
                    },
                  },
                  else: 0,
                },
              },
            },
          },
          {
            $group: {
              _id: {
                meal_category: '$meal_category',
                variants: '$variants',
                recipe_id: '$recipe_id',
                delivery_date: '$delivery_date',
                size: '$size',
                protein_category: '$protein_category',
              },
              total_order: {
                $sum: 1,
              },
              unit_price: {
                $first: '$price',
              },
              rating_count: {
                $sum: '$rating_count',
              },
              customer_rating_count: {
                $sum: '$customer_rating_count',
              },
              avg_rating_review: {
                $sum: '$rating_review',
              },
              dish_name: {
                $first: '$dish_name',
              },
              customer_price: {
                $sum: '$customer_price',
              },
            },
          },
          {
            $project: {
              _id: 0,
              recipe_id: '$_id.recipe_id',
              meal_category: '$_id.meal_category',
              variants: '$_id.variants',
              protein_category: '$_id.protein_category',
              dish_name: 1,
              delivery_date: '$_id.delivery_date',
              total_order: 1,
              unit_price: {
                $round: ['$unit_price', 2],
              },
              total_cost: {
                $round: [
                  {
                    $multiply: ['$total_order', '$unit_price'],
                  },
                  2,
                ],
              },
              avg_rating_count: {
                $cond: [
                  {
                    $gt: ['$customer_rating_count', 0],
                  },
                  {
                    $divide: ['$rating_count', '$customer_rating_count'],
                  },
                  0,
                ],
              },
              customer_rating_count: 1,
              avg_rating_review: 1,
              customer_price: 1,
            },
          },
          {
            $group: {
              _id: {
                meal_category: '$meal_category',
                // variants: "$variants",
                // recipe_id: "$recipe_id",
                // delivery_date: "$delivery_date",
                // size: "$size",
                // protein_category: "$protein_category"
              },
              total_order: {
                $sum: '$total_order',
              },
              customer_rating_count: {
                $sum: '$customer_rating_count',
              },
              rating_count: {
                $sum: '$avg_rating_count',
              },
              customer_price: {
                $sum: '$customer_price',
              },
              customer_rating_count_sum: {
                $sum: {
                  $cond: [
                    {
                      $gt: ['$avg_rating_count', 0],
                    },
                    // Condition: avg_rating_count > 0
                    1,
                    // If true, sum 1
                    0, // If false, sum 0
                  ],
                },
              },
              unit_price: {
                $avg: '$unit_price',
              },
              total_cost: {
                $sum: '$total_cost',
              },
            },
          },
          {
            $project: {
              _id: 0,
              // recipe_id: "$_id.recipe_id",
              meal_category: '$_id.meal_category',
              // variants: "$_id.variants",
              // dish_name: 1,
              // delivery_date: "$_id.delivery_date",
              total_order: 1,
              avg_rating_count: {
                $cond: [
                  {
                    $gt: ['$customer_rating_count_sum', 0],
                  },
                  {
                    $round: [
                      {
                        $divide: [
                          '$rating_count',
                          '$customer_rating_count_sum',
                        ],
                      },
                      1, // Specify the number of decimal places to round to
                    ],
                  },
                  0,
                ],
              },
              customer_rating_count: 1,
              avg_rating_review: 1,
              total_value: { $round: ['$customer_price', 1] },
              total_cost: { $round: ['$total_cost', 1] },
              unit_price: { $round: ['$unit_price', 1] },
            },
          },
        );
      } else if (filter == 'recipe') {
        pipeline.push(
          {
            $unwind: {
              path: '$delivery_item',
            },
          },
          {
            $project: {
              dish_name: {
                $ifNull: [
                  '$delivery_item.selected_meal.internal_dish_name',
                  '$delivery_item.selected_meal.dish_name',
                ],
              },
              recipe_id: {
                $toString: '$delivery_item.selected_meal.recipe_id',
              },
              customer_id: 1,
              order_id: 1,
              meal_type: '$delivery_item.meal_type',
              meal_category: '$delivery_item.selected_meal.meal_category',
              rating_id: '$delivery_item.selected_meal.rating_id',
              delivery_date: 1,
              variants: '$delivery_item.selected_meal.variants.protein_option',
              protein_category:
                '$delivery_item.selected_meal.variants.protein_category',
              size: '$delivery_item.selected_meal.variants.size',
              meal_price: '$delivery_item.selected_meal.variants.components',
            },
          },
          {
            $lookup: {
              from: 'ratings',
              localField: 'rating_id',
              foreignField: '_id',
              as: 'ratingData',
            },
          },
          {
            $project: {
              dish_name: 1,
              meal_category: 1,
              variants: 1,
              size: 1,
              recipe_id: 1,
              protein_category: 1,
              rating_id: 1,
              price: {
                $reduce: {
                  input: '$meal_price',
                  initialValue: 0,
                  in: {
                    $add: ['$$value', '$$this.price'],
                  },
                },
              },
              delivery_date: 1,
              customer_rating_count: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: '$ratingData',
                      },
                      0,
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
              rating_count: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: '$ratingData',
                      },
                      0,
                    ],
                  },
                  then: {
                    $arrayElemAt: ['$ratingData.rating', 0],
                  },
                  else: 0,
                },
              },
              rating_review: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: '$ratingData',
                      },
                      0,
                    ],
                  },
                  then: {
                    $size: {
                      $arrayElemAt: ['$ratingData.review', 0],
                    },
                  },
                  else: 0,
                },
              },
            },
          },
          {
            $group: {
              _id: {
                meal_category: '$meal_category',
                variants: '$variants',
                recipe_id: '$recipe_id',
                delivery_date: '$delivery_date',
                size: '$size',
                protein_category: '$protein_category',
              },
              total_order: {
                $sum: 1,
              },
              unit_price: {
                $first: '$price',
              },
              rating_count: {
                $sum: '$rating_count',
              },
              customer_rating_count: {
                $sum: '$customer_rating_count',
              },
              avg_rating_review: {
                $sum: '$rating_review',
              },
              dish_name: {
                $first: '$dish_name',
              },
            },
          },
          {
            $project:
            /**
             * specifications: The fields to
             *   include or exclude.
             */
            {
              _id: 0,
              recipe_id: '$_id.recipe_id',
              meal_category: '$_id.meal_category',
              variants: '$_id.variants',
              dish_name: 1,
              delivery_date: '$_id.delivery_date',
              total_order: 1,
              unit_price: {
                $round: [
                  '$unit_price',
                  // Take the first value of the price array
                  1, // Round to 2 decimal places
                ],
              },
              total_cost: {
                $round: [
                  {
                    $multiply: ['$total_order', '$unit_price'],
                  },
                  // Multiply total_order and unit_price
                  1, // Round the result to 2 decimal places
                ],
              },
              avg_rating_count: {
                $cond: [
                  {
                    $gt: ['$customer_rating_count', 0],
                  },
                  // Check if customer_rating_count > 0
                  {
                    $divide: ['$rating_count', '$customer_rating_count'],
                  },
                  // Perform the division if true
                  0, // Default to 0 if customer_rating_count is 0 or missing
                ],
              },
              customer_rating_count: 1,
              avg_rating_review: 1,
            },
          },
          {
            $group: {
              _id: {
                meal_category: '$meal_category',
                // variants: "$variants",
                recipe_id: '$recipe_id',
                // delivery_date: "$delivery_date",
                // size: "$size",
                // protein_category: "$protein_category"
              },
              dish_name: {
                $first: '$dish_name',
              },
              total_order: {
                $sum: '$total_order',
              },
              customer_rating_count: {
                $sum: '$customer_rating_count',
              },
              rating_count: {
                $sum: '$avg_rating_count',
              },
              customer_rating_count_sum: {
                $sum: {
                  $cond: [
                    {
                      $gt: ['$avg_rating_count', 0],
                    },
                    // Condition: avg_rating_count > 0
                    1,
                    // If true, sum 1
                    0, // If false, sum 0
                  ],
                },
              },
              unit_price: {
                $avg: '$unit_price',
              },
              total_cost: {
                $sum: '$total_cost',
              },
              customer_price: {
                $sum: '$customer_price',
              },
            },
          },
          {
            $project: {
              _id: 0,
              recipe_id: '$_id.recipe_id',
              meal_category: '$_id.meal_category',
              // variants: "$_id.variants",
              dish_name: 1,
              // delivery_date: "$_id.delivery_date",
              total_order: 1,
              avg_rating_count: {
                $cond: [
                  {
                    $gt: ['$customer_rating_count_sum', 0],
                  },
                  {
                    $round: [
                      {
                        $divide: [
                          '$rating_count',
                          '$customer_rating_count_sum',
                        ],
                      },
                      1, // Specify the number of decimal places to round to
                    ],
                  },
                  0,
                ],
              },
              total_value: { $round: ['$customer_price', 1] },
              customer_rating_count: 1,
              avg_rating_review: 1,
              total_cost: {
                $round: ['$total_cost', 1],
              },
              unit_price: {
                $round: ['$unit_price', 1],
              },
            },
          },
          {
            $match: {
              meal_category: meal_category,
            },
          },
        );
      }

      // Parse and apply multiple sorts
      if (sort && order) {
        const sortFields = sort.split(','); // e.g., "rating,customer_name"
        const sortOrders = order.split(','); // e.g., "1,-1"
        const sortObject: Record<string, number> = {};

        sortFields.forEach((field, index) => {
          sortObject[field] = +sortOrders[index] || 1; // Default to ascending if no order provided
        });
        console.log('Sort', sortObject);
        pipeline.push({ $sort: sortObject });
      }

      if (page && +limit > 0) {
        // Add sorting and pagination using $facet
        const skip = (+page - 1) * +limit;
        pipeline.push({
          $facet: {
            metadata: [
              { $count: 'total' }, // Count total documents matching the filter
            ],
            paginatedData: [
              // { $sort: { [sort]: +order } }, // Sort
              { $skip: skip }, // Skip documents for pagination
              { $limit: +limit }, // Limit documents per page
            ],
          },
        });
      }
      // pipeline.push({ $sort: { [sort]: +order } });

      const response = await this.deliveryModel.aggregate(pipeline);

      // Extract total count and paginated data from the response
      const total = response[0]?.metadata[0]?.total || 0;
      const paginatedData = response[0]?.paginatedData || [];
      return {
        list: paginatedData,
        totalRecords: total,
        currentPage: +page,
        totalPages: +limit > 0 ? Math.ceil(total / +limit) : 1,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  async getKitchenRecipeListWithoutCost(
    startDate: string,
    endDate: string,
    filter: string,
    page: string = '1',
    limit: string = '10',
    sort: string = 'meal_category',
    order: string = '1',
    meal_category?: string,
  ): Promise<any> {
    try {
      const start = moment(startDate).startOf('day').toDate();
      const end = moment(endDate).endOf('day').toDate();
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      const matchCriteria: any = {
        delivery_date: { $gte: start, $lte: end },
        delivery_type: 'subscription',
        not_deliverable: false,
        is_delivery_freezed: false,
      };

      if (filter === 'recipe' && meal_category) {
        matchCriteria['delivery_item.selected_meal.meal_category'] =
          meal_category;
      }

      const pipeline: any[] = [
        { $match: matchCriteria },
        { $project: { delivery_item: 1 } },
        { $unwind: '$delivery_item' },
      ];

      if (filter === 'category') {
        pipeline.push(
          {
            $group: {
              _id: '$delivery_item.selected_meal.meal_category',
              total_order: { $sum: 1 },
              rating_ids: {
                $addToSet: '$delivery_item.selected_meal.rating_id',
              },
            },
          },
          {
            $lookup: {
              from: 'ratings',
              localField: 'rating_ids',
              foreignField: '_id',
              as: 'ratingData',
            },
          },
          {
            $project: {
              _id: 1,
              meal_category: '$_id',
              total_order: 1,
              customer_rating_count: { $size: '$rating_ids' },
              avg_rating_count: { $round: [{ $avg: '$ratingData.rating' }, 1] },
              rating_review: {
                $size: {
                  $filter: {
                    input: '$ratingData',
                    as: 'r',
                    cond: {
                      $gt: [{ $size: { $ifNull: ['$$r.review', []] } }, 0],
                    },
                  },
                },
              },
              rating_comment: {
                $size: {
                  $filter: {
                    input: '$ratingData',
                    as: 'r',
                    cond: {
                      $and: [
                        { $ne: ['$$r.comment', null] },
                        { $ne: ['$$r.comment', ''] },
                      ],
                    },
                  },
                },
              },
            },
          },
        );
      } else if (filter === 'recipe') {
        pipeline.push(
          {
            $match: {
              'delivery_item.selected_meal.meal_category': meal_category,
            },
          },
          {
            $lookup: {
              from: 'ratings',
              localField: 'delivery_item.selected_meal.rating_id',
              foreignField: '_id',
              as: 'ratingData',
            },
          },
          {
            $group: {
              _id: {
                recipe_id: '$delivery_item.selected_meal.recipe_id',
                protein:
                  '$delivery_item.selected_meal.variants.protein_category',
              },
              total_order: { $sum: 1 },
              dish_name: {
                $first: {
                  $ifNull: [
                    '$delivery_item.selected_meal.internal_dish_name',
                    '$delivery_item.selected_meal.dish_name',
                  ],
                },
              },
              rating_sum: {
                $sum: {
                  $ifNull: [{ $arrayElemAt: ['$ratingData.rating', 0] }, 0],
                },
              },
              rating_count: {
                $sum: { $cond: [{ $gt: [{ $size: '$ratingData' }, 0] }, 1, 0] },
              },
              // Sum of review array sizes for avg_rating_review
              review_total: {
                $sum: {
                  $size: {
                    $ifNull: [{ $arrayElemAt: ['$ratingData.review', 0] }, []],
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              total_order: 1,
              customer_rating_count: '$rating_count',
              avg_rating_review: '$review_total',
              protein_category: '$_id.protein',
              recipe_id: { $toString: '$_id.recipe_id' },
              dish_name: { $concat: ['$dish_name', ' (', '$_id.protein', ')'] },
              avg_rating_count: {
                $cond: [
                  { $gt: ['$rating_count', 0] },
                  {
                    $round: [{ $divide: ['$rating_sum', '$rating_count'] }, 1],
                  },
                  0,
                ],
              },
            },
          },
        );
      }

      // Sort, execute and manually paginate for precise "totalRecords" count
      const sortObj: any = {};
      sort
        .split(',')
        .forEach(
          (f, i) => (sortObj[f.trim()] = parseInt(order.split(',')[i]) || 1),
        );
      pipeline.push({ $sort: sortObj });

      const fullResult = await this.deliveryModel
        .aggregate(pipeline)
        .allowDiskUse(true);

      const totalRecords = fullResult.length;
      const paginatedList = fullResult.slice(skip, skip + limitNum);

      return {
        list: paginatedList,
        totalRecords,
        currentPage: +page,
        totalPages: limitNum > 0 ? Math.ceil(totalRecords / limitNum) : 1,
      };
    } catch (error) {
      console.error('Kitchen Recipe Optimization Error:', error);
      throw new HttpException('Internal Server Error', 500);
    }
  }
  async getKitchenDietTypeWiseRecipeList(
    startDate: string,
    endDate: string,
    filter: string,
    // search?: string,
    page: string = '1',
    limit: string = '0',
    sort: string = 'delivery_date',
    order: string = '1', /// 1 for ascending, -1 for descending
    // meal_category?: string,
    recipe_id?: string,
    protein_category?: string,
  ): Promise<any> {
    try {
      console.log('protein category1111111111111111', protein_category);
      const matchQuery: any = {
        recipe_id: recipe_id,
      };
      if (protein_category) {
        matchQuery.protein_category = protein_category;
      }
      const pipeline: any[] = [
        {
          $match: {
            delivery_date: {
              $gte: new Date(
                moment(startDate)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              $lte: new Date(
                moment(endDate)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
            delivery_type: 'subscription',
            not_deliverable: false,
            is_delivery_freezed: false,
          },
        },
        {
          $unwind: {
            path: '$delivery_item',
          },
        },
        {
          $project: {
            dish_name: {
              $ifNull: [
                '$delivery_item.selected_meal.internal_dish_name',
                '$delivery_item.selected_meal.dish_name',
              ],
            },
            recipe_id: {
              $toString: '$delivery_item.selected_meal.recipe_id',
            },
            meal_category: '$delivery_item.selected_meal.meal_category',
            rating_id: '$delivery_item.selected_meal.rating_id',
            delivery_date: 1,
            variants: '$delivery_item.selected_meal.variants.protein_option',
            protein_category:
              '$delivery_item.selected_meal.variants.protein_category',
            size: '$delivery_item.selected_meal.variants.size',
            meal_price: '$delivery_item.selected_meal.variants.components',
          },
        },
        {
          $match: matchQuery,
        },
        {
          $lookup: {
            from: 'ratings',
            localField: 'rating_id',
            foreignField: '_id',
            as: 'ratingData',
          },
        },
        {
          $project: {
            dish_name: 1,
            meal_category: 1,
            variants: 1,
            size: 1,
            recipe_id: 1,
            protein_category: 1,
            rating_id: 1,
            price: {
              $reduce: {
                input: '$meal_price',
                initialValue: 0,
                in: {
                  $add: ['$$value', '$$this.price'],
                },
              },
            },
            delivery_date: 1,
            customer_rating_count: {
              $cond: {
                if: {
                  $gt: [
                    {
                      $size: '$ratingData',
                    },
                    0,
                  ],
                },
                then: 1,
                else: 0,
              },
            },
            rating_count: {
              $cond: {
                if: {
                  $gt: [
                    {
                      $size: '$ratingData',
                    },
                    0,
                  ],
                },
                then: {
                  $arrayElemAt: ['$ratingData.rating', 0],
                },
                else: 0,
              },
            },
            rating_review: {
              $cond: {
                if: {
                  $gt: [
                    {
                      $size: '$ratingData',
                    },
                    0,
                  ],
                },
                then: {
                  $size: {
                    $arrayElemAt: ['$ratingData.review', 0],
                  },
                },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: {
              meal_category: '$meal_category',
              variants: '$variants',
              recipe_id: '$recipe_id',
              delivery_date: '$delivery_date',
              size: '$size',
              protein_category: '$protein_category',
            },
            total_order: {
              $sum: 1,
            },
            unit_price: {
              $first: '$price',
            },
            rating_count: {
              $sum: '$rating_count',
            },
            customer_rating_count: {
              $sum: '$customer_rating_count',
            },
            avg_rating_review: {
              $sum: '$rating_review',
            },
            dish_name: {
              $first: '$dish_name',
            },
          },
        },
        {
          $project: {
            _id: 0,
            recipe_id: '$_id.recipe_id',
            meal_category: '$_id.meal_category',
            variants: '$_id.variants',
            protein_category: '$_id.protein_category',
            dish_name: 1,
            delivery_date: '$_id.delivery_date',
            total_order: 1,
            unit_price: {
              $round: ['$unit_price', 1],
            },
            total_cost: {
              $round: [
                {
                  $multiply: ['$total_order', '$unit_price'],
                },
                1,
              ],
            },
            avg_rating_count: {
              $cond: [
                {
                  $gt: ['$customer_rating_count', 0],
                },
                {
                  $divide: ['$rating_count', '$customer_rating_count'],
                },
                0,
              ],
            },
            rating_count: 1,
            customer_rating_count: 1,
            avg_rating_review: 1,
          },
        },
        {
          $group: {
            _id: {
              meal_category: '$meal_category',
              variants: '$variants',
              recipe_id: '$recipe_id',
              delivery_date: '$delivery_date',
              // size: "$size",
              protein_category: '$protein_category',
            },
            dish_name: {
              $first: '$dish_name',
            },
            total_order: {
              $sum: '$total_order',
            },
            customer_rating_count: {
              $sum: '$customer_rating_count',
            },
            rating_count: {
              $sum: '$rating_count',
            },
            customer_rating_count_sum: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$avg_rating_count', 0],
                  },
                  // Condition: avg_rating_count > 0
                  1,
                  // If true, sum 1
                  0, // If false, sum 0
                ],
              },
            },
            unit_price: {
              $avg: '$unit_price',
            },
            total_cost: {
              $sum: '$total_cost',
            },
          },
        },
        {
          $project: {
            _id: 0,
            recipe_id: '$_id.recipe_id',
            meal_category: '$_id.meal_category',
            variants: '$_id.variants',
            protein_category: '$_id.protein_category',
            dish_name: 1,
            delivery_date: '$_id.delivery_date',
            total_order: 1,
            avg_rating_count: {
              $cond: [
                {
                  $gt: ['$customer_rating_count', 0],
                },
                {
                  $round: [
                    {
                      $divide: ['$rating_count', '$customer_rating_count'],
                    },
                    1, // Specify the number of decimal places to round to
                  ],
                },
                0,
              ],
            },
            customer_rating_count: 1,
            avg_rating_review: 1,
            total_cost: {
              $round: ['$total_cost', 1],
            },
            unit_price: {
              $round: ['$unit_price', 1],
            },
          },
        },
        { $sort: { [sort]: +order } },
      ];

      if (page && +limit > 0) {
        const skip = (+page - 1) * +limit;
        console.log(skip, limit);
        pipeline.push({ $skip: Number(skip) });
        pipeline.push({ $limit: Number(limit) });
      }

      const response = await this.deliveryModel.aggregate(pipeline);

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  async getKitchenRecipeRating(
    startDate: string,
    endDate: string,
    // filter: string,
    // search?: string,
    page: string = '1',
    limit: string = '0',
    sort: string = 'rating',
    order: string = '1', /// 1 for ascending, -1 for descending
    diet_type?: string,
    protein_option?: string,
    recipe_id?: string,
    rating?: string,
    review?: string,
    comment?: string,
    meal_category?: string,
  ): Promise<any> {
    try {
      const matchConditions: Record<string, any> = {}; // Define matchConditions with a flexible type

      if (recipe_id) {
        matchConditions.$or = [
          {
            'delivery_item.selected_meal.recipe_id':
              new mongoose.Types.ObjectId(recipe_id),
          },
          { 'delivery_item.selected_meal.recipe_id': recipe_id },
        ];
      }

      if (diet_type && diet_type !== '') {
        // Add diet_type condition dynamically
        matchConditions[
          'delivery_item.selected_meal.variants.protein_category'
        ] = diet_type;
      }
      if (protein_option && protein_option !== '') {
        matchConditions['delivery_item.selected_meal.variants.protein_option'] =
          protein_option;
      }
      console.log('matchConditions', matchConditions);

      const matchRatingConditions = {};
      if (meal_category && meal_category !== '') {
        matchRatingConditions['meal_category'] = {
          $regex: meal_category,
          $options: 'i',
        };
      }
      if (rating && rating !== '') {
        const ratingArr = rating.split(',').map(Number);
        matchRatingConditions['rating'] = { $in: ratingArr }; // Ensures the array exists and is not empty
      }
      if (review === 'yes') {
        matchRatingConditions['review'] = { $exists: true, $ne: [] }; // Ensures the array exists and is not empty
      } else if (review === 'no') {
        matchRatingConditions['review'] = { $size: 0 }; // Matches documents where review is an empty array
      }
      if (comment === 'yes') {
        matchRatingConditions['comment'] = { $exists: true, $ne: '' }; // Ensures the array exists and is not empty
      } else if (comment === 'no') {
        matchRatingConditions['comment'] = { $eq: '' }; // Matches documents where comment is an empty array
      }

      console.log('matchRatingConditions', matchRatingConditions, startDate); // Output: [1, 2, 3, 4]

      const pipeline: any[] = [
        {
          $match: {
            delivery_date: {
              $gte: new Date(
                moment(startDate)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              $lte: new Date(
                moment(endDate)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
            delivery_type: 'subscription',
            not_deliverable: false,
            is_delivery_freezed: false,
            'delivery_item.selected_meal.rating_id': {
              $exists: true,
            },
          },
        },
        {
          $unwind: {
            path: '$delivery_item',
          },
        },
        {
          $match: matchConditions,
        },
        {
          $match: {
            'delivery_item.selected_meal.rating_id': {
              $exists: true,
            },
          },
        },
        {
          $lookup: {
            from: 'ratings',
            localField: 'delivery_item.selected_meal.rating_id',
            foreignField: '_id',
            as: 'ratingData',
          },
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer_id',
            foreignField: '_id',
            as: 'customerData',
          },
        },
        {
          $project: {
            customer_name: {
              $concat: [
                {
                  $arrayElemAt: ['$customerData.first_name', 0],
                },
                ' ',
                {
                  $arrayElemAt: ['$customerData.last_name', 0],
                },
              ],
            },
            rating: {
              $arrayElemAt: ['$ratingData.rating', 0],
            },
            review: {
              $arrayElemAt: ['$ratingData.review', 0],
            },
            comment: {
              $arrayElemAt: ['$ratingData.comment', 0],
            },
            recipe_id: 1,
            customer_id: 1,
            dish_name: '$delivery_item.selected_meal.dish_name',
            meal_category: '$delivery_item.selected_meal.meal_category',
            variants: '$delivery_item.selected_meal.variants.protein_option',
            protein_category:
              '$delivery_item.selected_meal.variants.protein_category',
            delivery_date: 1,
            meal_size: '$delivery_item.selected_meal.variants.size',
          },
        },
        {
          $match: matchRatingConditions,
        },
      ];

      if (!recipe_id || recipe_id === '') {
        pipeline.push({
          $group: {
            _id: '$dish_name',
            data: {
              $push: '$$ROOT',
            },
          },
        });
      }

      // console.log('pipeline', pipeline);
      if (page && +limit > 0) {
        // Add sorting and pagination using $facet
        const skip = (+page - 1) * +limit;
        pipeline.push({
          $facet: {
            metadata: [
              { $count: 'total' }, // Count total documents matching the filter
            ],
            paginatedData: [
              { $sort: { [sort]: +order } }, // Sort
              { $skip: skip }, // Skip documents for pagination
              { $limit: +limit }, // Limit documents per page
            ],
          },
        });
      }

      const response = await this.deliveryModel.aggregate(pipeline);

      // Extract total count and paginated data from the response
      const total = response[0]?.metadata[0]?.total || 0;
      const paginatedData = response[0]?.paginatedData || [];
      return {
        list: paginatedData,
        totalRecords: total,
        currentPage: +page,
        totalPages: +limit > 0 ? Math.ceil(total / +limit) : 1,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  async getCustomerWiseKitchenRecipeRating(
    startDate: string,
    endDate: string,
    search?: string,
    page: string = '1',
    limit: string = '0',
    sort: string = 'rating',
    order: string = '1', /// 1 for ascending, -1 for descending
    meal_category: string = '',
    diet_type: string = '',
    variant: string = '',
    customer_id?: string,
  ): Promise<any> {
    try {
      let condition: any;
      if (customer_id) {
        condition = {
          delivery_type: 'subscription',
          not_deliverable: false,
          is_delivery_freezed: false,
          'delivery_item.selected_meal.rating_id': { $exists: true },
          customer_id: new mongoose.Types.ObjectId(customer_id),
        };
      } else {
        condition = {
          delivery_date: {
            $gte: new Date(
              moment(startDate)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
            $lte: new Date(
              moment(endDate)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
          },
          delivery_type: 'subscription',
          not_deliverable: false,
          is_delivery_freezed: false,
          'delivery_item.selected_meal.rating_id': { $exists: true },
        };
      }

      const pipeline: any[] = [
        {
          $match: condition,
        },
        {
          $unwind: {
            path: '$delivery_item',
          },
        },
        {
          $match: {
            'delivery_item.selected_meal.rating_id': {
              $exists: true,
            },
          },
        },
        {
          $lookup: {
            from: 'ratings',
            localField: 'delivery_item.selected_meal.rating_id',
            foreignField: '_id',
            as: 'ratingData',
          },
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer_id',
            foreignField: '_id',
            as: 'customerData',
          },
        },
        {
          $project: {
            customer_name: {
              $concat: [
                {
                  $arrayElemAt: ['$customerData.first_name', 0],
                },
                ' ',
                {
                  $arrayElemAt: ['$customerData.last_name', 0],
                },
              ],
            },
            email: {
              $arrayElemAt: ['$customerData.email', 0],
            },
            whatsapp_number: {
              $arrayElemAt: ['$customerData.whatsapp_number', 0],
            },
            whatsapp_country_code: {
              $arrayElemAt: ['$customerData.whatsapp_country_code', 0],
            },
            phone_number: {
              $arrayElemAt: ['$customerData.whatsapp_number', 0],
            },
            country_code: {
              $arrayElemAt: ['$customerData.whatsapp_country_code', 0],
            },
            rating: {
              $arrayElemAt: ['$ratingData.rating', 0],
            },
            review: {
              $arrayElemAt: ['$ratingData.review', 0],
            },
            comment: {
              $arrayElemAt: ['$ratingData.comment', 0],
            },
            customer_id: 1,
            variants: '$delivery_item.selected_meal.variants.protein_option',
            protein_category:
              '$delivery_item.selected_meal.variants.protein_category',
            meal_category: '$delivery_item.selected_meal.meal_category',
            dish_name: {
              $ifNull: [
                '$delivery_item.selected_meal.internal_dish_name',
                '$delivery_item.selected_meal.dish_name',
              ],
            },
            delivery_date: 1,
          },
        },
      ];
      // Parse and apply multiple sorts

      if (meal_category) {
        console.log('meal_category', meal_category);
        pipeline.push({
          $match: {
            meal_category: { $regex: meal_category, $options: 'i' },
          },
        });
      }
      if (diet_type) {
        console.log('diet_type', diet_type);
        pipeline.push({
          $match: {
            protein_category: { $regex: diet_type, $options: 'i' },
          },
        });
      }
      if (variant) {
        console.log('variant', variant);
        pipeline.push({
          $match: {
            variants: { $regex: variant, $options: 'i' },
          },
        });
      }
      if (search) {
        console.log('search', search);
        pipeline.push({
          $match: {
            $or: [
              { customer_name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { whatsapp_number: { $regex: search, $options: 'i' } },
              { phone_number: { $regex: search, $options: 'i' } },
              { comment: { $regex: search, $options: 'i' } },
              { variants: { $regex: search, $options: 'i' } },
              { protein_category: { $regex: search, $options: 'i' } },
            ],
          },
        });
      }

      // Parse and apply multiple sorts
      if (sort && order) {
        const sortFields = sort.split(','); // e.g., "rating,customer_name"
        const sortOrders = order.split(','); // e.g., "1,-1"
        const sortObject: Record<string, number> = {};

        sortFields.forEach((field, index) => {
          sortObject[field] = +sortOrders[index] || 1; // Default to ascending if no order provided
        });
        console.log('Sort', sortObject);
        pipeline.push({ $sort: sortObject });
      }

      // console.log('pipeline', pipeline);
      if (page && +limit > 0) {
        // Add sorting and pagination using $facet
        const skip = (+page - 1) * +limit;
        pipeline.push({
          $facet: {
            metadata: [
              { $count: 'total' }, // Count total documents matching the filter
            ],
            paginatedData: [
              { $skip: skip }, // Skip documents for pagination
              { $limit: +limit }, // Limit documents per page
            ],
          },
        });
      }

      const response = await this.deliveryModel.aggregate(pipeline);

      // Extract total count and paginated data from the response
      const total = response[0]?.metadata[0]?.total || 0;
      const paginatedData = response[0]?.paginatedData || [];
      return {
        list: paginatedData,
        totalRecords: total,
        currentPage: +page,
        totalPages: +limit > 0 ? Math.ceil(total / +limit) : 1,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
