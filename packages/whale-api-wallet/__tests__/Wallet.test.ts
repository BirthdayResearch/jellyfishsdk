import { getNetwork } from '@defichain/jellyfish-network'
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '../src/Wallet'
import { WhaleApiTestClient } from '../testing/WhaleApiTestClient'
import { TestNodeProvider } from '../testing/TestNode'

describe('WhaleWalletAccountProvider', () => {
  const nodeProvider = new TestNodeProvider()
  const whaleApiClient = new WhaleApiTestClient()
  let provider: WhaleWalletAccountProvider

  afterEach(() => {
    whaleApiClient.clearMockReturnVal()
  })

  beforeAll(() => {
    provider = new WhaleWalletAccountProvider(whaleApiClient, getNetwork('regtest'))
  })

  it('should provide WhaleWalletAccount', () => {
    const node = nodeProvider.derive('1129/0/0/0')
    const account = provider.provide(node)
    expect(account instanceof WhaleWalletAccount).toStrictEqual(true)
  })
})
