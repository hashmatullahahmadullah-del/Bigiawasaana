import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShoppingBag, Flame, Trash2 } from 'lucide-react'

export default function Home() {
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('bigi_cart') || '[]'))
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('category'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = []
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setMenu(items)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    localStorage.setItem('bigi_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (item) => {
    setCart([...cart, item])
    toast.success(`${item.name.toUpperCase()} ADDED TO BAG`)
  }

  const removeFromCart = (index) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    setCart(newCart)
  }

  const handleOrder = async (method = 'cloud') => {
    if (cart.length === 0) return toast.error('YOUR CART IS EMPTY')
    if (!customerName.trim()) return toast.error('PLEASE ENTER A NAME FOR THE ORDER')

    const total = cart.reduce((sum, item) => sum + Number(item.price), 0)
    const orderPayload = {
      customerName: customerName.trim(),
      items: cart.map(i => ({ name: i.name, price: Number(i.price) })),
      total: total.toFixed(2),
      status: 'pending',
      prepTime: 20,
      createdAt: serverTimestamp()
    }

    try {
      if (method === 'cloud') {
        const docRef = await addDoc(collection(db, 'orders'), orderPayload)
        setCart([])
        navigate(`/order/${docRef.id}`)
      } else {
        orderPayload.source = 'whatsapp'
        const docRef = await addDoc(collection(db, 'orders'), orderPayload)
        const itemsText = cart.map(i => `🔥 ${i.name} ($${i.price})`).join('%0A')
        const msg = `Salam! New order from ${customerName}:%0A%0A${itemsText}%0A%0ATOTAL: $${total.toFixed(2)}`
        window.open(`https://wa.me/13237986120?text=${msg}`, '_blank')
        setCart([])
        setTimeout(() => navigate(`/order/${docRef.id}`), 1000)
      }
    } catch (err) {
      toast.error('ORDER FAILED. PLEASE TRY WHATSAPP.')
    }
  }

  const filteredMenu = activeCategory === 'all' ? menu : menu.filter(m => m.category === activeCategory)
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price), 0).toFixed(2)

  return (
    <div className="min-h-screen pb-20">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="Bigi Awasaana" className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-6 font-barlow tracking-widest text-xs uppercase font-bold">
            <a href="#menu" className="text-muted-foreground hover:text-white transition-colors hidden sm:block">Menu</a>
            <a href="tel:+13237986120" className="text-primary hover:text-orange-400 transition-colors">(323) 798-6120</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-20 container mx-auto px-4 flex flex-col items-center text-center">
        <Badge variant="outline" className="mb-6 font-barlow tracking-widest text-primary border-primary">100% ZABIHA HALAL</Badge>
        <h1 className="font-lalezar text-6xl md:text-8xl lg:text-9xl leading-[0.85] mb-6">
          AFGHAN<br />STREET<br /><span className="text-primary">FLAVOR.</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
          A family recipe. A lifetime of resilience. Now on the streets of Reseda — every night from 6PM to 2AM.
        </p>
        <a href="#menu">
          <Button size="lg" className="font-barlow tracking-widest uppercase font-bold">Explore The Menu</Button>
        </a>
      </header>

      {/* Menu Section */}
      <section id="menu" className="container mx-auto px-4 py-16 border-t border-border/50">
        <div className="text-center mb-12">
          <h2 className="font-lalezar text-4xl mb-2">The Menu</h2>
          <p className="text-muted-foreground font-barlow tracking-widest uppercase text-sm">Handcrafted &middot; Coal-fired &middot; Made to order</p>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide justify-start sm:justify-center">
          {['all', 'wraps', 'platters', 'sides', 'drinks'].map(cat => (
            <Button 
              key={cat} 
              variant={activeCategory === cat ? 'default' : 'outline'}
              onClick={() => setActiveCategory(cat)}
              className="font-barlow tracking-widest uppercase rounded-sm"
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenu.map(item => (
            <Card key={item.id} className={`overflow-hidden rounded-md border-border/50 bg-card ${!item.available ? 'opacity-50 grayscale' : ''}`}>
              <div className="relative h-64 w-full">
                <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80' }} />
                {item.isSpecial && (
                  <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground font-barlow tracking-widest uppercase">Daily Special</Badge>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="font-barlow text-2xl uppercase tracking-wide">{item.name}</CardTitle>
                  <span className="font-barlow text-xl font-bold text-primary">${Number(item.price).toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground min-h-[40px]">{item.description}</p>
              </CardHeader>
              <CardFooter>
                {item.available ? (
                  <Button className="w-full font-barlow tracking-widest uppercase font-bold" onClick={() => addToCart(item)}>
                    Add To Order
                  </Button>
                ) : (
                  <div className="w-full text-center py-2 border rounded font-barlow tracking-widest uppercase font-bold text-muted-foreground">Sold Out</div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Cart FAB & Sheet */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
          <Button size="lg" className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl flex items-center justify-center gap-2 font-barlow tracking-widest z-40 bg-primary hover:bg-primary/90 text-white border-4 border-background">
            <ShoppingBag className="h-6 w-6" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background">
                {cart.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col w-full sm:max-w-md bg-background border-l border-border p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="font-barlow tracking-widest uppercase text-2xl text-left">Your Order</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 font-barlow tracking-widest uppercase">Bag is empty</div>
            ) : (
              cart.map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-border/50 pb-4">
                  <div>
                    <div className="font-barlow font-bold uppercase tracking-wide">{item.name}</div>
                    <div className="text-primary font-bold text-sm">${Number(item.price).toFixed(2)}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(i)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t bg-card">
            <div className="mb-6">
              <label className="font-barlow text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 block">Order Name</label>
              <Input 
                placeholder="E.g., John Doe" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-background font-sans"
              />
            </div>
            <div className="flex justify-between items-center font-barlow font-bold text-2xl mb-6">
              <span>TOTAL</span>
              <span>${cartTotal}</span>
            </div>
            <div className="space-y-3">
              <Button size="lg" className="w-full font-barlow tracking-widest uppercase font-bold" onClick={() => handleOrder('cloud')}>
                Confirm Order
              </Button>
              <Button size="lg" variant="outline" className="w-full font-barlow tracking-widest uppercase font-bold border-green-500 text-green-500 hover:bg-green-500/10" onClick={() => handleOrder('whatsapp')}>
                Order via WhatsApp
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
