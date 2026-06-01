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
    <div className="min-h-screen pb-20 bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="Bigi Awasaana" className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-6 font-barlow tracking-widest text-xs uppercase font-bold">
            <a href="#menu" className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Menu</a>
            <a href="tel:+13237986120" className="text-primary hover:text-primary/80 transition-colors">(323) 798-6120</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="py-24 container mx-auto px-4 flex flex-col items-center text-center">
        <div className="flex flex-col items-center max-w-3xl">
          <Badge variant="outline" className="mb-8 px-4 py-1 font-barlow tracking-widest text-primary border-primary/50">100% ZABIHA HALAL</Badge>
          <h1 className="font-lalezar text-7xl md:text-8xl lg:text-9xl leading-none mb-6">
            AFGHAN<br />STREET<br />
            <span className="text-primary">FLAVOR.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10 font-light max-w-md">
            A family recipe. A lifetime of resilience. Now on the streets of Reseda — every night from <strong className="text-foreground">6PM to 2AM</strong>.
          </p>
          <a href="#menu">
            <Button size="lg" className="font-barlow tracking-widest uppercase font-bold">
              Explore The Menu
            </Button>
          </a>
        </div>
      </header>

      {/* Menu Section */}
      <section id="menu" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="font-lalezar text-5xl mb-2 text-foreground">The Menu</h2>
          <p className="text-primary font-barlow tracking-[0.2em] uppercase text-sm font-bold">Handcrafted &middot; Coal-fired &middot; Made to order</p>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 justify-start sm:justify-center scrollbar-hide">
          {['all', 'wraps', 'platters', 'sides', 'drinks'].map(cat => (
            <Button 
              key={cat} 
              variant={activeCategory === cat ? 'default' : 'outline'}
              onClick={() => setActiveCategory(cat)}
              className="font-barlow tracking-widest uppercase rounded-md"
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenu.map(item => (
            <Card key={item.id} className={`overflow-hidden flex flex-col transition-opacity ${!item.available ? 'opacity-60' : ''}`}>
              <div className="relative h-64 w-full overflow-hidden bg-muted">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="object-cover w-full h-full" 
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80' }} 
                />
                {item.isSpecial && (
                  <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground font-barlow tracking-widest uppercase">
                    <Flame className="w-3 h-3 mr-1 inline-block" /> Daily Special
                  </Badge>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent flex justify-between items-end">
                  <h3 className="font-barlow text-2xl uppercase tracking-wide text-foreground">{item.name}</h3>
                  <span className="font-barlow text-xl font-bold text-primary">${Number(item.price).toFixed(2)}</span>
                </div>
              </div>
              
              <CardContent className="pt-6 flex-1">
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
              
              <CardFooter className="pt-0">
                {item.available ? (
                  <Button 
                    className="w-full font-barlow tracking-widest uppercase" 
                    onClick={() => addToCart(item)}
                  >
                    Add To Bag
                  </Button>
                ) : (
                  <Button variant="secondary" className="w-full font-barlow tracking-widest uppercase" disabled>
                    Sold Out
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Cart FAB & Sheet */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
          <div className="fixed bottom-8 right-8 z-50">
            <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
              <ShoppingBag className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-black w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>
        </SheetTrigger>
        <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="font-barlow tracking-widest uppercase text-xl flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> Your Order
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <ShoppingBag className="w-12 h-12 opacity-50" />
                <span className="font-barlow tracking-widest uppercase">Your bag is empty</span>
              </div>
            ) : (
              cart.map((item, i) => (
                <Card key={i} className="flex justify-between items-center p-4">
                  <div>
                    <div className="font-barlow font-bold uppercase tracking-wide">{item.name}</div>
                    <div className="text-primary font-bold text-sm">${Number(item.price).toFixed(2)}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))
            )}
          </div>

          <div className="p-6 border-t border-border bg-card">
            <div className="mb-4">
              <label className="font-barlow text-xs font-bold tracking-widest text-primary uppercase mb-2 block">Order Name</label>
              <Input 
                placeholder="E.g., John Doe" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)}
                className="font-sans"
              />
            </div>
            <div className="flex justify-between items-center font-barlow font-bold text-2xl mb-6">
              <span className="tracking-widest uppercase">Total</span>
              <span className="text-primary">${cartTotal}</span>
            </div>
            <div className="space-y-2">
              <Button size="lg" className="w-full font-barlow tracking-widest uppercase" onClick={() => handleOrder('cloud')}>
                Confirm Order
              </Button>
              <Button size="lg" variant="outline" className="w-full font-barlow tracking-widest uppercase" onClick={() => handleOrder('whatsapp')}>
                Order via WhatsApp
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
