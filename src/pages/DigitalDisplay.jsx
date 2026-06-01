import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DigitalDisplay() {
  const [menu, setMenu] = useState([])
  const [time, setTime] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'menu')), snap => {
      setMenu(snap.docs.map(d => d.data()))
    })

    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }, 1000)

    return () => { unsub(); clearInterval(timer) }
  }, [])

  const special = menu.find(m => m.isSpecial && m.available)
  const categories = [...new Set(menu.map(m => m.category))]

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex">
      {/* Sidebar */}
      <div className="w-28 bg-card border-r border-border flex flex-col items-center py-10">
        <div className="font-lalezar text-6xl text-primary tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          BIGI AWASAANA
        </div>
      </div>

      <div className="flex-1 p-10 flex flex-col relative">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-border pb-8 mb-8">
          <div>
            <Badge variant="outline" className="mb-3 font-barlow tracking-widest uppercase text-primary border-primary/50">100% Zabiha Halal</Badge>
            <h1 className="font-barlow text-5xl font-bold tracking-wider uppercase">Authentic Afghan Street Food</h1>
          </div>
          <Card className="px-6 py-3">
            <span className="font-barlow text-4xl font-bold tracking-widest text-muted-foreground">{time}</span>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-12 overflow-hidden">
          {/* Special */}
          <div className="flex-1 flex flex-col justify-center pr-12 border-r border-border">
            {special ? (
              <>
                <Badge className="mb-4 w-fit font-barlow tracking-widest uppercase">Chef's Special</Badge>
                <h2 className="font-lalezar text-8xl leading-none uppercase mb-6">{special.name}</h2>
                <p className="text-xl text-muted-foreground mb-8">{special.description}</p>
                <div className="font-barlow text-7xl font-bold text-primary">${Number(special.price).toFixed(2)}</div>
              </>
            ) : (
              <div className="font-lalezar text-5xl text-muted-foreground uppercase text-center">Loading Specials...</div>
            )}
          </div>

          {/* Menu Columns */}
          <div className="flex-[2] columns-2 gap-10 overflow-y-auto pr-4">
            {categories.map(cat => (
              <div key={cat} className="mb-10 break-inside-avoid">
                <h2 className="font-barlow text-3xl tracking-widest text-primary uppercase font-bold mb-6">{cat}</h2>
                {menu.filter(m => m.category === cat).map((item, i) => (
                  <div key={i} className="flex justify-between items-baseline mb-4 relative">
                    <div className="absolute bottom-2 left-0 right-0 border-b-2 border-dotted border-border -z-10"></div>
                    <span className={`text-2xl pr-4 bg-background ${!item.available ? 'line-through text-muted-foreground' : ''}`}>{item.name}</span>
                    <span className="font-barlow text-3xl font-bold pl-4 bg-background text-primary">${Number(item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <Card className="absolute bottom-10 right-10 flex items-center gap-6 p-6">
          <div className="font-barlow text-2xl font-bold tracking-widest uppercase leading-tight">
            Skip the line.<br/><span className="text-primary">Order online.</span>
          </div>
          <div className="bg-white p-2 rounded">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://bigiawasaana.com&bgcolor=FFFFFF&color=000000" alt="QR" className="w-24 h-24" />
          </div>
        </Card>
      </div>
    </div>
  )
}
