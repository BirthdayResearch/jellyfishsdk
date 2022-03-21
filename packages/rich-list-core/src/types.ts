import { AccountAmount } from '@defichain/jellyfish-api-core/src/category/account'

export type Address = string

export interface AddressAccountAmount {
  [key: Address]: AccountAmount
}
