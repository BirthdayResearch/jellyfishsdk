import { PlaygroundSetup } from '../../module.playground/setup/setup'
import { Injectable } from '@nestjs/common'

@Injectable()
export class SetupGov extends PlaygroundSetup<Record<string, any>> {
  list (): Array<Record<string, any>> {
    return [
      { ATTRIBUTES: { 'v0/token/:dusdId/payback_dfi': 'true' } }
    ]
  }

  async create (each: any): Promise<void> {
    const key = Object.keys(each)[0]
    if (key === 'ATTRIBUTES') {
      const dusdInfo = await this.client.token.getToken('DUSD')
      const dusdId = Object.keys(dusdInfo)[0]
      /* eslint-disable-next-line */
      var re = new RegExp(':dusdId', 'g');
      const k = Object.keys(each[key])[0]
      each[key] = { [k.replace(re, dusdId)]: 'true' }
    }

    await this.client.masternode.setGov(each)
  }

  async has (each: any): Promise<boolean> {
    const key = Object.keys(each)[0]
    try {
      const gov = await this.client.masternode.getGov(key)
      if (Object.keys(gov[key]).length > 0) {
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }
}
