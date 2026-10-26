export interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  image: string
  createdAt: string
}

export interface OrderWithEvents {
  id: string
  productId: string
  productName: string
  variant: string
  quantity: number
  total: number
  placedAt: string
  // Fixed before-state badge 'Pedido confirmado' (the mockup's hardcoded
  // before-mode status). No longer derived from events[currentStep].title.
  statusLabel: string
}
