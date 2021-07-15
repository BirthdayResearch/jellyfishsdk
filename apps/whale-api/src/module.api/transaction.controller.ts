import BigNumber from 'bignumber.js'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  ParseIntPipe,
  Post,
  Query,
  ValidationPipe,
  Param,
  NotFoundException
} from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { IsHexadecimal, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator'
import { BadRequestApiException } from '@src/module.api/_core/api.error'
import { EstimateMode } from '@defichain/jellyfish-api-core/dist/category/mining'
import { TransactionMapper } from '@src/module.model/transaction'
import { Transaction } from '@whale-api-client/api/transactions'

class RawTxDto {
  @IsNotEmpty()
  @IsHexadecimal()
  hex!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFeeRate?: number
}

@Controller('/v0/:network/transactions')
export class TransactionsController {
  /**
   * MaxFeeRate = vkb * Fees
   * This will max out at around 0.001 DFI per average transaction (200vb).
   * @example A typical P2WPKH 1 to 1 transaction is 110.5vb
   * @example A typical P2WPKH 1 to 2 transaction is 142.5vb
   * @example A typical P2WPKH 1 to 1 + dftx transaction is around ~200vb.
   */
  private readonly defaultMaxFeeRate: BigNumber = new BigNumber('0.005')

  constructor (
    private readonly client: JsonRpcClient,
    private readonly transactionMapper: TransactionMapper
  ) {
  }

  /**
   * If fee rate cannot be estimated it will return a fixed rate of 0.00005000
   * This will max out at around 0.00001 DFI per average transaction (200vb).
   *
   * @param {number} confirmationTarget in blocks till fee get confirmed
   * @return {Promise<number>} fee rate per KB
   */
  @Get('/estimate-fee')
  async estimateFee (@Query('confirmationTarget', ParseIntPipe) confirmationTarget: number = 10): Promise<number> {
    const estimation = await this.client.mining.estimateSmartFee(confirmationTarget, EstimateMode.CONSERVATIVE)
    if (estimation.feerate !== undefined) {
      return estimation.feerate
    }

    return 0.00005000
  }

  /**
   * Get a single transaction by id
   *
   * @param {string} id of transaction to query
   * @return{Promise<Transaction>}
   */
  @Get('/:id')
  async get (@Param('id') id: string): Promise<Transaction> {
    const transaction = await this.transactionMapper.get(id)

    if (transaction === undefined) {
      throw new NotFoundException(`Unable to find transaction by id: ${id}`)
    }

    return transaction
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
