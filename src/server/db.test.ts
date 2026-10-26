// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// db.ts resolves its data/ dir from process.cwd() at import time and keeps a
// singleton connection, so we point cwd at a fresh temp dir BEFORE importing it.
let tmpDir: string
const originalCwd = process.cwd()

let db: typeof import('./db')

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-store-db-'))
  process.chdir(tmpDir)
  db = await import('./db')
  // Force seeding on the fresh DB.
  db.getDatabase()
})

afterAll(() => {
  process.chdir(originalCwd)
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('getAllProducts', () => {
  it('returns 3 products in Orbit, Pulse, Wave order (R3-4 ASC)', () => {
    const products = db.getAllProducts()
    expect(products).toHaveLength(3)
    expect(products.map((p) => p.name)).toEqual([
      'Orbit Headphones Pro',
      'Pulse Watch S2',
      'Wave Mini Speaker',
    ])
    expect(products[0].image).toBe('/assets/hero_produtos.svg#orbit')
  })
})

describe('getOrderWithEvents', () => {
  it('returns the minimal CS-2048 order with the fixed before-state statusLabel', () => {
    db.seedDatabase()
    const order = db.getOrderWithEvents('CS-2048')
    expect(order).not.toBeNull()
    expect(order!.id).toBe('CS-2048')
    expect(order!.productName).toBe('Orbit Headphones Pro')
    expect(order!.statusLabel).toBe('Pedido confirmado')
  })

  it('returns null for an unknown order id', () => {
    expect(db.getOrderWithEvents('NOPE')).toBeNull()
  })
})

describe('seedDatabase', () => {
  it('is idempotent on reset', () => {
    db.seedDatabase()
    const order = db.getOrderWithEvents('CS-2048')
    expect(order!.id).toBe('CS-2048')
    expect(db.getAllProducts()).toHaveLength(3)
  })
})
