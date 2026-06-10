import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@Injectable()
@ValidatorConstraint({ name: 'uniqueRecipetId', async: false })
export class uniqueRecipetIdValidator implements ValidatorConstraintInterface {
  // validate(value: any[], args: ValidationArguments) {
  //   const recipeIds = value.reduce((ids, comp) => {
  //     if (comp.component && Array.isArray(comp.component)) {
  //       // If `component` is an array of objects with `recipe_id` properties
  //       const recipeIds = comp.component.map(
  //         (c: { recipe_id: any; component_name: any }) =>
  //           c.component_name || c.recipe_id,
  //       );
  //       return [...ids, ...recipeIds];
  //     }
  //     return ids;
  //   }, []);

  //   // Check uniqueness of component ids
  //   return new Set(recipeIds).size === recipeIds.length;
  // }
  validate(value: any[]) {
    const recipeIds = new Set();

    for (const comp of value) {
      if (comp.recipe_id) {
        recipeIds.add(comp.recipe_id);
      } else {
        return false;
      }
    }

    const uniqueRecipetIds =
      recipeIds.size === value.filter((comp) => comp.recipe_id).length;

    return uniqueRecipetIds;
  }
  defaultMessage() {
    return 'Recipe duplicate not allowed !!';
  }
}

export function IsUniqueRecipeIds(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: uniqueRecipetIdValidator,
    });
  };
}
