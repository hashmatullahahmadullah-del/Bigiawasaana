import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

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
      <div className="w-32 bg-card border-r flex flex-col items-center py-10">
        <div className="font-lalezar text-6xl text-primary tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          BIGI AWASAANA
        </div>
      </div>

      <div className="flex-1 p-10 flex flex-col relative">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-8 mb-8">
          <div>
            <div className="font-barlow text-primary text-xl tracking-widest uppercase mb-2">100% Zabiha Halal</div>
            <div className="font-barlow text-5xl font-bold tracking-wider uppercase">Authentic Afghan Street Food</div>
          </div>
          <div className="font-barlow text-4xl text-muted-foreground font-bold tracking-widest">{time}</div>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-12">
          {/* Special Section */}
          <div className="flex-1 flex flex-col justify-center pr-12 border-r">
            {special ? (
              <>
                <div className="font-barlow text-2xl tracking-[0.2em] text-primary uppercase mb-6 font-bold">Chef's Special</div>
                <div className="font-lalezar text-8xl leading-none uppercase mb-8">{special.name}</div>
                <div className="text-2xl text-muted-foreground mb-12">{special.description}</div>
                <div className="font-barlow text-7xl font-bold">${Number(special.price).toFixed(2)}</div>
              </>
            ) : (
              <div className="font-lalezar text-6xl text-muted-foreground uppercase text-center">Loading Specials...</div>
            )}
          </div>

          {/* Menu Columns */}
          <div className="flex-[2] columns-2 gap-12 overflow-y-auto pr-4 scrollbar-hide">
            {categories.map(cat => (
              <div key={cat} className="mb-10 break-inside-avoid">
                <h2 className="font-barlow text-3xl tracking-widest text-primary uppercase font-bold mb-6">{cat}</h2>
                {menu.filter(m => m.category === cat).map((item, i) => (
                  <div key={i} className="flex justify-between items-baseline mb-4 relative">
                    <div className="absolute bottom-2 left-0 right-0 border-b-2 border-dotted border-border -z-10"></div>
                    <div className={`text-2xl pr-4 bg-background ${!item.available ? 'line-through text-muted-foreground' : ''}`}>{item.name}</div>
                    <div className="font-barlow text-3xl font-bold pl-4 bg-background">${Number(item.price).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div className="absolute bottom-10 right-10 bg-card border p-6 rounded flex items-center gap-6 shadow-2xl">
          <div className="font-barlow text-2xl font-bold tracking-widest uppercase leading-tight">
            Skip the line.<br/><span className="text-primary">Order online.</span>
          </div>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://bigiawasaana.com&bgcolor=060606&color=ffffff" alt="QR" className="w-24 h-24 rounded bg-white p-1" />
        </div>
      </div>
    </div>
  )
}
