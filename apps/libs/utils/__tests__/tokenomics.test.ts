import {
  getUsdVolumesInTokens,
  getVolumeD30InTokens,
  getVolumeH24InTokens,
  tokenPerUsd,
  usdPerToken
} from '../tokenomics'

const EG_POOLPAIR = {
  id: '4',
  symbol: 'ETH-DFI',
  displaySymbol: 'dETH-DFI',
  name: 'Ether-Default Defi token',
  status: true,
  tokenA: {
    symbol: 'ETH',
    displaySymbol: 'dETH',
    id: '1',
    reserve: '12381.39595202',
    blockCommission: '0'
  },
  tokenB: {
    symbol: 'DFI',
    displaySymbol: 'DFI',
    id: '0',
    reserve: '9515257.65041262',
    blockCommission: '0'
  },
  priceRatio: {
    ab: '0.00130121',
    ba: '768.51250757'
  },
  commission: '0.002',
  totalLiquidity: {
    token: '342973.54270977',
    usd: '64745242.17659580532292938112210697'
  },
  tradeEnabled: true,
  ownerAddress: '8UAhRuUFCyFUHEPD7qvtj8Zy2HxF5HH5nb',
  rewardPct: '0.14549',
  creation: {
    tx: '9827894c083b77938d13884f0404539daa054a818e0c5019afa1eeff0437a51b',
    height: 466822
  },
  apr: {
    reward: 0.5639641344943545,
    commission: 0.015311352369549345,
    total: 0.5792754868639037
  },
  volume: {
    h24: 1357996.187969406,
    d30: 48503079.01006337
  }
}

describe('Convert volume USD amounts to token counts', () => {
  it('getVolumesInTokens should return volumes in tokenA and tokenB', () => {
    const result = getUsdVolumesInTokens(EG_POOLPAIR)

    // ETH
    expect([
      result.volumeH24InTokenA.toFixed(8),
      result.volumeD30InTokenA.toFixed(8)
    ]).toStrictEqual([
      '519.38607191', // ETH ~= 1357996.187969406 USD
      '18550.73225235' // ETH ~= 48503079.01006337 USD
    ])

    // DFI
    expect([
      result.volumeH24InTokenB.toFixed(8),
      result.volumeD30InTokenB.toFixed(8)
    ]).toStrictEqual([
      '399154.69252745', // DFI ~= 1357996.187969406 USD
      '14256469.76067390' // DFI ~= 48503079.01006337 USD
    ])
  })

  it('getVolumeH24InTokens() should convert volume.h24 (USD) to tokenA and tokenB counts', () => {
    const result = getVolumeH24InTokens(EG_POOLPAIR)
    expect([
      result.volumeH24InTokenA.toFixed(8),
      result.volumeH24InTokenB.toFixed(8)
    ]).toStrictEqual([
      '519.38607191',
      '399154.69252745'
    ])
  })

  it('getVolumeD30InTokens() should convert volume.d30 (USD) to tokenA and tokenB counts', () => {
    const result = getVolumeD30InTokens(EG_POOLPAIR)
    expect([
      result.volumeD30InTokenA.toFixed(8),
      result.volumeD30InTokenB.toFixed(8)
    ]).toStrictEqual([
      '18550.73225235',
      '14256469.76067390'
    ])
  })
})

describe('USD-to-Token / Token-to-USD Conversion', () => {
  it('usdPerToken() should derive USD price of tokens from poolpair data', () => {
    const tokenAUsdPrice = usdPerToken(EG_POOLPAIR.tokenA.reserve, EG_POOLPAIR.totalLiquidity.usd)
    const tokenBUsdPrice = usdPerToken(EG_POOLPAIR.tokenB.reserve, EG_POOLPAIR.totalLiquidity.usd)

    expect([
      tokenAUsdPrice.toFixed(8),
      tokenBUsdPrice.toFixed(8)
    ]).toStrictEqual([
      '2614.61802964', // USD ~= 1 ETH
      '3.40218019' // USD ~= 1 DFI
    ])
  })

  it('tokenPerUsd() should convert 1 USD to token count from poolpair data', () => {
    const tokenAUsdPrice = tokenPerUsd(EG_POOLPAIR.tokenA.reserve, EG_POOLPAIR.totalLiquidity.usd)
    const tokenBUsdPrice = tokenPerUsd(EG_POOLPAIR.tokenB.reserve, EG_POOLPAIR.totalLiquidity.usd)

    expect([
      tokenAUsdPrice.toFixed(8),
      tokenBUsdPrice.toFixed(8)
    ]).toStrictEqual([
      '0.00038247', // ETH ~= 1 USD
      '0.29392917' // DFI ~= 1 USD
    ])
  })
})
