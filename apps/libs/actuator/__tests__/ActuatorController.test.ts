import { Test } from '@nestjs/testing'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { ActuatorController, ActuatorModule, ActuatorProbes, ProbeIndicator } from '../src'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Module } from '@nestjs/common'

describe('ActuatorController - Healthy service', () => {
  /**
   * Simulate a service that has dead simple health indicators
   */
  class HealthyServiceProbe extends ProbeIndicator {
    async liveness (): Promise<HealthIndicatorResult> {
      return this.withAlive('healthyService', { livenessDetail: 100 })
    }

    async readiness (): Promise<HealthIndicatorResult> {
      return this.withAlive('healthyService', { readinessDetail: 200 })
    }
  }

  /**
   * Some module whose health needs to be probed.
   * onApplicationBootstrap hook gives us the appropriate app lifecycle stage
   * to register the probe.
   */
  @Module({ providers: [HealthyServiceProbe] })
  class HealthyServiceActuatorModule {
    constructor (
      private readonly probes: ActuatorProbes,
      private readonly probe: HealthyServiceProbe) {
    }

    async onApplicationBootstrap (): Promise<void> {
      this.probes.add(this.probe)
    }
  }

  let app: NestFastifyApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        HealthyServiceActuatorModule,
        ActuatorModule
      ],
      providers: [HealthyServiceProbe],
      controllers: [ActuatorController]
    }).compile()

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter({ logger: false }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/_actuator/probes/liveness healthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/_actuator/probes/liveness'
    })

    expect(response.json()).toStrictEqual({
      details: {
        healthyService: {
          livenessDetail: 100,
          status: 'up'
        }
      },
      error: {},
      info: {
        healthyService: {
          livenessDetail: 100,
          status: 'up'
        }
      },
      status: 'ok'
    })
  })

  it('/_actuator/probes/readiness healthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
    })

    expect(response.json()).toStrictEqual({
      details: {
        healthyService: {
          readinessDetail: 200,
          status: 'up'
        }
      },
      error: {},
      info: {
        healthyService: {
          readinessDetail: 200,
          status: 'up'
        }
      },
      status: 'ok'
    })
  })
})

describe('ActuatorController - Unhealthy service', () => {
  /**
   * Simulate a service that has dead simple health indicators
   */
  class UnhealthyServiceProbe extends ProbeIndicator {
    async liveness (): Promise<HealthIndicatorResult> {
      return this.withDead('unhealthyService', 'some causative message', { livenessDetail: 0 })
    }

    async readiness (): Promise<HealthIndicatorResult> {
      return this.withDead('unhealthyService', 'some causative message', { readinessDetail: 1 })
    }
  }

  /**
   * Some module whose health needs to be probed.
   * onApplicationBootstrap hook gives us the appropriate app lifecycle stage
   * to register the probe.
   */
  @Module({ providers: [UnhealthyServiceProbe] })
  class UnhealthyServiceActuatorModule {
    constructor (
      private readonly probes: ActuatorProbes,
      private readonly probe: UnhealthyServiceProbe) {
    }

    async onApplicationBootstrap (): Promise<void> {
      this.probes.add(this.probe)
    }
  }

  let app: NestFastifyApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UnhealthyServiceActuatorModule,
        ActuatorModule
      ],
      providers: [UnhealthyServiceProbe],
      controllers: [ActuatorController]
    }).compile()

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter({ logger: false }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/_actuator/probes/liveness unhealthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/_actuator/probes/liveness'
    })

    expect(response.json()).toStrictEqual({
      details: {
        unhealthyService: {
          livenessDetail: 0,
          status: 'down'
        }
      },
      error: {
        unhealthyService: {
          livenessDetail: 0,
          status: 'down'
        }
      },
      info: {},
      status: 'error'
    })
  })

  it('/_actuator/probes/readiness unhealthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/_actuator/probes/readiness'
    })

    expect(response.json()).toStrictEqual({
      details: {
        unhealthyService: {
          readinessDetail: 1,
          status: 'down'
        }
      },
      error: {
        unhealthyService: {
          readinessDetail: 1,
          status: 'down'
        }
      },
      info: {},
      status: 'error'
    })
  })
})
