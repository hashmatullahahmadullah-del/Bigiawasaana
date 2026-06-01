import { useState, useEffect } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { motion, AnimatePresence } from 'framer-motion'

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

  // Animation variants for scrolling
  const marqueeVariants = {
    animate: {
      y: [0, -1000],
      transition: {
        y: {
          repeat: Infinity,
          repeatType: "loop",
          duration: 30,
          ease: "linear",
        },
      },
    },
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white flex relative">
      {/* Deep Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary/20 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* Sidebar */}
      <div className="w-32 bg-black/60 backdrop-blur-3xl border-r border-white/10 flex flex-col items-center py-12 z-10 shadow-2xl">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}
          className="font-lalezar text-7xl text-primary tracking-widest drop-shadow-[0_0_15px_rgba(255,107,0,0.6)]" 
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          BIGI AWASAANA
        </motion.div>
      </div>

      <div className="flex-1 p-12 flex flex-col relative z-10 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start pb-8 mb-10 border-b border-white/10">
          <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, ease: "easeOut" }}>
            <div className="font-barlow text-primary text-2xl tracking-[0.3em] uppercase mb-2 font-bold shadow-primary">100% Zabiha Halal</div>
            <div className="font-barlow text-6xl font-bold tracking-widest uppercase drop-shadow-lg">Authentic Afghan Street Food</div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-barlow text-5xl text-white/50 font-bold tracking-widest bg-white/5 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md">
            {time}
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-16 overflow-hidden">
          {/* Special Section */}
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="flex-1 flex flex-col justify-center pr-16 border-r border-white/10">
            {special ? (
              <AnimatePresence mode="wait">
                <motion.div key={special.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative">
                  <div className="font-barlow text-3xl tracking-[0.3em] text-primary uppercase mb-6 font-bold flex items-center gap-4">
                    <span className="w-12 h-[2px] bg-primary"></span> Chef's Special
                  </div>
                  <div className="font-lalezar text-[140px] leading-[0.9] uppercase mb-8 drop-shadow-2xl">{special.name}</div>
                  <div className="text-3xl text-white/60 mb-12 font-light leading-relaxed max-w-xl">{special.description}</div>
                  <div className="font-barlow text-8xl font-bold text-primary drop-shadow-[0_0_20px_rgba(255,107,0,0.5)]">${Number(special.price).toFixed(2)}</div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="font-lalezar text-7xl text-white/20 uppercase text-center animate-pulse">Loading Specials...</div>
            )}
          </motion.div>

          {/* Menu Columns - Marquee */}
          <div className="flex-[2] relative h-full overflow-hidden mask-image-b mask-image-t">
            {/* Top/Bottom Fade Masks */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent z-20" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-20" />
            
            <motion.div variants={marqueeVariants} animate="animate" className="columns-2 gap-16 pt-[800px] pb-[800px]">
              {categories.map(cat => (
                <div key={cat} className="mb-16 break-inside-avoid bg-white/[0.02] p-8 rounded-3xl border border-white/5 backdrop-blur-sm">
                  <h2 className="font-barlow text-4xl tracking-widest text-primary uppercase font-bold mb-8 flex items-center gap-4">
                    {cat}
                  </h2>
                  {menu.filter(m => m.category === cat).map((item, i) => (
                    <div key={i} className="flex justify-between items-baseline mb-6 relative group">
                      <div className="absolute bottom-2 left-0 right-0 border-b-2 border-dotted border-white/20 -z-10"></div>
                      <div className={`text-3xl pr-6 bg-transparent tracking-wide font-medium ${!item.available ? 'line-through text-white/30' : 'text-white/90 drop-shadow-md'}`}>{item.name}</div>
                      <div className={`font-barlow text-4xl font-bold pl-6 bg-transparent ${!item.available ? 'text-white/30' : 'text-primary'}`}>
                        ${Number(item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* QR Code - Floating */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1, type: "spring" }}
          className="absolute bottom-12 right-12 bg-black/80 backdrop-blur-2xl border border-primary/30 p-8 rounded-3xl flex items-center gap-8 shadow-[0_20px_50px_rgba(255,107,0,0.2)] z-30"
        >
          <div className="font-barlow text-3xl font-bold tracking-widest uppercase leading-tight text-white drop-shadow-md">
            Skip the line.<br/><span className="text-primary">Order online.</span>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-inner">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://bigiawasaana.com&bgcolor=FFFFFF&color=000000" alt="QR" className="w-28 h-28" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
