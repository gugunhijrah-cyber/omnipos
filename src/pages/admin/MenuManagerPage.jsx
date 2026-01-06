import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Image, Upload, Search, Tag, FileText, CheckSquare, Square, FolderPlus, Save, AlertCircle } from 'lucide-react';

const MenuManagerPage = () => {
  // STATE DATA
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Data Kategori dari DB
  
  // STATE UI & MODALS
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false); // Modal Khusus Kategori
  
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  
  // FORM DATA PRODUK
  const [formData, setFormData] = useState({
    name: '', category: '', price: '', 
    image: '', isAvailable: true, 
    description: '', showDetail: true
  });

  // FORM DATA KATEGORI BARU
  const [newCategoryName, setNewCategoryName] = useState("");

  // 1. LOAD DATA (REALTIME)
  useEffect(() => {
    // A. Load Produk
    const qProd = query(collection(db, "products"), orderBy("category", "asc"));
    const unsubProd = onSnapshot(qProd, (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // B. Load Kategori (PENTING: Agar dropdown tidak kosong)
    const qCat = query(collection(db, "categories"), orderBy("name", "asc"));
    const unsubCat = onSnapshot(qCat, (snap) => {
        const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategories(cats);
    });

    return () => { unsubProd(); unsubCat(); };
  }, []);

  // 2. IMAGE HANDLER
  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if(file) {
          const reader = new FileReader();
          reader.onloadend = () => setFormData({...formData, image: reader.result});
          reader.readAsDataURL(file);
      }
  };

  // 3. LOGIC PRODUK (CRUD)
  const handleSaveProduct = async (e) => {
      e.preventDefault();
      
      // Validasi Kategori
      if (!formData.category) {
          alert("Wajib pilih kategori! Jika kosong, buat kategori dulu.");
          return;
      }

      try {
          const payload = {
              name: formData.name,
              category: formData.category,
              price: parseInt(formData.price),
              image: formData.image,
              isAvailable: formData.isAvailable,
              description: formData.description || '',
              showDetail: formData.showDetail
          };

          if(formData.id) {
              await updateDoc(doc(db, "products", formData.id), payload);
          } else {
              await addDoc(collection(db, "products"), payload);
          }
          setShowProductModal(false);
      } catch(err) { alert("Gagal menyimpan menu: " + err.message); }
  };

  const handleDeleteProduct = async (id) => {
      if(window.confirm("Hapus menu ini secara permanen?")) await deleteDoc(doc(db, "products", id));
  };

  const openEditProduct = (p) => {
      setFormData({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          image: p.image,
          isAvailable: p.isAvailable,
          description: p.description || '',
          showDetail: p.showDetail !== undefined ? p.showDetail : true
      });
      setShowProductModal(true);
  };

  const openNewProduct = () => {
      // Set default kategori ke yang pertama jika ada
      const defaultCat = categories.length > 0 ? categories[0].name : "";
      setFormData({ name: '', category: defaultCat, price: '', image: '', isAvailable: true, description: '', showDetail: true });
      setShowProductModal(true);
  };

  // 4. LOGIC KATEGORI (CRUD)
  const handleAddCategory = async () => {
      if(!newCategoryName.trim()) return;
      const upperName = newCategoryName.toUpperCase();
      
      // Cek Duplikat
      if (categories.some(c => c.name === upperName)) {
          alert("Kategori sudah ada!");
          return;
      }

      try {
          await addDoc(collection(db, "categories"), { name: upperName });
          setNewCategoryName("");
      } catch(e) { alert("Gagal tambah kategori"); }
  };

  const handleDeleteCategory = async (id) => {
      if(window.confirm("Hapus kategori ini? Produk dengan kategori ini mungkin perlu diedit manual.")) {
          await deleteDoc(doc(db, "categories", id));
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* HEADER & TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
              <input className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" placeholder="Cari menu..." onChange={e=>setSearchTerm(e.target.value)}/>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
              <button onClick={()=>setShowCategoryModal(true)} className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl border border-blue-100 hover:bg-blue-100 flex items-center gap-2 text-xs whitespace-nowrap transition-colors">
                  <FolderPlus size={16}/> Kelola Kategori
              </button>
              <button onClick={openNewProduct} className="px-4 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-black flex items-center gap-2 text-xs whitespace-nowrap shadow-lg transition-colors">
                  <Plus size={16}/> Tambah Menu
              </button>
          </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button onClick={()=>setFilterCategory("ALL")} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${filterCategory==="ALL"?'bg-orange-600 text-white border-orange-600':'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>SEMUA</button>
          {categories.map(c => (
              <button key={c.id} onClick={()=>setFilterCategory(c.name)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${filterCategory===c.name?'bg-orange-600 text-white border-orange-600':'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{c.name}</button>
          ))}
          {categories.length === 0 && <span className="text-xs text-red-400 italic py-2 flex items-center gap-1"><AlertCircle size={12}/> Belum ada kategori. Klik 'Kelola Kategori'.</span>}
      </div>

      {/* TABEL PRODUK */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                  <tr>
                      <th className="p-4 pl-6">Produk</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Harga</th>
                      <th className="p-4">Detail Info</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right pr-6">Aksi</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                  {products.filter(p=>(filterCategory==="ALL"||p.category===filterCategory)&&p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                                      {p.image ? <img src={p.image} className="w-full h-full object-cover"/> : <Image className="w-full h-full p-2 text-gray-300"/>}
                                  </div>
                                  <span className="font-bold text-gray-800">{p.name}</span>
                              </div>
                          </td>
                          <td className="p-4"><span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">{p.category}</span></td>
                          <td className="p-4 font-mono font-bold text-gray-700">Rp {p.price.toLocaleString()}</td>
                          <td className="p-4">
                              <div className="flex items-center gap-2">
                                  {p.showDetail ? <CheckSquare size={14} className="text-green-500" title="Aktif"/> : <Square size={14} className="text-gray-300" title="Nonaktif"/>}
                                  <span className="text-xs text-gray-500 truncate max-w-[150px]">{p.description || '-'}</span>
                              </div>
                          </td>
                          <td className="p-4 text-center">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-full ${p.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {p.isAvailable ? 'READY' : 'HABIS'}
                              </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                              <button onClick={()=>openEditProduct(p)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 mr-2"><Edit2 size={14}/></button>
                              <button onClick={()=>handleDeleteProduct(p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* MODAL 1: FORM PRODUK (ADD/EDIT) */}
      {showProductModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl text-gray-800">{formData.id?'Edit Menu':'Menu Baru'}</h3><button onClick={()=>setShowProductModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button></div>
                  <form onSubmit={handleSaveProduct} className="space-y-5">
                      {/* Upload Foto */}
                      <label className="w-full h-36 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 relative group overflow-hidden">
                          {formData.image ? <img src={formData.image} className="w-full h-full object-cover"/> : <><Upload className="text-gray-400 mb-1"/><span className="text-xs font-bold text-gray-400">Upload Foto</span></>}
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
                      </label>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nama Menu</label><input required className="w-full p-3 border rounded-xl font-bold bg-white" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})}/></div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Kategori</label>
                              <select required className="w-full p-3 border rounded-xl bg-white focus:border-orange-500" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}>
                                  {categories.length === 0 && <option value="">(Kosong) Buat Kategori Dulu</option>}
                                  {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                          </div>
                          <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Harga (Rp)</label><input required type="number" className="w-full p-3 border rounded-xl font-bold bg-white" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})}/></div>
                      </div>

                      {/* Deskripsi & Config */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <label className="text-xs font-bold text-blue-800 uppercase mb-2 block flex items-center gap-2"><FileText size={14}/> Deskripsi Menu</label>
                          <textarea className="w-full p-3 border border-blue-200 rounded-xl text-sm mb-3 bg-white" rows="2" placeholder="Contoh: Bakso urat dengan mie..." value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})}/>
                          
                          <div className="flex items-center gap-3">
                              <input type="checkbox" id="showDetail" className="w-5 h-5 accent-blue-600" checked={formData.showDetail} onChange={e=>setFormData({...formData, showDetail:e.target.checked})}/>
                              <label htmlFor="showDetail" className="text-sm font-bold text-gray-700 cursor-pointer select-none">Tampilkan Tombol Info 'i'?</label>
                          </div>
                      </div>

                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <input type="checkbox" id="isAvailable" className="w-5 h-5 accent-green-600" checked={formData.isAvailable} onChange={e=>setFormData({...formData, isAvailable:e.target.checked})}/>
                          <label htmlFor="isAvailable" className="text-sm font-bold text-gray-700 cursor-pointer select-none">Menu Tersedia (Ready Stock)</label>
                      </div>

                      <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all">SIMPAN DATA</button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL 2: KELOLA KATEGORI (WAJIB ADA) */}
      {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl">Kelola Kategori</h3><button onClick={()=>setShowCategoryModal(false)}><X/></button></div>
                  
                  <div className="flex gap-2 mb-4">
                      <input className="flex-1 p-3 border rounded-xl font-bold uppercase text-sm" placeholder="NAMA KATEGORI BARU" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)}/>
                      <button onClick={handleAddCategory} className="bg-orange-600 text-white p-3 rounded-xl hover:bg-orange-700"><Plus/></button>
                  </div>

                  <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 border-t pt-2">
                      {categories.map(c => (
                          <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <span className="font-bold text-gray-700 text-sm">{c.name}</span>
                              <button onClick={()=>handleDeleteCategory(c.id)} className="text-gray-400 hover:text-red-600 bg-white p-2 rounded shadow-sm"><Trash2 size={16}/></button>
                          </div>
                      ))}
                      {categories.length === 0 && <p className="text-center text-gray-400 text-xs italic py-4">Belum ada kategori. Tambahkan diatas.</p>}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default MenuManagerPage;