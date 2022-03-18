export abstract class Database {
  abstract getByIndex<M extends Model> (
    mapping: ModelMapping<M>,
    index: ModelIndex<M>,
    partitionKey: ModelKey,
    sortKey?: ModelKey
  ): Promise<M | undefined>

  abstract getById<M extends Model> (
    mapping: ModelMapping<M>,
    id: string
  ): Promise<M | undefined>

  abstract query<M extends Model> (
    mapping: ModelMapping<M>,
    index: ModelIndex<M>,
    options: QueryOptions
  ): Promise<Paginated<M>>

  abstract put<M extends Model> (
    mapping: ModelMapping<M>,
    model: M
  ): Promise<void>

  abstract delete<M extends Model> (
    mapping: ModelMapping<M>,
    id: string
  ): Promise<void>
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface QueryOptions {
  /**
   * Provide to indicates searching on the sort index within partition key space.
   */
  partitionKey: ModelKey
  limit: number
  order: SortOrder
  gt?: ModelKey
  gte?: ModelKey
  lt?: ModelKey
  lte?: ModelKey
  eq?: ModelKey
}

export interface Paginated<M extends Model> {
  data: M[]
  lastKey?: string // undefined indicating no more results remaining
}

/**
 * Supported model key types
 */
export type ModelKey = string | number

interface ModelIndexString<M extends Model> {
  type: 'string'
  attributeName: keyof M // must be defined in Model
}

interface ModelIndexNumber<M extends Model> {
  type: 'number'
  attributeName: keyof M // must be defined in Model
}

/**
 * @see Model
 */
export interface ModelIndex<M extends Model> {
  /**
   * Fully featured name of the index.
   * Index must not collide with other index in database.
   */
  name: string

  /**
   * Partition key of the model index.
   */
  partition: ModelIndexString<M> | ModelIndexNumber<M>

  /**
   * Sort key of the model index, where present indicates composite key.
   * This attribute must be sorted in lexicographically order, which is a
   * typical implementation of most key-value store.
   */
  sort?: ModelIndexString<M> | ModelIndexNumber<M>
}

export interface ModelMapping<M extends Model> {
  /**
   * Name of the Model, also know as table name.
   * This will be used as a sub section key space and for the main id index.
   */
  type: string
  /**
   * Named indexes that can be declared. Although there are no limitations
   * to the number of indexes you can create per model you should still limit to
   * what you need. SortKey design tricks should be used to minimized the number
   * of indexes you need. Indexes must not collide, and the onus is on the
   * implementor to guarantee the behavior.
   */
  index: {
    [name: string]: ModelIndex<M>
  }

  /**
   * Pre-defined list of attributes to fetch from the database
   */
  attributes?: Array<keyof M>
}

export interface Model {
  /**
   * id of the data, required for put/delete consistency
   */
  id: string
}
