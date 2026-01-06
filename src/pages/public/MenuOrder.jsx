import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MENU_ITEMS, CATEGORIES } from '../../data/menuData'; // CATEGORIES SAMA, ITEMS GANTI DB
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

const MenuOrder = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // STATE MENU DB
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const data = localStorage.getItem('customer_info');
    if (!data) navigate('/');
    else setCustomer(JSON.parse(data));

    // FETCH DATA
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(list.filter(p => p.isAvailable));
    });
    return () => unsubscribe();
  }, []);

  // ... (Logic Add/Update Cart sama) ...
  const addToCart = (product) => {
    setCart(prev => {
      const exist = prev.find(item => item.id === product.id);
      if (exist) return prev.map(item => item.id === product.id ? {...item, qty: item.qty + 1} : item);
      return [...prev, { ...product, qty: 1, note: '' }];
    });
  };
  const updateQty = (id, delta) => setCart(prev => prev.map(item => item.id === id ? {...item, qty: Math.max(0, item.qty + delta)} : item).filter(i => i.qty > 0));
  const updateNote = (id, text) => setCart(prev => prev.map(item => item.id === id ? {...item, note: text} : item));
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

  const submitOrder = async () => {
    if(cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const orderPayload = {
        customerName: customer.name, tableNumber: customer.table, orderType: 'DINE_IN',
        items: cart, totalAmount: cartTotal, paymentStatus: 'UNPAID', status: 'PENDING',
        orderSource: 'MOBILE_WEB', createdAt: serverTimestamp(), isUpdated: false
      };
      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      localStorage.setItem('last_order', JSON.stringify({ ...orderPayload, id: docRef.id }));
      navigate('/order/success');
    } catch (error) { console.error(error); alert("Gagal kirim pesanan."); setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28 font-sans">
      <div className="bg-white px-4 pt-6 pb-2 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div><h1 className="font-black text-xl text-gray-800">Halo, {customer?.name}</h1><p className="text-xs text-gray-500">Meja <span className="font-bold text-primary text-sm">{customer?.table}</span></p></div>
          {cart.length > 0 && <div onClick={() => setShowCart(true)} className="relative p-2 bg-gray-100 rounded-full cursor-pointer"><ShoppingCart size={20} className="text-gray-700"/><span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{totalItems}</span></div>}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {CATEGORIES.map(cat => <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>{cat}</button>)}
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {products.filter(item => activeCategory === "ALL" || item.category === activeCategory).map(product => {
          const inCart = cart.find(c => c.id === product.id);
          return (
            <div key={product.id} onClick={() => addToCart(product)} className={`bg-white p-3 rounded-2xl shadow-sm border transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${inCart ? 'border-primary ring-1 ring-primary' : 'border-gray-100'}`}>
              <div>
                  <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden mb-3"><img src={product.image} className="w-full h-full object-cover" alt={product.name}/></div>
                  <h3 className="font-bold text-gray-800 text-xs leading-tight mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-gray-900 font-black text-sm">{(product.price/1000).toFixed(0)}k</p>
              </div>
              {inCart && <div className="mt-2 flex items-center justify-center bg-primary text-white text-xs font-bold py-1 rounded-lg shadow-md shadow-indigo-200">{inCart.qty}x di Keranjang</div>}
            </div>
          );
        })}
      </div>

      {/* Floating Button & Modal (Sama seperti sebelumnya) */}
      {cart.length > 0 && <div className="fixed bottom-6 left-4 right-4 z-30"><button onClick={() => setShowCart(true)} className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center"><span className="font-bold text-sm">{totalItems} Item</span><div className="flex items-center gap-2"><span className="text-gray-400 text-xs font-normal">Total</span><span className="font-black text-lg">Rp {cartTotal.toLocaleString('id-ID')}</span></div></button></div>}
      
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end animate-in slide-in-from-bottom duration-300 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="font-black text-xl">Pesanan Kamu</h2><button onClick={() => setShowCart(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 items-start">
                   <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0"><img src={item.image} className="w-full h-full object-cover"/></div>
                   <div className="flex-1">
                      <div className="flex justify-between"><h4 className="font-bold text-sm text-gray-800">{item.name}</h4><p className="text-primary font-bold text-xs">Rp {(item.price*item.qty).toLocaleString('id-ID')}</p></div>
                      <input type="text" placeholder="Catatan (Pedas, dll)..." className="w-full mt-1 text-[10px] bg-gray-50 border border-gray-100 rounded p-1.5 outline-none focus:border-primary text-gray-600" value={item.note} onChange={(e) => updateNote(item.id, e.target.value)} />
                      <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">-</button><span className="text-sm font-bold w-4 text-center">{item.qty}</span><button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">+</button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4"><button onClick={submitOrder} disabled={isSubmitting} className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg shadow-green-200 disabled:bg-gray-400">{isSubmitting ? 'Mengirim...' : 'Pesan Sekarang'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuOrder;