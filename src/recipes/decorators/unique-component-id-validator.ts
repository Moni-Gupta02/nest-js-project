// /* eslint-disable @typescript-eslint/no-unused-vars */
// // unique-component-id-validator.ts

// import {
//   registerDecorator,
//   ValidationOptions,
//   ValidationArguments,
//   ValidatorConstraint,
//   ValidatorConstraintInterface,
// } from 'class-validator';
// import { Injectable } from '@nestjs/common';

// @Injectable()
// @ValidatorConstraint({ name: 'uniqueComponentId', async: false })
// export class UniqueComponentIdValidator
//   implements ValidatorConstraintInterface
// {
//   // validate(value: any[], args: ValidationArguments) {
//   //   const componentIds = value.reduce((ids, comp) => {
//   //     if (comp.component && Array.isArray(comp.component)) {
//   //       // If `component` is an array of objects with `component_id` properties
//   //       const componentIds = comp.component.map(
//   //         (c: { component_id: any; component_name: any }) =>
//   //           c.component_name || c.component_id,
//   //       );
//   //       return [...ids, ...componentIds];
//   //     }
//   //     return ids;
//   //   }, []);

//   //   // Check uniqueness of component ids
//   //   return new Set(componentIds).size === componentIds.length;
//   // }
//   validate(value: any[], args: ValidationArguments) {
//     const componentIds = new Set();
//     const componentNames = new Set();

//     for (const comp of value) {
//       if (comp.component_id) {
//         componentIds.add(comp.component_id);
//       }

//       if (comp.component_name) {
//         componentNames.add(comp.component_name);
//       }
//     }

//     const uniqueComponentIds =
//       componentIds.size === value.filter((comp) => comp.component_id).length;
//     const uniqueIngredientIds =
//       componentNames.size ===
//       value.filter((comp) => comp.component_name).length;

//     return uniqueComponentIds && uniqueIngredientIds;
//   }
//   defaultMessage(args: ValidationArguments) {
//     return 'Composition duplicate component not allowed !!';
//   }
// }

// export function IsUniqueComponentIds(validationOptions?: ValidationOptions) {
//   return function (object: Record<string, any>, propertyName: string) {
//     registerDecorator({
//       target: object.constructor,
//       propertyName: propertyName,
//       options: validationOptions,
//       validator: UniqueComponentIdValidator,
//     });
//   };
// }
// unique-component-id-validator.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ComponentDocument } from 'src/component/Schemas/component.schema';

@Injectable()
export class UniqueComponentIdValidatorService {
  constructor(
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
  ) {}

  async areComponentsUnique(updateRecipe: any): Promise<boolean> {
    const componentIds = new Set();
    const componentNames = new Set();
    const ingredientIds = new Set();

    const components = updateRecipe?.composition || [];
    for (const comp of components) {
      if (comp.component_id) {
        componentIds.add(comp.component_id);
      }

      if (comp.component_name) {
        const count = await this.componentModel
          .countDocuments({ name: comp.component_name.trim() })
          .exec();
        console.log('component Exist', comp.component_name.trim(), count);
        if (count > 0) {
          return false;
        }
        componentNames.add(comp.component_name);
      }

      if (comp.ingredient_id) {
        ingredientIds.add(comp.ingredient_id);
      }
    }
    const uniqueComponentIds =
      componentIds.size ===
      components.filter((comp: { component_id: any }) => comp.component_id)
        .length;
    const uniqueComponentNames =
      componentNames.size ===
      components.filter((comp: { component_name: any }) => comp.component_name)
        .length;
    const uniqueIngredientIds =
      ingredientIds.size ===
      components.filter((comp: { ingredient_id: any }) => comp.ingredient_id)
        .length;

    return uniqueComponentIds && uniqueComponentNames && uniqueIngredientIds;
  }
}
