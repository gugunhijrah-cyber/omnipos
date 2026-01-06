import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDoc, limit } from 'firebase/firestore';
import { ChefHat, CheckCircle, UtensilsCrossed, Printer, AlertTriangle, History, X, Flame, BellRing, Timer, Volume2, Smartphone, Play } from 'lucide-react';

const AUDIO_DATA = {
    newOrder: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVMAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAZAAABxwAHCw4QEhcZGx0gIiQlKCorLTAyNDc5Oz0/QENFR0lLTE9QUlVXWVtkaGpsbnJzdXh6fH+Bg4aJiouOkZOVoKGkqKuusLK1uLq9vsLExsnLzdDT1tjc3+Hk5ujr7e/y9Pf6///OEAAABAAAAABBXHZuAAAAAAAAAAAAAAAAAAAA//OEBARkAAH0AAABHdo0i4KCIJ/5EBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQ//OEBAQkAAH0AAABHdo0i4KCIJ/5EBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQ//OEBAQkAAH0AAABHdo0i4KCIJ/5EBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQ//OEBAQkAAH0AAABHdo0i4KCIJ/5EBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQ',
    late: 'data:audio/mp3;base64,//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
};

const KitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [config, setConfig] = useState({ runningText: '', lateThreshold: 15, kitchenVolume: 80 });
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [audioAllowed, setAudioAllowed] = useState(false); // Default False
  const [currentTime, setCurrentTime] = useState(new Date()); 
  
  const audioNewRef = useRef(new Audio(AUDIO_DATA.newOrder));
  const audioLateRef = useRef(new Audio(AUDIO_DATA.late));
  const prevPendingCount = useRef(0);
  const alertedLateOrders = useRef(new Set()); 

  useEffect(() => {
    getDoc(doc(db, "settings", "store_config")).then(s => {
        if(s.exists()) {
            const d = s.data();
            setConfig({ 
                runningText: d.kitchenRunningText, 
                lateThreshold: d.kitchenLateThreshold,
                kitchenVolume: (d.kitchenVolume || 80) / 100 
            });
        }
    });
    const timer = setInterval(() => { setCurrentTime(new Date()); checkLateOrders(); }, 5000);
    return () => clearInterval(timer);
  }, [orders]); 

  // --- AUDIO LOGIC ---
  const enableAudio = () => {
      // Pancing browser untuk mengizinkan audio
      audioNewRef.current.play().then(() => {
          audioNewRef.current.pause();
          audioNewRef.current.currentTime = 0;
      }).catch(e => console.log(e));

      audioLateRef.current.play().then(() => {
          audioLateRef.current.pause();
          audioLateRef.current.currentTime = 0;
      }).catch(e => console.log(e));

      setAudioAllowed(true); // SET TRUE
  };

  const playAudio = (type) => {
      if (!audioAllowed) return; // Stop jika belum diizinkan user
      const player = type === 'NEW' ? audioNewRef.current : audioLateRef.current;
      player.volume = config.kitchenVolume || 0.8;
      player.currentTime = 0;
      player.play().catch(e => console.error("Audio Blocked by Browser", e));
  };

  useEffect(() => {
    const q = query(collection(db, "orders"), where("status", "in", ["PENDING", "COOKING"]), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
      
      const currentPending = ordersData.filter(o => o.status === 'PENDING').length;
      if (currentPending > prevPendingCount.current) {
          playAudio('NEW'); 
      }
      prevPendingCount.current = currentPending;
    });
    return () => unsubscribe();
  }, [audioAllowed]); // Re-run jika audioAllowed berubah

  const checkLateOrders = () => {
      orders.forEach(order => {
          const min = getMinutesDiff(order.createdAt);
          const isLate = min >= parseInt(config.lateThreshold);
          if (isLate && !alertedLateOrders.current.has(order.id)) {
              playAudio('LATE');
              alertedLateOrders.current.add(order.id);
          }
      });
  };

  const groupItems = (items) => {
      const mains = [], sides = [], drinks = [];
      items.forEach(item => {
          const cat = (item.category || '').toUpperCase();
          if (cat.includes('BAKSO') || cat.includes('MIE') || cat.includes('AYAM')) mains.push(item);
          else if (cat.includes('MINUM') || cat.includes('ES') || cat.includes('JUS')) drinks.push(item);
          else sides.push(item);
      });
      return [...mains, ...sides, ...drinks];
  };

  const handleAccept = async (id) => { try { await updateDoc(doc(db, "orders", id), { status: 'COOKING' }); prevPendingCount.current--; } catch(e){} };
  const handleFinish = async (id) => { if(window.confirm("Selesai?")) try { await updateDoc(doc(db, "orders", id), { status: 'READY', updatedAt: new Date() }); } catch(e){} };
  const getMinutesDiff = (ts) => ts ? Math.floor((new Date() - ts.toDate()) / 60000) : 0;

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-white font-sans overflow-hidden relative">
      
      {/* --- OVERLAY WAJIB KLIK (SOLUSI AUDIO MATI) --- */}
      {!audioAllowed && (
          <div className="absolute inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
              <div className="bg-red-600 p-6 rounded-full mb-6 animate-pulse"><Volume2 size={48} className="text-white"/></div>
              <h1 className="text-4xl font-black text-white mb-2 uppercase">Sistem Audio Belum Aktif</h1>
              <p className="text-gray-400 mb-8 max-w-md text-sm">Browser memblokir suara otomatis. Klik tombol di bawah untuk mengaktifkan Alarm Dapur.</p>
              <button onClick={enableAudio} className="px-10 py-4 bg-white text-red-600 font-black rounded-2xl text-xl shadow-2xl hover:scale-105 transition-transform flex items-center gap-3">
                  <Play fill="currentColor"/> MULAI SISTEM DAPUR
              </button>
          </div>
      )}

      {/* STYLE ANIMASI */}
      <style>{`@keyframes border-flash { 0%, 100% { border-color: #ef4444; } 50% { border-color: transparent; } } .animate-border-flash { animation: border-flash 1s infinite; } @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } .animate-marquee { animation: marquee 25s linear infinite; }`}</style>

      {/* HEADER & CONTENT */}
      <div className="bg-yellow-500 text-black font-black text-xs py-1.5 overflow-hidden whitespace-nowrap shrink-0 z-10 border-b-4 border-yellow-600 relative">
        <div className="inline-block animate-marquee pl-[100%] absolute top-1.5 left-0 w-full">{config.runningText}</div>
        <div className="opacity-0">.</div> 
      </div>

      <div className="p-3 border-b border-gray-800 bg-[#1a1a1a] shadow-lg flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
            <div className="bg-orange-600 p-2 rounded-lg"><UtensilsCrossed size={20} className="text-white"/></div>
            <div><h1 className="text-xl font-black uppercase tracking-tight">Kitchen Display</h1><div className="flex gap-2"><span className="text-[10px] font-bold bg-blue-900/50 border border-blue-800 px-2 rounded text-blue-300">Baru: {orders.filter(o=>o.status==='PENDING').length}</span><span className="text-[10px] font-bold bg-green-900/50 border border-green-800 px-2 rounded text-green-300">Proses: {orders.filter(o=>o.status==='COOKING').length}</span></div></div>
        </div>
        <div className="flex gap-3 items-center">
            <button onClick={() => playAudio('NEW')} className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg border border-gray-700 text-xs font-bold flex items-center gap-1"><Volume2 size={14}/> Test</button>
            <div className="text-2xl font-black font-mono">{currentTime.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</div>
            <button onClick={()=>setShowHistory(true)} className="bg-gray-800 p-2 rounded-lg"><History size={20}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0f0f0f]">
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {orders.map((order) => {
                const min = getMinutesDiff(order.createdAt);
                const isLate = min >= parseInt(config.lateThreshold || 15);
                const isNew = order.status === 'PENDING';
                const sortedItems = groupItems(order.items);

                let borderClass = isNew ? 'border-blue-600' : 'border-green-900';
                if (isLate && !isNew) borderClass = 'animate-border-flash border-red-600'; 
                let bgClass = isNew ? 'bg-[#1a202c]' : 'bg-[#1e1e1e]';

                return (
                <div key={order.id} className={`break-inside-avoid mb-4 rounded-xl overflow-hidden shadow-2xl relative border-4 ${borderClass} ${bgClass}`}>
                    {isNew && <div className="bg-blue-600 text-white text-center text-[10px] font-black py-1 uppercase"><BellRing size={10} className="inline mr-1"/> ORDER BARU</div>}
                    <div className="p-3 flex justify-between items-start border-b border-white/10 bg-black/20">
                        <div><div className="flex items-baseline gap-1"><span className="text-[9px] font-bold text-gray-500 uppercase">MEJA</span><h2 className="text-4xl font-black leading-none text-white">{order.tableNumber}</h2></div><div className="mt-1 font-bold text-gray-300 text-xs uppercase truncate max-w-[120px]">{order.customerName || 'NONAME'}</div>{order.source === 'SELF_ORDER' && <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-purple-300 border border-purple-500 px-1.5 py-0.5 rounded bg-purple-900/50 w-fit"><Smartphone size={10}/> SELF ORDER</div>}</div>
                        <div className="text-right flex flex-col items-end gap-1"><span className={`text-lg font-mono font-black flex items-center gap-1 ${isLate ? 'text-red-500' : 'text-gray-400'}`}><Timer size={14}/> {min}m</span><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${order.orderType==='TAKEAWAY' ? 'bg-purple-900 border-purple-600 text-purple-200' : 'bg-blue-900 border-blue-600 text-blue-200'}`}>{order.orderType==='TAKEAWAY'?'BUNGKUS':'DINE IN'}</span><button onClick={()=>printTicket(order)} className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-400 hover:text-white mt-1"><Printer size={12}/></button></div>
                    </div>
                    <div className="p-3 space-y-2 text-sm">{sortedItems.map((item, i) => (<div key={i} className="flex gap-2 py-1 border-b border-dashed border-gray-700 last:border-0 items-start"><span className="font-black text-lg w-6 text-right shrink-0 text-white leading-none">{item.qty}</span><div className="leading-tight"><span className="font-bold text-gray-300 block">{item.name}</span>{item.note && <div className="text-orange-400 text-[10px] italic mt-0.5 font-medium">"{item.note}"</div>}</div></div>))}</div>
                    <div className="p-1 bg-black/20">{isNew ? <button onClick={() => handleAccept(order.id)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase flex items-center justify-center gap-2 rounded-lg shadow-lg"><Flame size={16}/> TERIMA</button> : <button onClick={() => handleFinish(order.id)} className="w-full py-3 bg-[#14532d] hover:bg-green-600 text-green-100 font-black text-sm uppercase flex items-center justify-center gap-2 rounded-lg border border-green-800"><CheckCircle size={16}/> SELESAI</button>}</div>
                </div>
                )
            })}
        </div>
      </div>
      {showHistory && (<div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-[#1e1e1e] w-full max-w-3xl rounded-2xl border border-gray-700 h-[80vh] flex flex-col shadow-2xl"><div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#252525] rounded-t-2xl"><h3 className="font-bold text-xl flex items-center gap-3"><History className="text-orange-500"/> Riwayat Selesai</h3><button onClick={()=>setShowHistory(false)} className="hover:bg-gray-700 p-2 rounded-lg"><X/></button></div><div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">{historyList.map(h => (<div key={h.id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-gray-800"><div className="flex items-center gap-4"><span className="bg-gray-800 text-white w-10 h-10 flex items-center justify-center rounded-lg font-black text-xl">{h.tableNumber}</span><div><p className="font-bold text-gray-200">{h.customerName}</p><p className="text-[10px] text-gray-500 font-mono">{new Date(h.updatedAt?.seconds*1000).toLocaleString()}</p></div></div><span className="text-xs font-bold text-green-500 border border-green-900 bg-green-900/20 px-3 py-1 rounded-full uppercase">{h.status}</span></div>))}</div></div></div>)}
    </div>
  );
};

export default KitchenPage;