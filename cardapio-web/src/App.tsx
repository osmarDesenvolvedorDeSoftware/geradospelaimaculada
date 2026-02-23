import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import MenuPage from './features/menu/MenuPage'
import CartPage from './features/cart/CartPage'
import PaymentPage from './features/payment/PaymentPage'
import OrderStatusPage from './features/order-status/OrderStatusPage'
import RestaurantPage from './features/restaurant/RestaurantPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30000 } },
})

type Page = 'menu' | 'cart' | 'payment' | 'order-status' | 'restaurant'

function AppContent() {
  const [page, setPage] = useState<Page>('menu')
  const [orderId, setOrderId] = useState<string | null>(null)

  // Roteamento simples baseado no localStorage e hash da URL
  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#/restaurante') {
      setPage('restaurant')
      return
    }

    const activeOrder = localStorage.getItem('cardapio_active_order')
    if (activeOrder) {
      setOrderId(activeOrder)
      setPage('order-status')
    }
  }, [])

  const goTo = (p: Page, id?: string) => {
    if (id) setOrderId(id)
    setPage(p)
    window.scrollTo(0, 0)
  }

  if (page === 'restaurant') return <RestaurantPage />

  if (page === 'cart')
    return <CartPage onBack={() => goTo('menu')} onOrderCreated={(id) => goTo('payment', id)} />

  if (page === 'payment' && orderId)
    return <PaymentPage orderId={orderId} onDeclared={() => goTo('order-status')} />

  if (page === 'order-status' && orderId)
    return (
      <OrderStatusPage
        orderId={orderId}
        onNewOrder={() => {
          localStorage.removeItem('cardapio_active_order')
          setOrderId(null)
          goTo('menu')
        }}
      />
    )

  return <MenuPage onOpenCart={() => goTo('cart')} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
