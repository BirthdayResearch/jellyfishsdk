import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload, DfTxType } from '../../../src/category/account'

const burnAddress = 'mfburnZSAM7Gs1hpDeNaMotJXSGA7edosG'
const burnAddressPrivateKey = '93ViFmLeJVgKSPxWGQHmSdT5RbeGDtGW4bsiwQM2qnQyucChMqQ'
let fundedAddress: string

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    await client.wallet.importPrivKey(burnAddressPrivateKey)
  })

  afterAll(async () => {
    await container.stop()
  })

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  async function accountToAccount (symbol: string, amount: number, from: string, _to = ''): Promise<string> {
    const to = _to !== '' ? _to : await container.call('getnewaddress')

    await container.call('accounttoaccount', [from, { [to]: `${amount.toString()}@${symbol}` }])

    return to
  }

  it('should listBurnHistory after test masternode creation fee burn', async () => {
    const newAddress = await container.getNewAddress('', 'legacy')
    await client.masternode.createMasternode(newAddress)
    await container.generate(1)

    const history = await client.account.listBurnHistory()
    expect(history.length).toStrictEqual(1)
    expect(history[0].owner.slice(0, 16)).toStrictEqual('6a1a446654784301')
    expect(typeof history[0].blockHash).toStrictEqual('string')
    expect(history[0].blockHash.length).toStrictEqual(64)
    expect(history[0].type).toStrictEqual('CreateMasternode')
    expect(history[0].txn).toStrictEqual(2)
    expect(typeof history[0].txid).toStrictEqual('string')
    expect(history[0].txid.length).toStrictEqual(64)
    expect(typeof history[0].amounts).toStrictEqual('object')
    expect(history[0].amounts.length).toStrictEqual(1)
    expect(history[0].amounts[0]).toStrictEqual('1.00000000@DFI')
  })

  it('should listBurnHistory after burn token', async () => {
    fundedAddress = await container.getNewAddress()
    await client.wallet.sendToAddress(fundedAddress, 1)
    await container.call('utxostoaccount', [{ [fundedAddress]: '3@0' }])
    await container.generate(1)

    await createToken(fundedAddress, 'GOLD', 1)

    const history = await client.account.listBurnHistory()
    expect(history.length).toStrictEqual(2)
    expect(history[0].owner).toStrictEqual('6a19446654785404474f4c4404474f4c4408000000000000000007')
    expect(typeof history[0].blockHash).toStrictEqual('string')
    expect(history[0].blockHash.length).toStrictEqual(64)
    expect(history[0].type).toStrictEqual('CreateToken')
    expect(history[0].txn).toStrictEqual(1)
    expect(typeof history[0].txid).toStrictEqual('string')
    expect(history[0].txid.length).toStrictEqual(64)
    expect(typeof history[0].amounts).toStrictEqual('object')
    expect(history[0].amounts.length).toStrictEqual(1)
    expect(history[0].amounts[0]).toStrictEqual('1.00000000@DFI')
  })

  it('should listBurnHistory after mint token and send token to burn address', async () => {
    await container.call('minttokens', ['100@GOLD'])
    await container.generate(1)

    await accountToAccount('GOLD', 100, fundedAddress, burnAddress)
    await container.generate(1)

    const history = await client.account.listBurnHistory()
    expect(history.length).toStrictEqual(3)
    expect(history[0].owner).toStrictEqual(burnAddress)
    expect(history[0].type).toStrictEqual('AccountToAccount')
    expect(typeof history[0].amounts).toStrictEqual('object')
    expect(history[0].amounts.length).toStrictEqual(1)
    expect(history[0].amounts[0]).toStrictEqual('100.00000000@GOLD')
  })

  it('should listBurnHistory after utxostoaccount burn', async () => {
    await container.call('utxostoaccount', [{ [burnAddress]: '1@0' }])
    await container.generate(1)

    const history = await client.account.listBurnHistory()
    expect(history.length).toStrictEqual(4)
    expect(history[0].owner).toStrictEqual(burnAddress)
    expect(history[0].type).toStrictEqual('UtxosToAccount')
    expect(typeof history[0].amounts).toStrictEqual('object')
    expect(history[0].amounts.length).toStrictEqual(1)
    expect(history[0].amounts[0]).toStrictEqual('1.00000000@DFI')
  })

  it('should listBurnHistory after send to burn address with accountToAccount', async () => {
    await accountToAccount('0', 1, fundedAddress, burnAddress)
    await container.generate(1)

    const history = await client.account.listBurnHistory()
    expect(history.length).toStrictEqual(5)
    expect(history[0].owner).toStrictEqual(burnAddress)
    expect(history[0].type).toStrictEqual('AccountToAccount')
    expect(typeof history[0].amounts).toStrictEqual('object')
    expect(history[0].amounts.length).toStrictEqual(1)
    expect(history[0].amounts[0]).toStrictEqual('1.00000000@DFI')
  })

  it('should listBurnHistory after send to burn address with accounttoutxos', async () => {
    const payload: BalanceTransferPayload = {}
    payload[burnAddress] = '2@0'
    await client.account.accountToUtxos(fundedAddress, payload)
    await container.generate(1)

    const history = await client.account.listBurnHistory()
    expect(history.length).toStrictEqual(6)
    expect(history[0].owner).toStrictEqual(burnAddress)
    expect(history[0].type).toStrictEqual('None')
    expect(typeof history[0].amounts).toStrictEqual('object')
    expect(history[0].amounts.length).toStrictEqual(1)
    expect(history[0].amounts[0]).toStrictEqual('2.00000000@DFI')
  })

  it('should listBurnHistory after send utxo to burn address', async () => {
    await client.wallet.sendToAddress(burnAddress, 10)
    await container.generate(1)

    const history = await client.account.listBurnHistory()
    expect(history.length).toStrictEqual(7)
    expect(history[0].owner).toStrictEqual(burnAddress)
    expect(history[0].type).toStrictEqual('None')
    expect(typeof history[0].amounts).toStrictEqual('object')
    expect(history[0].amounts.length).toStrictEqual(1)
    expect(history[0].amounts[0]).toStrictEqual('10.00000000@DFI')
  })

  it('should listBurnHistory with filter on txtype None', async () => {
    const history = await client.account.listBurnHistory({
      txtype: DfTxType.NONE
    })
    expect(history.length).toStrictEqual(2)
    expect(history.every(({ type }) => type === 'None')).toBeTruthy()
  })

  it('should listBurnHistory with filter on txtype UtxosToAccount', async () => {
    const history = await client.account.listBurnHistory({
      txtype: DfTxType.UTXOS_TO_ACCOUNT
    })
    expect(history.length).toStrictEqual(1)
    expect(history.every(({ type }) => type === 'UtxosToAccount')).toBeTruthy()
  })

  it('should listBurnHistory with filter on txtype AccountToAccount', async () => {
    const history = await client.account.listBurnHistory({
      txtype: DfTxType.ACCOUNT_TO_ACCOUNT
    })
    expect(history.length).toStrictEqual(2)
    expect(history.every(({ type }) => type === 'AccountToAccount')).toBeTruthy()
  })

  it('should listBurnHistory with filter on txtype CreateMasternode', async () => {
    const history = await client.account.listBurnHistory({
      txtype: DfTxType.CREATE_MASTERNODE
    })
    expect(history.length).toStrictEqual(1)
    expect(history.every(({ type }) => type === 'CreateMasternode')).toBeTruthy()
  })

  it('should listBurnHistory with filter on txtype CreateToken', async () => {
    const history = await client.account.listBurnHistory({
      txtype: DfTxType.CREATE_TOKEN
    })
    expect(history.length).toStrictEqual(1)
    expect(history.every(({ type }) => type === 'CreateToken')).toBeTruthy()
  })

  it('should listBurnHistory with filter on token DFI', async () => {
    const history = await client.account.listBurnHistory({
      token: 'DFI'
    })
    expect(history.length).toStrictEqual(6)
    expect(history.every(({ amounts }) => amounts[0].includes('DFI'))).toBeTruthy()
  })

  it('should listBurnHistory with filter on token GOLD', async () => {
    const history = await client.account.listBurnHistory({
      token: 'GOLD'
    })
    expect(history.length).toStrictEqual(1)
    expect(history.every(({ amounts }) => amounts[0].includes('GOLD'))).toBeTruthy()
  })
})
