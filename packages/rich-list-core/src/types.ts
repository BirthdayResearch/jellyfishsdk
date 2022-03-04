import { AccountAmount } from '@defichain/jellyfish-api-core/src/category/account'

export interface ActiveAddressAccountAmount {
  [key: string]: AccountAmount
}

export interface RichListItem {
  address: string
  amount: number
}
