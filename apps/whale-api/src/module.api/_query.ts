import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

/**
 * Pagination query with next token as string.
 */
export class PaginationQueryString {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  size: number = 30

  @IsOptional()
  @IsString()
  next?: string
}

/**
 * Pagination query with next token as number.
 */
export class PaginationQueryNumber {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  size: number = 30

  @IsOptional()
  @IsNumber()
  next?: number
}
