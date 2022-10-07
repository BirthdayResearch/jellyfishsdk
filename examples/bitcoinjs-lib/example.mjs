import { ECPairFactory } from 'ecpair'
import { getNetworkBitcoinJsLib } from '@defichain/jellyfish-network'
import * as ecc from 'tiny-secp256k1'
import * as bitcoin from 'bitcoinjs-lib'
import assert from 'assert'

const ECPair = ECPairFactory(ecc)
const TestNet = getNetworkBitcoinJsLib('testnet')

const buffer = Buffer.from('ff00000000000000000000000000000000000000000000000000000000000000', 'hex')

// Otherwise generate it via ECPair.makeRandom({network: TestNet})
const keyPair = ECPair.fromPrivateKey(buffer, {
  network: TestNet
})

// Get the P2WPKH Address
const {
  address,
  output
} = bitcoin.payments.p2wpkh({
  pubkey: keyPair.publicKey,
  network: TestNet
})
console.log(address)
assert(address === 'tf1q28dlprp2yud2dpkjtuzyedygw7thq7fpa3dz2j')

// PSBT 1 VIN to 1 VOUT - ITSELF
const psbt = new bitcoin.Psbt({ network: TestNet })
  // From 10 DFI
  .addInput({
    // Vin TxId
    hash: '0176a5e01d5a772c47b497acb9cb88c1a2725cf1782e90625e0cdf06a9f56e5c',
    // Vin: Vout Index
    index: 0,
    // From Redeem Script
    witnessUtxo: {
      value: 1000000000,
      script: output
    }
  })
  // To 9.99999000 DFI
  .addOutput({
    script: output,
    value: 999999000, // In Satoshi
  })
  .signInput(0, keyPair)

psbt.finalizeAllInputs()
const txn = psbt.extractTransaction().toHex()

console.log(txn)
assert(txn === '020000000001015c6ef5a906df0c5e62902e78f15c72a2c188cbb9ac97b4472c775a1de0a576010000000000ffffffff0118c69a3b0000000016001451dbf08c2a271aa686d25f044cb488779770792102483045022100fec0518f1b33156785264142944afe187b6cc3caf3dcf838f648e2251b956b8702204b3e38f77133bd5f52ddf2f00f1e490de47e6b7c76199f7580fa022e6170d43001210285c9bd8ad859cdb136a95fc386b552fb9fce855d6cdddad6aa62f800390e1b1500000000')
// This was broadcasted as a3ce73bf5b0820cf94f57e19b4f57d450532610d8d83ab1b2e6af503cbe86595

// https://defiscan.live/transactions/a3ce73bf5b0820cf94f57e19b4f57d450532610d8d83ab1b2e6af503cbe86595?network=TestNet