import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import type { OrderWithEvents, Product } from '../types/store'
import { INITIAL_PRODUCTS, INITIAL_ORDER } from '../services/storeService'

const DB_DIR = path.resolve(process.cwd(), 'data')
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}
const DB_PATH = path.join(DB_DIR, 'store.db')

let dbInstance: InstanceType<typeof Database> | null = null

export function getDatabase(): InstanceType<typeof Database> {
  if (dbInstance) {
    return dbInstance
  }

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  // Schema creation. order_events DDL is kept for schema stability even though the
  // timeline feature was removed; nothing reads it anymore.
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price REAL NOT NULL,
      image TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      variant TEXT,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      placed_at TEXT NOT NULL,
      current_step INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  // Check if seed needed
  const countRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
  if (countRow.count === 0) {
    seedDatabase(db)
  }

  dbInstance = db
  return dbInstance
}

export function seedDatabase(db: InstanceType<typeof Database> = getDatabase()) {
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, description, category, price, image, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, product_id, product_name, variant, quantity, total, placed_at, current_step)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    // Clear any pre-existing order_events rows (timeline feature removed); nothing
    // re-seeds them, keeping the DB clean of data no code reads.
    db.prepare('DELETE FROM order_events').run()
    db.prepare('DELETE FROM orders').run()
    db.prepare('DELETE FROM products').run()

    // Products seeded with ascending created_at (matches INITIAL_PRODUCTS order).
    for (const p of INITIAL_PRODUCTS) {
      insertProduct.run(p.id, p.name, p.description || '', p.category || '', p.price, p.image, p.createdAt)
    }

    // current_step is kept as a column for schema stability but no longer drives
    // any UI; the before card uses a fixed status badge. Write a literal 0.
    insertOrder.run(
      INITIAL_ORDER.id,
      INITIAL_ORDER.productId,
      INITIAL_ORDER.productName,
      INITIAL_ORDER.variant,
      INITIAL_ORDER.quantity,
      INITIAL_ORDER.total,
      INITIAL_ORDER.placedAt,
      0
    )
  })

  transaction()
}

export function getAllProducts(): Product[] {
  const db = getDatabase()
  // R3-4: ASC ordering is an intentional divergence from stockcontrol's DESC so
  // products render in mockup order: Orbit, Pulse, Wave.
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at ASC').all() as Array<{
    id: string
    name: string
    description: string
    category: string
    price: number
    image: string
    created_at: string
  }>

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    price: r.price,
    image: r.image,
    createdAt: r.created_at,
  }))
}

// Minimal order read for the before card. The timeline was removed, so this no
// longer queries order_events or derives per-step status; statusLabel is the
// fixed before-state badge 'Pedido confirmado' (the mockup's hardcoded value).
export function getOrderWithEvents(id: string): OrderWithEvents | null {
  const db = getDatabase()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as
    | {
        id: string
        product_id: string
        product_name: string
        variant: string
        quantity: number
        total: number
        placed_at: string
      }
    | undefined

  if (!order) return null

  return {
    id: order.id,
    productId: order.product_id,
    productName: order.product_name,
    variant: order.variant,
    quantity: order.quantity,
    total: order.total,
    placedAt: order.placed_at,
    statusLabel: 'Pedido confirmado',
  }
}
