import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import {
  OP_CODES,
  TransferDomain
} from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder

const testing = Testing.create(container)

let dvmAddr: string
let evmAddr: string

describe('transferDomain', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/evm': 'true'
      }
    })
    await testing.generate(1)

    dvmAddr = await container.getNewAddress()
    evmAddr = await testing.container.getNewAddress('eth', 'eth')
    providers = await getProviders(testing.container)

    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))

    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.token.dfi({ address: dvmAddr, amount: 300 })

    await testing.token.dfi({ address: await providers.getAddress(), amount: 300 })
    await testing.generate(1)

    // Fund 100 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 100)
    await providers.setupMocks()

    builder = new P2WPKHTransactionBuilder(
      providers.fee,
      providers.prevout,
      providers.elliptic,
      RegTest
    )
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  // it("should fail if transfer within same domain", async () => {
  //   const script = await providers.elliptic.script(); // TODO(Pierre): Check if this is the correct dvm address to use

  //   const transferDomain: TransferDomain = {
  //     items: [{
  //       src:
  //       {
  //         address: script,
  //         domain: 2, // <-- same domain
  //         amount: {
  //           token: 0,
  //           amount: new BigNumber(10),
  //         },
  //         data: [0]
  //       },
  //       dst: {
  //         address: script,
  //         domain: 2, // <-- same domain
  //         amount: {
  //           token: 0,
  //           amount: new BigNumber(10),
  //         },
  //         data: [0]
  //       },
  //     }]
  //   }

  //   const txn = await builder.account.transferDomain(transferDomain, script);

  //   const promise = sendTransaction(testing.container, txn)

  //   await expect(promise).rejects.toThrow(DeFiDRpcError)
  //   await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: Cannot transfer inside same domain (code 16)')
  // });

  // it("should fail if amount is different", async () => {
  //   const script = await providers.elliptic.script(); // TODO(Pierre): Check if this is the correct dvm address to use

  //   const transferDomain: TransferDomain = {
  //     items: [{
  //       src:
  //       {
  //         address: script,
  //         domain: 2,
  //         amount: {
  //           token: 0,
  //           amount: new BigNumber(1), // <-- not match
  //         },
  //         data: [0]
  //       },
  //       dst: {
  //         address: script,
  //         domain: 3,
  //         amount: {
  //           token: 0,
  //           amount: new BigNumber(2), // <-- not match
  //         },
  //         data: [0]
  //       },
  //     }]
  //   }

  //   const txn = await builder.account.transferDomain(transferDomain, script);
  //   const promise = sendTransaction(testing.container, txn)

  //   await expect(promise).rejects.toThrow(DeFiDRpcError)
  //   await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: Source amount must be equal to destination amount (code 16)')
  // });

  // it("should fail if transfer other than DFI token", async () => {
  //   const script = await providers.elliptic.script(); // TODO(Pierre): Check if this is the correct dvm address to use

  //   const transferDomain: TransferDomain = {
  //     items: [{
  //       src:
  //       {
  //         address: script,
  //         domain: 2,
  //         amount: {
  //           token: 1, // <- not DFI
  //           amount: new BigNumber(3),
  //         },
  //         data: [0]
  //       },
  //       dst: {
  //         address: script,
  //         domain: 3,
  //         amount: {
  //           token: 1, // <- not DFI
  //           amount: new BigNumber(3),
  //         },
  //         data: [0]
  //       },
  //     }]
  //   }

  //   const txn = await builder.account.transferDomain(transferDomain, script);
  //   const promise = sendTransaction(testing.container, txn)

  //   await expect(promise).rejects.toThrow(DeFiDRpcError)
  //   await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: For transferdomain, only DFI token is currently supported (code 16)')
  // });

  it('should transfer domain from DVM to EVM', async () => {
    const script = await providers.elliptic.script()
    // const script = P2WPKH.fromAddress(RegTest, dvmAddr, P2WPKH).getScript()
    const evmScript = {
      stack: [
        OP_CODES.OP_16,
        OP_CODES.OP_PUSHDATA_HEX_LE(evmAddr.substring(2, evmAddr.length - 1))
      ]
    }

    const transferDomain: TransferDomain = {
      items: [{
        src:
        {
          address: script,
          domain: 2, // TransferDomainType.DVM
          amount: {
            token: 0,
            amount: new BigNumber(3)
          },
          data: [0]
        },
        dst: {
          address: evmScript,
          domain: 3, // TransferDomainType.EVM
          amount: {
            token: 0,
            amount: new BigNumber(3)
          },
          data: [0]
        }
      }]
    }

    const txn = await builder.account.transferDomain(transferDomain, script)
    const outs = await sendTransaction(container, txn)
    console.log({ outs })
  })
})
