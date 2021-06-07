import { AddressController } from '@src/module.api/address.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForAddressTxCount, waitForIndexedHeight } from '@src/e2e.module'
import { createSignedTxnHex, createToken, mintTokens, sendTokensToAddress } from '@defichain/testing'
import { WIF } from '@defichain/jellyfish-crypto'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: AddressController

describe('getBalance', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)

    app = await createTestingApp(container)
    controller = app.get(AddressController)

    await waitForIndexedHeight(app, 100)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('getBalance should be zero', async () => {
    const address = await container.getNewAddress()
    const balance = await controller.getBalance('regtest', address)
    expect(balance).toStrictEqual('0.00000000')
  })

  it('should getBalance non zero with bech32 address', async () => {
    const address = 'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r'

    await container.fundAddress(address, 1.23)
    await waitForAddressTxCount(app, address, 1)

    const balance = await controller.getBalance('regtest', address)
    expect(balance).toStrictEqual('1.23000000')
  })

  it('should getBalance non zero with legacy address', async () => {
    const address = await container.getNewAddress('', 'legacy')

    await container.fundAddress(address, 0.00100000)
    await waitForAddressTxCount(app, address, 1)

    const balance = await controller.getBalance('regtest', address)
    expect(balance).toStrictEqual('0.00100000')
  })

  it('should getBalance non zero with p2sh-segwit address', async () => {
    const address = await container.getNewAddress('', 'p2sh-segwit')

    await container.fundAddress(address, 10.99999999)
    await waitForAddressTxCount(app, address, 1)

    const balance = await controller.getBalance('regtest', address)
    expect(balance).toStrictEqual('10.99999999')
  })

  it('should throw error if getBalance with invalid address', async () => {
    await expect(controller.getBalance('regtest', 'invalid')).rejects.toThrow('InvalidDefiAddress')
  })

  it('should sum getBalance', async () => {
    const address = 'bcrt1qeq2g82kj99mqfvnwc2g5w0azzd298q0t84tc6s'

    await container.fundAddress(address, 0.12340001)
    await container.fundAddress(address, 4.32412313)
    await container.fundAddress(address, 12.93719381)
    await waitForAddressTxCount(app, address, 3)

    const balance = await controller.getBalance('regtest', address)
    expect(balance).toStrictEqual('17.38471695')
  })
})

describe('getAggregation', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)

    app = await createTestingApp(container)
    controller = app.get(AddressController)

    await waitForIndexedHeight(app, 100)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should aggregate 3 txn', async () => {
    const address = 'bcrt1qxvvp3tz5u8t90nwwjzsalha66zk9em95tgn3fk'

    await container.fundAddress(address, 0.12340001)
    await container.fundAddress(address, 4.32412313)
    await container.fundAddress(address, 12.93719381)
    await waitForAddressTxCount(app, address, 3)

    const agg = await controller.getAggregation('regtest', address)
    expect(agg).toStrictEqual({
      amount: {
        txIn: '17.38471695',
        txOut: '0.00000000',
        unspent: '17.38471695'
      },
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number)
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

  it('should throw error if getAggregation with invalid address', async () => {
    await expect(controller.getAggregation('regtest', 'invalid')).rejects.toThrow('InvalidDefiAddress')
  })
})

describe('listTransactions', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)

    app = await createTestingApp(container)
    controller = app.get(AddressController)

    await waitForIndexedHeight(app, 100)

    await container.waitForWalletBalanceGTE(100)
    await container.fundAddress(addressA.bech32, 34)
    await container.fundAddress(addressA.bech32, 0.12340001)
    await container.fundAddress(addressA.bech32, 1.32412313)
    await container.fundAddress(addressA.bech32, 2.93719381)

    await container.call('sendrawtransaction', [
      // This create vin & vout with 9.5
      await createSignedTxnHex(container, 9.5, 9.4999, options)
    ])
    await container.call('sendrawtransaction', [
      // This create vin & vout with 1.123
      await createSignedTxnHex(container, 1.123, 1.1228, options)
    ])
    await container.generate(1)
    await waitForAddressTxCount(app, addressB.bech32, 2)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

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

  it('(addressA) should listTransactions', async () => {
    const response = await controller.listTransactions('regtest', addressA.bech32, {
      size: 30
    })

    expect(response.data.length).toStrictEqual(8)
    expect(response.page).toBeUndefined()

    expect(response.data[5]).toStrictEqual({
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number)
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
      value: '1.32412313',
      vout: {
        n: expect.any(Number),
        txid: expect.stringMatching(/[0-f]{64}/)
      }
    })
  })

  it('(addressA) should listTransactions with pagination', async () => {
    const first = await controller.listTransactions('regtest', addressA.bech32, {
      size: 2
    })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toMatch(/[0-f]{82}/)
    expect(first.data[0].value).toStrictEqual('1.12300000')
    expect(first.data[0].type).toStrictEqual('vin')
    expect(first.data[1].value).toStrictEqual('1.12300000')
    expect(first.data[1].type).toStrictEqual('vout')

    const next = await controller.listTransactions('regtest', addressA.bech32, {
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(6)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].value).toStrictEqual('9.50000000')
    expect(next.data[0].type).toStrictEqual('vin')
    expect(next.data[1].value).toStrictEqual('9.50000000')
    expect(next.data[1].type).toStrictEqual('vout')
    expect(next.data[2].value).toStrictEqual('2.93719381')
    expect(next.data[2].type).toStrictEqual('vout')
    expect(next.data[3].value).toStrictEqual('1.32412313')
    expect(next.data[3].type).toStrictEqual('vout')
    expect(next.data[4].value).toStrictEqual('0.12340001')
    expect(next.data[4].type).toStrictEqual('vout')
    expect(next.data[5].value).toStrictEqual('34.00000000')
    expect(next.data[5].type).toStrictEqual('vout')
  })

  it('should throw error if listTransactions with invalid address', async () => {
    await expect(controller.listTransactions('regtest', 'invalid', { size: 30 }))
      .rejects.toThrow('InvalidDefiAddress')
  })

  it('(addressB) should listTransactions', async () => {
    const response = await controller.listTransactions('regtest', addressB.bech32, {
      size: 30
    })

    expect(response.data.length).toStrictEqual(2)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toStrictEqual({
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number)
      },
      hid: expect.stringMatching(/[0-f]{64}/),
      id: expect.stringMatching(/[0-f]{72}/),
      script: {
        hex: '00144ab4391ce5a732e36139e72d79a28e01b7b08034',
        type: 'witness_v0_keyhash'
      },
      tokenId: 0,
      txid: expect.stringMatching(/[0-f]{64}/),
      type: 'vout',
      typeHex: '01',
      value: '9.49990000',
      vout: {
        n: 0,
        txid: expect.stringMatching(/[0-f]{64}/)
      }
    })
  })

  it('(addressA) should listTransactions with undefined next pagination', async () => {
    const first = await controller.listTransactions('regtest', addressA.bech32, {
      size: 2,
      next: undefined
    })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toMatch(/[0-f]{82}/)
  })
})

describe('listTransactionsUnspent', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)

    app = await createTestingApp(container)
    controller = app.get(AddressController)

    await waitForIndexedHeight(app, 100)

    await container.waitForWalletBalanceGTE(100)
    await container.fundAddress(addressA.bech32, 34)
    await container.fundAddress(addressA.bech32, 0.12340001)
    await container.fundAddress(addressA.bech32, 1.32412313)
    await container.fundAddress(addressA.bech32, 2.93719381)

    await container.call('sendrawtransaction', [
      // This create vin & vout with 9.5
      await createSignedTxnHex(container, 9.5, 9.4999, options)
    ])
    await container.call('sendrawtransaction', [
      // This create vin & vout with 1.123
      await createSignedTxnHex(container, 1.123, 1.1228, options)
    ])
    await container.generate(1)
    await waitForAddressTxCount(app, addressB.bech32, 2)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

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

  it('(addressA) should listTransactionsUnspent', async () => {
    const response = await controller.listTransactionsUnspent('regtest', addressA.bech32, {
      size: 30
    })

    expect(response.data.length).toStrictEqual(4)
    expect(response.page).toBeUndefined()

    expect(response.data[3]).toStrictEqual({
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number)
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
        value: '2.93719381'
      }
    })
  })

  it('(addressA) should listTransactionsUnspent with pagination', async () => {
    const first = await controller.listTransactionsUnspent('regtest', addressA.bech32, {
      size: 2
    })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toMatch(/[0-f]{72}/)
    expect(first.data[0].vout.value).toStrictEqual('34.00000000')
    expect(first.data[1].vout.value).toStrictEqual('0.12340001')

    const next = await controller.listTransactionsUnspent('regtest', addressA.bech32, {
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].vout.value).toStrictEqual('1.32412313')
    expect(next.data[1].vout.value).toStrictEqual('2.93719381')
  })
  it('(addressB) should listTransactionsUnspent', async () => {
    const response = await controller.listTransactionsUnspent('regtest', addressB.bech32, {
      size: 30
    })

    expect(response.data.length).toStrictEqual(2)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toStrictEqual({
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number)
      },
      hid: expect.stringMatching(/[0-f]{64}/),
      id: expect.stringMatching(/[0-f]{72}/),
      script: {
        hex: '00144ab4391ce5a732e36139e72d79a28e01b7b08034',
        type: 'witness_v0_keyhash'
      },
      sort: expect.stringMatching(/[0-f]{80}/),
      vout: {
        n: expect.any(Number),
        tokenId: 0,
        txid: expect.stringMatching(/[0-f]{64}/),
        value: '1.12280000'
      }
    })
  })

  it('should listTransactionsUnspent with undefined next pagination', async () => {
    const first = await controller.listTransactionsUnspent('regtest', addressA.bech32, {
      size: 2,
      next: undefined
    })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toMatch(/[0-f]{72}/)
  })
})

describe('listTokens', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)

    app = await createTestingApp(container)
    controller = app.get(AddressController)

    await waitForIndexedHeight(app, 100)

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token, { mintAmount: 1000 })
      await sendTokensToAddress(container, address, 10, token)
    }
    await container.generate(1)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  const address = 'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r'
  const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

  it('should listTokens', async () => {
    const response = await controller.listTokens(address, {
      size: 30
    })

    expect(response.data.length).toStrictEqual(6)
    expect(response.page).toBeUndefined()

    expect(response.data[5]).toStrictEqual({
      id: '6',
      amount: '10.00000000',
      symbol: 'F',
      symbolKey: 'F',
      name: 'F',
      isDAT: true,
      isLPS: false
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await controller.listTokens(address, {
      size: 2
    })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('2')
    expect(first.data[0].symbol).toStrictEqual('A')
    expect(first.data[1].symbol).toStrictEqual('B')

    const next = await controller.listTokens(address, {
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(4)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toStrictEqual('C')
    expect(next.data[1].symbol).toStrictEqual('D')
    expect(next.data[2].symbol).toStrictEqual('E')
    expect(next.data[3].symbol).toStrictEqual('F')
  })

  it('should listTokens with undefined next pagination', async () => {
    const first = await controller.listTokens(address, {
      size: 2,
      next: undefined
    })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('2')
  })

  it('should throw error while listTokens with invalid address', async () => {
    await expect(controller.listTokens('invalid', { size: 30 }))
      .rejects.toThrow(RpcApiError)

    await expect(controller.listTokens('invalid', { size: 30 }))
      .rejects.toThrow('recipient (invalid) does not refer to any valid address')
  })
})
