import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type, Transform } from 'class-transformer'

/**
 * Pagination query with
 * - size as limit/count/max query
 * - next token for next slice/page
 *
 * This provides a singular consistent query pattern for DeFi Whale.
 */
export class PaginationQuery {
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => value > 100 ? 100 : value)
  @Min(0)
  @Type(() => Number)
  size: number = 30

  @IsOptional()
  @IsString()
  next?: string
}
