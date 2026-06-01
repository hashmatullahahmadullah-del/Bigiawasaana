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
      backgroundColor: 'rgba(255, 107, 0, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b bg-card px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/">
             <img src="/logo.png" alt="Logo" className="h-8" />
          </Link>
          <h1 className="font-barlow text-xl tracking-widest uppercase font-bold">Commander Dashboard</h1>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="font-barlow tracking-widest uppercase">Sign Out</Button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-card border">
            <TabsTrigger value="orders" className="font-barlow tracking-widest uppercase">Live Orders</TabsTrigger>
            <TabsTrigger value="menu" className="font-barlow tracking-widest uppercase">Menu Manager</TabsTrigger>
            <TabsTrigger value="stats" className="font-barlow tracking-widest uppercase">Analytics</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground font-barlow tracking-widest uppercase">No active orders</div>
              ) : activeOrders.map(order => (
                <Card key={order.id} className={`border-t-4 ${order.status === 'pending' ? 'border-t-primary' : order.status === 'preparing' ? 'border-t-yellow-500' : 'border-t-green-500'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-barlow text-xl uppercase tracking-widest">{order.customerName}</CardTitle>
                        <p className="text-xs text-muted-foreground uppercase">{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}</p>
                      </div>
                      <Badge variant="outline" className="uppercase font-barlow tracking-widest">{order.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm pb-2">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                        <span>{item.name}</span>
                        <span className="text-primary font-bold">${item.price}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-4 font-barlow text-lg font-bold">
                      <span>TOTAL</span>
                      <span>${order.total}</span>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2">
                    {order.status === 'pending' && <Button className="flex-1 text-xs" onClick={() => updateOrderStatus(order.id, 'preparing')}>Prepare</Button>}
                    {order.status === 'preparing' && <Button className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => updateOrderStatus(order.id, 'ready')}>Mark Ready</Button>}
                    {order.status === 'ready' && <Button className="flex-1 text-xs" variant="secondary" onClick={() => updateOrderStatus(order.id, 'completed')}>Complete</Button>}
                    <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => deleteOrder(order.id)}>Cancel</Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-lalezar text-3xl">Menu Items</h2>
              <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingItem(null)} className="font-barlow tracking-widest uppercase">Add New Item</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="font-barlow uppercase tracking-widest">{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={saveMenuItem} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={editingItem?.name} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Input id="category" name="category" defaultValue={editingItem?.category || 'wraps'} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input id="price" name="price" type="number" step="0.01" defaultValue={editingItem?.price} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" defaultValue={editingItem?.description} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="imageUrl">Image URL</Label>
                      <Input id="imageUrl" name="imageUrl" defaultValue={editingItem?.imageUrl} />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="available" defaultChecked={editingItem ? editingItem.available : true} />
                        <span className="text-sm">In Stock</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="isSpecial" defaultChecked={editingItem?.isSpecial} />
                        <span className="text-sm">Daily Special</span>
                      </label>
                    </div>
                    <Button type="submit" className="mt-4">Save Item</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Special</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menu.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <img src={item.imageUrl} alt="" className="w-8 h-8 rounded object-cover bg-muted" />
                        {item.name}
                      </TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell>${Number(item.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={item.available ? 'default' : 'destructive'} className="cursor-pointer bg-opacity-20" onClick={() => toggleMenuItem(item.id, 'available', item.available)}>
                          {item.available ? 'In Stock' : 'Sold Out'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isSpecial ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleMenuItem(item.id, 'isSpecial', item.isSpecial)}>
                          {item.isSpecial ? 'Special' : 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsMenuDialogOpen(true) }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if(confirm('Delete?')) await deleteDoc(doc(db, 'menu', item.id)) }}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest font-barlow">Daily Sales</CardTitle></CardHeader>
                <CardContent><div className="text-4xl font-lalezar text-primary">${dailySales.toFixed(2)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest font-barlow">Active Orders</CardTitle></CardHeader>
                <CardContent><div className="text-4xl font-lalezar">{activeOrders.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase tracking-widest font-barlow">Items Out of Stock</CardTitle></CardHeader>
                <CardContent><div className="text-4xl font-lalezar text-destructive">{menu.filter(m => !m.available).length}</div></CardContent>
              </Card>
            </div>
            <Card className="p-6">
              <h3 className="font-barlow tracking-widest uppercase mb-4 text-muted-foreground">Weekly Revenue</h3>
              <div className="h-64">
                <Line data={chartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
