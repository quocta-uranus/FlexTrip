import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Tên, email hoặc ID' })
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus)
  status?: UserStatus;
}

export class SuspendUserDto {
  @ApiProperty({ example: 'Gian lận thanh toán' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;
}

export class UnsuspendUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}
