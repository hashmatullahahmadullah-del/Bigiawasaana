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
import { motion, AnimatePresence } from 'framer-motion'

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden bg-background">
      {/* Ambient glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* Navbar - Glassmorphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="Bigi Awasaana" className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,107,0,0.3)]" />
          </Link>
          <div className="flex items-center gap-6 font-barlow tracking-widest text-xs uppercase font-bold">
            <a href="#menu" className="text-white/60 hover:text-white transition-colors hidden sm:block">Menu</a>
            <a href="tel:+13237986120" className="text-primary hover:text-orange-400 transition-colors drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]">(323) 798-6120</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-40 pb-32 container mx-auto px-4 flex flex-col items-center text-center relative">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="z-10 flex flex-col items-center">
          <Badge variant="outline" className="mb-8 px-4 py-1 font-barlow tracking-widest text-primary border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(255,107,0,0.2)]">100% ZABIHA HALAL</Badge>
          <h1 className="font-lalezar text-7xl md:text-8xl lg:text-9xl leading-[0.85] mb-8 drop-shadow-2xl">
            AFGHAN<br />STREET<br />
            <motion.span 
              initial={{ color: '#fff' }} 
              animate={{ color: '#FF6B00' }} 
              transition={{ delay: 0.5, duration: 1 }}
            >
              FLAVOR.
            </motion.span>
          </h1>
          <p className="text-white/70 max-w-md mx-auto mb-10 text-lg leading-relaxed font-light">
            A family recipe. A lifetime of resilience. Now on the streets of Reseda — every night from <strong className="text-white">6PM to 2AM</strong>.
          </p>
          <a href="#menu">
            <Button size="lg" className="h-14 px-10 text-lg rounded-full font-barlow tracking-[0.2em] uppercase font-bold shadow-[0_0_30px_rgba(255,107,0,0.4)] hover:shadow-[0_0_50px_rgba(255,107,0,0.6)] transition-all hover:-translate-y-1">
              Explore The Menu
            </Button>
          </a>
        </motion.div>
      </header>

      {/* Menu Section */}
      <section id="menu" className="container mx-auto px-4 py-24 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        <div className="text-center mb-16">
          <h2 className="font-lalezar text-5xl mb-4 text-white drop-shadow-md">The Menu</h2>
          <p className="text-primary font-barlow tracking-[0.3em] uppercase text-sm font-bold">Handcrafted &middot; Coal-fired &middot; Made to order</p>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-12 scrollbar-hide justify-start sm:justify-center">
          {['all', 'wraps', 'platters', 'sides', 'drinks'].map(cat => (
            <Button 
              key={cat} 
              variant={activeCategory === cat ? 'default' : 'outline'}
              onClick={() => setActiveCategory(cat)}
              className={`font-barlow tracking-widest uppercase rounded-full px-6 transition-all ${
                activeCategory === cat 
                  ? 'shadow-[0_0_15px_rgba(255,107,0,0.3)]' 
                  : 'border-white/10 text-white/60 hover:text-white hover:border-white/30 bg-white/5'
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Grid - Glassmorphism */}
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="visible" 
          key={activeCategory} // Force re-animation on category change
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {filteredMenu.map(item => (
            <motion.div variants={itemVariants} key={item.id}>
              <Card className={`overflow-hidden h-full flex flex-col rounded-2xl border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 group ${!item.available ? 'opacity-50 grayscale' : ''}`}>
                <div className="relative h-72 w-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" 
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80' }} 
                  />
                  {item.isSpecial && (
                    <Badge className="absolute top-4 left-4 z-20 bg-primary/90 backdrop-blur text-primary-foreground font-barlow tracking-widest uppercase border-none shadow-[0_0_10px_rgba(255,107,0,0.5)]">
                      <Flame className="w-3 h-3 mr-1 inline-block" /> Daily Special
                    </Badge>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
                    <CardTitle className="font-barlow text-3xl uppercase tracking-wide text-white leading-none drop-shadow-md">{item.name}</CardTitle>
                    <span className="font-barlow text-2xl font-bold text-primary drop-shadow-[0_0_5px_rgba(255,107,0,0.8)]">${Number(item.price).toFixed(2)}</span>
                  </div>
                </div>
                
                <CardContent className="pt-6 flex-1 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <p className="text-sm text-white/60 min-h-[40px] leading-relaxed font-light">{item.description}</p>
                </CardContent>
                
                <CardFooter className="bg-white/[0.02] border-t border-white/5 pt-4">
                  {item.available ? (
                    <Button 
                      className="w-full font-barlow tracking-[0.15em] uppercase font-bold h-12 rounded-xl transition-all group-hover:shadow-[0_0_20px_rgba(255,107,0,0.3)]" 
                      onClick={() => addToCart(item)}
                    >
                      Add To Bag
                    </Button>
                  ) : (
                    <div className="w-full text-center py-3 border border-white/10 rounded-xl font-barlow tracking-widest uppercase font-bold text-white/40 bg-white/5">Sold Out</div>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Cart FAB & Sheet - Glassmorphism */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <Button size="icon" className="h-16 w-16 rounded-full shadow-[0_10px_40px_rgba(255,107,0,0.5)] bg-primary text-white border-2 border-primary-foreground/20 hover:bg-primary/90">
              <ShoppingBag className="h-6 w-6" />
              <AnimatePresence>
                {cart.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-2 -right-2 bg-white text-black w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background shadow-lg"
                  >
                    {cart.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </SheetTrigger>
        <SheetContent className="flex flex-col w-full sm:max-w-md bg-black/80 backdrop-blur-3xl border-l border-white/10 p-0 shadow-2xl">
          <SheetHeader className="p-6 border-b border-white/10 bg-white/5">
            <SheetTitle className="font-barlow tracking-[0.2em] uppercase text-2xl text-left text-white flex items-center gap-3">
              <ShoppingBag className="text-primary" /> Your Order
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
                <ShoppingBag className="w-16 h-16 opacity-50" />
                <span className="font-barlow tracking-widest uppercase text-lg">Your bag is empty</span>
              </div>
            ) : (
              <AnimatePresence>
                {cart.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    key={i} 
                    className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl"
                  >
                    <div>
                      <div className="font-barlow font-bold uppercase tracking-wide text-lg">{item.name}</div>
                      <div className="text-primary font-bold">${Number(item.price).toFixed(2)}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(i)} className="text-white/40 hover:text-destructive hover:bg-destructive/20 rounded-full">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="mb-6">
              <label className="font-barlow text-xs font-bold tracking-[0.2em] text-primary uppercase mb-3 block">Order Name</label>
              <Input 
                placeholder="E.g., John Doe" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-black/50 border-white/20 text-white placeholder:text-white/30 font-sans h-12 rounded-xl focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
            <div className="flex justify-between items-center font-barlow font-bold text-3xl mb-6 text-white">
              <span className="tracking-widest">TOTAL</span>
              <span className="text-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]">${cartTotal}</span>
            </div>
            <div className="space-y-3">
              <Button size="lg" className="w-full h-14 rounded-xl font-barlow tracking-widest uppercase font-bold text-lg shadow-[0_0_20px_rgba(255,107,0,0.3)]" onClick={() => handleOrder('cloud')}>
                Confirm Order
              </Button>
              <Button size="lg" variant="outline" className="w-full h-14 rounded-xl font-barlow tracking-widest uppercase font-bold border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20 hover:text-green-300 transition-colors" onClick={() => handleOrder('whatsapp')}>
                Order via WhatsApp
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
