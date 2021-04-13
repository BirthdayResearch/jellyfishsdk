import { SmartBuffer } from 'smart-buffer'
import { OP_PUSHDATA } from '../../src/script'

// TODO(fuxingloh): push in as big endian?

it('should construct as big endian', () => {
  const buff = Buffer.from('00ff', 'hex')
  const data = new OP_PUSHDATA(buff, 'big')

  expect(data.hex).toBe('ff00')
  expect(data.asBuffer().toString('hex')).toBe('02ff00')
})

it('should construct as little endian', () => {
  const buff = Buffer.from('00ff', 'hex')
  const data = new OP_PUSHDATA(buff, 'little')

  expect(data.hex).toBe('00ff')
  expect(data.asBuffer().toString('hex')).toBe('0200ff')
})

describe('OP_PUSHDATA construct from buffer', () => {
  function expectHexBuffer (hex: string, prefix: string): void {
    const buff = Buffer.from(hex, 'hex')
    const data = new OP_PUSHDATA(buff, 'little')

    expect(data.type).toBe('OP_PUSHDATA')
    expect(data.hex).toBe(hex)
    expect(data.asBuffer().toString('hex')).toBe(`${prefix}${hex}`)
  }

  it('1 len', () => {
    expectHexBuffer('ff', '01')
  })

  it('20 len', () => {
    expectHexBuffer('2c078959e9a9be33f03f8a23045749d38f455dd3', '14')
  })

  it('75 len', () => {
    expectHexBuffer('9bd2c7c15fa3681483a2f5475e9b4da246879b671d42bae4127e62d7dab034a65d390d6b8369bd2c7c15fa3681483a2f5475e9b4da246879b671d42bae4127e62d7dab034a65d390d6b836', '4b')
  })

  it('200 len', () => {
    expectHexBuffer('3550392c580a13d951a2befd92edf56796341a57fa75e76d092158500648098a0116067aa7b7e6b8452184e8ed58181e08868b87bce63c60cd52477b024e57c95f47a8582edefb05e99195e7cd652fc86ed342b4f061f0b4594f45f1be3cbe8bb4d821a23550392c580a13d951a2befd92edf56796341a57fa75e76d092158500648098a0116067aa7b7e6b8452184e8ed58181e08868b87bce63c60cd52477b024e57c95f47a8582edefb05e99195e7cd652fc86ed342b4f061f0b4594f45f1be3cbe8bb4d821a2', '4cc8')
  })

  it('255 len', () => {
    expectHexBuffer('fb985ebcdccde13ff3b5a20a6e2f64384e8c345c178ea4559acaed581d50b2a9e058791fac5ef01308cfdf368caf064421d01a655776a5690272e0756dbb4d82e26e51b016986fbab4d2332a267271d9ca1f8f42a4010c55f162360ae5d5af6ed13a495a378e6f7b605356b97f2c44de79d4a1903e7aa3f30658ddb0e395b2cfb985ebcdccde13ff3b5a20a6e2f64384e8c345c178ea4559acaed581d50b2a9e058791fac5ef01308cfdf368caf064421d01a655776a5690272e0756dbb4d82e26e51b016986fbab4d2332a267271d9ca1f8f42a4010c55f162360ae5d5af6ed13a495a378e6f7b605356b97f2c44de79d4a1903e7aa3f30658ddb0e395b2c', '4cff')
  })

  it('256 len', () => {
    expectHexBuffer('486f5f35da8eeb722db96566562dddfb509458c1c13bad056f99a923a1a9846b6ac42ca3bf6e690532116be782cb8c545f4f812a9d3b862faea3abbafa83cf1f822d0e071a492e0f25c41469fd5639bc6f01217fc2a5e6b16dd72498c6cbc07edecd51574585f3a9d5cbc01c515a1aa6a7a2053a712566d1abb15bc99c432f23486f5f35da8eeb722db96566562dddfb509458c1c13bad056f99a923a1a9846b6ac42ca3bf6e690532116be782cb8c545f4f812a9d3b862faea3abbafa83cf1f822d0e071a492e0f25c41469fd5639bc6f01217fc2a5e6b16dd72498c6cbc07edecd51574585f3a9d5cbc01c515a1aa6a7a2053a712566d1abb15bc99c432f23', '4d0001')
  })

  it('300 len', () => {
    expectHexBuffer('6e1b6899c6bbeac9ff18bba6b7eaad6244c0c42c18ef8bfcd504390e9dc127397e07f8896b562f579e9de263c665bb36ace2091ce717b3d45e4115d17e8476777c6f92478e7dc4125941009f4c89a24b8cc8fb9cfe378a7926cabd8d9f9995636d485c8f89884000261bb0367dd5a29c5b07850e19f241bc89ef901dfa4829b1c346fd5f542548dcfe80842ba41e7a245d39a2f90a536e1b6899c6bbeac9ff18bba6b7eaad6244c0c42c18ef8bfcd504390e9dc127397e07f8896b562f579e9de263c665bb36ace2091ce717b3d45e4115d17e8476777c6f92478e7dc4125941009f4c89a24b8cc8fb9cfe378a7926cabd8d9f9995636d485c8f89884000261bb0367dd5a29c5b07850e19f241bc89ef901dfa4829b1c346fd5f542548dcfe80842ba41e7a245d39a2f90a53', '4d2c01')
  })
})

describe('OP_PUSHDATA construct from code and smart buffer', () => {
  function expectHexBuffer (code: number, hex: string, len: string): void {
    const buff = SmartBuffer.fromBuffer(Buffer.from(len + hex, 'hex'))
    const data = new OP_PUSHDATA(code, buff)

    const prefix = Buffer.allocUnsafe(1)
    prefix.writeUInt8(code)

    expect(data.type).toBe('OP_PUSHDATA')
    expect(data.hex).toBe(hex)
    expect(data.asBuffer().toString('hex')).toBe(
      `${prefix.toString('hex')}${len}${hex}`
    )
  }

  it('1 len', () => {
    expectHexBuffer(
      0x01,
      '01',
      ''
    )
  })

  it('20 len', () => {
    expectHexBuffer(
      0x14,
      '0c02478843654d891e9d54e16b142a3c398e4a30',
      ''
    )
  })

  it('75 len', () => {
    expectHexBuffer(
      0x4b,
      'c4b2e5154c417ed08958f2f73cb197c7e4004c88384dc72f2f980a6f70534393fc645dbae9ec146f9db140fee94bc51c214f011fb461efb6e9a11b1c930e557e66f1e018bafb194f019432',
      ''
    )
  })

  it('200 len', () => {
    expectHexBuffer(
      0x4c,
      '726eb46eee115eccdb09dee53ba072d3f1845c7815096babfd07e72de9fce90f365ded489c8c6e3f438e56ac1ed6ae87f401d0b54b6c684ac83bd17cee770a3b190c506e6dd6262177a0d8cf65952832ee16cb2c09d0f7bb7192f53ea778a5de1881f142726eb46eee115eccdb09dee53ba072d3f1845c7815096babfd07e72de9fce90f365ded489c8c6e3f438e56ac1ed6ae87f401d0b54b6c684ac83bd17cee770a3b190c506e6dd6262177a0d8cf65952832ee16cb2c09d0f7bb7192f53ea778a5de1881f142',
      'c8'
    )
  })

  it('255 len', () => {
    expectHexBuffer(
      0x4c,
      'a62afe2cadb85c0b3b710ca5bff357c2c8500a6567e1dab16e0b85ad6ebfaab6b2135f9669e8814069ee6485484f0800258cc9702cd55c8332019a113174cee055ef917081acccfefbd008d655e0749815574d8ae1eeb61c554a7648799bffcefb18d83e6540c289ef01711597770ca73daea2a3aae91822497d6a9c4479ca72db1581cc855d8454f4d61c37b99942aefaad95a1e51aeb036b8477dc3ff0d44fc50aa871cf1b52f9bfae554a716f30bca6f1e64421f460c5eb71bec6a643d50a5206cda4b1e18fbf22f663a2777219171b3025732f40827b7a10dadafe9d4cf038da35c11aee062554ab62b933d62c939116f00d9787f84533733272cc2f65',
      'ff'
    )
  })

  it('256 len', () => {
    expectHexBuffer(
      0x4d,
      '985a57f4f26f3c1dba0a1e4b5c2347429414f788dcefd541d4c3f2bf34f10fa3c678ff8f642d15d3967a624d59348528305ef6431fba6f97ab9be6eee2528a2f95f885b961dfe95ea8a65560e52e5fdb3cf828b85e1855e77af8429750d2e58eed1fc80849e7741fd20a739192419fae3f750b73069a30a60124529adc9487655afa2acd15755dc28a6282dc126ca4c9a9d5426beb3a3a5ba463daa1c7add82d2e0df78254706d39cc11d026322e7ed177fb01e058b18adde79ccc405e9f7f4710e74948fa2f54393e2a63aa2e7505b08d7a170213fc6b56dea3f174e3c8f44ab2de525a8999b9f05f3b802eda7e17475938555c8446c80ce1e76d77d33e91a3',
      '0001'
    )
  })

  it('300 len', () => {
    expectHexBuffer(
      0x4d,
      'a9a886aaf85ebbc6a3ffb65191ec638fc88fc0b01edf0feef74625beaf5a18a1ebceca643fdf0e0f65bf4eab49d8ea7bedac982bf671a7207336940f6ae11d580a305b543475ae03f41e7bedca4c1b72476fcec9c430574083e8ad47810123eb96d5fe6cfec74fd1235246868ffab169ecf62c44b240f68b5a3692e4151d8155782e8ae49ba61ee85221ba3b84a6841fab18ed1ed5dca05e11e648bcacfe2373da3d6f78ae18dc98ce9d1e8756be4eca65c2945807c445f9036cbd4e3383d23e500abd816d77307cb073a71bf2a9b4e40ee419820ec3d141552dddfb833a233f8ca69e2f43b05900a913355df1ff7a77e67148148ee1dfaba9626bc23355cf173344215e3d197339e352a64b5bd548e55dc26e50de482d037a7813b75da5af10426a02981a97add467ec4136',
      '2c01'
    )
  })
})
