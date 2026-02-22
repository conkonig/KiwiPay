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
    // await pool.query('TRUNCATE TABLE charge_events, charges RESTART IDENTITY CASCADE')
    // await pool.end()
})

test('step 0) health', async () => {
    const response = await app.inject({
        method: 'GET',
        url: '/health'
    })
    expect(response.statusCode).toBe(200)
})

test('step 0) health/db', async () => {
    const response = await app.inject({
        method: 'GET',
        url: '/health/db'
    })
    expect(response.statusCode).toBe(200)
})
