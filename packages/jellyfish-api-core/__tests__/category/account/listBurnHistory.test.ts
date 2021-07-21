import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload, DfTxType } from '../../../src/category/account'
import { createToken, accountToAccount } from '@defichain/testing'

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const burnAddress = 'mfburnZSAM7Gs1hpDeNaMotJXSGA7edosG'
  const burnAddressPrivateKey = '93ViFmLeJVgKSPxWGQHmSdT5RbeGDtGW4bsiwQM2qnQyucChMqQ'
  let fundedAddress: string

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    await client.wallet.importPrivKey(burnAddressPrivateKey)

    await createHistory()
  })

  async function createHistory (): Promise<void> {
    // test masternode creation fee burn
    const newAddress = await container.getNewAddress('', 'legacy')
    await client.masternode.createMasternode(newAddress)
    await container.generate(1)

    // creates funded account address
    fundedAddress = await container.getNewAddress()
    await client.wallet.sendToAddress(fundedAddress, 1)
    await container.call('utxostoaccount', [{ [fundedAddress]: '3@0' }])
    await container.generate(1)

    // burn token
    await createToken(container, 'GOLD', { collateralAddress: fundedAddress })

    // mint token and send token to burn address
    await container.call('minttokens', ['100@GOLD'])
    await container.generate(1)

    await accountToAccount(container, 'GOLD', 100, {
      from: fundedAddress, to: burnAddress
    })

    // utxostoaccount burn
    await container.call('utxostoaccount', [{ [burnAddress]: '1@0' }])
    await container.generate(1)

    // send to burn address with accountToAccount
    await accountToAccount(container, '0', 1, {
      from: fundedAddress, to: burnAddress
    })

    // send to burn address with accounttoutxos
    const payload: BalanceTransferPayload = {}
    payload[burnAddress] = '2@0'
    await client.account.accountToUtxos(fundedAddress, payload)
    await container.generate(1)

    // send utxo to burn address
    await client.wallet.sendToAddress(burnAddress, 10)
    await container.generate(1)
  }

  afterAll(async () => {
    await container.stop()
  })

  it('should listBurnHistory', async () => {
    const history = await client.account.listBurnHistory()
    expect(history.length).toStrictEqual(7)
    for (let i = 0; i < history.length; i += 1) {
      const burnHistory = history[i]
      expect(typeof burnHistory.owner).toStrictEqual('string')
      expect(typeof burnHistory.blockHeight).toStrictEqual('number')
      expect(typeof burnHistory.blockHash).toStrictEqual('string')
      expect(typeof burnHistory.blockTime).toStrictEqual('number')
      expect(typeof burnHistory.type).toStrictEqual('string')
      expect(typeof burnHistory.txn).toStrictEqual('number')
      expect(typeof burnHistory.txid).toStrictEqual('string')
      expect(burnHistory.amounts.length).toBeGreaterThan(0)
      expect(typeof burnHistory.amounts[0]).toStrictEqual('string')
    }
  })

  it('first transaction should be masternode creation fee burn', async () => {
    const history = await client.account.listBurnHistory()
    expect(history[6].owner.slice(0, 16)).toStrictEqual('6a1a446654784301')
    expect(history[6].type).toStrictEqual('CreateMasternode')
    expect(history[6].txn).toStrictEqual(2)
    expect(history[6].amounts.length).toStrictEqual(1)
    expect(history[6].amounts[0]).toStrictEqual('1.00000000@DFI')
  })

  it('second transaction should be after burn token', async () => {
    const history = await client.account.listBurnHistory()
    expect(history[5].owner).toStrictEqual('6a19446654785404474f4c4404474f4c4408000000000000000007')
    expect(history[5].type).toStrictEqual('CreateToken')
    expect(history[5].txn).toStrictEqual(1)
    expect(history[5].amounts.length).toStrictEqual(1)
    expect(history[5].amounts[0]).toStrictEqual('1.00000000@DFI')
  })

  it('third transaction should be send token to burn address', async () => {
    const history = await client.account.listBurnHistory()
    expect(history[4].owner).toStrictEqual(burnAddress)
    expect(history[4].type).toStrictEqual('AccountToAccount')
    expect(history[4].amounts.length).toStrictEqual(1)
    expect(history[4].amounts[0]).toStrictEqual('100.00000000@GOLD')
  })

  it('fourth transaction should be utxostoaccount burn', async () => {
    const history = await client.account.listBurnHistory()
    expect(history[3].owner).toStrictEqual(burnAddress)
    expect(history[3].type).toStrictEqual('UtxosToAccount')
    expect(typeof history[3].amounts).toStrictEqual('object')
    expect(history[3].amounts.length).toStrictEqual(1)
    expect(history[3].amounts[0]).toStrictEqual('1.00000000@DFI')
  })

  it('fifth transaction should be send to burn address with accountToAccount', async () => {
    const history = await client.account.listBurnHistory()
    expect(history[2].owner).toStrictEqual(burnAddress)
    expect(history[2].type).toStrictEqual('AccountToAccount')
    expect(history[2].amounts.length).toStrictEqual(1)
    expect(history[2].amounts[0]).toStrictEqual('1.00000000@DFI')
  })

  it('sixth transaction should be send to burn address with accounttoutxos', async () => {
    const history = await client.account.listBurnHistory()
    expect(history[1].owner).toStrictEqual(burnAddress)
    expect(history[1].type).toStrictEqual('None')
    expect(history[1].amounts.length).toStrictEqual(1)
    expect(history[1].amounts[0]).toStrictEqual('2.00000000@DFI')
  })

  it('last transaction should be send utxo to burn address', async () => {
    const history = await client.account.listBurnHistory()
    expect(history[0].owner).toStrictEqual(burnAddress)
    expect(history[0].type).toStrictEqual('None')
    expect(history[0].amounts.length).toStrictEqual(1)
    expect(history[0].amounts[0]).toStrictEqual('10.00000000@DFI')
  })

  it('should listBurnHistory with filter on txtype AccountToAccount', async () => {
    const history = await client.account.listBurnHistory({
      txtype: DfTxType.ACCOUNT_TO_ACCOUNT
    })
    expect(history.length).toStrictEqual(2)
    expect(history.every(({ type }) => type === 'AccountToAccount')).toStrictEqual(true)
  })

  it('should listBurnHistory with filter on token DFI', async () => {
    const history = await client.account.listBurnHistory({
      token: 'DFI'
    })
    expect(history.length).toStrictEqual(6)
    expect(history.every(({ amounts }) => amounts[0].includes('DFI'))).toStrictEqual(true)
  })

  it('should listBurnHistory with maxBlockHeight 105', async () => {
    const maxBlockHeight = 105
    const history = await client.account.listBurnHistory()
    const maxBlockHeightHistory = await client.account.listBurnHistory({
      maxBlockHeight
    })

    expect(maxBlockHeightHistory.every(({ blockHeight }) => blockHeight <= maxBlockHeight)).toStrictEqual(true)
    expect(history.every(({ blockHeight }) => blockHeight <= maxBlockHeight)).toStrictEqual(false)
  })

  it('should listBurnHistory with depth 5', async () => {
    const depth = 5
    const history = await client.account.listBurnHistory()
    const depthHistory = await client.account.listBurnHistory({
      depth
    })
    const maxBlockHeight = Math.max(...history.map(el => el.blockHeight)) // Get maxBlockHeight from history

    expect(depthHistory.every(({ blockHeight }) => blockHeight >= maxBlockHeight - depth)).toStrictEqual(true)
    expect(history.every(({ blockHeight }) => blockHeight >= maxBlockHeight - depth)).toStrictEqual(false)
  })

  it('should listBurnHistory with limit 5', async () => {
    const history = await client.account.listBurnHistory()
    const historyWithLimit = await client.account.listBurnHistory({
      limit: 5
    })
    expect(historyWithLimit.length).toStrictEqual(5)
    expect(historyWithLimit.slice(0, 5)).toStrictEqual(history.slice(0, 5))
  })
})
