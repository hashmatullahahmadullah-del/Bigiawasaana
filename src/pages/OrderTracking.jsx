import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

export default function OrderTracking() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'orders', id), (docSnap) => {
      if (docSnap.exists()) {
        setOrder(docSnap.data())
      } else {
        setError(true)
      }
    }, () => setError(true))
    return () => unsub()
  }, [id])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="font-lalezar text-4xl mb-4">ORDER NOT FOUND</h1>
        <p className="text-muted-foreground mb-8">This order may have been completed or cancelled.</p>
        <Link to="/"><Button className="font-barlow tracking-widest uppercase">Back to Menu</Button></Link>
      </div>
    )
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center font-barlow tracking-widest uppercase animate-pulse">Loading order...</div>
  }

  const getProgress = () => {
    switch(order.status) {
      case 'pending': return 33;
      case 'preparing': return 66;
      case 'ready': return 100;
      case 'completed': return 100;
      default: return 0;
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto flex flex-col pt-12">
      <div className="text-center mb-12">
        <Link to="/">
          <img src="/logo.png" alt="Bigi Awasaana Logo" className="h-20 w-auto mx-auto mb-4" />
        </Link>
        <p className="font-barlow text-xs text-muted-foreground tracking-widest uppercase">Order Tracking</p>
        <h1 className="font-barlow text-2xl font-bold uppercase mt-2">{order.customerName}</h1>
      </div>

      <Card className="mb-8 border-primary/20 bg-primary/5 text-center p-6">
        <div className="font-barlow text-xs text-muted-foreground tracking-widest uppercase mb-2">Current Status</div>
        <div className="font-lalezar text-4xl text-primary uppercase">{order.status}</div>
      </Card>

      <div className="mb-12">
        <Progress value={getProgress()} className="h-2 mb-6" />
        <div className="flex justify-between font-barlow text-xs tracking-widest uppercase text-muted-foreground font-bold">
          <span className={order.status === 'pending' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 'text-primary' : ''}>Received</span>
          <span className={order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 'text-primary' : ''}>Preparing</span>
          <span className={order.status === 'ready' || order.status === 'completed' ? 'text-green-500' : ''}>Ready</span>
        </div>
      </div>

      {order.status === 'ready' && (
        <div className="bg-green-600 text-white text-center p-6 rounded-md font-barlow font-bold text-xl tracking-widest uppercase mb-8 animate-bounce">
          YOUR ORDER IS READY — COME TO THE WINDOW
        </div>
      )}

      {order.status === 'completed' && (
        <Card className="mb-8 border-primary/20 bg-card p-6 text-center">
          <div className="text-2xl mb-2">⭐⭐⭐⭐⭐</div>
          <h3 className="font-barlow font-bold text-lg tracking-widest uppercase mb-2">Enjoyed your meal?</h3>
          <p className="text-sm text-muted-foreground mb-4">Leave us a quick Google review — it helps our family business more than you know.</p>
          <a href="https://share.google/ZX9dlaVM85GJ93PGY" target="_blank" rel="noreferrer">
            <Button className="w-full font-barlow tracking-widest uppercase">★ Leave a Google Review</Button>
          </a>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-barlow text-sm tracking-widest uppercase text-muted-foreground">Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span className="text-primary font-bold">${item.price}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-barlow text-xl font-bold pt-4 border-t border-border/50">
            <span>Total</span>
            <span>${order.total}</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-xs text-muted-foreground border border-border/50 p-4 rounded bg-card/50">
        Cash accepted at pickup &middot; Card payments coming soon
      </div>
    </div>
  )
}
