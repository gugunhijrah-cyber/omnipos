import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit3, CheckCircle, Lock, RefreshCw, Smartphone, Bell, X, Image, Trash2, Printer, Volume2, Play } from 'lucide-react';
import { CATEGORIES } from '../../data/menuData'; 
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, getDoc, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';

const NOTIF_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVMAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAZAAABxwAHCw4QEhcZGx0gIiQlKCorLTAyNDc5Oz0/QENFR0lLTE9QUlVXWVtkaGpsbnJzdXh6fH+Bg4aJiouOkZOVoKGkqKuusLK1uLq9vsLExsnLzdDT1tjc3+Hk5ujr7e/y9Pf6///OEAAABAAAAABBXHZuAAAAAAAAAAAAAAAAAAAA//OEBARkAAH0AAABHdo0i4KCIJ/5EBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQ//OEBAQkAAH0AAABHdo0i4KCIJ/5EBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQ//OEBAQkAAH0AAABHdo0i4KCIJ/5EBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQERAREBEQ';

const POSPage = () => {
  const navigate = useNavigate();
  // State
  const [products, setProducts] = useState([]); 
  const [cart, setCart] = useState([]);
  const [queueOrders, setQueueOrders] = useState([]); 
  const [historyOrders, setHistoryOrders] = useState([]); 
  const [listTab, setListTab] = useState('QUEUE'); 
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ method: 'CASH', cashAmount: '', change: 0 });
  const [finalOrderData, setFinalOrderData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taxConfig, setTaxConfig] = useState({ enabled: false, rate: 0 });
  const [isShiftOpen, setIsShiftOpen] = useState(null);
  const [newOrderAlert, setNewOrderAlert] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({ name: '', table: '', type: 'DINE_IN' });
  const [audioAllowed, setAudioAllowed] = useState(false);
  
  const audioRef = useRef(new Audio(NOTIF_SOUND));
  const prevQueueLength = useRef(0);

  // --- EFFECT ---
  useEffect(() => {
    const checkShift = async () => {
        try {
            const q = query(collection(db, "shifts"), where("status", "==", "OPEN"), limit(1));
            const snap = await getDocs(q);
            setIsShiftOpen(!snap.empty);
        } catch(e) { console.error("Error", e); setIsShiftOpen(false); }
    };
    checkShift();

    const unsubProd = onSnapshot(query(collection(db, "products")), (snap) => {
        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isAvailable);
        const sorted = raw.sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));
        setProducts(sorted);
    });
    
    getDoc(doc(db, "settings", "store_config")).then(s => {
        if(s.exists()) setTaxConfig({ enabled: s.data().taxEnabled, rate: parseInt(s.data().taxPercentage)||0 });
    });

    const unsubOrder = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
      const allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pending = allData.filter(o => o.status !== 'COMPLETED' && !(o.status === 'READY' && o.paymentStatus === 'PAID'));
      const history = allData.filter(o => (o.status === 'READY' && o.paymentStatus === 'PAID') || o.status === 'COMPLETED');

      setQueueOrders(pending); 
      setHistoryOrders(history);
      
      // LOGIC NOTIFIKASI SUARA
      if (pending.length > prevQueueLength.current) {
          if (audioAllowed) {
              audioRef.current.play().catch(e => console.log("Audio block", e));
          }
          const newest = pending[0];
          if (newest && newest.source === 'SELF_ORDER') {
              setNewOrderAlert(`Meja ${newest.tableNumber} Order Baru!`);
              setTimeout(() => setNewOrderAlert(null), 5000);
          }
      }
      prevQueueLength.current = pending.length; 

      if (currentOrder) {
        const updated = allData.find(o => o.id === currentOrder.id);
        if (updated) setCurrentOrder(updated);
      }
    });

    return () => { unsubProd(); unsubOrder(); };
  }, [currentOrder?.id, audioAllowed]); 

  // --- AUDIO ENABLE (DIPERBAIKI) ---
  const enableAudio = () => {
      // Mainkan suara kosong sejenak untuk memancing izin browser
      audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setAudioAllowed(true); // HILANGKAN OVERLAY
      }).catch(e => {
          console.log("Audio permission error:", e);
          // Tetap hilangkan overlay meski error, agar kasir bisa dipakai
          setAudioAllowed(true); 
      });
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const taxAmount = taxConfig.enabled ? Math.round(subtotal * (taxConfig.rate / 100)) : 0;
  const cartTotal = subtotal + taxAmount;
  const isLocked = currentOrder?.paymentStatus === 'PAID';

  const recallOrder = (o) => { setCart(o.items || []); setCustomerInfo({ name: o.customerName || '', table: o.tableNumber || '', type: o.orderType || 'DINE_IN' }); setCurrentOrder(o); };
  const resetOrder = () => { setCart([]); setCustomerInfo({ name: '', table: '', type: 'DINE_IN' }); setCurrentOrder(null); setPaymentData({ method: 'CASH', cashAmount: '', change: 0 }); setIsProcessing(false); };
  const addToCart = (p) => { if(isLocked) return; setCart(prev => { const ex = prev.find(i=>i.id===p.id); return ex ? prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...prev, {...p, qty:1, note:''}] }); };
  const updateQty = (id, d) => { if(isLocked) return; setCart(prev => prev.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0)); };
  const updateNote = (id, n) => { if(isLocked) return; setCart(prev => prev.map(i=>i.id===id?{...i,note:n}:i)); };
  const handleSave = async () => { if (cart.length === 0 || !customerInfo.name || !customerInfo.table) return alert("Mohon lengkapi Nama & Meja!"); if (isProcessing) return; setIsProcessing(true); const payload = { customerName: customerInfo.name, tableNumber: customerInfo.table, orderType: customerInfo.type, items: cart, subtotal, taxAmount, totalAmount: cartTotal, paymentStatus: 'UNPAID', status: 'PENDING', updatedAt: serverTimestamp(), source: 'CASHIER' }; try { if(currentOrder) await updateDoc(doc(db, "orders", currentOrder.id), {...payload, isUpdated:true}); else await addDoc(collection(db, "orders"), {...payload, createdAt: serverTimestamp(), isUpdated:false}); resetOrder(); } catch(e) { console.error(e); setIsProcessing(false); } };
  const processPayment = async () => { const cashIn = paymentData.cashAmount ? parseInt(paymentData.cashAmount) : cartTotal; if (paymentData.method === 'CASH' && cashIn < cartTotal) return alert("Uang Kurang!"); if (isProcessing) return; setIsProcessing(true); const payload = { paymentStatus: 'PAID', paymentMethod: paymentData.method, cashReceived: cashIn, changeAmount: cashIn - cartTotal, updatedAt: serverTimestamp() }; try { let activeData; if(currentOrder) { await updateDoc(doc(db, "orders", currentOrder.id), payload); activeData = { ...currentOrder, ...payload, items: cart, totalAmount: cartTotal, taxAmount, subtotal }; } else { const ref = await addDoc(collection(db, "orders"), { customerName: customerInfo.name, tableNumber: customerInfo.table, orderType: customerInfo.type, ...payload, items: cart, subtotal, taxAmount, totalAmount: cartTotal, status: 'PENDING', createdAt: serverTimestamp(), source: 'CASHIER' }); activeData = { id: ref.id, customerName: customerInfo.name, tableNumber: customerInfo.table, ...payload, items: cart, totalAmount: cartTotal, taxAmount, subtotal }; } setFinalOrderData(activeData); setShowPayModal(false); setShowReceiptModal(true); setIsProcessing(false); } catch(e) { console.error(e); setIsProcessing(false); } };
  const handleCloseReceipt = () => { setShowReceiptModal(false); resetOrder(); };

  if (isShiftOpen === false) return <div className="h-screen flex items-center justify-center bg-gray-100"><div className="text-center p-8 bg-white rounded-2xl shadow-xl"><Lock size={64} className="mx-auto text-red-500 mb-4"/><h2 className="text-2xl font-black">Shift Belum Dibuka</h2><button onClick={()=>navigate('/shift')} className="mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Buka Shift</button></div></div>;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden w-full relative">
      
      {/* OVERLAY WAJIB KLIK UNTUK POS (Z-INDEX TINGGI & FULL SCREEN) */}
      {!audioAllowed && (
          <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white p-8 rounded-3xl text-center shadow-2xl animate-in zoom-in w-full max-w-md">
                  <div className="bg-blue-100 p-4 rounded-full inline-block mb-4"><Volume2 size={40} className="text-blue-600"/></div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">SISTEM KASIR SIAP</h2>
                  <p className="text-sm text-gray-500 mb-6">Klik tombol di bawah untuk mengaktifkan notifikasi suara dan mulai berjualan.</p>
                  <button 
                    onClick={enableAudio} 
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all text-lg"
                  >
                      MULAI KASIR SEKARANG
                  </button>
              </div>
          </div>
      )}

      {/* TOAST ALERT */}
      {newOrderAlert && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce cursor-pointer" onClick={()=>setNewOrderAlert(null)}>
              <Bell className="text-yellow-400" size={20}/>
              <div><p className="text-xs font-bold text-gray-400">NOTIFIKASI</p><p className="text-sm font-black">{newOrderAlert}</p></div>
              <X size={16} className="text-gray-500 hover:text-white"/>
          </div>
      )}

      {/* 1. SIDEBAR ANTRIAN */}
      <div className="w-64 bg-white border-r flex flex-col z-20 shadow-xl flex-shrink-0">
         <div className="p-3 border-b flex gap-2 bg-gray-50">
             <button onClick={()=>setListTab('QUEUE')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg border ${listTab==='QUEUE'?'bg-black text-white border-black':'bg-white text-gray-500 border-gray-200'}`}>Antrian</button>
             <button onClick={()=>setListTab('HISTORY')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg border ${listTab==='HISTORY'?'bg-black text-white border-black':'bg-white text-gray-500 border-gray-200'}`}>Riwayat</button>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {(listTab === 'QUEUE' ? queueOrders : historyOrders).map(o => (
                <div key={o.id} onClick={() => recallOrder(o)} className={`relative p-3 rounded-lg border cursor-pointer hover:bg-blue-50 transition-all ${currentOrder?.id === o.id ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                    {o.source === 'SELF_ORDER' && <div className="absolute -top-2 -right-2 bg-purple-600 text-white p-1 rounded-full shadow-sm z-10"><Smartphone size={12}/></div>}
                    <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 rounded border">#{o.id.slice(-4).toUpperCase()}</span><span className={`text-[10px] font-black px-1.5 rounded uppercase ${o.paymentStatus==='PAID'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{o.paymentStatus}</span></div>
                    <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 bg-gray-900 text-white rounded flex items-center justify-center text-sm font-black">{o.tableNumber}</div><div className="flex-1 min-w-0"><p className="font-black text-gray-800 text-xs truncate uppercase">{o.customerName || 'NONAME'}</p><p className="text-[9px] text-gray-500">{o.items?.length || 0} menu</p></div></div>
                </div>
            ))}
         </div>
      </div>

      {/* 2. MENU GRID */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-50">
         <div className="p-4 bg-white shadow-sm z-10 sticky top-0">
             <div className="relative mb-3"><Search className="absolute left-3 top-2.5 text-gray-400" size={16}/><input type="text" placeholder="Cari menu..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-black" onChange={e=>setSearchQuery(e.target.value)}/></div>
             <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">{CATEGORIES.map(c=><button key={c} onClick={()=>setActiveCategory(c)} className={`px-4 py-1.5 text-[10px] font-bold rounded-full border transition-all whitespace-nowrap shadow-sm ${activeCategory===c?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{c}</button>)}</div>
         </div>
         <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                {products.filter(p=>(activeCategory==="ALL"||p.category===activeCategory)&&p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p=>(
                    <div key={p.id} onClick={()=>addToCart(p)} className={`group cursor-pointer transition-all duration-200 hover:-translate-y-1 ${isLocked ? 'opacity-50 grayscale pointer-events-none':''}`}>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md hover:border-black">
                            <div className="aspect-square w-full bg-gray-100 relative overflow-hidden flex items-center justify-center">
                                {/* FIX ERROR GAMBAR */}
                                {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex'}}/> : null}
                                <div className="hidden w-full h-full bg-orange-100 text-orange-500 font-black text-2xl flex items-center justify-center" style={{display: p.image ? 'none' : 'flex'}}>{p.name.charAt(0)}</div>
                            </div>
                            <div className="p-3 flex flex-col flex-1 justify-between">
                                <div><h3 className="font-bold text-gray-800 text-xs leading-snug mb-1">{p.name}</h3><p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{p.category}</p></div>
                                <div className="mt-2 flex justify-between items-center pt-2 border-t border-gray-50"><span className="font-black text-black text-sm">Rp {p.price.toLocaleString()}</span><div className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-colors"><Plus size={14}/></div></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
         </div>
      </div>

      {/* 3. KERANJANG (SAMA) */}
      <div className="w-80 bg-white border-l flex flex-col shadow-2xl z-20 flex-shrink-0">
         <div className="p-4 border-b bg-white">
            <div className="flex justify-between items-center mb-3"><h2 className="font-black text-lg text-gray-800 flex items-center gap-2">{isLocked ? <Lock size={18} className="text-red-500"/> : <Edit3 size={18} className="text-blue-600"/>} {isLocked ? 'Terkunci' : 'Order Baru'}</h2><button onClick={resetOrder} className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1"><RefreshCw size={12}/> Reset</button></div>
            <div className="flex gap-2 mb-2"><div className="w-20"><input disabled={isLocked} className="w-full p-2 bg-gray-50 border rounded text-center font-black text-sm outline-none focus:border-black disabled:opacity-50 placeholder-gray-400" placeholder="Meja" value={customerInfo.table} onChange={e=>setCustomerInfo({...customerInfo, table:e.target.value})}/></div><div className="flex-1"><input disabled={isLocked} className="w-full p-2 bg-gray-50 border rounded font-bold text-sm outline-none focus:border-black disabled:opacity-50 uppercase placeholder-gray-400" placeholder="Nama Pelanggan..." value={customerInfo.name} onChange={e=>setCustomerInfo({...customerInfo, name:e.target.value})}/></div></div>
            <div className="flex bg-gray-100 p-1 rounded-lg">{['DINE_IN', 'TAKEAWAY'].map(t=><button key={t} disabled={isLocked} onClick={()=>setCustomerInfo({...customerInfo, type:t})} className={`flex-1 py-1.5 text-[10px] font-black rounded transition-all ${customerInfo.type===t?'bg-white text-black shadow-sm':'text-gray-400 hover:text-gray-600'}`}>{t.replace('_',' ')}</button>)}</div>
         </div>
         <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
            {cart.map(i=>(<div key={i.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm"><div className="flex justify-between items-start mb-1"><div className="flex-1 pr-2"><div className="font-bold text-xs text-gray-800 leading-tight">{i.name}</div><div className="text-[10px] text-blue-600 font-bold">Rp {(i.price*i.qty).toLocaleString()}</div></div>{isLocked ? <span className="font-black text-xs bg-gray-100 px-2 py-1 rounded">x{i.qty}</span> : <div className="flex items-center gap-1 bg-gray-100 rounded p-0.5 border border-gray-200"><button onClick={()=>updateQty(i.id,-1)} className="w-5 h-5 bg-white rounded shadow-sm text-gray-600 font-bold flex items-center justify-center">-</button><span className="text-xs font-bold w-5 text-center">{i.qty}</span><button onClick={()=>updateQty(i.id,1)} className="w-5 h-5 bg-black text-white rounded shadow-sm font-bold flex items-center justify-center">+</button></div>}</div><input disabled={isLocked} className="w-full text-[10px] bg-transparent border-b border-dashed border-gray-300 p-1 outline-none text-gray-600 placeholder-gray-400" placeholder={isLocked?"":"Catatan..."} value={i.note||''} onChange={e=>updateNote(i.id,e.target.value)}/></div>))}
         </div>
         <div className="p-4 border-t bg-white shadow-lg z-30">
            <div className="space-y-1 mb-3"><div className="flex justify-between text-xs font-bold text-gray-500"><span>Subtotal</span><span>{subtotal.toLocaleString()}</span></div>{taxConfig.enabled && <div className="flex justify-between text-xs font-bold text-blue-600"><span>Pajak ({taxConfig.rate}%)</span><span>{taxAmount.toLocaleString()}</span></div>}<div className="flex justify-between font-black text-xl text-gray-900 pt-2 border-t border-dashed"><span>Total</span><span>Rp {cartTotal.toLocaleString()}</span></div></div>
            {isLocked ? (
                <div className="bg-green-100 text-green-800 p-3 rounded-xl text-center font-bold text-xs border border-green-200 flex flex-col items-center gap-1"><CheckCircle size={16}/><span>LUNAS & MENUNGGU DAPUR</span></div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={handleSave} disabled={cart.length===0 || isProcessing} className="col-span-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold">Simpan</button>
                    <button onClick={()=>{setPaymentData({...paymentData,cashAmount:'',change:0});setShowPayModal(true)}} disabled={cart.length===0 || isProcessing} className="col-span-2 py-3 bg-black text-white rounded-lg font-bold shadow-lg">{isProcessing?'Memproses...':'Bayar'}</button>
                </div>
            )}
         </div>
      </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6"><h3 className="font-black text-lg">Pembayaran</h3><button onClick={()=>setShowPayModal(false)}><X size={18}/></button></div>
                <h2 className="font-black text-3xl text-center mb-6 text-black">Rp {cartTotal.toLocaleString()}</h2>
                <div className="grid grid-cols-3 gap-2 mb-6">{['CASH','QRIS','DEBIT'].map(m=><button key={m} onClick={()=>setPaymentData({...paymentData, method:m})} className={`py-3 text-[10px] font-black border rounded-lg transition-all ${paymentData.method===m?'bg-black text-white border-black':'bg-white text-gray-500 border-gray-100'}`}>{m}</button>)}</div>
                {paymentData.method==='CASH' && (<div className="mb-6 relative"><label className="text-[10px] font-bold text-gray-500 uppercase absolute -top-2 left-4 bg-white px-1">Uang Diterima</label><input type="number" autoFocus className="w-full p-4 border-2 border-gray-200 rounded-xl font-bold text-2xl outline-none focus:border-black" placeholder={`Pas: ${cartTotal}`} onChange={e=>{const val=e.target.value; setPaymentData({...paymentData, cashAmount:val, change:val?val-cartTotal:0})}}/><div className={`flex justify-between mt-2 font-bold text-sm px-1 ${paymentData.change<0?'text-red-500':'text-green-600'}`}><span>Kembali</span><span>{paymentData.change.toLocaleString()}</span></div></div>)}
                <button onClick={processPayment} disabled={isProcessing} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all flex justify-center items-center gap-2"><CheckCircle size={18}/> {isProcessing ? 'Memproses...' : 'PROSES BAYAR'}</button>
            </div>
        </div>
      )}

      {showReceiptModal && finalOrderData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-96 p-6 rounded-sm shadow-2xl relative text-center">
                <div className="mb-4"><div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle size={24} className="text-green-600"/></div><h2 className="font-black text-xl">Transaksi Berhasil!</h2><p className="text-sm text-gray-500">Kembalian: Rp {parseInt(finalOrderData.changeAmount).toLocaleString()}</p></div>
                <div className="bg-gray-50 p-4 rounded text-[10px] font-mono border border-gray-200 leading-relaxed mb-4 text-left"><p className="text-center font-bold border-b-2 border-dashed border-gray-300 pb-2 mb-2">BAKSO UJO</p><div className="mb-2 text-gray-500 space-y-1"><div className="flex justify-between"><span>Tgl:</span><span>{new Date().toLocaleDateString()}</span></div><div className="flex justify-between"><span>No:</span><span>#{finalOrderData.id.slice(-4).toUpperCase()}</span></div></div><div className="border-b-2 border-dashed border-gray-300 pb-2 mb-2 space-y-1">{finalOrderData.items.map((i,x)=>(<div key={x} className="flex justify-between"><span>{i.qty}x {i.name.substring(0,18)}</span><span>{(i.price*i.qty).toLocaleString()}</span></div>))}</div><div className="space-y-1 text-gray-600"><div className="flex justify-between"><span>Subtotal</span><span>{finalOrderData.subtotal.toLocaleString()}</span></div>{finalOrderData.taxAmount > 0 && <div className="flex justify-between"><span>Pajak</span><span>{finalOrderData.taxAmount.toLocaleString()}</span></div>}<div className="flex justify-between font-black text-base text-black border-t-2 border-dashed border-gray-300 pt-2 mt-1"><span>TOTAL</span><span>{finalOrderData.totalAmount.toLocaleString()}</span></div></div></div>
                <div className="flex gap-2"><button onClick={()=>window.print()} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-xs"><Printer size={16} className="inline"/> Print</button><button onClick={handleCloseReceipt} className="flex-1 py-3 bg-gray-900 text-white rounded-lg font-bold text-xs hover:bg-black">Tutup</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default POSPage;