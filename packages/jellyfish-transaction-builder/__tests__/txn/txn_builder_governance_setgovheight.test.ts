import { GenesisKeys, MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { RegTest } from '@defichain/jellyfish-network'
import { createPoolPair, createToken } from '@defichain/testing'

class CustomOperatorGovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      `-masternode_operator=${GenesisKeys[GenesisKeys.length - 1].operator.address}` // Uses masternode_operator with bech32 address to be able to craft vote transaction
    ]
  }
}

describe('setgovheight', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new CustomOperatorGovernanceMasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.container.call('importprivkey', [GenesisKeys[GenesisKeys.length - 1].operator.privKey, 'operator', true])
    await testing.container.call('importprivkey', [GenesisKeys[GenesisKeys.length - 1].owner.privKey, 'owner', true])

    await createToken(testing.container, 'CAT')
    await createToken(testing.container, 'DOG')
    await createPoolPair(testing.container, 'CAT', 'DFI')
    await createPoolPair(testing.container, 'DOG', 'DFI')

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.container.waitForWalletBalanceGTE(12)
    await fundEllipticPair(testing.container, providers.ellipticPair, 50)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should set governance with future activation height', async () => {
    { // before
      const govVar = await testing.rpc.masternode.getGov('LP_SPLITS')
      expect(Object.keys(govVar.LP_SPLITS).length).toStrictEqual(0)
    }

    const script = await providers.elliptic.script()
    const set = await builder.governance.setGoverance({
      governanceVars: [
        {
          key: 'LP_SPLITS',
          value: [
            { tokenId: 3, value: new BigNumber(0.7) },
            { tokenId: 4, value: new BigNumber(0.3) }
          ]
        }
      ]
    }, script)
    await sendTransaction(testing.container, set)

    const currentHeight = await testing.container.getBlockCount()
    const activationHeight = currentHeight + 3
    const setWithHeight = await builder.governance.setGoveranceHeight({
      governanceVars: [
        {
          key: 'LP_SPLITS',
          value: [
            { tokenId: 3, value: new BigNumber(0.8) },
            { tokenId: 4, value: new BigNumber(0.2) }
          ]
        }
      ],
      activationHeight
    }, script)
    await sendTransaction(testing.container, setWithHeight)

    { // after
      const govVars: any[][] = await testing.rpc.call('listgovs', [], 'bignumber')
      expect(govVars.length).toBeGreaterThan(0)
      const liqSplits = govVars.find(gv => gv[0].LP_SPLITS !== undefined)
      expect(liqSplits).not.toBeUndefined()
      expect(liqSplits?.length).toStrictEqual(2)
      const [current, next] = liqSplits as any[]
      expect(current.LP_SPLITS['3'].toString()).toStrictEqual('0.7')
      expect(current.LP_SPLITS['4'].toString()).toStrictEqual('0.3')
      expect(next[activationHeight]['3'].toString()).toStrictEqual('0.8')
      expect(next[activationHeight]['4'].toString()).toStrictEqual('0.2')
    }
  })
})
