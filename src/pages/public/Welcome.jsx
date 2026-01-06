import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, ArrowRight, Store } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Welcome = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', table: '' });
  const [storeData, setStoreData] = useState(null);

  useEffect(() => {
    const fetchStore = async () => {
      const docRef = doc(db, "settings", "store_config");
      const snap = await getDoc(docRef);
      if(snap.exists()) setStoreData(snap.data());
    };
    fetchStore();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.table) return alert("Mohon isi Nama dan Nomor Meja");
    localStorage.setItem('customer_info', JSON.stringify(formData));
    navigate('/order');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Dynamic Logo */}
      <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 overflow-hidden border-4 border-white animate-in zoom-in duration-500">
        {storeData?.logoBase64 ? (
            <img src={storeData.logoBase64} alt="Logo" className="w-full h-full object-cover"/>
        ) : (
            <Store size={40} className="text-primary" />
        )}
      </div>

      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-800 mb-2">{storeData?.storeName || 'Selamat Datang!'}</h1>
          <p className="text-gray-400 text-sm">{storeData?.welcomeQuote || 'Silakan isi data untuk mulai memesan.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Nama Anda</label>
            <input type="text" placeholder="Contoh: Budi" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Nomor Meja</label>
            <input type="number" placeholder="Contoh: 5" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary transition-all" value={formData.table} onChange={(e) => setFormData({...formData, table: e.target.value})} />
          </div>
          <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-black text-lg shadow-lg shadow-indigo-200 mt-4 flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all">
            LIHAT MENU <ArrowRight size={20}/>
          </button>
        </form>
      </div>
      <p className="mt-8 text-xs text-gray-400 font-medium text-center">© 2026 {storeData?.storeName}<br/>Powered by OmniPOS</p>
    </div>
  );
};

export default Welcome;