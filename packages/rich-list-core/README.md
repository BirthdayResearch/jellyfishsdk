# @defichain/rich-list-core
Complementary library module for rich-list-api to compute and keep a rich list state in injected storage service.

## Prerequisite
Three dependencies to be injected
- Storage - key value pair
- Queue - LIFO, deduplication
- Linked list - simpled indexed data, only able to append / delete / read the last component

All above are storage services and expected to be persistent and should survive service restart.
