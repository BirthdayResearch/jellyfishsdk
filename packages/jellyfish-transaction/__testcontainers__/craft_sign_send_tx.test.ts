import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { CTransactionSegWit, DeFiTransactionConstants, Transaction, TransactionSigner } from '../src'
import { OP_CODES } from '../src/script'
import { decodeAsEllipticPair, HASH160 } from '@defichain/jellyfish-crypto'
import { SmartBuffer } from 'smart-buffer'

const container = new MasterNodeRegTestContainer()
let client: JsonRpcClient

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  client = new JsonRpcClient(await container.getCachedRpcUrl())
})

afterAll(async () => {
  await container.stop()
})

beforeEach(async () => {
  await container.waitForWalletBalanceGTE(100)
})

it('should craft, sign and broadcast a txn', async () => {
  // From Address P2WPKH
  const input = {
    bech32: 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn',
    privKey: 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
  }

  // To Address P2WPKH
  const output = {
    bech32: 'bcrt1qf26rj8895uewxcfeuukhng5wqxmmpqp555z5a7',
    privKey: 'cQbfHFbdJNhg3UGaBczir2m5D4hiFRVRKgoU8GJoxmu2gEhzqHtV'
  }

  const inputPair = decodeAsEllipticPair(input.privKey)
  const outputPair = decodeAsEllipticPair(output.privKey)

  // Fund an untracked address for 10.0 DFI for testing
  const { txid, vout } = await container.fundAddress(input.bech32, 10)

  // Create transaction to sign
  const transaction: Transaction = {
    version: DeFiTransactionConstants.Version,
    vin: [
      {
        index: vout,
        script: { stack: [] },
        sequence: 0xffffffff,
        // container.fundAddress returns in BE
        txid: Buffer.from(txid, 'hex').reverse().toString('hex')
      }
    ],
    vout: [
      {
        value: new BigNumber('9.999'), // 0.001 as fees
        script: {
          stack: [
            OP_CODES.OP_0,
            OP_CODES.OP_PUSHDATA(
              HASH160(await outputPair.publicKey()),
              'little'
            )
          ]
        },
        dct_id: 0x00
      }
    ],
    lockTime: 0x00000000
  }

  // Signing a transaction
  const signed = await TransactionSigner.sign(transaction, [{
    prevout: {
      value: new BigNumber(10),
      script: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA(
            HASH160(await inputPair.publicKey()),
            'little'
          )
        ]
      },
      dct_id: 0x00
    },
    ellipticPair: inputPair
  }])

  // Get it as a buffer and send to container
  const buffer = new SmartBuffer()
  new CTransactionSegWit(signed).toBuffer(buffer)
  await client.rawtx.sendRawTransaction(
    buffer.toBuffer().toString('hex')
  )

  // Import and track that address
  await container.generate(1)
  await container.call('importprivkey', [output.privKey])

  const unspent = await container.call('listunspent', [
    0, 9999999, [output.bech32]
  ])

  // Amount is exact to what I send
  expect(unspent[0].amount).toBe(9.999)
})
