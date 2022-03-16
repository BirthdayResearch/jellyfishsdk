import { BigNumber } from '@defichain/jellyfish-api-core'

export interface AccountAmount {
  [id: string]: BigNumber
}

export interface ActiveAddressAccountAmount {
  [key: string]: AccountAmount
}
