import { Inject, Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { Masternode } from '../module.model/masternode'
import { MasternodeState } from '@defichain/jellyfish-api-core/dist/category/masternode'
import { NetworkName } from '@defichain/jellyfish-network'

const MasternodeConsensusParams = {
  mainnet: {
    activationDelay: 10,
    newActivationDelay: 1008,
    resignDelay: 60,
    newResignDelay: 2 * 1008
  },
  testnet: {
    activationDelay: 10,
    newActivationDelay: 1008,
    resignDelay: 60,
    newResignDelay: 2 * 1008
  },
  devnet: {
    activationDelay: 10,
    newActivationDelay: 1008,
    resignDelay: 60,
    newResignDelay: 2 * 1008
  },
  regtest: {
    activationDelay: 10,
    newActivationDelay: 1008,
    resignDelay: 60,
    newResignDelay: 2 * 1008
  },
  changi: {
    activationDelay: 10,
    newActivationDelay: 1008,
    resignDelay: 60,
    newResignDelay: 2 * 1008
  }
}

@Injectable()
export class MasternodeService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
  }

  async getEunosHeight (): Promise<number | undefined> {
    return await this.cache.get<number>('EUNOS_HEIGHT', async () => {
      const softforks = (await this.rpcClient.blockchain.getBlockchainInfo()).softforks
      return softforks.eunos.height
    })
  }

  async getMnActivationDelay (height: number): Promise<number> {
    const eunosHeight = await this.getEunosHeight()
    if (eunosHeight === undefined || height < eunosHeight) {
      return MasternodeConsensusParams[this.network].activationDelay
    }

    return MasternodeConsensusParams[this.network].newActivationDelay
  }

  async getMnResignDelay (height: number): Promise<number> {
    const eunosHeight = await this.getEunosHeight()
    if (eunosHeight === undefined || height < eunosHeight) {
      return MasternodeConsensusParams[this.network].resignDelay
    }

    return MasternodeConsensusParams[this.network].newResignDelay
  }

  // !TODO: Alter retrospective behaviour based on EunosPaya height
  // See: https://github.com/DeFiCh/ain/blob/master/src/masternodes/masternodes.cpp#L116
  async getMasternodeState (masternode: Masternode, height: number): Promise<MasternodeState> {
    if (masternode.resignHeight === -1) { // enabled or pre-enabled
      // Special case for genesis block
      const activationDelay = await this.getMnActivationDelay(masternode.creationHeight)
      if (masternode.creationHeight === 0 || height >= masternode.creationHeight + activationDelay) {
        return MasternodeState.ENABLED
      }
      return MasternodeState.PRE_ENABLED
    } // pre-resigned or resigned
    const resignDelay = await this.getMnResignDelay(masternode.resignHeight)
    if (height < masternode.resignHeight + resignDelay) {
      return MasternodeState.PRE_RESIGNED
    }
    return MasternodeState.RESIGNED
  }
}
