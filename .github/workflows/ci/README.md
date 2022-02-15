# Sanity testing

On top of end-to-end testing, sanity testing is done after the docker image is build. This kind of testing is performed
to ascertain the possibility of bugs within the workflow that generate the builds. To identify and determine whether a
build artifact (docker) should be rejected. This is only done on CI and you are not expected to perform them manually.

## The setup

- `.github/workflows/ci.yml` docker job will enforce this behavior at merge.
- `docker-compose.yml` closely resemble an orchestrated setup.
- `wait-for.sh` to wait for containers to be healthy before running the tests.
