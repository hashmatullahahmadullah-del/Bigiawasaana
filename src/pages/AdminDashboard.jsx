import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { db, auth } from '../firebase'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Line } from 'react-chartjs-2'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [menu, setMenu] = useState([])
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate('/login')
    })
    return () => unsub()
  }, [navigate])

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const unsubOrders = onSnapshot(qOrders, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    const qMenu = query(collection(db, 'menu'), orderBy('category'))
    const unsubMenu = onSnapshot(qMenu, snap => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    return () => { unsubOrders(); unsubMenu(); }
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const updateOrderStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status })
      toast.success(`Order marked as ${status}`)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const deleteOrder = async (id) => {
    if (!confirm('Cancel this order?')) return
    try {
      await deleteDoc(doc(db, 'orders', id))
      toast.success('Order canceled')
    } catch (err) {
      toast.error('Failed to cancel order')
    }
  }

  const toggleMenuItem = async (id, field, currentVal) => {
    try {
      await updateDoc(doc(db, 'menu', id), { [field]: !currentVal })
      toast.success('Menu updated')
    } catch (err) {
      toast.error('Failed to update menu')
    }
  }

  const saveMenuItem = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const data = {
      name: form.get('name'),
      category: form.get('category'),
      price: Number(form.get('price')),
      description: form.get('description'),
      imageUrl: form.get('imageUrl'),
      available: form.get('available') === 'on',
      isSpecial: form.get('isSpecial') === 'on'
    }
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'menu', editingItem.id), data)
        toast.success('Item updated')
      } else {
        await addDoc(collection(db, 'menu'), { ...data, createdAt: new Date() })
        toast.success('Item added')
      }
      setIsMenuDialogOpen(false)
      setEditingItem(null)
    } catch (err) {
      toast.error('Failed to save item')
    }
  }

  const activeOrders = orders.filter(o => o.status !== 'completed')
  const today = new Date(); today.setHours(0,0,0,0)
  const dailySales = orders.filter(o => o.createdAt && new Date(o.createdAt.seconds * 1000) >= today)
                           .reduce((sum, o) => sum + Number(o.total || 0), 0)

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Sales ($)',
      data: [0, 0, 0, 0, dailySales, 0, 0],
      borderColor: '#FF6B00',
      backgroundColor: 'rgba(255, 107, 0, 0.2)',
      fill: true,
      tension: 0.4
    }]
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/">
             <img src="/logo.png" alt="Logo" className="h-10 drop-shadow-[0_0_10px_rgba(255,107,0,0.5)]" />
          </Link>
          <h1 className="font-barlow text-2xl tracking-widest uppercase font-bold text-white drop-shadow-md hidden sm:block">Commander Dashboard</h1>
        </div>
        <Button variant="outline" onClick={handleLogout} className="font-barlow tracking-widest uppercase border-white/20 text-white hover:bg-white/10">Sign Out</Button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full z-10 pt-10">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-10 bg-black/50 border border-white/10 rounded-xl p-1 backdrop-blur-md">
            <TabsTrigger value="orders" className="font-barlow tracking-widest uppercase text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Live Orders</TabsTrigger>
            <TabsTrigger value="menu" className="font-barlow tracking-widest uppercase text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Menu Manager</TabsTrigger>
            <TabsTrigger value="stats" className="font-barlow tracking-widest uppercase text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Analytics</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {activeOrders.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 text-center text-white/40 font-barlow tracking-widest uppercase text-xl">No active orders</motion.div>
                ) : activeOrders.map(order => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.9 }} 
                    key={order.id}
                  >
                    <Card className={`overflow-hidden border-t-4 border-l-0 border-r-0 border-b border-white/10 bg-black/60 backdrop-blur-xl shadow-xl transition-all ${order.status === 'pending' ? 'border-t-primary' : order.status === 'preparing' ? 'border-t-yellow-500' : 'border-t-green-500'}`}>
                      <CardHeader className="pb-4 bg-white/[0.02]">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="font-barlow text-2xl uppercase tracking-widest text-white">{order.customerName}</CardTitle>
                            <p className="text-xs text-primary font-bold uppercase tracking-wider">{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}</p>
                          </div>
                          <Badge variant="outline" className={`uppercase font-barlow tracking-widest border-white/20 ${order.status === 'ready' ? 'bg-green-500/20 text-green-400' : ''}`}>{order.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm py-4">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between py-2 border-b border-white/10 last:border-0 text-white/80">
                            <span>{item.name}</span>
                            <span className="text-primary font-bold">${item.price}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-6 font-barlow text-2xl font-bold text-white">
                          <span className="tracking-widest">TOTAL</span>
                          <span className="text-primary drop-shadow-[0_0_5px_rgba(255,107,0,0.5)]">${order.total}</span>
                        </div>
                      </CardContent>
                      <div className="p-4 bg-white/[0.02] border-t border-white/10 flex gap-3">
                        {order.status === 'pending' && <Button className="flex-1 font-barlow tracking-widest uppercase font-bold" onClick={() => updateOrderStatus(order.id, 'preparing')}>Prepare</Button>}
                        {order.status === 'preparing' && <Button className="flex-1 font-barlow tracking-widest uppercase font-bold bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]" onClick={() => updateOrderStatus(order.id, 'ready')}>Mark Ready</Button>}
                        {order.status === 'ready' && <Button className="flex-1 font-barlow tracking-widest uppercase font-bold border-white/20 text-white hover:bg-white/10" variant="outline" onClick={() => updateOrderStatus(order.id, 'completed')}>Complete</Button>}
                        <Button variant="ghost" className="text-destructive hover:bg-destructive/20 hover:text-red-400 font-barlow tracking-widest uppercase" onClick={() => deleteOrder(order.id)}>Cancel</Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
              <h2 className="font-lalezar text-5xl text-white drop-shadow-md">Menu Items</h2>
              <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingItem(null)} className="font-barlow tracking-widest uppercase shadow-[0_0_15px_rgba(255,107,0,0.4)]">Add New Item</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-black/90 backdrop-blur-3xl border-white/20">
                  <DialogHeader>
                    <DialogTitle className="font-barlow text-2xl text-white uppercase tracking-widest">{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={saveMenuItem} className="grid gap-6 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-white/70 font-barlow tracking-widest uppercase">Name</Label>
                      <Input id="name" name="name" defaultValue={editingItem?.name} required className="bg-white/5 border-white/20 text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="category" className="text-white/70 font-barlow tracking-widest uppercase">Category</Label>
                        <Input id="category" name="category" defaultValue={editingItem?.category || 'wraps'} required className="bg-white/5 border-white/20 text-white" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="price" className="text-white/70 font-barlow tracking-widest uppercase">Price ($)</Label>
                        <Input id="price" name="price" type="number" step="0.01" defaultValue={editingItem?.price} required className="bg-white/5 border-white/20 text-white" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description" className="text-white/70 font-barlow tracking-widest uppercase">Description</Label>
                      <Input id="description" name="description" defaultValue={editingItem?.description} className="bg-white/5 border-white/20 text-white" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="imageUrl" className="text-white/70 font-barlow tracking-widest uppercase">Image URL</Label>
                      <Input id="imageUrl" name="imageUrl" defaultValue={editingItem?.imageUrl} className="bg-white/5 border-white/20 text-white" />
                    </div>
                    <div className="flex gap-6 mt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" name="available" defaultChecked={editingItem ? editingItem.available : true} className="w-4 h-4 accent-primary" />
                        <span className="font-barlow tracking-widest uppercase text-white">In Stock</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" name="isSpecial" defaultChecked={editingItem?.isSpecial} className="w-4 h-4 accent-primary" />
                        <span className="font-barlow tracking-widest uppercase text-white">Daily Special</span>
                      </label>
                    </div>
                    <Button type="submit" className="mt-6 font-barlow tracking-widest uppercase h-12">Save Item</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-white/10 rounded-xl overflow-hidden bg-black/40 backdrop-blur-xl shadow-2xl">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-barlow tracking-widest uppercase text-white/60">Item</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase text-white/60">Category</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase text-white/60">Price</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase text-white/60">Stock</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase text-white/60">Special</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase text-white/60 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menu.map((item) => (
                    <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-medium flex items-center gap-4 py-4">
                        <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/10 shadow-lg" />
                        <span className="text-white font-bold">{item.name}</span>
                      </TableCell>
                      <TableCell className="capitalize text-white/70">{item.category}</TableCell>
                      <TableCell className="text-primary font-bold">${Number(item.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`cursor-pointer tracking-widest border-white/10 ${item.available ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-red-400'}`} onClick={() => toggleMenuItem(item.id, 'available', item.available)}>
                          {item.available ? 'IN STOCK' : 'SOLD OUT'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`cursor-pointer tracking-widest border-white/10 ${item.isSpecial ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_10px_rgba(255,107,0,0.2)]' : 'text-white/40'}`} onClick={() => toggleMenuItem(item.id, 'isSpecial', item.isSpecial)}>
                          {item.isSpecial ? 'SPECIAL' : 'NORMAL'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 space-x-2">
                        <Button variant="ghost" size="sm" className="font-barlow tracking-widest uppercase text-white hover:bg-white/10" onClick={() => { setEditingItem(item); setIsMenuDialogOpen(true) }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="font-barlow tracking-widest uppercase text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={async () => { if(confirm('Delete?')) await deleteDoc(doc(db, 'menu', item.id)) }}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white/50 uppercase tracking-widest font-barlow">Daily Sales</CardTitle></CardHeader>
                <CardContent><div className="text-6xl font-lalezar text-primary drop-shadow-[0_0_10px_rgba(255,107,0,0.4)]">${dailySales.toFixed(2)}</div></CardContent>
              </Card>
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white/50 uppercase tracking-widest font-barlow">Active Orders</CardTitle></CardHeader>
                <CardContent><div className="text-6xl font-lalezar text-white drop-shadow-md">{activeOrders.length}</div></CardContent>
              </Card>
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white/50 uppercase tracking-widest font-barlow">Items Out of Stock</CardTitle></CardHeader>
                <CardContent><div className="text-6xl font-lalezar text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">{menu.filter(m => !m.available).length}</div></CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-8 bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
                <h3 className="font-barlow tracking-widest uppercase mb-6 text-white/70 text-lg">Weekly Revenue (Simulation)</h3>
                <div className="h-80">
                  <Line data={chartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }, x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } } }, plugins: { legend: { display: false } } }} />
                </div>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
