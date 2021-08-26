import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'

const container = new MasterNodeRegTestContainer()
const client = new ContainerAdapterClient(container)
const burnAddress = 'mfburnZSAM7Gs1hpDeNaMotJXSGA7edosG'

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  // Masternode
  await client.masternode.createMasternode(await container.getNewAddress('', 'legacy'))
  await container.generate(1)

  // burn gold token
  const fundedAddress = await container.getNewAddress()
  await createToken(container, 'GOLD', { collateralAddress: fundedAddress })
  await client.token.mintTokens('100@GOLD')
  await container.generate(1)
  await client.account.sendTokensToAddress({}, { [burnAddress]: ['50@GOLD'] })

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
    emissionburn: new BigNumber('6274')
  })
})
