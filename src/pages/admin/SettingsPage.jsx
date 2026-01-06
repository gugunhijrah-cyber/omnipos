import React, { useState, useEffect } from 'react';
import { Save, Store, Upload, Type, Clock, MapPin, Instagram, Phone, Megaphone, DollarSign, Palette, Video, MessageSquareQuote } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import MenuManagerPage from './MenuManagerPage';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [loading, setLoading] = useState(false);
  
  // STATE LENGKAP (Semua konfigurasi ada disini)
  const [settings, setSettings] = useState({
    // 1. Identitas Resto
    storeName: 'Bakso Ujo',
    address: 'Jl. Raya Kuliner No. 88, Tangerang Selatan',
    operatingHours: '10.00 - 22.00 WIB',
    quote: 'Rasa yang tak pernah bohong.',
    logoBase64: '',
    
    // 2. Kontak & Sosmed
    whatsappNumber: '6281234567890',
    instagram: '@baksoujo',
    tiktok: '@baksoujo_id',
    googleReviewLink: '', 

    // 3. Promo
    promoText: 'DISKON 20% HARI INI!',
    promoActive: true,
    
    // 4. Keuangan & Tema
    taxEnabled: false,
    taxPercentage: 10,
    themeColor: 'orange', 

    // 5. Konfigurasi Dapur (Kitchen)
    kitchenRunningText: 'UTAMAKAN KUALITAS & KEBERSIHAN',
    kitchenLateThreshold: 15, // Menit
    kitchenVolume: 80, // Persen
  });

  // Load Data saat aplikasi dibuka
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "store_config"));
        if (snap.exists()) {
            setSettings({ ...settings, ...snap.data() }); // Gabungkan data default dengan data dari DB
        }
      } catch (error) {
        console.error("Gagal load setting:", error);
      }
    };
    loadSettings();
  }, []);

  // Simpan Data
  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "store_config"), settings);
      alert("✅ Pengaturan Berhasil Disimpan!");
    } catch (error) { 
        alert("Gagal menyimpan: " + error.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings({ ...settings, logoBase64: reader.result });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 font-sans custom-scrollbar">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* NAVIGASI TAB */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          <button onClick={() => setActiveTab('PROFILE')} className={`flex-1 py-5 min-w-[180px] text-xs font-black uppercase tracking-wider transition-colors ${activeTab==='PROFILE'?'text-orange-600 border-b-4 border-orange-500 bg-orange-50/50':'text-gray-400 hover:bg-gray-50'}`}>Profil, Promo & Pajak</button>
          <button onClick={() => setActiveTab('KITCHEN')} className={`flex-1 py-5 min-w-[180px] text-xs font-black uppercase tracking-wider transition-colors ${activeTab==='KITCHEN'?'text-orange-600 border-b-4 border-orange-500 bg-orange-50/50':'text-gray-400 hover:bg-gray-50'}`}>Layar Dapur</button>
          <button onClick={() => setActiveTab('MENU')} className={`flex-1 py-5 min-w-[180px] text-xs font-black uppercase tracking-wider transition-colors ${activeTab==='MENU'?'text-orange-600 border-b-4 border-orange-500 bg-orange-50/50':'text-gray-400 hover:bg-gray-50'}`}>Manajemen Menu</button>
        </div>
        
        <div className="p-8">
          {/* TAB 1: PROFIL & CONFIG UTAMA */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-8 animate-in fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* BAGIAN 1: IDENTITAS */}
                    <div className="space-y-4">
                        <h3 className="font-black text-gray-800 border-b pb-2 flex items-center gap-2"><Store size={18}/> Identitas Resto</h3>
                        
                        {/* Upload Logo */}
                        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center overflow-hidden mb-3 relative group">
                                {settings.logoBase64 ? <img src={settings.logoBase64} className="w-full h-full object-cover"/> : <Store size={32} className="text-gray-300"/>}
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload}/>
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold">GANTI LOGO</div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Klik gambar untuk ubah</span>
                        </div>

                        <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nama Restoran</label><input className="w-full p-3 border rounded-xl font-bold" value={settings.storeName} onChange={e=>setSettings({...settings, storeName:e.target.value})}/></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Slogan / Quote</label><textarea className="w-full p-3 border rounded-xl text-sm" rows="2" value={settings.quote} onChange={e=>setSettings({...settings, quote:e.target.value})}/></div>
                    </div>

                    {/* BAGIAN 2: KONTAK & PROMO */}
                    <div className="space-y-4">
                        <h3 className="font-black text-gray-800 border-b pb-2 flex items-center gap-2"><Phone size={18}/> Kontak & Promo</h3>
                        <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">WhatsApp Admin (628..)</label><input type="number" className="w-full p-3 border rounded-xl" value={settings.whatsappNumber} onChange={e=>setSettings({...settings, whatsappNumber:e.target.value})}/></div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Instagram</label><input className="w-full p-3 border rounded-xl text-xs" value={settings.instagram} onChange={e=>setSettings({...settings, instagram:e.target.value})}/></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">TikTok</label><input className="w-full p-3 border rounded-xl text-xs" value={settings.tiktok} onChange={e=>setSettings({...settings, tiktok:e.target.value})}/></div>
                        </div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Link Google Review</label><input className="w-full p-3 border rounded-xl text-xs text-blue-600" placeholder="https://..." value={settings.googleReviewLink} onChange={e=>setSettings({...settings, googleReviewLink:e.target.value})}/></div>
                        
                        {/* BOX PROMO */}
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-yellow-800 uppercase flex items-center gap-2"><Megaphone size={14}/> Running Promo</label>
                                <input type="checkbox" className="accent-orange-600 w-5 h-5 cursor-pointer" checked={settings.promoActive} onChange={e=>setSettings({...settings, promoActive:e.target.checked})}/>
                            </div>
                            <textarea className="w-full p-2 border border-yellow-200 rounded-lg text-sm bg-white" rows="2" value={settings.promoText} onChange={e=>setSettings({...settings, promoText:e.target.value})} placeholder="Isi teks promo disini..."/>
                        </div>
                    </div>

                    {/* BAGIAN 3: ALAMAT & KEUANGAN */}
                    <div className="space-y-6">
                        <h3 className="font-black text-gray-800 border-b pb-2 flex items-center gap-2"><MapPin size={18}/> Lokasi & Pajak</h3>
                        
                        <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Alamat Lengkap</label><textarea className="w-full p-3 border rounded-xl text-sm" rows="3" value={settings.address} onChange={e=>setSettings({...settings, address:e.target.value})}/></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jam Operasional</label><input className="w-full p-3 border rounded-xl" value={settings.operatingHours} onChange={e=>setSettings({...settings, operatingHours:e.target.value})}/></div>

                        {/* CONFIG PAJAK */}
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-bold text-blue-900 flex items-center gap-2"><DollarSign size={16}/> Pungutan Pajak</label>
                                <input type="checkbox" className="w-5 h-5 accent-blue-600 cursor-pointer" checked={settings.taxEnabled} onChange={e=>setSettings({...settings, taxEnabled:e.target.checked})}/>
                            </div>
                            {settings.taxEnabled && (
                                <div className="animate-in slide-in-from-top-2">
                                    <label className="text-xs font-bold text-blue-700 uppercase">Persentase (%)</label>
                                    <input type="number" className="w-full p-2 rounded border border-blue-200 font-bold text-lg mt-1" value={settings.taxPercentage} onChange={e=>setSettings({...settings, taxPercentage:e.target.value})}/>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* TOMBOL SIMPAN UTAMA */}
                <div className="border-t pt-6 sticky bottom-0 bg-white pb-4">
                    <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                        <Save size={20}/> {loading ? 'MENYIMPAN...' : 'SIMPAN SEMUA PERUBAHAN'}
                    </button>
                </div>
            </div>
          )}

          {/* TAB 2: CONFIG DAPUR */}
          {activeTab === 'KITCHEN' && (
            <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 shadow-sm">
                    <label className="font-black text-orange-900 text-sm mb-2 block uppercase tracking-wide">Teks Berjalan (Running Text)</label>
                    <textarea className="w-full p-4 rounded-xl border border-orange-200 text-sm font-medium" rows="2" value={settings.kitchenRunningText} onChange={e=>setSettings({...settings, kitchenRunningText:e.target.value})} placeholder="Pesan untuk koki..."/>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 border rounded-2xl bg-white shadow-sm">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Batas Waktu (Menit)</label>
                        <input type="number" className="w-full p-3 border rounded-xl font-black text-2xl" value={settings.kitchenLateThreshold} onChange={e=>setSettings({...settings, kitchenLateThreshold:e.target.value})}/>
                        <p className="text-[10px] text-gray-400 mt-2">Kartu akan berkedip merah jika lewat waktu ini.</p>
                    </div>
                    <div className="p-4 border rounded-2xl bg-white shadow-sm">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Volume Alarm</label>
                        <input type="range" className="w-full mt-4 accent-orange-600 cursor-pointer" min="0" max="100" value={settings.kitchenVolume} onChange={e=>setSettings({...settings, kitchenVolume:e.target.value})}/>
                        <p className="text-right font-bold text-orange-600">{settings.kitchenVolume}%</p>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <button onClick={handleSave} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition-all">
                        Simpan Konfigurasi Dapur
                    </button>
                </div>
            </div>
          )}

          {/* TAB 3: MENU MANAGEMENT (Memanggil Component Terpisah) */}
          {activeTab === 'MENU' && <MenuManagerPage />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;