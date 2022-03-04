import { AccountAmount } from '@defichain/jellyfish-api-core/src/category/account'

export interface ActiveAddressAccountAmount {
  [key: string]: AccountAmount
}

export interface AddressBalance {
  address: string
  amount: number
}
