import type { OrderWithEvents, Product } from '../types/store'

// R3-3: pinned localStorage keys. The API is the source of truth; successful
// responses are mirrored to these keys and read back only when the API fails.
const PRODUCTS_STORAGE_KEY = 'cockpit_store_products_v1'
const ORDER_STORAGE_KEY = 'cockpit_store_order_v1'
const DATA_CHANGE_EVENT = 'cockpit_store_data_change'

export const SEED_ORDER_ID = 'CS-2048'

// R3-4: ascending createdAt so the catalog renders Orbit, Pulse, Wave in mockup order.
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-orbit',
    name: 'Orbit Headphones Pro',
    description: 'Som premium para qualquer jornada.',
    category: 'Áudio imersivo',
    price: 699,
    image: '/assets/hero_produtos.svg#orbit',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'prod-pulse',
    name: 'Pulse Watch S2',
    description: 'Seu ritmo, sob controle.',
    category: 'Wearables',
    price: 899,
    image: '/assets/hero_produtos.svg#pulse',
    createdAt: '2026-10-02T10:00:00.000Z',
  },
  {
    id: 'prod-wave',
    name: 'Wave Mini Speaker',
    description: 'Som potente em qualquer lugar.',
    category: 'Áudio conectado',
    price: 349,
    image: '/assets/hero_produtos.svg#wave',
    createdAt: '2026-10-03T10:00:00.000Z',
  },
]

// The single seed order, fully renderable so R3-1 can seed React state synchronously.
// statusLabel is the fixed before-state badge (the mockup's hardcoded before mode).
export const INITIAL_ORDER: OrderWithEvents = {
  id: SEED_ORDER_ID,
  productId: 'prod-orbit',
  productName: 'Orbit Headphones Pro',
  variant: 'Grafite',
  quantity: 1,
  total: 699,
  placedAt: '19/10/2026',
  statusLabel: 'Pedido confirmado',
}

// In-memory cache for SSR / fallback.
let inMemoryProducts: Product[] = [...INITIAL_PRODUCTS]
let inMemoryOrder: OrderWithEvents = INITIAL_ORDER

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/* ==================== LocalStorage Fallbacks ==================== */

export function getStoredProducts(): Product[] {
  if (!isBrowser() || typeof window.localStorage === 'undefined') {
    return inMemoryProducts
  }
  try {
    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS))
      return INITIAL_PRODUCTS
    }
    return JSON.parse(raw) as Product[]
  } catch (e) {
    console.error('Error reading products from localStorage:', e)
    return inMemoryProducts
  }
}

export function saveProducts(products: Product[]): void {
  inMemoryProducts = products
  if (isBrowser() && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products))
      window.dispatchEvent(new Event(DATA_CHANGE_EVENT))
    } catch (e) {
      console.error('Error saving products to localStorage:', e)
    }
  }
}

export function getStoredOrder(): OrderWithEvents {
  if (!isBrowser() || typeof window.localStorage === 'undefined') {
    return inMemoryOrder
  }
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(INITIAL_ORDER))
      return INITIAL_ORDER
    }
    return JSON.parse(raw) as OrderWithEvents
  } catch (e) {
    console.error('Error reading order from localStorage:', e)
    return inMemoryOrder
  }
}

export function saveOrder(order: OrderWithEvents): void {
  inMemoryOrder = order
  if (isBrowser() && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order))
      window.dispatchEvent(new Event(DATA_CHANGE_EVENT))
    } catch (e) {
      console.error('Error saving order to localStorage:', e)
    }
  }
}

/* ==================== Backend REST API Calls (SQLite Persisted) ==================== */

export async function fetchProductsApi(): Promise<Product[]> {
  try {
    const res = await fetch('/api/products')
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)
    const data = (await res.json()) as Product[]
    saveProducts(data)
    return data
  } catch (e) {
    console.warn('API /api/products unavailable, using fallback data:', e)
    return getStoredProducts()
  }
}

export async function loadOrderApi(id: string): Promise<OrderWithEvents> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)
    const data = (await res.json()) as OrderWithEvents
    saveOrder(data)
    return data
  } catch (e) {
    console.warn(`API /api/orders/${id} unavailable, using fallback data:`, e)
    return getStoredOrder()
  }
}
