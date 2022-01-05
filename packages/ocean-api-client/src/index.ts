export * from './errors/ApiException'
export * from './errors/ApiValidationException'
export * from './errors/ClientException'
export * from './errors/TimeoutException'
export * from './errors/BadRequestException'

export * from './ApiResponse'
export * from './OceanApiClient'

// TODO(fuxingloh):
//  export * from './api/Fee'
//  import { OceanApiClient } from '../OceanApiClient'
//
//  export class Fee {
//    constructor (private readonly client: OceanApiClient) {
//    }
//
//    /**
//     * @param {number} confirmationTarget in blocks till fee get confirmed
//     * @return {Promise<number>} fee rate per KB
//     */
//    async estimate (confirmationTarget: number = 10): Promise<number> {
//      return await this.client.requestData('GET', `fee/estimate?confirmationTarget=${confirmationTarget}`)
//    }
//  }
