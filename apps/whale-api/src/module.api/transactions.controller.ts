import BigNumber from 'bignumber.js'
import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common'
import { NetworkGuard } from '@src/module.api/guards/network.guard'
import { ExceptionInterceptor } from '@src/module.api/interceptors/exception.interceptor'
import { ResponseInterceptor } from '@src/module.api/interceptors/response.interceptor'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { IsHexadecimal, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator'
import { BadRequestApiException } from '@src/module.api/interceptors/api.error'

class RawTxDto {
  @IsNotEmpty()
  @IsHexadecimal()
  hex!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFeeRate?: number
}

@Controller('/v1/:network/transactions')
@UseGuards(NetworkGuard)
@UseInterceptors(ResponseInterceptor, ExceptionInterceptor)
export class TransactionsController {
  /**
   * MaxFeeRate = vkb * Fees
   * This will max out at around 0.001 DFI per transaction (200vb).
   * @example A typical P2WPKH 1 to 1 transaction is 110.5vb
   * @example A typical P2WPKH 1 to 2 transaction is 142.5vb
   * @example A typical P2WPKH 1 to 1 + dftx transaction is around ~200vb.
   */
  private readonly defaultMaxFeeRate: BigNumber = new BigNumber('0.005')

  constructor (private readonly client: JsonRpcClient) {
  }

  /**
   * @param {RawTxDto} tx to submit to the network.
   * @return {Promise<string>} hash of the transaction
   * @throws {BadRequestApiException} if tx fail mempool acceptance
   */
  @Post()
  async send (@Body() tx: RawTxDto): Promise<string> {
    const maxFeeRate = this.getMaxFeeRate(tx)
    try {
      return await this.client.rawtx.sendRawTransaction(tx.hex, maxFeeRate)
    } catch (e) {
      throw new BadRequestApiException()
    }
  }

  /**
   * @param {RawTxDto} tx to test whether allow acceptance into mempool.
   * @return {Promise<void>}
   * @throws {BadRequestApiException} if tx fail mempool acceptance
   */
  @Post('/test')
  @HttpCode(200)
  async test (@Body(ValidationPipe) tx: RawTxDto): Promise<void> {
    const maxFeeRate = this.getMaxFeeRate(tx)
    try {
      const result = await this.client.rawtx.testMempoolAccept(tx.hex, maxFeeRate)
      if (result.allowed) {
        return
      }
    } catch (e) {
    }
    throw new BadRequestApiException()
  }

  private getMaxFeeRate (tx: RawTxDto): BigNumber {
    if (tx.maxFeeRate !== undefined) {
      return new BigNumber(tx.maxFeeRate)
    }
    return this.defaultMaxFeeRate
  }
}
