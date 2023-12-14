/* eslint-disable  @typescript-eslint/explicit-function-return-type */
/* eslint-disable  @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { fetch } from 'cross-fetch'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import { ChildProcess, spawn } from 'child_process'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ApiPagedResponse } from './module.api/_core/api.paged.response'

import { AddressToken, AddressHistory } from '@defichain/whale-api-client/dist/api/address'
import { Block } from './module.model/block'
import { MasternodeData } from '@defichain/whale-api-client/dist/api/masternodes'
import {
  AllSwappableTokensResult,
  BestSwapPathResult, DexPricesResult,
  PoolPairData,
  PoolSwapAggregatedData,
  PoolSwapData,
  SwapPathsResult
} from '@defichain/whale-api-client/dist/api/poolpairs'
import { GovernanceProposal, ProposalVotesResult } from '@defichain/whale-api-client/dist/api/governance'
import { LoanVaultActive, LoanVaultLiquidated } from '@defichain/whale-api-client/dist/api/loan'
import { MasternodeType } from '@defichain/jellyfish-api-core/dist/category/governance'
import { Oracle } from './module.model/oracle'
import { OraclePriceAggregated } from './module.model/oracle.price.aggregated'
import { OraclePriceFeed } from './module.model/oracle.price.feed'
import { OraclePriceActive } from './module.model/oracle.price.active'
import { PriceTicker } from './module.model/price.ticker'
import { PriceFeedInterval, PriceOracle } from '@defichain/whale-api-client/dist/api/prices'
import { RawTransaction } from '@defichain/jellyfish-api-core/dist/category/rawtx'
import { ScriptActivity } from './module.model/script.activity'
import { ScriptAggregation } from './module.model/script.aggregation'
import { ScriptUnspent } from './module.model/script.unspent'
import { BurnData, RewardDistributionData, StatsData, SupplyData } from '@defichain/whale-api-client/dist/api/stats'
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens'
import { Transaction } from './module.model/transaction'
import { TransactionVin } from './module.model/transaction.vin'
import { TransactionVout } from './module.model/transaction.vout'

const PORT = 3002
const ENDPOINT = `http://127.0.0.1:${PORT}`
const SPAWNING_TIME = 120_000

export interface OceanListQuery {
  size: number
  next?: string
}

export interface OceanRawTxQuery {
  verbose: boolean
}

export interface OceanProposalQuery {
  masternode?: MasternodeType | string
  cycle?: number
  all?: boolean
  query?: OceanListQuery
}

class DefidOceanApi {
  async get (path: string): Promise<any> {
    const res = await fetch(`${ENDPOINT}${path}`, {
      method: 'GET'
    })
    return await res.json()
  }

  async post (path: string, data?: any): Promise<any> {
    const res = await fetch(`${ENDPOINT}${path}`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return await res.json()
  }
}

export class DefidOceanController {
  protected readonly api: DefidOceanApi = new DefidOceanApi()
}

export class DAddressController extends DefidOceanController {
  async getAccountHistory (address: string, height: number, txno: number): Promise<AddressHistory> {
    return await this.api.get(`/address/${address}/history/${height}/${txno}`)
  }

  async listAccountHistory (address: string, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<AddressHistory>> {
    if (query.next !== undefined) {
      return await this.api.get(`/address/${address}/history?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/address/${address}/history?size=${query.size}`)
  }

  async getBalance (address: string): Promise<string> {
    return await this.api.get(`/address/${address}/balance`)
  }

  async getAggregation (address: string): Promise<ScriptAggregation | undefined> {
    return await this.api.get(`/address/${address}/aggregation`)
  }

  async listTokens (address: string, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<AddressToken>> {
    if (query.next !== undefined) {
      return await this.api.get(`/address/${address}/tokens?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/address/${address}/tokens?size=${query.size}`)
  }

  async listVaults (address: string, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>> {
    if (query.next !== undefined) {
      return await this.api.get(`/address/${address}/vaults?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/address/${address}/vaults?size=${query.size}`)
  }

  async listTransactions (address: string, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<ScriptActivity>> {
    if (query.next !== undefined) {
      return await this.api.get(`/address/${address}/transactions?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/address/${address}/transactions?size=${query.size}`)
  }

  async listTransactionsUnspent (address: string, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<ScriptUnspent>> {
    if (query.next !== undefined) {
      return await this.api.get(`/address/${address}/transactions/unspent?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/address/${address}/transactions/unspent?size=${query.size}`)
  }
}

export class DBlockController extends DefidOceanController {
  async list (query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<Block>> {
    if (query.next !== undefined) {
      return await this.api.get(`/blocks?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/blocks?size=${query.size}`)
  }

  async get (id: string): Promise<Block | undefined> {
    return await this.api.get(`/blocks/${id}`)
  }

  async getTransactions (hash: string, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<Transaction>> {
    if (query.next !== undefined) {
      return await this.api.get(`/blocks/${hash}/transactions?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/blocks/${hash}/transactions?size=${query.size}`)
  }
}

export class DFeeController extends DefidOceanController {
  async estimate (): Promise<number> {
    return await this.api.get('/fee/estimate')
  }
}

export class DGovernanceController extends DefidOceanController {
  async listProposals (): Promise<ApiPagedResponse<GovernanceProposal>> {
    return await this.api.get('/governance/proposals')
  }

  async getProposal (id: string): Promise<GovernanceProposal> {
    return await this.api.get(`/governance/proposals/${id}`)
  }

  async listProposalVotes (id: string, query: OceanProposalQuery): Promise<ApiPagedResponse<ProposalVotesResult>> {
    const q = {
      masternode: MasternodeType.MINE,
      cycle: 0,
      all: false,
      query: {
        size: 30
      },
      ...query
    }
    const qStr = `masternode=${q.masternode}&cycle=${q.cycle}&all=${q.all}&size=${q.query?.size}`
    if (q?.query?.next !== undefined) {
      return await this.api.get(`/governance/proposals/${id}/votes?${qStr}&next=${q.query.next}`)
    }
    return await this.api.get(`/governance/proposals/${id}/votes?${qStr}`)
  }
}

export class DMasternodeController extends DefidOceanController {
  async list (query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<MasternodeData>> {
    if (query.next !== undefined) {
      return await this.api.get(`/masternodes?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/masternodes?size=${query.size}`)
  }

  async get (id: string): Promise<MasternodeData> {
    return await this.api.get(`/masternodes/${id}`)
  }
}

export class DOracleController extends DefidOceanController {
  async list (query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<Oracle>> {
    if (query.next !== undefined) {
      return await this.api.get(`/oracles?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/oracles?size=${query.size}`)
  }

  async getPriceFeed (id: string, key: string): Promise<ApiPagedResponse<OraclePriceFeed>> {
    return await this.api.get(`/oracles/${id}/${key}/feed`)
  }

  async getOracleByAddress (address: string): Promise<Oracle> {
    return await this.api.get(`/oracles/${address}`)
  }
}

export class DPoolPairController extends DefidOceanController {
  async list (query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<PoolPairData>> {
    if (query.next !== undefined) {
      return await this.api.get(`/poolpairs?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/poolpairs?size=${query.size}`)
  }

  async get (id: string): Promise<PoolPairData> {
    return await this.api.get(`/poolpairs/${id}`)
  }

  async listPoolSwaps (id: string, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<PoolSwapData>> {
    if (query.next !== undefined) {
      return await this.api.get(`/poolpairs/${id}/swaps?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/poolpairs/${id}/swaps?size=${query.size}`)
  }

  async listPoolSwapsVerbose (id: string, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<PoolSwapData>> {
    if (query.next !== undefined) {
      return await this.api.get(`/poolpairs/${id}/swaps/verbose?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/poolpairs/${id}/swaps/verbose?size=${query.size}`)
  }

  async listPoolSwapsAggregate (id: string, interval: number, query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<PoolSwapAggregatedData>> {
    if (query.next !== undefined) {
      return await this.api.get(`/poolpairs/${id}/swaps/aggregate/${interval}?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/poolpairs/${id}/swaps/aggregate/${interval}?size=${query.size}`)
  }

  async listSwappableTokens (id: string): Promise<AllSwappableTokensResult> {
    return await this.api.get(`/poolpairs/paths/swappable/${id}`)
  }

  async listPaths (fromTokenId: string, toTokenId: string): Promise<SwapPathsResult> {
    return await this.api.get(`/poolpairs/paths/from/${fromTokenId}/to/${toTokenId}`)
  }

  async getBestPath (fromTokenId: string, toTokenId: string): Promise<BestSwapPathResult> {
    return await this.api.get(`/poolpairs/paths/best/from/${fromTokenId}/to/${toTokenId}`)
  }

  async listDexPrices (denomination: string): Promise<DexPricesResult> {
    return await this.api.get(`/poolpairs/dexprices?denomination=${denomination}`)
  }
}

export class DPriceController extends DefidOceanController {
  async list (query: OceanListQuery = { size: 30 }): Promise<ApiPagedResponse<PriceTicker>> {
    if (query.next !== undefined) {
      return await this.api.get(`/prices?size=${query.size}&next=${query.next}`)
    }
    return await this.api.get(`/prices?size=${query.size}`)
  }

  async get (id: string): Promise<PriceTicker | undefined> {
    return await this.api.get(`/prices/${id}`)
  }

  async getFeed (id: string): Promise<ApiPagedResponse<OraclePriceAggregated>> {
    return await this.api.get(`/prices/${id}/feed`)
  }

  async getFeedActive (id: string): Promise<ApiPagedResponse<OraclePriceActive>> {
    return await this.api.get(`/prices/${id}/feed/active`)
  }

  async getFeedWithInterval (id: string, interval: number): Promise<ApiPagedResponse<PriceFeedInterval>> {
    return await this.api.get(`/prices/${id}/feed/interval/${interval}`)
  }

  async listPriceOracles (id: string): Promise<ApiPagedResponse<PriceOracle>> {
    return await this.api.get(`/prices/${id}/oracles`)
  }
}

export class DRawTxController extends DefidOceanController {
  async send (): Promise<string> {
    return await this.api.post('/rawtx/send')
  }

  async test (): Promise<void> {
    return await this.api.get('/rawtx/test')
  }

  async get (id: string, query: OceanRawTxQuery = { verbose: false }): Promise<string | RawTransaction> {
    return await this.api.get(`/rawtx/${id}?verbose=${query.verbose}`)
  }
}

export class DStatsController extends DefidOceanController {
  async get (): Promise<StatsData> {
    return await this.api.get('/stats')
  }

  async getSupply (): Promise<SupplyData> {
    return await this.api.get('/stats/supply')
  }

  async getBurn (): Promise<BurnData> {
    return await this.api.get('/stats/burn')
  }

  async getRewardDistribution (): Promise<RewardDistributionData> {
    return await this.api.get('/stats/reward/distribution')
  }
}

export class DTokenController extends DefidOceanController {
  async list (): Promise<ApiPagedResponse<TokenData>> {
    return await this.api.get('/tokens')
  }

  async get (id: string): Promise<TokenData> {
    return await this.api.get(`/tokens/${id}`)
  }
}

export class DTransactionController extends DefidOceanController {
  async get (id: string): Promise<Transaction> {
    return await this.api.get(`/transactions/${id}`)
  }

  async getVins (id: string): Promise<ApiPagedResponse<TransactionVin>> {
    return await this.api.get(`/transactions/${id}/vins`)
  }

  async getVouts (id: string): Promise<ApiPagedResponse<TransactionVout>> {
    return await this.api.get(`/transactions/${id}/vouts`)
  }
}

export class DefidBin {
  tmpDir: string = `/tmp/${uuidv4()}`
  binary: ChildProcess | null = null

  public constructor (
    readonly container: MasterNodeRegTestContainer,
    readonly addressController: DAddressController,
    readonly blockController: DBlockController,
    readonly feeController: DFeeController,
    readonly governanceController: DGovernanceController,
    readonly masternodeController: DMasternodeController,
    readonly oracleController: DOracleController,
    readonly poolPairController: DPoolPairController,
    readonly priceController: DPriceController,
    readonly rawTxController: DRawTxController,
    readonly statsController: DStatsController,
    readonly transactionController: DTransactionController,
    readonly tokenController: DTokenController
  ) {
  }

  async start (): Promise<void> {
    fs.mkdirSync(this.tmpDir)

    if (process.env.DEFID === undefined) {
      throw new Error('`process.env.DEFID` is required')
    }

    const args = [
      `-datadir=${this.tmpDir}`,
      '-regtest',
      '-printtoconsole',
      '-gen=0',
      '-rpcuser=test',
      '-rpcpassword=test',
      '-jellyfish_regtest',
      '-logtimemicros',
      '-logthreadnames',
      '-debug',
      `-masternode_operator=${RegTestFoundationKeys[1].operator.address}`,
      '-dummypos=0',
      '-txnotokens=0',
      '-logtimemicros',
      '-txindex=1',
      '-acindex=1'
    ]

    const extraArgs = [
      '-amkheight=0',
      '-bayfrontheight=1',
      '-bayfrontgardensheight=2',
      '-clarkequayheight=3',
      '-dakotaheight=4',
      '-dakotacrescentheight=5',
      '-eunosheight=6',
      '-eunospayaheight=7',
      '-fortcanningheight=8',
      '-fortcanningmuseumheight=9',
      '-fortcanninghillheight=10',
      '-fortcanningroadheight=11',
      '-fortcanningcrunchheight=12',
      '-fortcanningspringheight=13',
      '-fortcanninggreatworldheight=14',
      '-fortcanningepilogueheight=15',
      '-grandcentralheight=16',
      '-grandcentralepilogueheight=17',
      '-metachainheight=18'
    ]

    const binary = spawn(process.env.DEFID, args.concat(extraArgs))

    binary.on('error', err => {
      if ((err as any).errno === 'ENOENT') {
        console.error('\x1b[31mMissing Defid binary.\nPlease compile the Defid\x1b[0m')
      } else {
        console.error(err)
      }
      process.exit(1)
    })

    const logs: string[] = []

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        console.error('\x1b[31m Failed to start Defid node.\x1b[0m')
        console.error(logs.map(chunk => chunk.toString()).join('\n'))
        process.exit(1)
      }, SPAWNING_TIME - 20_000)

      const onData = async (chunk: any) => {
        logs.push(chunk)

        /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */
        if (chunk.toString().match(/addcon thread start/)) {
          try {
            const res = await this.blockController.get('0')
            console.log('[DefidBin.start()] blockController.get res: ', res)
          } catch (err) {
            console.log('[DefidBin.start()] blockController.get err: ', err)
          }

          clearTimeout(timer)

          binary.stderr.off('data', onData)
          binary.stdout.off('data', onData)

          // import privkey
          // setgov
          // generate(2)

          resolve()
        }
      }

      binary.stderr.on('data', onData)
      binary.stdout.on('data', onData)
    })

    this.binary = binary
  }
}
