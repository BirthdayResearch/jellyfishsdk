import * as dynamoose from 'dynamoose'
import { Schema, SchemaDefinition } from 'dynamoose/dist/Schema'
import { Database, Model, ModelIndex, ModelKey, ModelMapping, Paginated, QueryOptions, SortOrder } from './_abstract'

export class DynamoDb extends Database {
  async put<M extends Model> (mapping: ModelMapping<M>, model: M): Promise<void> {
    await dynamoose.model(mapping.type).create(model, { overwrite: true })
  }

  async getById<M extends Model> (mapping: ModelMapping<M>, id: string): Promise<M | undefined> {
    return await dynamoose.model(mapping.type)
      .get(id,
        (mapping.attributes != null)
          ? { attributes: mapping.attributes as string[] }
          : {}
      ) as unknown as M
  }

  async getByIndex<M extends Model>(
    mapping: ModelMapping<M>,
    index: ModelIndex<M>,
    partitionKey: ModelKey,
    sortKey?: ModelKey
  ): Promise<M | undefined> {
    const request = dynamoose
      .model(mapping.type)
      .query(createDynamooseQuery<M>(index, partitionKey, sortKey))
      .using(index.name)

    let _req = await request.limit(1)
    if (mapping.attributes !== undefined) {
      _req = _req.attributes(mapping.attributes as string[])
    }
    const response = await _req.exec()
    return response[0] as unknown as M
  }

  async query<M extends Model> (mapping: ModelMapping<M>, index: ModelIndex<M>, options: QueryOptions): Promise<Paginated<M>> {
    // Query partition key
    let request = dynamoose.model(mapping.type)
      .query(index.partition.attributeName as string)
      .eq(options.partitionKey)
      .sort(options.order === SortOrder.ASC ? 'ascending' : 'descending')
      .using(index.name)
      .limit(options.limit)

    if (mapping.attributes !== undefined) {
      request = request.attributes(mapping.attributes as string[])
    }

    const response = await request.exec()
    console.log('>>>', response)
    return {
      lastKey: undefined,
      data: response
    }
  }

  async delete<M extends Model> (mapping: ModelMapping<M>, id: string): Promise<void> {
    const model = dynamoose.model(mapping.type)
    await model.delete(id)
  }
}

export function makeDynamooseSchema<M extends Model> (modelMapping: ModelMapping<M>): Schema {
  const schema: SchemaDefinition = {
    id: {
      type: String,
      hashKey: true
    }
  }
  for (const index of Object.values(modelMapping.index)) {
    const dynamooseIndexDefinition: SchemaDefinition[''] = {
      type: index.partition.type === 'number' ? Number : String
    }

    if (index.sort !== undefined) { // Create index with a partition + sort key
      dynamooseIndexDefinition.index = {
        global: true,
        rangeKey: index.sort.attributeName as string,
        name: index.name
      }
      // Declare the sort key as an attribute in the schema
      schema[index.sort.attributeName as string] = {
        type: index.sort.type === 'number' ? Number : String
      }
    } else { // Create index with partition key only
      dynamooseIndexDefinition.index = {
        global: true,
        name: index.name
      }
    }
    schema[index.partition.attributeName as string] = dynamooseIndexDefinition
  }

  return new Schema(schema, { saveUnknown: true })
}

function createDynamooseQuery<M extends Model> (index: ModelIndex<M>, partitionKey: ModelKey, sortKey?: ModelKey): Record<string, ModelKey> {
  const query: Record<any, any> = {
    [index.partition.attributeName]: { eq: partitionKey }
  }
  if (sortKey !== undefined) {
    if (index.sort === undefined) {
      throw new Error('Sort key must be defined on index ' + index.name)
    }
    query[index.sort.attributeName] = { eq: sortKey }
  }
  console.log('>>> Query', query)
  return query
}
