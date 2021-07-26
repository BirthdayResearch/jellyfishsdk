import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { DeFiDBinary } from "./defid_binary";
import { ApiClient } from "@defichain/jellyfish-api-core";

export enum DolphinArg {
  REINDEX = '-reindex'
  // TODO(fuxingloh):
}

export class DeFiDaemon {
  private readonly binary: DeFiDBinary

  private process?: ChildProcessWithoutNullStreams
  private apiClient?: ApiClient

  constructor () {
    this.binary = new DeFiDBinary()
  }

  get client (): ApiClient {
    if (this.apiClient === undefined) {
      throw new Error('jellyfish-defid must be started before client can be accessed')
    }
    return this.apiClient
  }

  async start (args: DolphinArg[]) {
    await this.binary.downloadOrUpdate()
    this.process = spawn(this.binary.path, args)
    // process manager with std out
  }

  async waitForHealthy (timeout: number) {

  }

  async stop () {

  }

  async delete () {
    await this.binary.delete()
  }
}
