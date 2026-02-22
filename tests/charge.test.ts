import { test, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../api/src/index'

let app: Awaited<ReturnType<typeof buildApp>>['app']
let pool: Awaited<ReturnType<typeof buildApp>>['pool']

beforeAll(async () => {
    const built = await buildApp()
    app = built.app
    pool = built.pool
})

afterAll(async () => {
    await pool.query('TRUNCATE TABLE charge_events, charges RESTART IDENTITY CASCADE')
    await pool.end()
})

const chargePayload = (overrides: Record<string, unknown> = {}) => ({
    account_id: '550e8400-e29b-41d4-a716-446655440000',
    amount: 1000,
    currency: 'NZD',
    idempotency_key: `key-${Math.random().toString(36).slice(2)}`,
    ...overrides,
})

test('step 1) charges: create charge returns 201 and response has id + status PENDING', async () => {
    const payload = chargePayload()
    const response = await app.inject({
        method: 'POST',
        url: '/charges',
        payload,
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body).toHaveProperty('id')
    expect(body.id).toBeTruthy()
    expect(body.status).toBe('PENDING')
})

test('step 1) charges: replay same request returns 200 and same id', async () => {
    const payload = chargePayload()
    const first = await app.inject({
        method: 'POST',
        url: '/charges',
        payload,
    })
    expect(first.statusCode).toBe(201)
    const firstBody = first.json()
    const second = await app.inject({
        method: 'POST',
        url: '/charges',
        payload,
    })
    expect(second.statusCode).toBe(200)
    const secondBody = second.json()
    expect(secondBody.id).toBe(firstBody.id)
    expect(secondBody.status).toBe('PENDING')
})

test('step 1) charges: same idempotency key + different payload returns 409', async () => {
    const key = `key-${Math.random().toString(36).slice(2)}`
    await app.inject({
        method: 'POST',
        url: '/charges',
        payload: chargePayload({ idempotency_key: key, amount: 200 }),
    })
    const response = await app.inject({
        method: 'POST',
        url: '/charges',
        payload: chargePayload({ idempotency_key: key, amount: 500 }),
    })
    expect(response.statusCode).toBe(409)
})

test('step 1) charges: concurrency race - 2 simultaneous POSTs same key, one charge, same id', async () => {
    const payload = chargePayload()
    const [res1, res2] = await Promise.all([
        app.inject({ method: 'POST', url: '/charges', payload }),
        app.inject({ method: 'POST', url: '/charges', payload }),
    ])
    expect([res1.statusCode, res2.statusCode].sort()).toEqual([200, 201])
    const body1 = res1.json()
    const body2 = res2.json()
    expect(body1.id).toBe(body2.id)
    const { rows } = await pool.query(
        'SELECT id FROM charges WHERE idempotency_key = $1',
        [payload.idempotency_key]
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(body1.id)
})

test('step 2) charge_events: with every charge created a charge event is created with status PENDING', async () => {
    const key = `key-${Math.random().toString(36).slice(2)}`
    const payload = chargePayload({ amount: 1000, idempotency_key: key })
    const response1 = await app.inject({
        method: 'POST', url: '/charges', payload,
    })
    const chargeId = response1.json().id
    const response2 = await app.inject({
        method: 'GET',
        url: `/charges/${chargeId}/events`
    })
    expect(response2.statusCode).toBe(200)
    const body = response2.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(body[0].status).toBe('PENDING')
})

test('step 2) If event insert fails, charge is not persisted', async () => {
    const key = `key-${Math.random().toString(36).slice(2)}`

    const response = await app.inject({
        method: 'POST',
        url: '/charges',
        headers: {
            'x-test-fail-event': 'true',
        },
        payload: chargePayload({ idempotency_key: key }),
    })

    // 1️⃣ API should fail
    expect(response.statusCode).toBe(500)

    // 2️⃣ Charge should NOT exist
    const { rows } = await pool.query(
        'SELECT * FROM charges WHERE idempotency_key = $1',
        [key]
    )

    expect(rows).toHaveLength(0)
})

test('step 3) charge_jobs: with every charge created a charge job is created with status PENDING', async () => {
    const key = `key-${Math.random().toString(36).slice(2)}`
    const payload = chargePayload({ amount: 1000, idempotency_key: key })
    const response = await app.inject({
        method: 'POST', url: '/charges', payload,
    })
    const chargeId = response.json().id
    const response2 = await app.inject({
        method: 'GET',
        url: `/charges/${chargeId}/jobs`
    })
    expect(response2.statusCode).toBe(200)
    const body = response2.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(body[0].status).toBe('PENDING')
})

