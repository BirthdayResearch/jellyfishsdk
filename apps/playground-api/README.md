# Playground API

Migration of the entire `JellyfishSDK/playground` project into `JellyfishSDK/jellyfish/apps/playground-api`. This
project is different from `JellyfishSDK/jellyfish/packages/playground`.

## Motivation

> https://github.com/JellyfishSDK/jellyfish/issues/580

As part of [#580](https://github.com/JellyfishSDK/jellyfish/issues/580) consolidation efforts. We had multiple projects
that were extensions of the jellyfish project. The separated projects allowed us to move quickly initially but proves to
be a bottleneck when it comes to development.

> https://github.com/JellyfishSDK/jellyfish/issues/978

We need to maintain this project regardless of the slated deprecation. By migrating this project into
`JellyfishSDK/jellyfish`, we can maintain it in one place.

