import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@Injectable()
@ValidatorConstraint({ name: 'uniqueCompositionId', async: false })
export class UniqueCompositionIdValidator
  implements ValidatorConstraintInterface
{
  private type: string = '';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(value: any[], args: ValidationArguments) {
    const componentIds = new Set();
    const ingredientIds = new Set();

    for (const comp of value) {
      if (comp.component_id) {
        componentIds.add(comp.component_id);
      }

      if (comp.ingredient_id) {
        ingredientIds.add(comp.ingredient_id);
      }
    }

    const uniqueComponentIds =
      componentIds.size === value.filter((comp) => comp.component_id).length;
    const uniqueIngredientIds =
      ingredientIds.size === value.filter((comp) => comp.ingredient_id).length;

    if (!uniqueComponentIds) {
      this.type = 'Sub-recipe';
    }
    if (!uniqueIngredientIds) {
      this.type = 'Ingredient';
    }
    return uniqueComponentIds && uniqueIngredientIds;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return `'Composition duplicate ${this.type} not allowed !!'`;
  }
}

export function IsUniqueCompositionIds(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: UniqueCompositionIdValidator,
    });
  };
}
