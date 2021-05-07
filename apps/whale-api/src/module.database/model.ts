/**
 * Supported model key types
 */
export type ModelKey = string | number
export type ModelKeyType = 'string' | 'number'

interface ModelIndexString<M extends Model> {
  type: 'string'
  key: (model: M) => string
}

interface ModelIndexNumber<M extends Model> {
  type: 'number'
  key: (model: M) => number
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
}

/**
 * Model in module.database describes a persistent data model structure with known indexes
 * and type. For a performant read and write design, model query must conform to a key-value
 * store with all indexes that are required must be manually described and coded as opposed to
 * a traditional relational approach. This allows the use of
 * [LSM Databases](https://en.wikipedia.org/wiki/Log-structured_merge-tree) for hyper performant
 * design.
 *
 * Hence aggregation functions are not expected to be performed by the data store. If aggregation
 * features are required such as count or sum, it must be defined as a model and created by the
 * implementor. This shifts all the scalability concerns to the implementor allowing for a
 * hyper-scale implementation for a truly decentralized index.
 *
 * Model supports two types of indexes which are ModelIndex and ModelIndexComposite.
 * Indexes which is a plural and that suggests that there can be multiple index per model.
 * Therefore allows database consumer to query each individual index. Therefore each model
 * can have multiple primary keys presenting it.
 *
 * ModelIndex with just partitionKey represents a key-value structure where there is a single
 * unique key in the index for each model. This supports your traditional queryById operations.
 *
 * ModelIndex with both partitionKey and sortKey represents a key-sort-value structure where
 * there is a single unique composite key. The composite key being partitionKey and sortKey.
 * Partition key as it suggests, partition the model index space into unique index slices.
 * While the sort key, sorts the unique index slices. Being a sorted key, allows for sort
 * operations to be performed on the sorted unique index slice. This supports your traditional
 * queryById and get 10 items starting from this sort key.
 *
 * Anything else that is not supported in the ModelIndex design specification mentioned above
 * must not be supported for an agnostic database model design. This approach allows the use of
 * many NoSQL implementations for a truly hyper scale database design.
 */
export interface Model {
  /**
   * id of the data, required for put/delete consistency
   */
  id: string
}
