import { Body, Controller, Get, HttpCode, ParseIntPipe, Post, Query, ValidationPipe } from '@nestjs/common'
import { ApiClient, mining } from '@defichain/jellyfish-api-core'
import BigNumber from 'bignumber.js'
import { IsHexadecimal, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator'
import { BadRequestApiException } from '@defichain/ocean-api-client'
class RawTxDto {
  @IsNotEmpty()
  @IsHexadecimal()
  hex!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFeeRate?: number
}

@Controller('/rawtx')
export class RawTxController {
  /**
   * MaxFeeRate = vkb * Fees
   * This will max out at around 0.02 DFI per average transaction (200vb). 0.1/1000*200 = 0.02 DIF
   * @example A typical P2WPKH 1 to 1 transaction is 110.5vb
   * @example A typical P2WPKH 1 to 2 transaction is 142.5vb
   * @example A typical P2WPKH 1 to 1 + dftx transaction is around ~200vb.
   */
  private readonly defaultMaxFeeRate: BigNumber = new BigNumber('0.1')

  constructor (private readonly client: ApiClient) {
  }

  /**
   * If fee rate cannot be estimated it will return a fixed rate of 0.00005000
   * That fee rate will max out at around 0.00001 DFI per average transaction (200vb).
   *
   * @param {number} confirmationTarget in blocks till fee get confirmed
   * @return {Promise<number>} fee rate per KB
   */
  @Get('/fee/estimate')
  async estimate (@Query('confirmationTarget', ParseIntPipe) confirmationTarget: number = 10): Promise<number> {
    const estimation = await this.client.mining.estimateSmartFee(confirmationTarget, mining.EstimateMode.CONSERVATIVE)
    if (estimation.feerate !== undefined) {
      return estimation.feerate
    }

    return 0.00005000
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
      if (!result.allowed) {
        console.log('err 1 ')
        throw new BadRequestApiException('Transaction is not allowed to be inserted')
      }
    } catch (err: any) {
      if (err.message.indexOf('Transaction is not allowed to be inserted') !== -1) {
        console.log('err 2 ', err)
        throw err
      }
      if (err?.payload?.message === 'TX decode failed') {
        console.log('err 3 ', err)
        throw new BadRequestApiException('Transaction decode failed')
      }
      console.log('err 4 ', err)
      throw new Error(err?.payload?.message)
    }
  }

  private getMaxFeeRate (tx: RawTxDto): BigNumber {
    if (tx.maxFeeRate !== undefined) {
      return new BigNumber(tx.maxFeeRate)
    }
    return this.defaultMaxFeeRate
  }
}
