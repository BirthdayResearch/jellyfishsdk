import { Database, SortOrder } from '../database'
import { PartitionMapping, PartitionSortMapping } from './_model'
import { PARTITION_SORTS, PARTITIONS } from './_fixtures'

/**
 * Setup everything that is required to test database specification
 */
export async function setup (database: Database): Promise<void> {
  for (const data of PARTITIONS) {
    await database.put(PartitionMapping, data)
  }

  for (const data of PARTITION_SORTS) {
    await database.put(PartitionSortMapping, data)
  }
}

/**
 * Teardown all persisted data in each test scope
 */
export async function teardown (database: Database): Promise<void> {
}

export async function shouldGetById (database: Database): Promise<void> {
  for (const data of PARTITIONS) {
    const model = await database.get(PartitionMapping, data.id)
    expect(model).toStrictEqual(data)
  }

  for (const data of PARTITION_SORTS) {
    const model = await database.get(PartitionSortMapping, data.id)
    expect(model).toStrictEqual(data)
  }
}

export async function shouldDump (database: Database): Promise<void> {
  const dump = await database.dump()
  expect(dump).toBeTruthy()
}

export async function shouldGetByPartitionKey (database: Database): Promise<void> {
  const index = PartitionMapping.index
  for (const data of PARTITIONS) {
    const partitionA = await database.get(index.partition_a, data.a)
    expect(partitionA).toStrictEqual(data)

    const partitionB = await database.get(index.partition_b, data.b)
    expect(partitionB).toStrictEqual(data)

    const compositeC = await database.get(index.composite_c, data.c_partition, data.c_sort)
    expect(compositeC).toStrictEqual(data)
  }
}

export async function shouldGetByPartitionSortKey (database: Database): Promise<void> {
  const index = PartitionSortMapping.index

  for (const data of PARTITION_SORTS) {
    const compositeA = await database.get(index.composite_a, data.a_partition, data.a_sort)
    expect(compositeA).toStrictEqual(data)

    const compositeB = await database.get(index.composite_b, data.b_partition, data.b_sort)
    expect(compositeB).toStrictEqual(data)
  }
}

/**
 * Test all indexes specified is deleted
 */
export async function shouldDelete (database: Database): Promise<void> {
  for (const data of PARTITIONS) {
    await database.delete(PartitionMapping, data.id)

    const partitionA = await database.get(PartitionMapping.index.partition_a, data.a)
    expect(partitionA).toBeUndefined()

    const partitionB = await database.get(PartitionMapping.index.partition_b, data.b)
    expect(partitionB).toBeUndefined()

    const compositeC = await database.get(PartitionMapping.index.composite_c, data.c_partition, data.c_sort)
    expect(compositeC).toBeUndefined()
  }

  for (const data of PARTITION_SORTS) {
    await database.delete(PartitionSortMapping, data.id)

    const compositeA = await database.get(PartitionSortMapping.index.composite_a, data.a_partition, data.a_sort)
    expect(compositeA).toBeUndefined()

    const compositeB = await database.get(PartitionSortMapping.index.composite_b, data.b_partition, data.b_sort)
    expect(compositeB).toBeUndefined()
  }
}

export async function shouldQueryPartitionPagination (database: Database): Promise<void> {
  const window43 = await database.query(PartitionMapping.index.partition_a, {
    limit: 2,
    order: SortOrder.DESC
  })
  expect(window43.length).toStrictEqual(2)
  expect(window43[0]).toStrictEqual(PARTITIONS[3])
  expect(window43[1]).toStrictEqual(PARTITIONS[2])

  const window32 = await database.query(PartitionMapping.index.partition_a, {
    limit: 2,
    order: SortOrder.DESC,
    lt: window43[0].a
  })
  expect(window32.length).toStrictEqual(2)
  expect(window32[0]).toStrictEqual(PARTITIONS[2])
  expect(window32[1]).toStrictEqual(PARTITIONS[1])

  const window21 = await database.query(PartitionMapping.index.partition_a, {
    limit: 2,
    order: SortOrder.DESC,
    lt: window32[0].a
  })
  expect(window21.length).toStrictEqual(2)
  expect(window21[0]).toStrictEqual(PARTITIONS[1])
  expect(window21[1]).toStrictEqual(PARTITIONS[0])

  const window11 = await database.query(PartitionMapping.index.partition_a, {
    limit: 2,
    order: SortOrder.DESC,
    lt: window21[0].a
  })
  expect(window11.length).toStrictEqual(1)
  expect(window11[0]).toStrictEqual(PARTITIONS[0])
}

export async function shouldQueryPartitionSortPagination (database: Database): Promise<void> {
  const window43 = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: '1000',
    limit: 2,
    order: SortOrder.DESC
  })
  expect(window43.length).toStrictEqual(2)
  expect(window43[0].a_partition).toStrictEqual('1000')
  expect(window43[0].a_sort).toStrictEqual('2000')
  expect(window43[1].a_partition).toStrictEqual('1000')
  expect(window43[1].a_sort).toStrictEqual('1000')

  const window32 = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: '1000',
    limit: 2,
    order: SortOrder.DESC,
    lt: window43[0].a_sort
  })
  expect(window32.length).toStrictEqual(2)
  expect(window32[0].a_partition).toStrictEqual('1000')
  expect(window32[0].a_sort).toStrictEqual('1000')
  expect(window32[1].a_partition).toStrictEqual('1000')
  expect(window32[1].a_sort).toStrictEqual('0002')

  const window21 = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: '1000',
    limit: 2,
    order: SortOrder.DESC,
    lt: window32[0].a_sort
  })
  expect(window21.length).toStrictEqual(2)
  expect(window21[0].a_partition).toStrictEqual('1000')
  expect(window21[0].a_sort).toStrictEqual('0002')
  expect(window21[1].a_partition).toStrictEqual('1000')
  expect(window21[1].a_sort).toStrictEqual('0001')

  const window11 = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: '1000',
    limit: 2,
    order: SortOrder.DESC,
    lt: window21[0].a_sort
  })
  expect(window11.length).toStrictEqual(1)
  expect(window11[0].a_partition).toStrictEqual('1000')
  expect(window11[0].a_sort).toStrictEqual('0001')
}

export async function shouldQueryKeySpaceWithoutColliding (database: Database): Promise<void> {
  const all = await database.query(PartitionSortMapping.index.composite_a, {
    partitionKey: 'nothing',
    limit: 100,
    order: SortOrder.ASC
  })
  expect(all.length).toStrictEqual(0)

  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC
  })
  expect(slice.length).toStrictEqual(4)
  expect(slice[0].b_partition).toStrictEqual(2000)
  expect(slice[0].b_sort).toStrictEqual(1000)

  expect(slice[3].b_partition).toStrictEqual(2000)
  expect(slice[3].b_sort).toStrictEqual(4000)
}

export async function shouldQueryWithAscDesc (database: Database): Promise<void> {
  const partitionADesc = await database.query(PartitionMapping.index.partition_a, {
    limit: 100,
    order: SortOrder.DESC
  })
  expect(partitionADesc.length).toStrictEqual(4)
  expect(partitionADesc[0].a).toStrictEqual('0003')
  expect(partitionADesc[1].a).toStrictEqual('0002')
  expect(partitionADesc[2].a).toStrictEqual('0001')
  expect(partitionADesc[3].a).toStrictEqual('0000')

  const partitionAAsc = await database.query(PartitionMapping.index.partition_a, {
    limit: 100,
    order: SortOrder.ASC
  })
  expect(partitionAAsc.length).toStrictEqual(4)
  expect(partitionAAsc[0].a).toStrictEqual('0000')
  expect(partitionAAsc[1].a).toStrictEqual('0001')
  expect(partitionAAsc[2].a).toStrictEqual('0002')
  expect(partitionAAsc[3].a).toStrictEqual('0003')

  const compositeBDesc = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.DESC
  })
  expect(compositeBDesc.length).toStrictEqual(4)
  expect(compositeBDesc[0].b_sort).toStrictEqual(4000)
  expect(compositeBDesc[1].b_sort).toStrictEqual(3000)
  expect(compositeBDesc[2].b_sort).toStrictEqual(2000)
  expect(compositeBDesc[3].b_sort).toStrictEqual(1000)

  const compositeBAsc = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC
  })
  expect(compositeBAsc.length).toStrictEqual(4)
  expect(compositeBAsc[0].b_sort).toStrictEqual(1000)
  expect(compositeBAsc[1].b_sort).toStrictEqual(2000)
  expect(compositeBAsc[2].b_sort).toStrictEqual(3000)
  expect(compositeBAsc[3].b_sort).toStrictEqual(4000)
}

export async function shouldQueryWithOperatorGT (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gt: 1000
  })
  expect(slice.length).toStrictEqual(3)
  expect(slice[0].b_sort).toStrictEqual(2000)
  expect(slice[1].b_sort).toStrictEqual(3000)
  expect(slice[2].b_sort).toStrictEqual(4000)
}

export async function shouldQueryWithOperatorGTE (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gte: 2000
  })
  expect(slice.length).toStrictEqual(3)
  expect(slice[0].b_sort).toStrictEqual(2000)
  expect(slice[1].b_sort).toStrictEqual(3000)
  expect(slice[2].b_sort).toStrictEqual(4000)
}

export async function shouldQueryWithOperatorLT (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.DESC,
    lt: 3000
  })
  expect(slice.length).toStrictEqual(2)
  expect(slice[0].b_sort).toStrictEqual(2000)
  expect(slice[1].b_sort).toStrictEqual(1000)
}

export async function shouldQueryWithOperatorLTE (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.DESC,
    lte: 3000
  })
  expect(slice.length).toStrictEqual(3)
  expect(slice[0].b_sort).toStrictEqual(3000)
  expect(slice[1].b_sort).toStrictEqual(2000)
  expect(slice[2].b_sort).toStrictEqual(1000)
}

export async function shouldQueryWithOperatorGTLT (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gt: 1000,
    lt: 4000
  })
  expect(slice.length).toStrictEqual(2)
  expect(slice[0].b_sort).toStrictEqual(2000)
  expect(slice[1].b_sort).toStrictEqual(3000)
}

export async function shouldQueryWithOperatorGTELTE (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gte: 1000,
    lte: 3000
  })
  expect(slice.length).toStrictEqual(3)
  expect(slice[0].b_sort).toStrictEqual(1000)
  expect(slice[1].b_sort).toStrictEqual(2000)
  expect(slice[2].b_sort).toStrictEqual(3000)
}

export async function shouldQueryWithOperatorGTLTE (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.DESC,
    gt: 1000,
    lte: 3000
  })
  expect(slice.length).toStrictEqual(2)
  expect(slice[0].b_sort).toStrictEqual(3000)
  expect(slice[1].b_sort).toStrictEqual(2000)
}

export async function shouldQueryWithOperatorGTELT (database: Database): Promise<void> {
  const slice = await database.query(PartitionSortMapping.index.composite_b, {
    partitionKey: 2000,
    limit: 100,
    order: SortOrder.ASC,
    gte: 1000,
    lt: 3000
  })
  expect(slice.length).toStrictEqual(2)
  expect(slice[0].b_sort).toStrictEqual(1000)
  expect(slice[1].b_sort).toStrictEqual(2000)
}
