import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional } from 'class-validator';
import { CONFIG_REGISTRY } from '../../../system-config/config-registry';
import { IsConfigValues } from '../../../system-config/is-config-values.validator';

const KEYS = CONFIG_REGISTRY.map((d) => d.key);

export class UpdateConfigDto {
  @ApiProperty({ example: { platform_fee: 12, cancel_window: 5 } })
  @IsConfigValues()
  values!: Record<string, number>;
}

export class ResetConfigDto {
  @ApiPropertyOptional({ enum: KEYS, isArray: true, description: 'Bỏ trống = reset tất cả' })
  @IsOptional() @IsArray() @ArrayMaxSize(KEYS.length) @IsIn(KEYS, { each: true })
  keys?: string[];
}
