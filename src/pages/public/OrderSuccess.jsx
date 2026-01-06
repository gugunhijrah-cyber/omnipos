import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Download, MessageCircle, Home } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [waNumber, setWaNumber] = useState('');

  useEffect(() => {
    // Ambil data order terakhir
    const lastOrder = localStorage.getItem('last_order');
    if (lastOrder) setOrder(JSON.parse(lastOrder));
    else navigate('/');

    // Ambil nomor WA dari Setting Firebase
    const fetchSettings = async () => {
        const docRef = doc(db, "settings", "store_profile");
        const docSnap = await getDoc(docRef);
        if(docSnap.exists()) setWaNumber(docSnap.data().whatsappNumber);
    };
    fetchSettings();
  }, []);

  if (!order) return null;

  const handleWhatsApp = () => {
    if (!waNumber) return alert("Nomor WA Toko belum disetting admin.");
    
    // Format Pesan WA
    let message = `Halo Bakso Ujo, saya *${order.customerName}* (Meja ${order.tableNumber}).%0A`;
    message += `Saya baru saja memesan:%0A`;
    order.items.forEach(item => {
        message += `- ${item.qty}x ${item.name} ${item.note ? '('+item.note+')' : ''}%0A`;
    });
    message += `%0ATotal: Rp ${order.totalAmount.toLocaleString('id-ID')}%0A`;
    message += `Mohon diproses ya. Terima kasih!`;

    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
  };

  const handleSaveStruk = () => {
    window.print(); // Cara termudah di HP (Save as PDF)
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
      
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <CheckCircle size={40} className="text-green-600" strokeWidth={3} />
      </div>

      <h1 className="text-2xl font-black text-gray-800 mb-2">Pesanan Diterima!</h1>
      <p className="text-gray-500 text-sm mb-8 px-8">Pesananmu sudah masuk ke dapur kami dan sedang disiapkan.</p>

      {/* Kartu Struk Mini */}
      <div className="w-full max-w-sm bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8 text-left relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-purple-500"></div>
        <div className="flex justify-between items-center mb-4 border-b border-dashed border-gray-300 pb-4">
            <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Order ID</p>
                <p className="font-mono font-bold text-gray-800">#{order.id.slice(-5)}</p>
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-400 font-bold uppercase">Meja</p>
                <p className="font-black text-2xl text-primary">{order.tableNumber}</p>
            </div>
        </div>
        
        <div className="space-y-2 mb-4">
            {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-600">
                    <span>{item.qty}x {item.name}</span>
                    <span className="font-bold">{(item.price * item.qty).toLocaleString('id-ID')}</span>
                </div>
            ))}
        </div>

        <div className="border-t border-dashed border-gray-300 pt-4 flex justify-between items-center">
            <span className="font-bold text-gray-800">Total Tagihan</span>
            <span className="font-black text-xl text-primary">Rp {order.totalAmount.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Tombol Aksi */}
      <div className="w-full max-w-sm space-y-3">
        <button 
            onClick={handleWhatsApp}
            className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-all"
        >
            <MessageCircle size={20}/> Konfirmasi ke WhatsApp
        </button>

        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={handleSaveStruk}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
                <Download size={18}/> Simpan Struk
            </button>
            <button 
                onClick={() => navigate('/')}
                className="py-3 bg-white border-2 border-gray-100 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
                <Home size={18}/> Menu Utama
            </button>
        </div>
      </div>

    </div>
  );
};

export default OrderSuccess;