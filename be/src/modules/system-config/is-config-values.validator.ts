import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { validateConfigValues } from './config-registry';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function IsConfigValues(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isConfigValues',
      target: target.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) =>
          isPlainObject(value) && Object.keys(value).length > 0 && validateConfigValues(value).length === 0,
        defaultMessage: (args: ValidationArguments) =>
          isPlainObject(args.value) && Object.keys(args.value).length > 0
            ? validateConfigValues(args.value).join('; ')
            : `${propertyName} must be a non-empty object of config values`,
      },
    });
}
