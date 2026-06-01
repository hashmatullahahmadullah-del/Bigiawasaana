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

    return () => { unsubOrders(); unsubMenu() }
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
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      fill: true,
      tension: 0.4
    }]
  }

  const statusColor = (status) => {
    if (status === 'pending') return 'border-t-primary'
    if (status === 'preparing') return 'border-t-yellow-500'
    if (status === 'ready') return 'border-t-green-500'
    return ''
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/"><img src="/logo.png" alt="Logo" className="h-10" /></Link>
          <h1 className="font-barlow text-xl tracking-widest uppercase font-bold hidden sm:block">Commander Dashboard</h1>
        </div>
        <Button variant="outline" onClick={handleLogout} className="font-barlow tracking-widest uppercase">Sign Out</Button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="orders" className="font-barlow tracking-widest uppercase text-sm">Live Orders</TabsTrigger>
            <TabsTrigger value="menu" className="font-barlow tracking-widest uppercase text-sm">Menu Manager</TabsTrigger>
            <TabsTrigger value="stats" className="font-barlow tracking-widest uppercase text-sm">Analytics</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeOrders.length === 0 ? (
                <div className="col-span-full py-32 text-center text-muted-foreground font-barlow tracking-widest uppercase text-lg">No active orders</div>
              ) : activeOrders.map(order => (
                <Card key={order.id} className={`overflow-hidden border-t-4 ${statusColor(order.status)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-barlow text-xl uppercase tracking-widest">{order.customerName}</CardTitle>
                        <p className="text-xs text-primary font-bold uppercase tracking-wider mt-1">
                          {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}
                        </p>
                      </div>
                      <Badge variant="outline" className="uppercase font-barlow tracking-widest">{order.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm pb-4">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                        <span>{item.name}</span>
                        <span className="text-primary font-bold">${item.price}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-4 font-barlow text-xl font-bold">
                      <span className="tracking-widest uppercase">Total</span>
                      <span className="text-primary">${order.total}</span>
                    </div>
                  </CardContent>
                  <div className="p-4 border-t border-border flex gap-2">
                    {order.status === 'pending' && <Button className="flex-1 font-barlow tracking-widest uppercase" onClick={() => updateOrderStatus(order.id, 'preparing')}>Prepare</Button>}
                    {order.status === 'preparing' && <Button className="flex-1 font-barlow tracking-widest uppercase" onClick={() => updateOrderStatus(order.id, 'ready')}>Mark Ready</Button>}
                    {order.status === 'ready' && <Button variant="outline" className="flex-1 font-barlow tracking-widest uppercase" onClick={() => updateOrderStatus(order.id, 'completed')}>Complete</Button>}
                    <Button variant="ghost" className="text-destructive font-barlow tracking-widest uppercase" onClick={() => deleteOrder(order.id)}>Cancel</Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-lalezar text-4xl">Menu Items</h2>
              <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingItem(null)} className="font-barlow tracking-widest uppercase">Add New Item</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="font-barlow text-xl uppercase tracking-widest">{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={saveMenuItem} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={editingItem?.name} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Input id="category" name="category" defaultValue={editingItem?.category || 'wraps'} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input id="price" name="price" type="number" step="0.01" defaultValue={editingItem?.price} required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" defaultValue={editingItem?.description} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="imageUrl">Image URL</Label>
                      <Input id="imageUrl" name="imageUrl" defaultValue={editingItem?.imageUrl} />
                    </div>
                    <div className="flex gap-6 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" name="available" defaultChecked={editingItem ? editingItem.available : true} className="accent-primary" />
                        In Stock
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" name="isSpecial" defaultChecked={editingItem?.isSpecial} className="accent-primary" />
                        Daily Special
                      </label>
                    </div>
                    <Button type="submit" className="mt-4 font-barlow tracking-widest uppercase">Save Item</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-barlow tracking-widest uppercase">Item</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase">Category</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase">Price</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase">Stock</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase">Special</TableHead>
                    <TableHead className="font-barlow tracking-widest uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menu.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium flex items-center gap-3">
                        <img src={item.imageUrl} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
                        {item.name}
                      </TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell className="text-primary font-bold">${Number(item.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.available ? 'default' : 'destructive'} 
                          className="cursor-pointer font-barlow tracking-widest uppercase" 
                          onClick={() => toggleMenuItem(item.id, 'available', item.available)}
                        >
                          {item.available ? 'IN STOCK' : 'SOLD OUT'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`cursor-pointer font-barlow tracking-widest uppercase ${item.isSpecial ? 'border-primary text-primary' : ''}`} 
                          onClick={() => toggleMenuItem(item.id, 'isSpecial', item.isSpecial)}
                        >
                          {item.isSpecial ? 'SPECIAL' : 'NORMAL'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" className="font-barlow tracking-widest uppercase" onClick={() => { setEditingItem(item); setIsMenuDialogOpen(true) }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive font-barlow tracking-widest uppercase" onClick={async () => { if(confirm('Delete?')) await deleteDoc(doc(db, 'menu', item.id)) }}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest font-barlow">Daily Sales</CardTitle></CardHeader>
                <CardContent><div className="text-5xl font-lalezar text-primary">${dailySales.toFixed(2)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest font-barlow">Active Orders</CardTitle></CardHeader>
                <CardContent><div className="text-5xl font-lalezar">{activeOrders.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest font-barlow">Out of Stock</CardTitle></CardHeader>
                <CardContent><div className="text-5xl font-lalezar text-destructive">{menu.filter(m => !m.available).length}</div></CardContent>
              </Card>
            </div>
            <Card className="p-6">
              <h3 className="font-barlow tracking-widest uppercase mb-4 text-muted-foreground">Weekly Revenue</h3>
              <div className="h-72">
                <Line data={chartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }, x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } } }, plugins: { legend: { display: false } } }} />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
