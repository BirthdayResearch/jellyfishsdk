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
   * Attempts to submit new block to network.
   * See https://en.bitcoin.it/wiki/BIP_0022 for full specification.
   *
   * @param {string} hexdata the hex-encoded block data to submit
   * @param {string} dummy value, for compatibility with BIP22. This value is ignored.
   * @returns {Promise<void>}
   */
  async submitBlock (hexdata: string, dummy: string = ''): Promise<void> {
    return await this.client.call('submitblock', [hexdata, dummy], 'number')
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
