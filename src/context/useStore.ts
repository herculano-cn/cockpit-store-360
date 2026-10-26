import { useState, useEffect } from 'react'
import type { OrderWithEvents, Product } from '../types/store'
import {
  SEED_ORDER_ID,
  getStoredProducts,
  getStoredOrder,
  fetchProductsApi,
  loadOrderApi,
} from '../services/storeService'

export function useStore() {
  // R3-1: seed synchronously from the in-memory seed constants (never []/null) so
  // SSR + first client paint render the full catalog and the populated CS-2048 card
  // with no hydration mismatch. fetchProductsApi()/loadOrderApi() refresh on mount.
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts())
  const [order, setOrder] = useState<OrderWithEvents>(() => getStoredOrder())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    Promise.all([fetchProductsApi(), loadOrderApi(SEED_ORDER_ID)])
      .then(([prods, ord]) => {
        setProducts(prods)
        setOrder(ord)
      })
      .finally(() => setIsLoaded(true))
  }, [])

  return {
    products,
    order,
    isLoaded,
  }
}
