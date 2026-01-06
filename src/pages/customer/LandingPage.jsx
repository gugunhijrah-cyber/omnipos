import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, MapPin, Clock, Instagram, Phone, ArrowRight, Star, Megaphone, Video, MessageSquareQuote } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const LandingPage = () => {
  const navigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);
  const [config, setConfig] = useState(null);

  useEffect(() => {
      getDoc(doc(db, "settings", "store_config")).then(snap => {
          if (snap.exists()) setConfig(snap.data());
      });
  }, []);

  const handleSecretLogin = () => {
    setTapCount(prev => prev + 1);
    if (window.secretTimer) clearTimeout(window.secretTimer);
    window.secretTimer = setTimeout(() => setTapCount(0), 2000);

    if (tapCount + 1 >= 5) {
        const pass = prompt("🔐 ADMIN ACCESS\nMasukkan PIN:");
        if (pass === "1234") navigate('/pos');
        else { alert("Akses Ditolak"); setTapCount(0); }
    }
  };

  const openLink = (url) => { if(url) window.open(url, '_blank'); };
  const handleWhatsApp = () => { if(config?.whatsappNumber) openLink(`https://wa.me/${config.whatsappNumber}`); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden font-sans">
      
      {/* BACKGROUND MODERN */}
      <div className="absolute top-0 left-0 w-full h-[55vh] bg-gradient-to-br from-orange-600 via-red-600 to-red-800 rounded-b-[50px] z-0 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute top-10 right-10 w-40 h-40 bg-yellow-400 opacity-20 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center pt-16 px-6">
          
          {/* LOGO & BRAND */}
          <div onClick={handleSecretLogin} className="w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-5 cursor-pointer select-none active:scale-95 transition-transform overflow-hidden ring-4 ring-white/30">
              {config?.logoBase64 ? <img src={config.logoBase64} className="w-full h-full object-cover"/> : <span className="text-5xl font-black text-orange-600">U</span>}
          </div>

          <h1 className="text-3xl font-black text-white text-center mb-2 uppercase tracking-tight drop-shadow-md">{config?.storeName || 'Bakso Ujo'}</h1>
          
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 mb-6 shadow-sm">
              <Star size={14} className="text-yellow-300 fill-yellow-300"/>
              <span className="text-xs font-bold text-white tracking-wide">AUTHENTIC TASTE</span>
          </div>

          {/* PROMO CARD (Highlight) */}
          {config?.promoActive && config?.promoText && (
              <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl mb-6 flex items-center gap-4 transform hover:scale-105 transition-transform border-l-4 border-yellow-400 animate-in slide-in-from-bottom duration-700">
                  <div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><Megaphone size={20}/></div>
                  <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Promo Spesial</p>
                      <p className="text-sm font-black text-gray-800 leading-tight">{config.promoText}</p>
                  </div>
              </div>
          )}

          {/* INFO RESTO CARD */}
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 mb-8 border border-gray-100">
              {/* Alamat & Jam */}
              <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><MapPin size={18}/></div>
                      <div><h3 className="font-bold text-gray-800 text-xs uppercase">Lokasi</h3><p className="text-xs text-gray-500 leading-snug">{config?.address || '-'}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Clock size={18}/></div>
                      <div><h3 className="font-bold text-gray-800 text-xs uppercase">Jam Buka</h3><p className="text-xs text-gray-500 leading-snug">{config?.operatingHours || '-'}</p></div>
                  </div>
              </div>
              
              <hr className="my-4 border-gray-100"/>
              
              {/* GRID 4 TOMBOL SOCIAL MEDIA */}
              <div className="grid grid-cols-2 gap-3">
                  <button onClick={()=>openLink(`https://instagram.com/${config?.instagram?.replace('@','')}`)} className="py-3 bg-pink-50 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-pink-600 hover:bg-pink-100 transition-colors">
                      <Instagram size={16}/> Instagram
                  </button>
                  <button onClick={()=>openLink(`https://tiktok.com/${config?.tiktok}`)} className="py-3 bg-gray-100 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-gray-700 hover:bg-gray-200 transition-colors">
                      <Video size={16}/> TikTok
                  </button>
                  <button onClick={handleWhatsApp} className="py-3 bg-green-50 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-green-600 hover:bg-green-100 transition-colors">
                      <Phone size={16}/> WhatsApp
                  </button>
                  <button onClick={()=>openLink(config?.googleReviewLink)} className="py-3 bg-blue-50 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors">
                      <MessageSquareQuote size={16}/> Ulasan Google
                  </button>
              </div>
          </div>

          {/* TOMBOL ORDER UTAMA */}
          <button onClick={() => navigate('/order')} className="w-full max-w-sm bg-gray-900 text-white py-5 rounded-3xl shadow-2xl flex items-center justify-center gap-3 group hover:scale-105 transition-all active:scale-95 mb-10">
              <div className="bg-orange-500 p-2 rounded-full group-hover:rotate-12 transition-transform"><ChefHat size={20}/></div>
              <span className="font-black text-lg tracking-wider">PESAN MAKANAN</span>
              <ArrowRight className="group-hover:translate-x-1 transition-transform"/>
          </button>
          
          <p className="text-[10px] text-gray-400 mt-4 mb-4 font-medium">© {new Date().getFullYear()} {config?.storeName}</p>
      </div>
    </div>
  );
};

export default LandingPage;