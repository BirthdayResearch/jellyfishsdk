import { Transaction } from '@defichain/jellyfish-transaction/dist/tx'
import { ApiClient } from '../.'

export enum EstimateMode {
  UNSET = 'UNSET',
  ECONOMICAL = 'ECONOMICAL',
  CONSERVATIVE = 'CONSERVATIVE'
}

/**
 * Mining RPCs for DeFi Blockchain
 */
export class Mining {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns the estimated network hashes per second
   *
   * @param {number} nblocks to estimate since last difficulty change.
   * @param {number} height to estimate at the time of the given height.
   * @return {Promise<number>}
   */
  async getNetworkHashPerSecond (nblocks: number = 120, height: number = -1): Promise<number> {
    return await this.client.call('getnetworkhashps', [nblocks, height], 'number')
  }

  /**
   * Get mining-related information
   * @return {Promise<MiningInfo>}
   */
  async getMiningInfo (): Promise<MiningInfo> {
    return await this.client.call('getmininginfo', [], 'number')
  }

  /**
   *
   * @param {number} confirmationTarget in blocks (1 - 1008)
   * @param {EstimateMode} [estimateMode=EstimateMode.CONSERVATIVE] estimateMode of fees.
   * @returns {Promise<SmartFeeEstimation>}
   */
  async estimateSmartFee (confirmationTarget: number, estimateMode: EstimateMode = EstimateMode.CONSERVATIVE): Promise<SmartFeeEstimation> {
    return await this.client.call('estimatesmartfee', [confirmationTarget, estimateMode], 'number')
  }

  /**
   * If the request parameters include a 'mode' key, that is used to explicitly select between the default 'template' request or a 'proposal'.
   * It returns data needed to construct a block to work on.
   * For full specification, see BIPs 22, 23, 9, and 145:
   *    https://github.com/bitcoin/bips/blob/master/bip-0022.mediawiki
   *    https://github.com/bitcoin/bips/blob/master/bip-0023.mediawiki
   *    https://github.com/bitcoin/bips/blob/master/bip-0009.mediawiki#getblocktemplate_changes
   *    https://github.com/bitcoin/bips/blob/master/bip-0145.mediawiki
   *
   * @param {TemplateRequest} templateRequest A json object in the following spec
   * @param {string} mode This must be set to 'template', 'proposal' (see BIP 23), or omitted
   * @param {string[]} capabilities client side supported feature, 'longpoll', 'coinbasetxn', 'coinbasevalue', 'proposal', 'serverlist', 'workid'
   * @param {string[]} rules A list of strings
   * @returns {Promise<BlockTemplate>}
   */
  async getBlockTemplate (templateRequest: TemplateRequest): Promise<BlockTemplate> {
    return await this.client.call('getblocktemplate', [templateRequest], 'number')
  }
}

/**
 * Minting related information
 */
export interface MintingInfo {
  blocks: number
  currentblockweight?: number
  currentblocktx?: number
  difficulty: string
  isoperator: boolean
  masternodeid?: string
  masternodeoperator?: string
  masternodestate?: 'PRE_ENABLED' | 'ENABLED' | 'PRE_RESIGNED' | 'RESIGNED' | 'PRE_BANNED' | 'BANNED'
  generate?: boolean
  mintedblocks?: number
  networkhashps: number
  pooledtx: number
  chain: 'main' | 'test' | 'regtest' | string
  warnings: string
}

/**
 * Minting related information
 */
export interface MiningInfo {
  blocks: number
  currentblockweight?: number
  currentblocktx?: number
  difficulty: string
  isoperator: boolean
  masternodes: MasternodeInfo[]
  networkhashps: number
  pooledtx: number
  chain: 'main' | 'test' | 'regtest' | string
  warnings: string
}

/**
 * Masternode related information
 */
export interface MasternodeInfo {
  id: string
  operator: string
  state: 'PRE_ENABLED' | 'ENABLED' | 'PRE_RESIGNED' | 'RESIGNED' | 'PRE_BANNED' | 'BANNED'
  generate: boolean
  mintedblocks: number
  lastblockcreationattempt: string
  targetMultiplier: number
}

export interface SmartFeeEstimation {
  feerate?: number
  errors?: string[]
  blocks: number
}

export interface TemplateRequest {
  mode?: string
  capabilities?: string[]
  rules: string[]
}

export interface BlockTemplate {
  capabilities: string[]
  version: number
  rules: string[]
  vbavailable: any
  vbrequired: number
  previousblockhash: string
  transactions: Transaction[]
  coinbaseaux: any
  coinbasevalue: number
  longpollid: string
  target: string
  mintime: number
  mutable: string[]
  noncerange: string
  sigoplimit: number
  sizelimit: number
  weightlimit: number
  curtime: number
  bits: string
  height: number
  default_witness_commitment: string
}
