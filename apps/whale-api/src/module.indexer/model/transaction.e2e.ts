import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BlockMapper } from '../../module.model/block'
import { TransactionMapper } from '../../module.model/transaction'
import { TransactionVinMapper } from '../../module.model/transaction.vin'
import { TransactionVoutMapper } from '../../module.model/transaction.vout'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../e2e.module'
import { Testing } from '@defichain/jellyfish-testing'
import { TransferDomainType } from '@defichain/jellyfish-api-core/dist/category/account'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(21)

  app = await createTestingApp(container)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

/* eslint-disable @typescript-eslint/no-non-null-assertion */

async function expectTransactions (hash: string, count: number): Promise<void> {
  const transactionMapper = app.get(TransactionMapper)
  const vinMapper = app.get(TransactionVinMapper)
  const voutMapper = app.get(TransactionVoutMapper)
  const transactions = await transactionMapper.queryByBlockHash(hash, 100)

  expect(transactions.length).toStrictEqual(count)

  for (const transaction of transactions) {
    expect(transaction.block.hash).toStrictEqual(hash)

    for (const vin of await vinMapper.query(transaction.txid, 100)) {
      expect(vin.txid).toStrictEqual(transaction.txid)
    }

    for (const vout of await voutMapper.query(transaction.txid, 100)) {
      expect(vout.txid).toStrictEqual(transaction.txid)
      expect(vout.n).toBeGreaterThanOrEqual(0)
      expect(vout.script.hex).toBeDefined()
      expect(Number.parseFloat(vout.value)).toBeGreaterThanOrEqual(0)
    }
  }
}

it('should wait for block 0', async () => {
  await waitForIndexedHeight(app, 0)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(0)

  await expectTransactions(block!.hash, block!.transactionCount)
})

it('should wait for block 5', async () => {
  await waitForIndexedHeight(app, 5)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(5)

  await expectTransactions(block!.hash, block!.transactionCount)
})

it('should wait for block 20', async () => {
  await waitForIndexedHeight(app, 20)

  const blockMapper = app.get(BlockMapper)
  const block = await blockMapper.getByHeight(20)

  await expectTransactions(block!.hash, block!.transactionCount)
})

describe('EVM txn indexing', () => {
  const testing = Testing.create(container)
  let dfiAddress: string, ethAddress: string, toEthAddress: string
  const amount = {
    ONE: 1,
    HUNDRED: 100
  }

  beforeAll(async () => {
    await container.generate(100)
    await waitForIndexedHeight(app, 100)
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        // Enable evm
        'v0/params/feature/evm': 'true',
        'v0/params/feature/transferdomain': 'true',
        'v0/transferdomain/dvm-evm/enabled': 'true',
        'v0/transferdomain/evm-dvm/enabled': 'true',
        'v0/transferdomain/dvm-evm/dat-enabled': 'true',
        'v0/transferdomain/evm-dvm/dat-enabled': 'true',
        'v0/transferdomain/dvm-evm/src-formats': ['p2pkh', 'bech32'],
        'v0/transferdomain/dvm-evm/dest-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/src-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/auth-formats': ['bech32-erc55'],
        'v0/transferdomain/evm-dvm/dest-formats': ['p2pkh', 'bech32']
      }
    })
    await container.generate(2)
    dfiAddress = await container.call('getnewaddress', ['', 'legacy'])
    await container.call('utxostoaccount', [{ [dfiAddress]: '105@DFI' }])
    await container.generate(1)
    ethAddress = await container.call('getnewaddress', ['', 'erc55'])
    toEthAddress = await container.call('getnewaddress', ['', 'erc55'])
  })

  it('should index evm txn', async () => {
    const dvmToEvmTransfer = [
      {
        src: {
          address: dfiAddress,
          amount: `${amount.HUNDRED}@DFI`,
          domain: TransferDomainType.DVM
        },
        dst: {
          address: ethAddress,
          amount: `${amount.HUNDRED}@DFI`,
          domain: TransferDomainType.EVM
        }
      }
    ]
    await container.call('transferdomain', [dvmToEvmTransfer])
    await container.generate(1)

    const tx4 = await createEVMTx({ testing, from: ethAddress, to: toEthAddress, value: amount.ONE, nonce: 4 })
    const tx0 = await createEVMTx({ testing, from: ethAddress, to: toEthAddress, value: amount.ONE, nonce: 0 })
    const tx2 = await createEVMTx({ testing, from: ethAddress, to: toEthAddress, value: amount.ONE, nonce: 2 })
    const tx1 = await createEVMTx({ testing, from: ethAddress, to: toEthAddress, value: amount.ONE, nonce: 1 })
    const tx3 = await createEVMTx({ testing, from: ethAddress, to: toEthAddress, value: amount.ONE, nonce: 3 })

    await container.generate(1)
    const blockHash: string = await testing.rpc.blockchain.getBestBlockHash()
    const blockDetails = await testing.rpc.blockchain.getBlock(blockHash, 1)

    // validate sorted txn list
    expect(blockDetails.tx[1]).toStrictEqual(tx0)
    expect(blockDetails.tx[2]).toStrictEqual(tx1)
    expect(blockDetails.tx[3]).toStrictEqual(tx2)
    expect(blockDetails.tx[4]).toStrictEqual(tx3)
    expect(blockDetails.tx[5]).toStrictEqual(tx4)

    await container.generate(1)
    await waitForIndexedHeight(app, blockDetails.height)

    const transactionMapper = app.get(TransactionMapper)
    const blockMapper = app.get(BlockMapper)
    const block = await blockMapper.getByHeight(blockDetails.height)
    await expectTransactions(block!.hash, block!.transactionCount)
    const transactions = await transactionMapper.queryByBlockHash(block!.hash, 100)

    // validate mapped txn list
    expect(transactions[1].id).toStrictEqual(tx0)
    expect(transactions[2].id).toStrictEqual(tx1)
    expect(transactions[3].id).toStrictEqual(tx2)
    expect(transactions[4].id).toStrictEqual(tx3)
    expect(transactions[5].id).toStrictEqual(tx4)

    // Wait for next block to get indexed
    await container.generate(1)
    const newBlockHash: string = await testing.rpc.blockchain.getBestBlockHash()
    const newBlockDetails = await testing.rpc.blockchain.getBlock(newBlockHash, 1)
    await container.generate(1)
    await waitForIndexedHeight(app, newBlockDetails.height)
  })
})

async function createEVMTx ({ testing, from, to, value, nonce }: {
  testing: Testing
  from: string
  to: string
  value: number
  nonce: number
}): Promise<string> {
  return await testing.rpc.evm.evmtx({
    from,
    to,
    nonce,
    gasPrice: 21,
    gasLimit: 21000,
    value: new BigNumber(value)
  })
}
