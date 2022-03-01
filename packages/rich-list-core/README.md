# @defichain/rich-list-core
Complementary library module for rich-list-api to compute and keep a rich list state in injected storage service.

## Prerequisite
Three dependencies to be injected
- Queue - LIFO, deduplication
- Database - simpled database with one index allowed

All above are storage services and expected to be persistent and should survive service restart for production use.
