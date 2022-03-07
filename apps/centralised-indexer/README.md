# Centralised Indexer

The Centralised Indexer is responsible for:
1. Polling the blockchain for blocks
2. Indexing relevant data using DynamoDB

## Technical Design

Essentially an ETL worker that is intended to be deployed as a single instance per AWS region (for resilience) that 
will pull data from the blockchain, so that blockchain rpc bottlenecks can be bypassed.
