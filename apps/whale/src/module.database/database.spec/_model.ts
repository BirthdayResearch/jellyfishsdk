import { Model, ModelMapping } from '../../module.database/model'

export const PartitionMapping: ModelMapping<Partition> = {
  type: 'Partition',
  index: {
    partition_a: {
      name: 'partition_a',
      partition: {
        type: 'string',
        key: (p) => p.a
      }
    },
    partition_b: {
      name: 'partition_b',
      partition: {
        type: 'number',
        key: (p) => p.b
      }
    },
    composite_c: {
      name: 'composite_c',
      partition: {
        type: 'string',
        key: (p) => p.c_partition
      },
      sort: {
        type: 'number',
        key: (p) => p.c_sort
      }
    }
  }
}

export interface Partition extends Model {
  id: string
  a: string
  b: number

  c_partition: string
  c_sort: number

  name: string
  num: number
  amount: number
  nested: {
    a: string
    b: string
    c: number
  }
}

export const PartitionSortMapping: ModelMapping<PartitionSort> = {
  type: 'PartitionSort',
  index: {
    composite_a: {
      name: 'composite_a',
      partition: {
        type: 'string',
        key: (d) => d.a_partition
      },
      sort: {
        type: 'string',
        key: (d) => d.a_sort
      }
    },
    composite_b: {
      name: 'composite_b',
      partition: {
        type: 'number',
        key: (d) => d.b_partition
      },
      sort: {
        type: 'number',
        key: (d) => d.b_sort
      }
    }
  }
}

export interface PartitionSort extends Model {
  id: string
  a_partition: string
  a_sort: string

  b_partition: number
  b_sort: number

  name: string
  num: number
  amount: string
  nested: {
    a: string
    b: string
    c: number
  }
}
