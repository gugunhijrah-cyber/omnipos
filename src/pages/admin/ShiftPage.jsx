import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
// Menghapus 'orderBy' dari import untuk menghindari error Index Firebase
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Wallet, TrendingUp, AlertCircle, Save, Printer, Lock, LogIn, Clock, CreditCard, FileText, ArrowUpRight, ArrowDownRight, AlertTriangle, X, Plus, Trash2 } from 'lucide-react';

const ShiftPage = () => {
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SUMMARY'); 
  
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [startModalInput, setStartModalInput] = useState('');

  // 1. CEK SHIFT AKTIF
  useEffect(() => {
    const qActive = query(collection(db, "shifts"), where("status", "==", "OPEN"), limit(1));
    const unsubShift = onSnapshot(qActive, (snap) => {
        if (!snap.empty) {
            const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setCurrentShift(data);
            subscribeData(data);
        } else {
            setCurrentShift(null);
            setOrders([]);
            setExpenses([]);
        }
        setLoading(false);
    });

    const fetchHistory = async () => {
        // Query history tetap pakai orderBy karena biasanya index ini standar
        // Jika error, hapus orderBy("endTime", "desc")
        try {
            const q = query(collection(db, "shifts"), where("status", "==", "CLOSED"), limit(5));
            const snap = await getDocs(q);
            // Sort manual di client side
            const sorted = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.endTime - a.endTime);
            setShiftHistory(sorted);
        } catch(e) { console.log("History Load Error", e); }
    };
    fetchHistory();

    return () => unsubShift();
  }, []);

  // 2. SUBSCRIBE DATA (FIX ERROR INDEX)
  const subscribeData = (shift) => {
      // ORDERS
      const qOrders = query(collection(db, "orders"), where("createdAt", ">=", shift.startTime));
      onSnapshot(qOrders, (snap) => {
          // Filter & Sort di Client Side untuk hindari error Index
          const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const paidOrders = allOrders
            .filter(o => o.paymentStatus === 'PAID')
            .sort((a,b) => b.createdAt - a.createdAt);
          setOrders(paidOrders);
      });

      // EXPENSES (FIX: Hapus orderBy di query, lakukan di client)
      const qExpenses = query(collection(db, "shift_expenses"), where("shiftId", "==", shift.id));
      onSnapshot(qExpenses, (snap) => {
          const allExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Sort Client Side (Terbaru diatas)
          setExpenses(allExpenses.sort((a,b) => b.createdAt - a.createdAt));
      });
  };

  // --- KALKULASI ---
  const calculateStats = () => {
      const cashSales = orders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const digitalSales = orders.filter(o => o.paymentMethod !== 'CASH').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalRevenue = cashSales + digitalSales;
      const totalExpenses = expenses.reduce((sum, e) => sum + (parseInt(e.amount) || 0), 0);
      const startCash = currentShift?.startingCash || 0;
      const expectedCash = startCash + cashSales - totalExpenses;

      return { cashSales, digitalSales, totalRevenue, totalExpenses, expectedCash, startCash };
  };

  const stats = calculateStats();

  // --- ACTIONS ---

  const handleOpenShift = async () => {
    if (!startModalInput) return alert("Masukkan modal awal!");
    try { 
        await addDoc(collection(db, "shifts"), { 
            staffName: 'Kasir', 
            startingCash: parseInt(startModalInput), 
            startTime: serverTimestamp(), 
            status: 'OPEN' 
        }); 
    } catch (error) { alert("Gagal buka shift"); }
  };

  const handleAddExpense = async (e) => {
      e.preventDefault();
      const desc = e.target.desc.value;
      const amount = e.target.amount.value;
      if(!desc || !amount) return;

      try {
          await addDoc(collection(db, "shift_expenses"), {
              shiftId: currentShift.id,
              description: desc,
              amount: parseInt(amount),
              createdAt: serverTimestamp(),
              staffName: 'Kasir'
          });
          e.target.reset();
      } catch (err) { alert("Gagal catat biaya. Cek koneksi."); }
  };

  const handleDeleteExpense = async (id) => {
      if(window.confirm("Hapus pengeluaran ini?")) {
          try { await deleteDoc(doc(db, "shift_expenses", id)); } catch(e){}
      }
  };

  const handleCloseShift = async () => {
    const actual = parseInt(actualCashInput) || 0;
    const diff = actual - stats.expectedCash;

    if(!window.confirm("Yakin tutup shift? Data tidak bisa diubah lagi.")) return;

    try {
      await updateDoc(doc(db, "shifts", currentShift.id), {
        endTime: serverTimestamp(),
        status: 'CLOSED',
        stats: {
            totalRevenue: stats.totalRevenue,
            cashSales: stats.cashSales,
            digitalSales: stats.digitalSales,
            totalExpenses: stats.totalExpenses,
            expectedCash: stats.expectedCash,
            actualCash: actual,
            difference: diff,
            transactionCount: orders.length
        }
      });
      setIsClosingModalOpen(false);
      setTimeout(() => window.print(), 500); // Cetak otomatis
    } catch (error) { console.error(error); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">Memuat Data Shift...</div>;

  // TAMPILAN BUKA SHIFT
  if (!currentShift) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl overflow-hidden text-center p-10">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <LogIn className="text-orange-600" size={40}/>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Buka Shift Baru</h1>
            <p className="text-gray-500 mb-8">Masukkan modal awal di laci kasir.</p>
            <div className="text-left mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Modal Awal (Rp)</label>
                <input type="number" className="w-full p-4 border-2 border-gray-200 rounded-2xl font-black text-2xl outline-none focus:border-orange-500 mt-1" placeholder="0" onChange={e=>setStartModalInput(e.target.value)} autoFocus/>
            </div>
            <button onClick={handleOpenShift} className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-lg hover:bg-black transition-all">MULAI OPERASIONAL</button>
        </div>
      </div>
    );
  }

  // TAMPILAN DASHBOARD
  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 font-sans custom-scrollbar">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
              <h1 className="text-3xl font-black text-gray-900">Shift Operasional</h1>
              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>Aktif • Sejak {currentShift.startTime?.toDate().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
          </div>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
              {['SUMMARY', 'TRANSACTIONS', 'EXPENSES'].map(t => (
                  <button key={t} onClick={()=>setActiveTab(t)} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab===t?'bg-gray-100 text-gray-900':'text-gray-500 hover:text-gray-700'}`}>{t==='SUMMARY'?'Ringkasan':t==='TRANSACTIONS'?'Transaksi':'Biaya'}</button>
              ))}
          </div>
          <button onClick={() => setIsClosingModalOpen(true)} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-lg"><Lock className="w-4 h-4"/> Tutup Shift</button>
      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between mb-4"><span className="text-xs font-bold text-gray-400 uppercase">Omzet Bruto</span><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={18}/></div></div>
                    <h3 className="text-3xl font-black text-gray-900">Rp {stats.totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between mb-4"><span className="text-xs font-bold text-gray-400 uppercase">Transaksi</span><div className="p-2 bg-gray-50 text-gray-600 rounded-lg"><FileText size={18}/></div></div>
                    <h3 className="text-3xl font-black text-gray-900">{orders.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                    <div className="flex justify-between mb-4"><span className="text-xs font-bold text-gray-400 uppercase">Pengeluaran</span><div className="p-2 bg-red-50 text-red-600 rounded-lg"><ArrowDownRight size={18}/></div></div>
                    <h3 className="text-3xl font-black text-red-600">Rp {stats.totalExpenses.toLocaleString()}</h3>
                </div>
                <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between mb-4"><span className="text-xs font-bold text-gray-400 uppercase">Ekspektasi Kas Fisik</span><div className="p-2 bg-white/10 rounded-lg"><Wallet size={18}/></div></div>
                        <h3 className="text-3xl font-black text-white">Rp {stats.expectedCash.toLocaleString()}</h3>
                        <p className="text-[10px] text-gray-400 mt-2">Modal Awal + Tunai - Biaya</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6 uppercase text-sm tracking-wider">Metode Pembayaran</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded-2xl border border-green-100">
                            <div className="flex items-center gap-3"><div className="p-2 bg-green-200 text-green-700 rounded-lg"><Wallet size={20}/></div><span className="font-bold text-green-900">Uang Tunai (Cash)</span></div>
                            <span className="font-black text-lg text-green-700">Rp {stats.cashSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-3"><div className="p-2 bg-blue-200 text-blue-700 rounded-lg"><CreditCard size={20}/></div><span className="font-bold text-blue-900">Digital (QRIS/EDC)</span></div>
                            <span className="font-black text-lg text-blue-700">Rp {stats.digitalSales.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6 uppercase text-sm tracking-wider">Info Sesi</h3>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-500">ID Sesi</span><span className="font-mono font-bold text-gray-700">#{currentShift.id.slice(0,8).toUpperCase()}</span></div>
                        <div className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-500">Waktu Buka</span><span className="font-bold text-gray-900">{currentShift.startTime?.toDate().toLocaleString()}</span></div>
                        <div className="flex justify-between items-center pt-2"><span className="text-gray-500">Modal Awal</span><span className="font-black text-xl text-gray-900">Rp {stats.startCash.toLocaleString()}</span></div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* TAB 2: TRANSAKSI */}
      {activeTab === 'TRANSACTIONS' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-800">Daftar Transaksi</h3><span className="text-xs font-bold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">{orders.length} Pesanan</span></div>
              <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold"><tr><th className="p-4 pl-6">Waktu</th><th className="p-4">Pelanggan</th><th className="p-4">Metode</th><th className="p-4 text-right">Total</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                      {orders.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Belum ada transaksi.</td></tr> : orders.map(o => (
                          <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-4 pl-6 font-mono text-gray-500">{new Date(o.createdAt?.seconds*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                              <td className="p-4"><div className="font-bold text-gray-900">{o.customerName}</div><div className="text-xs text-gray-400">#{o.id.slice(-4)}</div></td>
                              <td className="p-4"><span className={`font-bold text-xs ${o.paymentMethod==='CASH'?'text-green-600':'text-blue-600'}`}>{o.paymentMethod}</span></td>
                              <td className="p-4 text-right font-black text-gray-900">Rp {o.totalAmount?.toLocaleString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* TAB 3: BIAYA (EXPENSES) - FIX ERROR */}
      {activeTab === 'EXPENSES' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ArrowDownRight className="text-red-500"/> Input Pengeluaran Operasional</h3>
                  <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-2"><label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Keterangan</label><input name="desc" type="text" placeholder="Beli Gas, Es Batu..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-red-500 outline-none" required/></div>
                      <div><label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Nominal (Rp)</label><input name="amount" type="number" placeholder="0" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-red-500 outline-none font-bold" required/></div>
                      <button type="submit" className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"><Plus size={18}/> Tambah</button>
                  </form>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-800">Daftar Pengeluaran</h3><span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">Total: Rp {stats.totalExpenses.toLocaleString()}</span></div>
                  <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold"><tr><th className="p-4 pl-6">Waktu</th><th className="p-4">Keterangan</th><th className="p-4 text-right">Nominal</th><th className="p-4"></th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                          {expenses.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Belum ada pengeluaran.</td></tr> : expenses.map(e => (
                              <tr key={e.id}>
                                  <td className="p-4 pl-6 font-mono text-gray-500">{e.createdAt?.seconds ? new Date(e.createdAt.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                                  <td className="p-4 font-bold text-gray-800">{e.description}</td>
                                  <td className="p-4 text-right font-black text-red-600">- Rp {e.amount?.toLocaleString()}</td>
                                  <td className="p-4 text-center"><button onClick={()=>handleDeleteExpense(e.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* CLOSING MODAL */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex-1 p-8 bg-white border-r border-gray-100">
                    <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-black text-gray-900">Closing Shift</h2><button onClick={()=>setIsClosingModalOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full"><X size={20}/></button></div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase">Modal Awal</p><p className="text-xl font-black text-gray-800">Rp {stats.startCash.toLocaleString()}</p></div>
                        <div className="p-4 bg-green-50 rounded-2xl border border-green-100"><p className="text-xs font-bold text-green-600 uppercase">Tunai Masuk</p><p className="text-xl font-black text-green-700">+Rp {stats.cashSales.toLocaleString()}</p></div>
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100"><p className="text-xs font-bold text-red-600 uppercase">Pengeluaran</p><p className="text-xl font-black text-red-700">-Rp {stats.totalExpenses.toLocaleString()}</p></div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100"><p className="text-xs font-bold text-blue-600 uppercase">Non-Tunai</p><p className="text-xl font-black text-blue-700">Rp {stats.digitalSales.toLocaleString()}</p></div>
                    </div>
                    <div className="bg-gray-900 text-white p-5 rounded-2xl mb-6 flex justify-between items-center"><span className="font-bold text-sm uppercase tracking-wide">Ekspektasi Uang Fisik</span><span className="font-mono text-2xl font-black">Rp {stats.expectedCash.toLocaleString()}</span></div>
                    <div className="mb-6"><label className="block text-sm font-bold text-gray-700 mb-2">Hitung Uang di Laci (Aktual)</label><input type="number" className="w-full p-4 border-2 border-orange-200 rounded-2xl font-black text-3xl outline-none focus:border-orange-500 text-gray-900" placeholder="0" value={actualCashInput} onChange={(e) => setActualCashInput(e.target.value)} autoFocus/>
                        {actualCashInput && <div className={`mt-2 font-bold flex items-center gap-2 ${parseInt(actualCashInput) - stats.expectedCash < 0 ? 'text-red-500' : 'text-green-600'}`}>{parseInt(actualCashInput) - stats.expectedCash < 0 ? <AlertTriangle size={16}/> : <CheckCircle size={16}/>} Selisih: Rp {(parseInt(actualCashInput) - stats.expectedCash).toLocaleString()}</div>}
                    </div>
                    <button onClick={handleCloseShift} className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg flex justify-center gap-2"><Lock size={18}/> SIMPAN & TUTUP SHIFT</button>
                </div>
                <div className="w-[380px] bg-gray-50 p-8 flex flex-col justify-center items-center shadow-inner">
                    <div className="bg-white p-6 w-full shadow-xl text-xs font-mono leading-relaxed border border-gray-200 relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-gray-100 to-white opacity-50"></div>
                        <h3 className="text-center font-black text-base border-b-2 border-dashed pb-4 mb-4">LAPORAN SHIFT<br/><span className="text-sm font-normal">Bakso Ujo</span></h3>
                        <div className="space-y-1 mb-4 border-b-2 border-dashed pb-4 text-gray-600"><div className="flex justify-between"><span>Mulai:</span><span>{currentShift.startTime?.toDate().toLocaleString()}</span></div><div className="flex justify-between"><span>Selesai:</span><span>Sekarang</span></div><div className="flex justify-between"><span>Kasir:</span><span>{currentShift.staffName}</span></div></div>
                        <p className="font-bold mb-2">PEMASUKAN</p>
                        <div className="space-y-1 mb-4 border-b-2 border-dashed pb-4"><div className="flex justify-between"><span>Modal Awal</span><span>{stats.startCash.toLocaleString()}</span></div><div className="flex justify-between font-bold"><span>Total Penjualan</span><span>{stats.totalRevenue.toLocaleString()}</span></div><div className="flex justify-between pl-2 text-gray-500"><span>- Tunai</span><span>{stats.cashSales.toLocaleString()}</span></div><div className="flex justify-between pl-2 text-gray-500"><span>- Non-Tunai</span><span>{stats.digitalSales.toLocaleString()}</span></div></div>
                        <p className="font-bold mb-2 text-red-600">PENGELUARAN</p>
                        <div className="space-y-1 mb-4 border-b-2 border-dashed pb-4"><div className="flex justify-between text-red-600"><span>Total Biaya</span><span>-{stats.totalExpenses.toLocaleString()}</span></div></div>
                        <p className="font-bold mb-2 text-center bg-gray-100 py-1 rounded">RINGKASAN KAS</p>
                        <div className="space-y-2"><div className="flex justify-between font-bold"><span>Ekspektasi Kas</span><span>{stats.expectedCash.toLocaleString()}</span></div><div className="flex justify-between"><span>Kas Aktual</span><span>{parseInt(actualCashInput || 0).toLocaleString()}</span></div><div className={`flex justify-between font-black border-t border-dashed pt-2 ${parseInt(actualCashInput || 0) - stats.expectedCash < 0 ? 'text-red-600' : 'text-green-600'}`}><span>Selisih</span><span>{(parseInt(actualCashInput || 0) - stats.expectedCash).toLocaleString()}</span></div></div>
                        <div className="mt-6 text-center text-[10px] text-gray-400">Dicetak: {new Date().toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default ShiftPage;