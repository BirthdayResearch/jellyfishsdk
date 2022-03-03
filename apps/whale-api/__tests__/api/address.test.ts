import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { createSignedTxnHex, createToken, mintTokens, utxosToAccount } from '@defichain/testing'
import { WIF } from '@defichain/jellyfish-crypto'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

let address: string
const tokens = ['A', 'B', 'C', 'D']

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  address = await container.getNewAddress('', 'bech32')
  await container.waitForWalletBalanceGTE(20)

  await utxosToAccount(container, 15.5, { address: address })
  await container.generate(1)

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(101)
    await createToken(container, token)
    await mintTokens(container, token, { mintAmount: 1000 })
    await container.call('sendtokenstoaddress', [{}, { [address]: [`10@${token}`] }])
  }

  await container.generate(1)

  // setup a loan token
  const testing = Testing.create(container)
  const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), [
    { token: 'DFI', currency: 'USD' },
    { token: 'LOAN', currency: 'USD' }
  ], { weightage: 1 })
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [
      { tokenAmount: '2@DFI', currency: 'USD' },
      { tokenAmount: '2@LOAN', currency: 'USD' }
    ]
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.rpc.loan.setLoanToken({
    symbol: 'LOAN',
    name: 'LOAN',
    fixedIntervalPriceId: 'LOAN/USD',
    mintable: true,
    interest: new BigNumber(0.02)
  })
  await testing.generate(1)

  await testing.token.dfi({
    address: await testing.address('DFI'),
    amount: 100
  })

  await testing.rpc.loan.createLoanScheme({
    id: 'scheme',
    minColRatio: 110,
    interestRate: new BigNumber(1)
  })
  await testing.generate(1)

  const vaultId = await testing.rpc.loan.createVault({
    ownerAddress: await testing.address('VAULT'),
    loanSchemeId: 'scheme'
  })
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [
      { tokenAmount: '2@DFI', currency: 'USD' },
      { tokenAmount: '2@LOAN', currency: 'USD' }
    ]
  })
  await testing.generate(1)

  await testing.rpc.loan.depositToVault({
    vaultId: vaultId,
    from: await testing.address('DFI'),
    amount: '100@DFI'
  })
  await testing.generate(1)
  await testing.rpc.loan.takeLoan({
    vaultId: vaultId,
    amounts: '10@LOAN',
    to: address
  })
  await testing.generate(1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('getBalance', () => {
  beforeAll(async () => {
    await container.waitForWalletBalanceGTE(100)
  })

  it('should getBalance zero for bech32', async () => {
    const address = await container.getNewAddress()
    const balance = await client.address.getBalance(address)
    expect(balance).toStrictEqual('0.00000000')
  })

  it('should getBalance for bech32', async () => {
    const address = 'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r'

    await container.fundAddress(address, 1.23)
    await service.waitForAddressTxCount(address, 1)

    const balance = await client.address.getBalance(address)
    expect(balance).toStrictEqual('1.23000000')
  })

  it('should getBalance for legacy', async () => {
    const address = await container.getNewAddress('', 'legacy')

    await container.fundAddress(address, 1.92822343)
    await service.waitForAddressTxCount(address, 1)

    const balance = await client.address.getBalance(address)
    expect(balance).toStrictEqual('1.92822343')
  })

  it('should getBalance for p2sh', async () => {
    const address = await container.getNewAddress('', 'p2sh-segwit')

    await container.fundAddress(address, 1.23419341)
    await service.waitForAddressTxCount(address, 1)

    const balance = await client.address.getBalance(address)
    expect(balance).toStrictEqual('1.23419341')
  })
})

it('should getAggregation', async () => {
  const address = 'bcrt1qxvvp3tz5u8t90nwwjzsalha66zk9em95tgn3fk'

  await container.waitForWalletBalanceGTE(30)
  await container.fundAddress(address, 0.12340002)
  await container.fundAddress(address, 4.32412313)
  await container.fundAddress(address, 19.93719381)
  await service.waitForAddressTxCount(address, 3)

  const agg = await client.address.getAggregation(address)
  expect(agg).toStrictEqual({
    amount: {
      txIn: '24.38471696',
      txOut: '0.00000000',
      unspent: '24.38471696'
    },
    block: {
      hash: expect.stringMatching(/[0-f]{64}/),
      height: expect.any(Number),
      time: expect.any(Number),
      medianTime: expect.any(Number)
    },
    hid: expect.stringMatching(/[0-f]{64}/),
    id: expect.stringMatching(/[0-f]{72}/),
    script: {
      hex: '0014331818ac54e1d657cdce90a1dfdfbad0ac5cecb4',
      type: 'witness_v0_keyhash'
    },
    statistic: {
      txCount: 3,
      txInCount: 3,
      txOutCount: 0
    }
  })
})

describe('tokens', () => {
  it('should listToken', async () => {
    const response = await client.address.listToken(address)
    expect(response.length).toStrictEqual(6)
    expect(response.hasNext).toStrictEqual(false)

    expect(response[0]).toStrictEqual(expect.objectContaining({ id: '0', amount: '15.50000000', symbol: 'DFI', isLoanToken: false }))
    expect(response[4]).toStrictEqual(expect.objectContaining({ id: '4', amount: '10.00000000', symbol: 'D', isLoanToken: false }))
    expect(response[5]).toStrictEqual(expect.objectContaining({ id: '5', amount: '10.00000000', symbol: 'LOAN', isLoanToken: true }))
  })

  it('should paginate listToken', async () => {
    const first = await client.address.listToken(address, 2)
    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('1')

    expect(first[0]).toStrictEqual(expect.objectContaining({ id: '0', amount: '15.50000000', symbol: 'DFI' }))
    expect(first[1]).toStrictEqual(expect.objectContaining({ id: '1', amount: '10.00000000', symbol: 'A' }))

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(2)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('3')

    expect(next[0]).toStrictEqual(expect.objectContaining({ id: '2', amount: '10.00000000', symbol: 'B' }))
    expect(next[1]).toStrictEqual(expect.objectContaining({ id: '3', amount: '10.00000000', symbol: 'C' }))

    const last = await client.paginate(next)
    expect(last.length).toStrictEqual(2)
    expect(last.hasNext).toStrictEqual(true)
    expect(last.nextToken).toStrictEqual('5')

    expect(last[0]).toStrictEqual(expect.objectContaining({ id: '4', amount: '10.00000000', symbol: 'D', isLoanToken: false }))
    expect(last[1]).toStrictEqual(expect.objectContaining({ id: '5', amount: '10.00000000', symbol: 'LOAN', isLoanToken: true }))

    const emptyLast = await client.paginate(last)
    expect(emptyLast.length).toStrictEqual(0)
    expect(emptyLast.hasNext).toStrictEqual(false)
  })
})

describe('transactions', () => {
  const addressA = {
    bech32: 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn',
    privKey: 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
  }
  const addressB = {
    bech32: 'bcrt1qf26rj8895uewxcfeuukhng5wqxmmpqp555z5a7',
    privKey: 'cQbfHFbdJNhg3UGaBczir2m5D4hiFRVRKgoU8GJoxmu2gEhzqHtV'
  }
  const options = {
    aEllipticPair: WIF.asEllipticPair(addressA.privKey),
    bEllipticPair: WIF.asEllipticPair(addressB.privKey)
  }

  beforeAll(async () => {
    await container.waitForWalletBalanceGTE(100)
    await container.fundAddress(addressA.bech32, 34)
    await container.fundAddress(addressB.bech32, 2.93719381)

    await container.call('sendrawtransaction', [
      // This create vin & vout with 9.5
      await createSignedTxnHex(container, 9.5, 9.4999, options)
    ])
    await container.generate(1)
    await service.waitForAddressTxCount(addressA.bech32, 3)
    await service.waitForAddressTxCount(addressB.bech32, 2)
  })

  it('should listTransaction', async () => {
    const transactions = await client.address.listTransaction(addressA.bech32)

    expect(transactions.length).toStrictEqual(3)
    expect(transactions.hasNext).toStrictEqual(false)

    expect(transactions[2]).toStrictEqual({
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        time: expect.any(Number),
        medianTime: expect.any(Number)
      },
      hid: expect.stringMatching(/[0-f]{64}/),
      id: expect.stringMatching(/[0-f]{72}/),
      script: {
        hex: '001425a544c073cbca4e88d59f95ccd52e584c7e6a82',
        type: 'witness_v0_keyhash'
      },
      tokenId: 0,
      txid: expect.stringMatching(/[0-f]{64}/),
      type: 'vout',
      typeHex: '01',
      value: '34.00000000',
      vout: {
        n: expect.any(Number),
        txid: expect.stringMatching(/[0-f]{64}/)
      }
    })
  })

  it('should paginate listTransaction', async () => {
    const first = await client.address.listTransaction(addressA.bech32, 2)
    expect(first.length).toStrictEqual(2)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toMatch(/[0-f]{80}/)

    expect(first[0]).toStrictEqual(expect.objectContaining({ value: '9.50000000', type: 'vin' }))
    expect(first[1]).toStrictEqual(expect.objectContaining({ value: '9.50000000', type: 'vout' }))

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(1)
    expect(next.hasNext).toStrictEqual(false)

    expect(next[0]).toStrictEqual(expect.objectContaining({ value: '34.00000000', type: 'vout' }))
  })

  it('should listTransactionUnspent', async () => {
    const unspent = await client.address.listTransactionUnspent(addressA.bech32)

    expect(unspent.length).toStrictEqual(1)
    expect(unspent.hasNext).toStrictEqual(false)

    expect(unspent[0]).toStrictEqual({
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        time: expect.any(Number),
        medianTime: expect.any(Number)
      },
      hid: expect.stringMatching(/[0-f]{64}/),
      id: expect.stringMatching(/[0-f]{72}/),
      script: {
        hex: '001425a544c073cbca4e88d59f95ccd52e584c7e6a82',
        type: 'witness_v0_keyhash'
      },
      sort: expect.stringMatching(/[0-f]{80}/),
      vout: {
        n: expect.any(Number),
        tokenId: 0,
        txid: expect.stringMatching(/[0-f]{64}/),
        value: '34.00000000'
      }
    })
  })

  it('should paginate listTransactionUnspent', async () => {
    const first = await client.address.listTransactionUnspent(addressB.bech32, 1)
    expect(first.length).toStrictEqual(1)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toMatch(/[0-f]{80}/)

    expect(first[0].vout.value).toStrictEqual('2.93719381')

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(1)
    expect(next.hasNext).toStrictEqual(true)

    expect(next[0].vout.value).toStrictEqual('9.49990000')

    const empty = await client.paginate(next)
    expect(empty.length).toStrictEqual(0)
  })
})
