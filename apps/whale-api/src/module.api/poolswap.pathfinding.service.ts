import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { UndirectedGraph } from 'graphology'
import {
  AllSwappableTokensResult,
  BestSwapPathResult,
  SwapPathPoolPair,
  SwapPathsResult,
  TokenIdentifier
} from '@defichain/whale-api-client/dist/api/poolpairs'
import { DeFiDCache, PoolPairInfoWithId } from './cache/defid.cache'
import { Interval } from '@nestjs/schedule'
import BigNumber from 'bignumber.js'
import { allSimplePaths } from 'graphology-simple-path'
import { parseDisplaySymbol } from './token.controller'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { connectedComponents } from 'graphology-components'
import { NetworkName } from '@defichain/jellyfish-network'
import { PoolPairFeesService } from './poolpair.fees.service'

@Injectable()
export class PoolSwapPathFindingService {
  tokenGraph: UndirectedGraph = new UndirectedGraph()
  tokensToSwappableTokens = new Map<TokenIdentifier['id'], TokenIdentifier[]>()

  constructor (
    protected readonly deFiDCache: DeFiDCache,
    private readonly poolPairFeesServices: PoolPairFeesService,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
  }

  @Interval(120_000) // 120s
  async syncTokenGraph (): Promise<void> {
    const poolPairs = await this.deFiDCache.getPoolPairs()
    await this.addTokensAndConnectionsToGraph(poolPairs)
    await this.updateTokensToSwappableTokens()
  }

  async getAllSwappableTokens (tokenId: string): Promise<AllSwappableTokensResult> {
    await this.syncTokenGraphIfEmpty()

    return {
      fromToken: await this.getTokenIdentifier(tokenId),
      swappableTokens: this.tokensToSwappableTokens.get(tokenId) ?? []
    }
  }

  async getBestPath (fromTokenId: string, toTokenId: string): Promise<BestSwapPathResult> {
    const {
      fromToken,
      toToken,
      paths
    } = await this.getAllSwapPaths(fromTokenId, toTokenId)

    // always use direct path if available
    for (const path of paths) {
      if (path.length === 1) {
        return {
          fromToken: fromToken,
          toToken: toToken,
          bestPath: path,
          estimatedReturn: formatNumber(
            computeReturnInDestinationToken(path, fromTokenId)
          ) // denoted in toToken
        }
      }
    }

    // otherwise, search for the best path based on return
    let bestPath: SwapPathPoolPair[] = []
    let bestReturn = new BigNumber(0)

    for (const path of paths) {
      const totalReturn = computeReturnInDestinationToken(path, fromTokenId)
      if (totalReturn.isGreaterThan(bestReturn)) {
        bestReturn = totalReturn
        bestPath = path
      }
    }

    return {
      fromToken: fromToken,
      toToken: toToken,
      bestPath: bestPath,
      estimatedReturn: formatNumber(bestReturn) // denoted in toToken
    }
  }

  /**
   * Get all poolPairs that can support a direct swap or composite swaps from one token to another.
   * @param {number} fromTokenId
   * @param {number} toTokenId
   */
  async getAllSwapPaths (fromTokenId: string, toTokenId: string): Promise<SwapPathsResult> {
    if (fromTokenId === toTokenId) {
      throw new Error('Invalid tokens: fromToken must be different from toToken')
    }

    await this.syncTokenGraphIfEmpty()

    const result: SwapPathsResult = {
      fromToken: await this.getTokenIdentifier(fromTokenId),
      toToken: await this.getTokenIdentifier(toTokenId),
      paths: []
    }

    if (
      !this.tokenGraph.hasNode(fromTokenId) ||
      !this.tokenGraph.hasNode(toTokenId)
    ) {
      return result
    }

    result.paths = await this.computePathsBetweenTokens(fromTokenId, toTokenId)
    return result
  }

  /**
   * Performs graph traversal to compute all possible paths between two tokens.
   * Must be able to handle cycles.
   * @param {number} fromTokenId
   * @param {number} toTokenId
   * @return {Promise<SwapPathPoolPair[][]>}
   * @private
   */
  private async computePathsBetweenTokens (
    fromTokenId: string,
    toTokenId: string
  ): Promise<SwapPathPoolPair[][]> {
    const poolPairPaths: SwapPathPoolPair[][] = []

    for (const path of allSimplePaths(this.tokenGraph, fromTokenId, toTokenId)) {
      const poolPairs: SwapPathPoolPair[] = []
      // Iterate over the path pairwise; ( tokenA )---< poolPairId >---( tokenB )
      // to collect poolPair info into the final result
      for (let i = 1; i < path.length; i++) {
        const tokenA = path[i - 1]
        const tokenB = path[i]

        const poolPairId = this.tokenGraph.edge(tokenA, tokenB)
        if (poolPairId === undefined) {
          throw new Error(
            'Unexpected error encountered during path finding - ' +
            `could not find edge between ${tokenA} and ${tokenB}`
          )
        }

        const poolPair = await this.getPoolPairInfo(poolPairId)
        const estimatedDexFees = await this.poolPairFeesServices.getDexFeesPct(poolPair, poolPairId, tokenA, tokenB)

        poolPairs.push({
          poolPairId: poolPairId,
          symbol: poolPair.symbol,
          tokenA: await this.getTokenIdentifier(poolPair.idTokenA),
          tokenB: await this.getTokenIdentifier(poolPair.idTokenB),
          priceRatio: {
            ab: formatNumber(new BigNumber(poolPair['reserveA/reserveB'])),
            ba: formatNumber(new BigNumber(poolPair['reserveB/reserveA']))
          },
          ...((estimatedDexFees != null) && { estimatedDexFees })
        })
      }

      poolPairPaths.push(poolPairs)
    }

    return poolPairPaths
  }

  /**
   * Derives from PoolPairToken to construct an undirected graph.
   * Each node represents a token, each edge represents a poolPair that bridges a pair of tokens.
   * For example, [[A-DFI], [B-DFI]] creates an undirected graph with 3 nodes and 2 edges:
   * ( A )--- A-DFI ---( DFI )--- B-DFI ---( B )
   * @param {PoolPairToken[]} poolPairList - poolPairTokens to derive tokens and poolPairs added to the graph
   * @private
   */
  private async addTokensAndConnectionsToGraph (poolPairList: PoolPairInfoWithId[]): Promise<void> {
    for (const poolPair of poolPairList) {
      if (await this.isPoolPairIgnored(poolPair)) {
        continue
      }

      if (!this.tokenGraph.hasNode(poolPair.idTokenA)) {
        this.tokenGraph.addNode(poolPair.idTokenA)
      }
      if (!this.tokenGraph.hasNode(poolPair.idTokenB)) {
        this.tokenGraph.addNode(poolPair.idTokenB)
      }
      if (!this.tokenGraph.hasEdge(poolPair.idTokenA, poolPair.idTokenB)) {
        this.tokenGraph.addUndirectedEdgeWithKey(poolPair.id, poolPair.idTokenA, poolPair.idTokenB)
      }
    }
  }

  private async isPoolPairIgnored (poolPair: PoolPairInfoWithId): Promise<boolean> {
    // Hot Fix for MainNet due to cost of running getPoolPairInfo during boot up.
    if (this.network === 'mainnet') {
      if (poolPair.id === '48') {
        return true
      }
    } else {
      if (!poolPair.status) {
        return true
      }
    }

    return false
  }

  private async getTokenIdentifier (tokenId: string): Promise<TokenIdentifier> {
    const tokenInfo = await this.deFiDCache.getTokenInfo(tokenId)
    if (tokenInfo === undefined) {
      throw new NotFoundException(`Unable to find token ${tokenId}`)
    }
    return {
      id: tokenId,
      symbol: tokenInfo.symbol,
      displaySymbol: parseDisplaySymbol(tokenInfo)
    }
  }

  private async getPoolPairInfo (poolPairId: string): Promise<PoolPairInfo> {
    const poolPair = await this.deFiDCache.getPoolPairInfoFromPoolPairs(poolPairId)
    if (poolPair === undefined) {
      throw new NotFoundException(`Unable to find token ${poolPairId}`)
    }
    return poolPair
  }

  /**
   * Indexes each token to their graph 'component', allowing quick queries for
   * all the swappable tokens for a given token.
   * @private
   */
  private async updateTokensToSwappableTokens (): Promise<void> {
    const components = connectedComponents(this.tokenGraph)
    for (const component of components) {
      // enrich with symbol
      const tokens: TokenIdentifier[] = []
      for (const tokenId of component) {
        tokens.push(await this.getTokenIdentifier(tokenId))
      }

      // index each token to their swappable tokens
      for (const token of tokens) {
        this.tokensToSwappableTokens.set(
          token.id,
          tokens.filter(tk => tk.id !== token.id) // exclude tokens from their own 'swappables' list
        )
      }
    }
  }

  private async syncTokenGraphIfEmpty (): Promise<void> {
    if (this.tokenGraph.size === 0) {
      await this.syncTokenGraph()
    }
  }
}

function computeReturnInDestinationToken (path: SwapPathPoolPair[], fromTokenId: string): BigNumber {
  let total = new BigNumber(1)
  for (const poolPair of path) {
    if (fromTokenId === poolPair.tokenA.id) {
      total = total.multipliedBy(poolPair.priceRatio.ba)
      fromTokenId = poolPair.tokenB.id
    } else {
      total = total.multipliedBy(poolPair.priceRatio.ab)
      fromTokenId = poolPair.tokenA.id
    }
  }
  return total
}

function formatNumber (number: BigNumber): string {
  return number.eq(0)
    ? '0'
    : number.toFixed(8)
}
