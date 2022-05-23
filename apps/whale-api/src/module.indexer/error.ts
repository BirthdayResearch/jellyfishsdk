export class IndexerError extends Error {
  constructor (message: string) {
    super(`module.indexer: ${message}`)
  }
}

/**
 * During module.sync lifecycle there are reliant on existing index data.
 * When the data cannot be found, it will result in NotFoundIndexerError crashing the syncing.
 */
export class NotFoundIndexerError extends IndexerError {
  constructor (action: 'invalidate' | 'index', type: string, id: string) {
    super(`attempting to sync:${action} but type:${type} with id:${id} cannot be found in the index`)
  }
}
