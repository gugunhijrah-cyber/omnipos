import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, X, Search, ChevronLeft, MessageCircle, CheckCircle, User, Info, Download, Home, Image } from 'lucide-react';

const CustomerOrderPage = () => {
  const navigate = useNavigate();
  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [cart, setCart] = useState([]);
  
  // UI State
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerInfo, setCustomerInfo] = useState({ name: '', table: '' });
  const [showInfoModal, setShowInfoModal] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [config, setConfig] = useState(null);
  
  const receiptRef = useRef(null);

  // 1. LOAD DATA & CATEGORIES
  useEffect(() => {
    getDoc(doc(db, "settings", "store_config")).then(s => { if(s.exists()) setConfig(s.data()); });
    
    // Load Products
    const qProd = query(collection(db, "products"), where("isAvailable", "==", true));
    const unsubProd = onSnapshot(qProd, (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Load Categories from DB (PENTING: Agar urutan sesuai setting admin)
    const qCat = query(collection(db, "categories"), orderBy("name", "asc"));
    const unsubCat = onSnapshot(qCat, (snap) => {
        const cats = snap.docs.map(d => d.data().name);
        setCategories(cats.length > 0 ? cats : ["BAKSO", "MIE AYAM", "MINUMAN", "TAMBAHAN"]); // Fallback
    });

    return () => { unsubProd(); unsubCat(); };
  }, []);

  // --- LOGIC SORTING (PENTING: Menu Berurutan Sesuai Kategori) ---
  const sortedProducts = useMemo(() => {
      let filtered = products.filter(p => 
          (activeCategory === "ALL" || p.category === activeCategory) && 
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Jika tab "ALL", urutkan berdasarkan index kategori di array categories
      if (activeCategory === "ALL") {
          filtered.sort((a, b) => {
              const indexA = categories.indexOf(a.category);
              const indexB = categories.indexOf(b.category);
              // Jika kategori tidak ditemukan, taruh di paling akhir
              return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
          });
      }
      return filtered;
  }, [products, activeCategory, searchQuery, categories]);

  // --- CART FUNCTIONS ---
  const addToCart = (product) => {
      setCart(prev => {
          const exist = prev.find(i => i.id === product.id);
          if (exist) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
          return [...prev, { ...product, qty: 1, note: '' }];
      });
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const updateQty = (id, delta) => { setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0)); };
  const updateNote = (id, text) => { setCart(prev => prev.map(i => i.id === id ? { ...i, note: text } : i)); };
  
  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const taxAmount = config?.taxEnabled ? Math.round(subtotal * (config.taxPercentage / 100)) : 0;
  const grandTotal = subtotal + taxAmount;

  const handleCheckout = async () => {
      if (cart.length === 0) return;
      if (!customerInfo.name || !customerInfo.table) { alert("Mohon lengkapi Nama & Meja!"); setShowInfoModal(true); return; }
      
      const newOrder = {
          customerName: customerInfo.name, tableNumber: customerInfo.table, items: cart, 
          subtotal, taxAmount, totalAmount: grandTotal, 
          status: 'PENDING', paymentStatus: 'UNPAID', orderType: 'DINE_IN', source: 'SELF_ORDER', createdAt: serverTimestamp()
      };
      try { const ref = await addDoc(collection(db, "orders"), newOrder); setSuccessOrder({ id: ref.id, ...newOrder }); setCart([]); setIsCartOpen(false); } catch (e) { alert("Gagal order"); }
  };

  const sendToWhatsApp = () => {
      if (!successOrder || !config?.whatsappNumber) return;
      let msg = `*ORDER BARU - MEJA ${customerInfo.table}*\nAtas Nama: ${customerInfo.name}\n----------------\n`;
      successOrder.items.forEach(i => msg += `${i.qty}x ${i.name} ${i.note?`(${i.note})`:''}\n`);
      msg += `----------------\n*TOTAL: Rp ${grandTotal.toLocaleString()}*`;
      window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDownloadReceipt = () => { window.print(); };

  // --- RENDER MODAL INPUT (WAJIB) ---
  if (showInfoModal && !successOrder) return (
      <div className="fixed inset-0 z-50 bg-gray-900/90 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/food.png')]">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in">
              <div className="text-center mb-6"><div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600"><User size={32}/></div><h2 className="font-black text-2xl text-gray-800">Mulai Pesan</h2></div>
              <div className="space-y-4">
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Anda</label><input autoFocus className="w-full p-4 bg-gray-50 rounded-xl font-bold border focus:border-orange-500 outline-none" value={customerInfo.name} onChange={e=>setCustomerInfo({...customerInfo, name:e.target.value})}/></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor Meja</label><input inputMode="numeric" className="w-full p-4 bg-gray-50 rounded-xl font-bold border focus:border-orange-500 outline-none" value={customerInfo.table} onChange={e=>setCustomerInfo({...customerInfo, table:e.target.value})}/></div>
                  <button disabled={!customerInfo.name || !customerInfo.table} onClick={()=>setShowInfoModal(false)} className="w-full py-4 bg-orange-600 disabled:bg-gray-300 text-white font-black rounded-xl shadow-lg mt-4">MASUK MENU</button>
              </div>
          </div>
      </div>
  );

  // --- RENDER SUCCESS STRUK ---
  if (successOrder) return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-in fade-in">
              <div className="bg-green-600 p-6 text-center text-white print:hidden"><CheckCircle size={40} className="mx-auto mb-2"/><h2 className="font-black text-xl">Pesanan Masuk!</h2><p className="text-xs">Mohon tunggu sebentar.</p></div>
              <div className="p-6 bg-white relative print:p-0 print:w-full" ref={receiptRef}>
                  <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4"><h3 className="font-black text-lg text-gray-800 uppercase">{config?.storeName}</h3><p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p></div>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-4 uppercase"><span>{customerInfo.name}</span><span>MEJA {customerInfo.table}</span></div>
                  <div className="space-y-2 mb-4 text-sm">{successOrder.items.map((i,x) => (<div key={x} className="flex justify-between"><span className="font-bold text-gray-700">{i.qty}x {i.name}</span><span>{(i.price*i.qty).toLocaleString()}</span></div>))}</div>
                  <div className="border-t-2 border-dashed border-gray-200 pt-4"><div className="flex justify-between font-black text-xl text-gray-900"><span>TOTAL</span><span>Rp {grandTotal.toLocaleString()}</span></div></div>
              </div>
              <div className="p-4 bg-gray-50 flex flex-col gap-2 print:hidden border-t border-gray-100">
                  <button onClick={sendToWhatsApp} className="w-full py-3.5 bg-green-500 text-white font-bold rounded-xl flex justify-center gap-2 shadow-md"><MessageCircle/> Konfirmasi WhatsApp</button>
                  <div className="flex gap-2"><button onClick={handleDownloadReceipt} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl flex justify-center gap-2 hover:bg-gray-50"><Download size={18}/> Simpan Struk</button><button onClick={()=>navigate('/')} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl flex justify-center gap-2 hover:bg-gray-50"><Home size={18}/> Selesai</button></div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center sticky top-0">
          <div className="flex items-center gap-3"><button onClick={()=>navigate('/')} className="p-2 bg-gray-100 rounded-full"><ChevronLeft size={20}/></button><div><h1 className="font-black text-gray-800 leading-none">MENU</h1><p className="text-[10px] text-gray-500 font-bold">{customerInfo.name} • Meja {customerInfo.table}</p></div></div>
          <div className="relative cursor-pointer" onClick={()=>setIsCartOpen(true)}><div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><ShoppingBag size={20}/></div>{cart.length>0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm border-2 border-white">{cart.reduce((a,b)=>a+b.qty,0)}</span>}</div>
      </div>

      {/* FILTER KATEGORI */}
      <div className="bg-white px-4 pb-4 border-b border-gray-100">
          <div className="relative mb-3"><Search className="absolute left-3 top-2.5 text-gray-400" size={16}/><input type="text" placeholder="Cari menu favorit..." className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500" onChange={e=>setSearchQuery(e.target.value)}/></div>
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button onClick={()=>setActiveCategory("ALL")} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory==="ALL"?'bg-gray-900 text-white shadow-md':'bg-gray-50 text-gray-500 border border-gray-100'}`}>Semua</button>
              {categories.map((c, idx)=><button key={idx} onClick={()=>setActiveCategory(c)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory===c?'bg-gray-900 text-white shadow-md':'bg-gray-50 text-gray-500 border border-gray-100'}`}>{c}</button>)}
          </div>
      </div>

      {/* MENU GRID (SORTED BY CATEGORY) */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 custom-scrollbar bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
              {sortedProducts.map(p => (
                  <div key={p.id} onClick={()=>addToCart(p)} className="group bg-white rounded-3xl p-3 shadow-sm border border-gray-100 relative overflow-hidden transition-all active:scale-95 cursor-pointer hover:shadow-lg hover:border-orange-200">
                      <div className="aspect-square bg-gray-100 rounded-2xl mb-3 overflow-hidden relative">
                          {/* Gambar + Fallback */}
                          {p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/> : <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-200"><Image/></div>}
                          <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-md px-2 py-1 rounded-lg"><span className="font-black text-[10px] text-gray-800">Rp {p.price/1000}k</span></div>
                          {/* Tombol Info 'i' (Toggleable) */}
                          {p.showDetail && <button onClick={(e)=>{e.stopPropagation(); setSelectedDetail(p)}} className="absolute top-2 left-2 bg-black/50 text-white w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md z-20 hover:bg-orange-600"><Info size={12}/></button>}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                          <div>
                              <h3 className="font-extrabold text-gray-800 text-xs leading-snug mb-1 line-clamp-2">{p.name}</h3>
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{p.category}</span>
                          </div>
                          {/* Rating Dihapus */}
                          <div className="flex justify-end mt-2"><button className="bg-gray-900 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg group-hover:bg-orange-600"><Plus size={14}/></button></div>
                      </div>
                      {/* Badge Qty */}
                      {cart.find(i=>i.id===p.id) && <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-bl-2xl flex items-center justify-center shadow-md z-10">{cart.find(i=>i.id===p.id).qty}</div>}
                  </div>
              ))}
          </div>
      </div>

      {/* FLOAT BUTTON */}
      {cart.length > 0 && !isCartOpen && <div className="absolute bottom-6 left-4 right-4 z-20 animate-bounce-subtle"><button onClick={()=>setIsCartOpen(true)} className="w-full bg-gray-900 text-white p-4 rounded-3xl shadow-2xl flex justify-between items-center border border-gray-800 backdrop-blur-lg"><div className="flex items-center gap-3"><div className="bg-orange-500 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 border-gray-900">{cart.reduce((a,b)=>a+b.qty,0)}</div><div className="text-left"><p className="font-bold text-sm">Lihat Keranjang</p><p className="text-[10px] text-gray-400">Siap dipesan</p></div></div><span className="font-black text-lg">Rp {grandTotal.toLocaleString()}</span></button></div>}

      {/* DETAIL MODAL */}
      {selectedDetail && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in" onClick={()=>setSelectedDetail(null)}><div className="bg-white w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e=>e.stopPropagation()}><div className="h-48 bg-gray-100 relative">{selectedDetail.image?<img src={selectedDetail.image} className="w-full h-full object-cover"/>:<div className="w-full h-full bg-gray-200 flex items-center justify-center"><Image/></div>}<button onClick={()=>setSelectedDetail(null)} className="absolute top-3 right-3 bg-white/50 p-2 rounded-full hover:bg-white text-black backdrop-blur-md"><X size={20}/></button></div><div className="p-6"><h3 className="text-2xl font-black text-gray-900 mb-1">{selectedDetail.name}</h3><p className="text-orange-600 font-bold text-lg mb-4">Rp {selectedDetail.price.toLocaleString()}</p><div className="bg-gray-50 p-4 rounded-xl mb-6"><h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Info size={12}/> Detail Menu</h4><p className="text-sm text-gray-600 leading-relaxed">{selectedDetail.description || "Tidak ada deskripsi."}</p></div><button onClick={()=>{addToCart(selectedDetail); setSelectedDetail(null)}} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2"><Plus size={20}/> TAMBAH</button></div></div></div>}

      {/* CART LIST MODAL */}
      {isCartOpen && <div className="absolute inset-0 bg-white z-30 flex flex-col animate-in slide-in-from-bottom duration-300"><div className="p-4 border-b flex justify-between items-center bg-gray-50"><h2 className="font-black text-lg flex items-center gap-2"><ShoppingBag className="text-orange-600"/> Pesanan Anda</h2><button onClick={()=>setIsCartOpen(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"><X size={18}/></button></div><div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">{cart.map(item => (<div key={item.id} className="flex gap-4 items-start pb-4 border-b border-dashed border-gray-100 last:border-0"><div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">{item.image?<img src={item.image} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50"><Image/></div>}</div><div className="flex-1"><div className="flex justify-between mb-1"><h4 className="font-bold text-gray-800 text-sm">{item.name}</h4><span className="font-black text-orange-600 text-sm">Rp {(item.price*item.qty).toLocaleString()}</span></div><input type="text" placeholder="Catatan..." className="w-full text-xs p-2 bg-gray-50 rounded-lg border border-gray-200 mb-2 focus:border-orange-500 outline-none" value={item.note} onChange={e=>updateNote(item.id, e.target.value)}/><div className="flex items-center gap-4 bg-gray-50 w-fit px-2 py-1 rounded-lg border border-gray-100"><button onClick={()=>updateQty(item.id,-1)} className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center font-bold text-gray-600 text-xs">-</button><span className="font-black text-sm">{item.qty}</span><button onClick={()=>updateQty(item.id,1)} className="w-6 h-6 bg-gray-900 text-white rounded shadow-sm flex items-center justify-center font-bold text-xs">+</button></div></div></div>))}</div><div className="p-5 border-t bg-gray-50"><div className="space-y-1 mb-4"><div className="flex justify-between text-gray-500 text-xs font-bold"><span>Subtotal</span><span>Rp {subtotal.toLocaleString()}</span></div>{taxAmount > 0 && <div className="flex justify-between text-blue-600 text-xs font-bold"><span>Pajak ({config.taxPercentage}%)</span><span>Rp {taxAmount.toLocaleString()}</span></div>}<div className="flex justify-between items-center text-xl font-black text-gray-900 pt-2 border-t border-dashed"><span>Total</span><span>Rp {grandTotal.toLocaleString()}</span></div></div><button onClick={handleCheckout} className="w-full py-4 bg-gray-900 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-black transition-all">KIRIM PESANAN</button></div></div>}
    </div>
  );
};

export default CustomerOrderPage;