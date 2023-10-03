import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import BigNumber from 'bignumber.js'
import { Interface, ethers } from 'ethers'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import {
  Script,
  TransferDomain
  , CTransactionSegWit
} from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import TransferDomainV1 from '../../../../artifacts/contracts/TransferDomainV1.sol/TransferDomainV1.json'
import { SmartBuffer } from 'smart-buffer'
import { describeWithDefid, generate } from '../util'

const TD_CONTRACT_ADDR = '0xdf00000000000000000000000000000000000001'
const DST_20_CONTRACT_ADDR_BTC = '0xff00000000000000000000000000000000000001'

const TRANSFER_DOMAIN_TYPE = {
  DVM: 2,
  EVM: 3
}

let providers: MockProviders
let builder: P2WPKHTransactionBuilder

let wallet: ethers.Wallet
let tdFace: Interface

let dvmAddr: string
let evmAddr: string
let dvmScript: Script
let evmScript: Script

describeWithDefid('transferDomain', (context) => {
  it('(defid) transfer domain dToken from DVM to EVM', async () => {
    providers = await getProviders(context.client)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))

    dvmAddr = await providers.getAddress()
    evmAddr = await providers.getEvmAddress()
    dvmScript = await providers.elliptic.script()
    evmScript = await providers.elliptic.evmScript()
    console.log('dvmAddr: ', dvmAddr)
    console.log('evmAddr: ', evmAddr)
    console.log('dvmScript: ', dvmScript)
    console.log('evmScript: ', evmScript)

    await context.client.wallet.sendToAddress(dvmAddr, 100)
    await generate(context.client, 1)

    await context.client.account.utxosToAccount({
      [dvmAddr]: '100@0'
    })
    await generate(context.client, 1)

    await context.client.token.createToken({
      symbol: 'BTC',
      name: 'BTC',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: dvmAddr
    })
    await generate(context.client, 1)

    await context.client.token.mintTokens({
      amounts: ['100@BTC']
    })
    await generate(context.client, 1)

    builder = new P2WPKHTransactionBuilder(
      providers.fee,
      providers.prevout,
      providers.elliptic,
      RegTest
    )

    const evmPrivKey = await context.client.wallet.dumpPrivKey(evmAddr)
    wallet = new ethers.Wallet(evmPrivKey)
    tdFace = new ethers.Interface(TransferDomainV1.abi)

    let evmTx = new Uint8Array([])
    {
      // EvmIn
      const from = TD_CONTRACT_ADDR
      const to = evmAddr
      const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
      const native = dvmAddr
      const data = tdFace.encodeFunctionData('transferDST20', [DST_20_CONTRACT_ADDR_BTC, from, to, amount, native])
      const nonce = await context.ethersjs.getTransactionCount(evmAddr)
      console.log('data: ', data)

      const tx: ethers.TransactionRequest = {
        to: TD_CONTRACT_ADDR,
        nonce: nonce,
        data: data,
        chainId: (await context.ethersjs.getNetwork()).chainId,
        type: 0,
        value: 0,
        gasLimit: 0,
        gasPrice: 0 // base fee
      }

      const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`
      console.log('signed: ', signed)

      evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
    }

    const transferDomain: TransferDomain = {
      items: [{
        src:
        {
          address: dvmScript,
          domain: TRANSFER_DOMAIN_TYPE.DVM,
          amount: {
            token: 1, // <- BTC
            amount: new BigNumber(3)
          },
          data: new Uint8Array([])
        },
        dst: {
          address: evmScript,
          domain: TRANSFER_DOMAIN_TYPE.EVM,
          amount: {
            token: 1, // <- BTC
            amount: new BigNumber(3)
          },
          data: evmTx
        }
      }]
    }

    await context.client.wallet.sendToAddress(dvmAddr, 30)
    await generate(context.client, 1)

    const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
    const buffer = new SmartBuffer()
    new CTransactionSegWit(txn).toBuffer(buffer)
    const hex = buffer.toBuffer().toString('hex')
    console.log('hex: ', hex)

    // const txid = await context.client.call('sendrawtransaction', [hex], 'number')
    // console.log('txid: ', txid)

    // const rawtx = await context.client.call('getrawtransaction', [txid, true], 'number')
    // console.log('rawtx: ', rawtx)

    // await generate(context.client, 1)

    const mempool = await context.client.call('getrawmempool', [], 'number')
    console.log('mempool: ', mempool)
  })
})
