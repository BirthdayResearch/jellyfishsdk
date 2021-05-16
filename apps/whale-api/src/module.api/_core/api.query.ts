import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

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
  @Min(0)
  @Max(60)
  @Type(() => Number)
  size: number = 30

  @IsOptional()
  @IsString()
  next?: string
}
