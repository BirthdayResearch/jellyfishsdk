import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { Testing } from '@defichain/jellyfish-testing'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
const client = new ContainerAdapterClient(container)
const burnAddress = 'mfburnZSAM7Gs1hpDeNaMotJXSGA7edosG'

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  // Masternode
  await client.masternode.createMasternode(await container.getNewAddress('', 'legacy'))
  await container.generate(1)

  // burn gold token
  await testing.token.create({ symbol: 'GOLD' })
  await container.generate(1)

  await testing.token.mint({
    amount: 100,
    symbol: 'GOLD'
  })
  await container.generate(1)

  await testing.token.send({
    address: burnAddress,
    amount: 50,
    symbol: 'GOLD'
  })

  // send utxo to burn address
  await client.wallet.sendToAddress(burnAddress, 10)
  await container.generate(1)
})

afterAll(async () => {
  await container.stop()
})

it('should getBurnInfo', async () => {
  const info = await client.account.getBurnInfo()

  expect(info).toStrictEqual({
    address: burnAddress,
    amount: new BigNumber('10'),
    tokens: ['50.00000000@GOLD'],
    feeburn: new BigNumber('2'),
    auctionburn: new BigNumber(0),
    // consortiumtokens: [],
    emissionburn: new BigNumber('6274'),
    paybackburn: [],
    paybackfees: [],
    paybacktokens: [],
    dexfeetokens: [],
    dfipaybackfee: new BigNumber(0),
    dfipaybacktokens: [],
    dfip2203: [],
    dfip2206f: []
  })
})
