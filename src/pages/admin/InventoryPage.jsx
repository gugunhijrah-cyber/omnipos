import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Package, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Search, Plus, Edit2, History, Trash2, X, Save, Filter, ClipboardCheck, DollarSign, Download } from 'lucide-react';

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("ALL"); 
  
  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({ name: '', category: 'BAHAN BAKU', unit: 'kg', stock: 0, minStock: 5, cost: 0 });
  
  // Adjust Data (Sekarang support mode OPNAME)
  const [adjustData, setAdjustData] = useState({ id: '', name: '', currentStock: 0, type: 'IN', amount: '', realStock: '', note: '' });
  
  const [selectedItemHistory, setSelectedItemHistory] = useState([]);

  // 1. LOAD DATA
  useEffect(() => {
    const qItems = query(collection(db, "inventory"), orderBy("name", "asc"));
    const unsubItems = onSnapshot(qItems, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qLogs = query(collection(db, "inventory_logs"), orderBy("createdAt", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubItems(); unsubLogs(); };
  }, []);

  // --- ACTIONS ---

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
        const payload = {
            name: formData.name,
            category: formData.category,
            unit: formData.unit,
            minStock: parseInt(formData.minStock),
            cost: parseInt(formData.cost) || 0, // Harga Beli
            updatedAt: serverTimestamp()
        };

        if (formData.id) {
            await updateDoc(doc(db, "inventory", formData.id), payload);
        } else {
            await addDoc(collection(db, "inventory"), {
                ...payload,
                stock: parseInt(formData.stock),
            });
        }
        setShowFormModal(false);
        setFormData({ name: '', category: 'BAHAN BAKU', unit: 'kg', stock: 0, minStock: 5, cost: 0 });
    } catch (error) { alert("Gagal menyimpan data"); }
  };

  const handleDelete = async (id) => {
      if(window.confirm("Hapus item ini? Data riwayat akan tetap ada.")) {
          await deleteDoc(doc(db, "inventory", id));
      }
  };

  const handleAdjustStock = async (e) => {
      e.preventDefault();
      
      let finalAmount = 0;
      let finalType = adjustData.type;
      let newStock = adjustData.currentStock;

      // LOGIKA STOCK OPNAME (FITUR PRO)
      if (adjustData.type === 'OPNAME') {
          const real = parseInt(adjustData.realStock);
          if (isNaN(real)) return alert("Masukkan jumlah fisik!");
          
          const diff = real - adjustData.currentStock;
          if (diff === 0) return alert("Stok fisik sama dengan sistem. Tidak perlu penyesuaian.");
          
          finalType = diff > 0 ? 'ADJUST_IN' : 'ADJUST_OUT'; // Penyesuaian
          finalAmount = Math.abs(diff);
          newStock = real;
      } else {
          // LOGIKA BIASA (IN/OUT)
          finalAmount = parseInt(adjustData.amount);
          if(!finalAmount || finalAmount <= 0) return alert("Jumlah harus valid");
          
          if (adjustData.type === 'IN') newStock += finalAmount;
          else newStock -= finalAmount;
      }

      if (newStock < 0) return alert("Stok tidak boleh minus!");

      try {
          // 1. Update Stok
          await updateDoc(doc(db, "inventory", adjustData.id), { stock: newStock, updatedAt: serverTimestamp() });

          // 2. Catat Log
          await addDoc(collection(db, "inventory_logs"), {
              itemId: adjustData.id,
              itemName: adjustData.name,
              type: finalType, 
              amount: finalAmount,
              currentStock: newStock,
              note: adjustData.note || (adjustData.type === 'OPNAME' ? 'Stock Opname' : 'Manual Adjustment'),
              createdAt: serverTimestamp(),
              staff: 'Admin'
          });

          setShowAdjustModal(false);
      } catch (error) { console.error(error); }
  };

  const openHistory = (item) => {
      const history = logs.filter(l => l.itemId === item.id);
      setSelectedItemHistory(history);
      setShowHistoryModal(true);
  };

  const handleDownloadCSV = () => {
      let csv = "NAMA ITEM,KATEGORI,STOK,SATUAN,HARGA BELI,TOTAL ASET,STATUS\n";
      items.forEach(i => {
          csv += `${i.name},${i.category},${i.stock},${i.unit},${i.cost},${i.stock * i.cost},${i.stock <= i.minStock ? 'LOW' : 'OK'}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stok_Gudang_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
  };

  // --- STATISTIK ---
  const lowStockCount = items.filter(i => i.stock <= i.minStock).length;
  const totalAssetValue = items.reduce((acc, item) => acc + (item.stock * (item.cost || 0)), 0);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 font-sans custom-scrollbar">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Gudang & Stok</h1>
              <p className="text-sm text-gray-500 font-medium mt-1">Manajemen bahan baku dan aset operasional.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadCSV} className="px-4 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-all">
                <Download size={18}/> Export Data
            </button>
            <button onClick={()=>{setFormData({ name: '', category: 'BAHAN BAKU', unit: 'kg', stock: 0, minStock: 5, cost: 0 }); setShowFormModal(true)}} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-lg">
                <Plus size={18}/> Item Baru
            </button>
          </div>
      </div>

      {/* KPI CARDS (DENGAN VALUASI ASET) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><Package size={24}/></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Total Item</p><h3 className="text-2xl font-black text-gray-900">{items.length} SKU</h3></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-xl text-green-600"><DollarSign size={24}/></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Nilai Aset Gudang</p><h3 className="text-2xl font-black text-gray-900">Rp {(totalAssetValue/1000).toFixed(0)}k</h3></div>
          </div>
          <div className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 ${lowStockCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
              <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-red-200 text-red-600' : 'bg-gray-100 text-gray-600'}`}><AlertTriangle size={24}/></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Stok Menipis</p><h3 className={`text-2xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockCount} Item</h3></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><History size={24}/></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Log Hari Ini</p><h3 className="text-2xl font-black text-gray-900">{logs.filter(l => l.createdAt?.seconds * 1000 > new Date().setHours(0,0,0,0)).length} Akt</h3></div>
          </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* TOOLBAR */}
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
                  <input type="text" placeholder="Cari bahan..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm font-bold" onChange={(e)=>setSearchTerm(e.target.value)}/>
              </div>
              <div className="flex gap-2">
                  {['ALL', 'LOW', 'GOOD'].map(f => (
                      <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${filter===f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                          {f==='ALL'?'Semua':f==='LOW'?'Stok Rendah':'Stok Aman'}
                      </button>
                  ))}
              </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                      <tr>
                          <th className="p-5 pl-8">Nama Item</th>
                          <th className="p-5">Kategori</th>
                          <th className="p-5">Harga Beli (Satuan)</th>
                          <th className="p-5 text-center">Stok Fisik</th>
                          <th className="p-5 text-center">Satuan</th>
                          <th className="p-5 text-center">Nilai Aset</th>
                          <th className="p-5 text-right pr-8">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {items
                        .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .filter(i => filter === 'ALL' || (filter === 'LOW' ? i.stock <= i.minStock : i.stock > i.minStock))
                        .map(item => (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                              <td className="p-5 pl-8 font-bold text-gray-800">{item.name}</td>
                              <td className="p-5"><span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold uppercase">{item.category}</span></td>
                              <td className="p-5 text-gray-600">Rp {item.cost?.toLocaleString() || 0}</td>
                              <td className="p-5 text-center">
                                  <span className={`text-lg font-black ${item.stock <= item.minStock ? 'text-red-600' : 'text-gray-900'}`}>{item.stock}</span>
                              </td>
                              <td className="p-5 text-center text-gray-500 font-medium">{item.unit}</td>
                              <td className="p-5 text-center font-bold text-gray-700">Rp {(item.stock * (item.cost||0)).toLocaleString()}</td>
                              <td className="p-5 pr-8 text-right">
                                  <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={()=>{setAdjustData({id:item.id, name:item.name, currentStock:item.stock, type:'IN', amount:'', note:''}); setShowAdjustModal(true)}} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Masuk (Beli)"><ArrowUpCircle size={16}/></button>
                                      <button onClick={()=>{setAdjustData({id:item.id, name:item.name, currentStock:item.stock, type:'OUT', amount:'', note:''}); setShowAdjustModal(true)}} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Keluar (Pakai/Rusak)"><ArrowDownCircle size={16}/></button>
                                      <button onClick={()=>{setAdjustData({id:item.id, name:item.name, currentStock:item.stock, type:'OPNAME', amount:'', note:'', realStock:''}); setShowAdjustModal(true)}} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100" title="Stock Opname (Hitung Fisik)"><ClipboardCheck size={16}/></button>
                                      <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                      <button onClick={()=>{setFormData(item); setShowFormModal(true)}} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><Edit2 size={16}/></button>
                                      <button onClick={()=>openHistory(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><History size={16}/></button>
                                      <button onClick={()=>handleDelete(item.id)} className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* MODAL INPUT ITEM */}
      {showFormModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl">{formData.id ? 'Edit Item' : 'Item Baru'}</h3><button onClick={()=>setShowFormModal(false)}><X/></button></div>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Item</label><input type="text" className="w-full p-3 border rounded-xl font-bold" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required/></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori</label><select className="w-full p-3 border rounded-xl" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}><option value="BAHAN BAKU">Bahan Baku</option><option value="KEMASAN">Kemasan</option><option value="LAINNYA">Lainnya</option></select></div>
                          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Satuan</label><select className="w-full p-3 border rounded-xl" value={formData.unit} onChange={e=>setFormData({...formData, unit:e.target.value})}><option value="kg">Kg</option><option value="gr">Gram</option><option value="pcs">Pcs</option><option value="liter">Liter</option><option value="ikat">Ikat</option><option value="porsi">Porsi</option></select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          {!formData.id && <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stok Awal</label><input type="number" className="w-full p-3 border rounded-xl font-bold" value={formData.stock} onChange={e=>setFormData({...formData, stock:e.target.value})} required/></div>}
                          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Harga Beli (Satuan)</label><input type="number" className="w-full p-3 border rounded-xl font-bold" value={formData.cost} onChange={e=>setFormData({...formData, cost:e.target.value})} placeholder="Rp 0"/></div>
                      </div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min. Stok (Peringatan)</label><input type="number" className="w-full p-3 border rounded-xl font-bold text-red-600" value={formData.minStock} onChange={e=>setFormData({...formData, minStock:e.target.value})} required/></div>
                      <button type="submit" className="w-full py-4 bg-black text-white font-bold rounded-xl mt-4">SIMPAN DATA</button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL ADJUST & OPNAME */}
      {showAdjustModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="font-black text-xl">{adjustData.type === 'IN' ? 'Stok Masuk' : adjustData.type === 'OUT' ? 'Stok Keluar' : 'Stock Opname'}</h3>
                          <p className="text-xs text-gray-500">{adjustData.name} • Saat ini: {adjustData.currentStock}</p>
                      </div>
                      <button onClick={()=>setShowAdjustModal(false)}><X/></button>
                  </div>
                  <form onSubmit={handleAdjustStock} className="space-y-4">
                      {adjustData.type === 'OPNAME' ? (
                          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                              <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Stok Fisik Aktual</label>
                              <input autoFocus type="number" className="w-full p-2 bg-white border border-purple-200 rounded-lg font-black text-3xl outline-none text-purple-900" placeholder="0" value={adjustData.realStock} onChange={e=>setAdjustData({...adjustData, realStock:e.target.value})} required/>
                              <p className="text-[10px] text-gray-500 mt-2">Sistem akan otomatis menghitung selisih.</p>
                          </div>
                      ) : (
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jumlah ({adjustData.type === 'IN' ? '+' : '-'})</label>
                              <input autoFocus type="number" className={`w-full p-4 border-2 rounded-2xl font-black text-3xl outline-none ${adjustData.type==='IN'?'border-green-200 text-green-600 focus:border-green-500':'border-red-200 text-red-600 focus:border-red-500'}`} placeholder="0" value={adjustData.amount} onChange={e=>setAdjustData({...adjustData, amount:e.target.value})} required/>
                          </div>
                      )}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan</label>
                          <textarea className="w-full p-3 border rounded-xl text-sm" rows="2" placeholder="Keterangan..." value={adjustData.note} onChange={e=>setAdjustData({...adjustData, note:e.target.value})} required></textarea>
                      </div>
                      <button type="submit" className={`w-full py-4 text-white font-bold rounded-xl ${adjustData.type==='IN'?'bg-green-600 hover:bg-green-700': adjustData.type==='OUT' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>SIMPAN</button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL RIWAYAT */}
      {showHistoryModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-3xl p-0 shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="font-black text-lg">Kartu Stok Digital</h3><button onClick={()=>setShowHistoryModal(false)}><X size={20}/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {selectedItemHistory.length === 0 ? <p className="text-center text-gray-400 text-sm">Belum ada riwayat.</p> : selectedItemHistory.map(h => (
                          <div key={h.id} className="flex justify-between items-center border-b border-dashed pb-3 last:border-0">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-black px-1.5 rounded uppercase ${h.type.includes('IN')?'bg-green-100 text-green-700':h.type.includes('OUT')?'bg-red-100 text-red-700':'bg-purple-100 text-purple-700'}`}>{h.type.replace('_', ' ')}</span>
                                      <span className="text-xs font-bold text-gray-400">{new Date(h.createdAt?.seconds*1000).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-sm font-bold text-gray-800 mt-1">{h.note}</p>
                              </div>
                              <div className="text-right">
                                  <span className={`text-lg font-black ${h.type.includes('IN')?'text-green-600':'text-red-600'}`}>{h.type.includes('IN')?'+':'-'}{h.amount}</span>
                                  <p className="text-[10px] text-gray-400">Sisa: {h.currentStock}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default InventoryPage;