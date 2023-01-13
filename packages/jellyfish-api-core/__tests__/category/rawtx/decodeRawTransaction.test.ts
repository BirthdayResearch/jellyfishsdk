import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'

describe('decode raw transaction', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should decode a witness transaction', async () => {
    const encrawtx = '010000000001010000000000000072c1a6a246ae63f74f931e8365e15a089c68d61900000000000000000000ffffffff0100e1f50500000000000102616100000000'
    const decrawtx = await client.rawtx.decodeRawTransaction(encrawtx, true)

    expect(decrawtx).toStrictEqual({
      txid: 'd006b4ece5d4adbd6f46b3a6f65f4a230caf6c44d8510e4340d0f26b7ceeb44a',
      hash: '23f0c1f68f0a43bb434494933a5a0f6f9636261f33b036b7700d96e264aceeda',
      version: 1,
      size: 66,
      vsize: 62,
      weight: 246,
      locktime: 0,
      vin: [
        {
          txid: '000000000019d6689c085ae165831e934ff763ae46a2a6c17200000000000000',
          vout: 0,
          scriptSig:
            {
              asm: '',
              hex: ''
            },
          txinwitness: ['6161'],
          sequence: 4294967295
        }
      ],
      vout: [
        {
          value: 1,
          n: 0,
          scriptPubKey:
            {
              asm: '',
              hex: '',
              type: 'nonstandard'
            }
        }
      ]
    })
  })

  it('should throw an error when for decode as non-witness a witness transaction', async () => {
    const encrawtx = '010000000001010000000000000072c1a6a246ae63f74f931e8365e15a089c68d61900000000000000000000ffffffff0100e1f50500000000000102616100000000'
    await expect(client.rawtx.decodeRawTransaction(encrawtx, false)).rejects.toThrow(RpcApiError)
  })

  it('should decode a non-witness transaction', async () => {
    const encrawtx = '01000000010000000000000072c1a6a246ae63f74f931e8365e15a089c68d61900000000000000000000ffffffff0100e1f505000000000000000000'
    const decrawtx = await client.rawtx.decodeRawTransaction(encrawtx, true)

    expect(decrawtx).toStrictEqual({
      txid: 'd006b4ece5d4adbd6f46b3a6f65f4a230caf6c44d8510e4340d0f26b7ceeb44a',
      hash: 'd006b4ece5d4adbd6f46b3a6f65f4a230caf6c44d8510e4340d0f26b7ceeb44a',
      version: 1,
      size: 60,
      vsize: 60,
      weight: 240,
      locktime: 0,
      vin: [
        {
          txid: '000000000019d6689c085ae165831e934ff763ae46a2a6c17200000000000000',
          vout: 0,
          scriptSig:
            {
              asm: '',
              hex: ''
            },
          sequence: 4294967295
        }
      ],
      vout: [
        {
          value: 1,
          n: 0,
          scriptPubKey:
            {
              asm: '',
              hex: '',
              type: 'nonstandard'
            }
        }
      ]
    })
  })
})
