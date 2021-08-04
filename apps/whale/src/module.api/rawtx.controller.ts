import { Body, Controller, HttpCode, Post, ValidationPipe } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BadRequestApiException } from '@src/module.api/_core/api.error'
import { IsHexadecimal, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator'
import BigNumber from 'bignumber.js'

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
export class RawtxController {
  /**
   * MaxFeeRate = vkb * Fees
   * This will max out at around 0.001 DFI per average transaction (200vb).
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
  @Post('/send')
  async send (@Body() tx: RawTxDto): Promise<string> {
    const maxFeeRate = this.getMaxFeeRate(tx)
    try {
      return await this.client.rawtx.sendRawTransaction(tx.hex, maxFeeRate)
    } catch (err) {
      // TODO(fuxingloh): more meaningful error
      if (err?.payload?.message === 'TX decode failed') {
        throw new BadRequestApiException('Transaction decode failed')
      }
      if (err?.payload?.message.indexOf('absurdly-high-fee') !== -1) {
        // message: 'absurdly-high-fee, 100000000 > 11100000 (code 256)'
        throw new BadRequestApiException('Absurdly high fee')
      }

      throw new BadRequestApiException(err?.payload?.message)
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
      if (!result.allowed) {
        throw new Error('Transaction is not allowed to be inserted')
      }
    } catch (err) {
      if (err.message === 'Transaction is not allowed to be inserted') {
        throw new BadRequestApiException('Transaction is not allowed to be inserted')
      }
      if (err?.payload?.message === 'TX decode failed') {
        throw new BadRequestApiException('Transaction decode failed')
      }
      /* istanbul ignore next */
      throw new BadRequestApiException(err?.payload?.message)
    }
  }

  private getMaxFeeRate (tx: RawTxDto): BigNumber {
    if (tx.maxFeeRate !== undefined) {
      return new BigNumber(tx.maxFeeRate)
    }
    return this.defaultMaxFeeRate
  }
}
