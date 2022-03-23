import { Partition, PartitionSort } from '../../module.database/database.spec/_model'

export const PARTITIONS: Partition[] = [
  {
    id: '_0000',
    a: '0000',
    b: 0,
    c_partition: '1000',
    c_sort: 1,
    name: 'P_1',
    num: 10,
    amount: 123,
    nested: { a: '4', b: '2', c: 3.5 }
  },
  {
    id: '_0001',
    a: '0001',
    b: 1,
    c_partition: '1000',
    c_sort: 2,
    name: 'P_2',
    num: 11,
    amount: 124,
    nested: { a: '3', b: '2', c: 3.6 }
  },
  {
    id: '_0002',
    a: '0002',
    b: 2,
    c_partition: '1000',
    c_sort: 3,
    name: 'P_3',
    num: 12,
    amount: 125,
    nested: { a: '2', b: '2', c: 3.7 }
  },
  {
    id: '_0003',
    a: '0003',
    b: 3,
    c_partition: '1000',
    c_sort: 4,
    name: 'P_4',
    num: 13,
    amount: 126,
    nested: { a: '1', b: '2', c: 3.8 }
  }
]

export const PARTITION_SORTS: PartitionSort[] = [
  {
    id: '_0000',
    a_partition: '0000',
    a_sort: '0001',
    b_partition: 1000,
    b_sort: 1000,
    name: 'PS_1_1',
    num: 20,
    amount: '10.5',
    nested: { a: '1', b: '3', c: 9 }
  },
  {
    id: '_0001',
    a_partition: '0000',
    a_sort: '0002',
    b_partition: 1000,
    b_sort: 2000,
    name: 'PS_1_2',
    num: 30,
    amount: '10.6',
    nested: { a: '2', b: '5', c: 8 }
  },
  {
    id: '_0002',
    a_partition: '0000',
    a_sort: '1000',
    b_partition: 1000,
    b_sort: 3000,
    name: 'PS_1_3',
    num: 40,
    amount: '10.7',
    nested: { a: '3', b: '7', c: 7 }
  },
  {
    id: '_0003',
    a_partition: '0000',
    a_sort: '2000',
    b_partition: 1000,
    b_sort: 4000,
    name: 'PS_1_4',
    num: 50,
    amount: '10.8',
    nested: { a: '4', b: '9', c: 6 }
  },
  {
    id: '_0004',
    a_partition: '1000',
    a_sort: '0001',
    b_partition: 2000,
    b_sort: 1000,
    name: 'PS_2_1',
    num: 21,
    amount: '11.5',
    nested: { a: '[1', b: '~3', c: 9 }
  },
  {
    id: '_0005',
    a_partition: '1000',
    a_sort: '0002',
    b_partition: 2000,
    b_sort: 2000,
    name: 'PS_2_2',
    num: 31,
    amount: '12.6',
    nested: { a: ']2', b: '-5', c: 8 }
  },
  {
    id: '_0006',
    a_partition: '1000',
    a_sort: '1000',
    b_partition: 2000,
    b_sort: 3000,
    name: 'PS_2_3',
    num: 41,
    amount: '13.7',
    nested: { a: '(3', b: '_7', c: 7 }
  },
  {
    id: '_0007',
    a_partition: '1000',
    a_sort: '2000',
    b_partition: 2000,
    b_sort: 4000,
    name: 'PS_2_4',
    num: 51,
    amount: '14.8',
    nested: { a: ')4', b: '=9', c: 6 }
  }
]
