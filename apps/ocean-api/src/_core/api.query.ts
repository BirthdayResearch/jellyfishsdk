import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { ArgsType, Field, Int } from '@nestjs/graphql'

/**
 * Pagination query with
 * - size as limit/count/max query
 * - next token for next slice/page
 *
 * This provides a singular consistent query pattern for DeFi Whale.
 */

@ArgsType()
export class PaginationQuery {
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => value > 200 ? 200 : value)
  @Min(1)
  @Type(() => Number)
  @Field((type) => Int)
  size: number = 30

  @IsOptional()
  @IsString()

  @Field((type) => String)
  next?: string
}
