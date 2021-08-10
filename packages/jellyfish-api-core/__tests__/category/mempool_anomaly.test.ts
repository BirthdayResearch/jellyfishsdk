import BigNumber from 'bignumber.js'
import { ContainerGroup, MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'

const group = new ContainerGroup([
  new MasterNodeRegTestContainer(), // Miner
  new RegTestContainer(), // Token Minter
  new RegTestContainer() // Token & UTXO Receiver
])
const clients = [
  new ContainerAdapterClient(group.get(0)),
  new ContainerAdapterClient(group.get(1)),
  new ContainerAdapterClient(group.get(2))
]

beforeAll(async () => {
  await group.start()
  await group.get(0).waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await group.stop()
})

describe('setup TOKEN on [0] and give to [1] for minting with 100 UTXO for spending', () => {
  beforeAll(async () => {
    const collateralAddress = await group.get(1).getNewAddress()
    await clients[0].token.createToken({
      symbol: 'TOKEN',
      name: 'TOKEN',
      collateralAddress: collateralAddress,
      isDAT: true,
      mintable: true,
      tradeable: true
    })
    await clients[0].wallet.sendToAddress(collateralAddress, 100)

    await group.get(0).generate(1)
    await group.waitForSync()
  })

  it('should mint 100 token, mine block, send 100 token, send utxo, mine block', async () => {
    const anotherAddress = await clients[2].wallet.getNewAddress()

    { // 1. mint 100 token on [1] and wait for
      const txId = await clients[1].token.mintTokens('100@TOKEN')
      await group.waitForMempoolSync(txId)
    }

    // 2. mine block on [0]
    await group.get(0).generate(1)
    await group.waitForSync()

    { // 3. send the 100@TOKEN from [1] to [2] (via accounttoaccount)
      const txid = await clients[1].account.sendTokensToAddress({}, { [anotherAddress]: ['100@TOKEN'] })
      await group.waitForMempoolSync(txid)
    }

    { // 4. send 10 UTXO from [1] to [2] (via sendtoaddress)
      const txid = await clients[1].wallet.sendToAddress(anotherAddress, 10)
      await group.waitForMempoolSync(txid)
    }

    // 5. mine block
    await group.get(0).generate(1)
    await group.waitForSync()

    // 6. wait for balances
    const utxo = await clients[2].wallet.getBalance()
    const account = await clients[2].account.getAccount(anotherAddress)
    expect(utxo).toStrictEqual(new BigNumber(10))
    expect(account).toStrictEqual(['100.00000000@TOKEN'])
  })
})
