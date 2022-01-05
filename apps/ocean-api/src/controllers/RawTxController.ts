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
   * @param {RawTxDto} tx to submit to the network.
   * @return {Promise<string>} hash of the transaction
   * @throws {BadRequestApiException} if tx fail mempool acceptance
   */
  // @Post('/send')
  // async send (@Body() tx: RawTxDto): Promise<string> {
  //   await this.validate(tx.hex)

  //   const maxFeeRate = this.getMaxFeeRate(tx)
  //   try {
  //     return await this.client.rawtx.sendRawTransaction(tx.hex, maxFeeRate)
  //   } catch (err: any) {
  //     // TODO(fuxingloh): more meaningful error
  //     if (err?.payload?.message === 'TX decode failed') {
  //       throw new BadRequestApiException('Transaction decode failed')
  //     }
  //     if (err?.payload?.message.indexOf('absurdly-high-fee') !== -1) {
  //       // message: 'absurdly-high-fee, 100000000 > 11100000 (code 256)'
  //       throw new BadRequestApiException('Absurdly high fee')
  //     }

  //     throw new BadRequestApiException(err?.payload?.message)
  //   }
  // }

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
      console.log('result: ', result)
      if (!result.allowed) {
        throw new BadRequestApiException('Transaction is not allowed to be inserted')
      }
    } catch (err: any) {
      console.log('err.message: ', err.message)
      if (err.message.indexOf('Transaction is not allowed to be inserted') !== -1) {
        throw new BadRequestApiException('Transaction is not allowed to be inserted')
      }
      if (err?.payload?.message === 'TX decode failed') {
        throw new BadRequestApiException('Transaction decode failed')
      }
      throw new Error(err?.payload?.message)
    }
  }

  private getMaxFeeRate (tx: RawTxDto): BigNumber {
    if (tx.maxFeeRate !== undefined) {
      return new BigNumber(tx.maxFeeRate)
    }
    return this.defaultMaxFeeRate
  }

  // async validate (hex: string): Promise<void> {
  //   if (!hex.startsWith('040000000001')) {
  //     return
  //   }

  //   const buffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
  //   const transaction = new CTransactionSegWit(buffer)

  //   if (transaction.vout.length !== 2) {
  //     return
  //   }

  //   if (transaction.vout[0].script.stack.length !== 2) {
  //     return
  //   }

  //   if (transaction.vout[0].script.stack[0].type !== OP_CODES.OP_RETURN.type) {
  //     return
  //   }

  //   if ((transaction.vout[0].script.stack[1]).tx.type !== CCompositeSwap.OP_CODE) {
  //     return
  //   }

  //   const dftx = (transaction.vout[0].script.stack[1]).tx.data
  //   if (dftx.pools.length === 0) {
  //     return
  //   }

  //   const lastPoolId = dftx.pools[dftx.pools.length - 1].id
  //   const toTokenId = `${dftx.poolSwap.toTokenId}`

  //   const info = await this.deFiDCache.getPoolPairInfo(`${lastPoolId}`)
  //   if (info?.idTokenA === toTokenId || info?.idTokenB === toTokenId) {
  //     return
  //   }
  //   throw new BadRequestApiException('Invalid CompositeSwap')
  // }
}
