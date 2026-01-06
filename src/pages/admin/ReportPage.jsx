import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Calendar, TrendingUp, ShoppingBag, DollarSign, BarChart2, Printer, ArrowUpRight, FileText, Filter, Percent, CreditCard, Clock, Download, Wallet, PieChart } from 'lucide-react';

const ReportPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Default Filter: Hari Ini
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10)); 
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); 
  const [filterLabel, setFilterLabel] = useState('Hari Ini');

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTx: 0,
    avgOrderValue: 0,
    totalTax: 0,
    topProducts: [],
    categoryShare: [],
    dailyTrend: [],
    paymentMethods: { cash: 0, digital: 0 },
    peakHours: [] 
  });

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const setQuickFilter = (type) => {
      const end = new Date();
      const start = new Date();
      
      if (type === 'TODAY') {
          setFilterLabel('Hari Ini');
      } else if (type === 'WEEK') {
          start.setDate(end.getDate() - 7);
          setFilterLabel('7 Hari Terakhir');
      } else if (type === 'MONTH') {
          start.setDate(1);
          setFilterLabel('Bulan Ini');
      }

      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), where("paymentStatus", "==", "PAID"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);

      const filteredData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), dateObj: doc.data().createdAt?.toDate() }))
        .filter(item => item.dateObj && item.dateObj >= start && item.dateObj <= end);

      setTransactions(filteredData);
      processAnalytics(filteredData);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const processAnalytics = (data) => {
    let revenue = 0;
    let tax = 0;
    let productMap = {};
    let categoryMap = {};
    let dateMap = {};
    let payMap = { cash: 0, digital: 0 };
    let hourMap = {};

    data.forEach(order => {
      const total = order.totalAmount || 0;
      revenue += total;
      tax += (order.taxAmount || 0);

      if (order.paymentMethod === 'CASH') payMap.cash += total;
      else payMap.digital += total;

      const dateKey = order.dateObj ? order.dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';
      dateMap[dateKey] = (dateMap[dateKey] || 0) + total;

      if(order.dateObj) {
          const hour = order.dateObj.getHours(); 
          const hourKey = `${hour < 10 ? '0'+hour : hour}:00`;
          hourMap[hourKey] = (hourMap[hourKey] || 0) + 1;
      }

      if(order.items) {
          order.items.forEach(item => {
            if (!productMap[item.name]) productMap[item.name] = { qty: 0, omzet: 0 };
            productMap[item.name].qty += item.qty;
            productMap[item.name].omzet += (item.price * item.qty);
            
            const cat = item.category || 'LAINNYA';
            categoryMap[cat] = (categoryMap[cat] || 0) + (item.price * item.qty);
          });
      }
    });

    const sortedProducts = Object.keys(productMap).map(key => ({ name: key, ...productMap[key] })).sort((a, b) => b.qty - a.qty).slice(0, 10);
    const sortedCategories = Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] })).sort((a, b) => b.value - a.value);
    const trendArray = Object.keys(dateMap).reverse().map(key => ({ date: key, value: dateMap[key] })); 
    const sortedHours = Object.keys(hourMap).map(key => ({ hour: key, count: hourMap[key] })).sort((a,b) => parseInt(a.hour) - parseInt(b.hour));

    setStats({
      totalRevenue: revenue,
      totalTax: tax,
      totalTx: data.length,
      avgOrderValue: data.length > 0 ? Math.round(revenue / data.length) : 0,
      topProducts: sortedProducts,
      categoryShare: sortedCategories,
      dailyTrend: trendArray,
      paymentMethods: payMap,
      peakHours: sortedHours
    });
  };

  // --- FITUR DOWNLOAD EXCEL/CSV (FIXED & LENGKAP) ---
  const handleDownloadCSV = () => {
    if (transactions.length === 0) return alert("Tidak ada data untuk diunduh.");

    // Gunakan TITIK KOMA (;) agar otomatis rapi di Excel format Indonesia/Eropa
    const SEP = ";"; 
    
    // 1. Header CSV dengan BOM agar Excel membaca encoding UTF-8 dengan benar
    let csvContent = "\uFEFF"; 
    
    // 2. Bagian Ringkasan (Summary) di Atas
    csvContent += `LAPORAN PENJUALAN BAKSO UJO${SEP}${filterLabel}\n`;
    csvContent += `Periode${SEP}'${startDate} s/d '${endDate}\n`; // Tanda kutip ' agar tidak dianggap rumus
    csvContent += `Total Omzet${SEP}Rp ${stats.totalRevenue}\n`;
    csvContent += `Total Transaksi${SEP}${stats.totalTx}\n`;
    csvContent += `Download Pada${SEP}${new Date().toLocaleString()}\n\n`;

    // 3. Header Kolom
    csvContent += `TANGGAL${SEP}JAM${SEP}NO RESI${SEP}MEJA${SEP}PELANGGAN${SEP}TIPE${SEP}METODE${SEP}MENU TERJUAL${SEP}TOTAL (RP)${SEP}PAJAK (RP)\n`;

    // 4. Isi Data
    transactions.forEach(t => {
        const date = t.dateObj ? t.dateObj.toLocaleDateString('id-ID') : '-';
        const time = t.dateObj ? t.dateObj.toLocaleTimeString('id-ID') : '-';
        const id = t.id ? `'#${t.id.slice(-4).toUpperCase()}` : '-'; // Pakai kutip agar tidak jadi Scientific Number
        const table = t.tableNumber || '-';
        // Bersihkan nama dari delimiter
        const name = (t.customerName || 'Guest').replace(/;/g, ','); 
        const type = t.orderType || '-';
        const method = t.paymentMethod || '-';
        const total = t.totalAmount || 0;
        const tax = t.taxAmount || 0;

        // Gabungkan items menjadi satu string rapi
        const itemsDetail = t.items 
            ? t.items.map(i => `${i.name} (x${i.qty})`).join(" | ") 
            : "-";

        csvContent += `${date}${SEP}${time}${SEP}${id}${SEP}${table}${SEP}${name}${SEP}${type}${SEP}${method}${SEP}${itemsDetail}${SEP}${total}${SEP}${tax}\n`;
    });

    // 5. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_BaksoUjo_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 font-sans custom-scrollbar p-6 print:p-0 print:bg-white">
      
      <style>
        {`@media print { .no-print { display: none !important; } .print-full { width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; } body { background: white; } }`}
      </style>

      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 print-full">
        <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Laporan Bisnis</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Periode: <span className="text-primary font-bold">{startDate} s/d {endDate}</span></p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto no-print">
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setQuickFilter('TODAY')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterLabel === 'Hari Ini' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>HARI INI</button>
                <button onClick={() => setQuickFilter('WEEK')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterLabel === '7 Hari Terakhir' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>MINGGUAN</button>
                <button onClick={() => setQuickFilter('MONTH')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterLabel === 'Bulan Ini' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>BULANAN</button>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl">
                <input type="date" className="bg-transparent text-xs font-bold text-gray-700 outline-none" value={startDate} onChange={(e) => {setStartDate(e.target.value); setFilterLabel('Custom');}}/>
                <span className="text-gray-300">-</span>
                <input type="date" className="bg-transparent text-xs font-bold text-gray-700 outline-none" value={endDate} onChange={(e) => {setEndDate(e.target.value); setFilterLabel('Custom');}}/>
            </div>
            <button onClick={() => window.print()} className="p-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors" title="Print PDF"><Printer size={18}/></button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print:grid-cols-4 print:gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden print:border-2">
          <div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-50 rounded-2xl text-blue-600 no-print"><DollarSign size={24}/></div><span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded print:bg-white print:text-black">NETTO</span></div>
          <h3 className="text-3xl font-black text-gray-800">Rp {(stats.totalRevenue).toLocaleString('id-ID')}</h3>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wide">Total Pendapatan</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden print:border-2">
          <div className="flex justify-between items-start mb-4"><div className="p-3 bg-orange-50 rounded-2xl text-orange-600 no-print"><ShoppingBag size={24}/></div><span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-1 rounded print:bg-white print:text-black">COUNT</span></div>
          <h3 className="text-3xl font-black text-gray-800">{stats.totalTx}</h3>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wide">Total Transaksi</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden print:border-2">
          <div className="flex justify-between items-start mb-4"><div className="p-3 bg-pink-50 rounded-2xl text-pink-600 no-print"><Percent size={24}/></div><span className="text-[10px] font-black bg-pink-100 text-pink-700 px-2 py-1 rounded print:bg-white print:text-black">TAX</span></div>
          <h3 className="text-3xl font-black text-gray-800">Rp {(stats.totalTax).toLocaleString('id-ID')}</h3>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wide">Pajak Terkumpul</p>
        </div>
        <div className="bg-gray-900 text-white p-6 rounded-3xl border border-gray-800 shadow-sm relative overflow-hidden print:bg-white print:text-black print:border-2">
          <div className="flex justify-between items-start mb-4"><div className="p-3 bg-white/10 rounded-2xl text-white no-print"><TrendingUp size={24}/></div><span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded print:bg-white print:text-black">AOV</span></div>
          <h3 className="text-3xl font-black">Rp {(stats.avgOrderValue).toLocaleString('id-ID')}</h3>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wide">Rata-rata Order</p>
        </div>
      </div>

      {/* CHART SECTION 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 print:grid-cols-2">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm print:border-2">
          <div className="flex justify-between items-center mb-8"><h3 className="font-black text-xl text-gray-800">Tren Penjualan</h3><span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-500 no-print">Harian</span></div>
          <div className="h-64 flex items-end justify-between gap-2 border-b border-gray-100 pb-4">
            {stats.dailyTrend.length === 0 ? <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">Belum ada data</div> : stats.dailyTrend.map((day, index) => {
                const maxVal = Math.max(...stats.dailyTrend.map(d => d.value));
                const height = maxVal > 0 ? (day.value / maxVal) * 100 : 0;
                return (
                <div key={index} className="flex-1 flex flex-col items-center group relative min-w-[20px]">
                    <div className="w-full bg-blue-500/10 rounded-t-lg relative print:bg-gray-300" style={{ height: `${height}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 no-print">Rp {day.value.toLocaleString()}</div>
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 mt-2 truncate w-full text-center">{day.date}</p>
                </div>
                )
            })}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center print:border-2">
            <h3 className="font-black text-xl text-gray-800 mb-6">Metode Pembayaran</h3>
            <div className="space-y-6">
                <div className="bg-green-50 p-5 rounded-2xl border border-green-100 print:bg-white print:border">
                    <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2 text-green-700 font-bold"><Wallet size={18}/> Tunai (Cash)</div><span className="text-xs font-black bg-white px-2 py-1 rounded text-green-600 print:border">{stats.totalRevenue > 0 ? Math.round((stats.paymentMethods.cash/stats.totalRevenue)*100) : 0}%</span></div>
                    <div className="text-2xl font-black text-green-800">Rp {stats.paymentMethods.cash.toLocaleString()}</div>
                </div>
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 print:bg-white print:border">
                    <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2 text-blue-700 font-bold"><CreditCard size={18}/> Non-Tunai</div><span className="text-xs font-black bg-white px-2 py-1 rounded text-blue-600 print:border">{stats.totalRevenue > 0 ? Math.round((stats.paymentMethods.digital/stats.totalRevenue)*100) : 0}%</span></div>
                    <div className="text-2xl font-black text-blue-800">Rp {stats.paymentMethods.digital.toLocaleString()}</div>
                </div>
            </div>
        </div>
      </div>

      {/* CHART SECTION 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 print:break-inside-avoid">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm print:border-2">
              <h3 className="font-black text-xl text-gray-800 mb-6 flex items-center gap-2"><Clock size={20}/> Jam Tersibuk</h3>
              <div className="h-48 flex items-end gap-2">
                  {stats.peakHours.length === 0 ? <div className="w-full h-full flex items-center justify-center text-gray-400">Data tidak cukup</div> : stats.peakHours.map((h, i) => {
                      const max = Math.max(...stats.peakHours.map(p => p.count));
                      const height = (h.count / max) * 100;
                      return (
                          <div key={i} className="flex-1 flex flex-col items-center group min-w-[20px]">
                              <div className="w-full bg-orange-400 rounded-t relative group-hover:bg-orange-500 transition-all print:bg-gray-400" style={{height: `${height}%`}}>
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 no-print">{h.count}</div>
                              </div>
                              <span className="text-[9px] font-bold text-gray-400 mt-2">{h.hour}</span>
                          </div>
                      )
                  })}
              </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:border-2">
              <h3 className="font-black text-xl text-gray-800 mb-6 flex items-center gap-2"><PieChart size={20}/> Kontribusi Kategori</h3>
              <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {stats.categoryShare.length === 0 ? <div className="text-gray-400 text-center py-10">Belum ada data</div> : stats.categoryShare.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                          <span className={`text-xs font-black w-8 h-8 flex items-center justify-center rounded-lg ${idx===0?'bg-yellow-100 text-yellow-700':idx===1?'bg-gray-100 text-gray-600':'bg-gray-50 text-gray-400'} print:border`}>#{idx+1}</span>
                          <div className="flex-1">
                              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-gray-700 uppercase">{cat.name}</span><span>{stats.totalRevenue > 0 ? ((cat.value/stats.totalRevenue)*100).toFixed(1) : 0}%</span></div>
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden print:border"><div className="h-full bg-gray-800 print:bg-black" style={{width: `${stats.totalRevenue > 0 ? (cat.value/stats.totalRevenue)*100 : 0}%`}}></div></div>
                          </div>
                          <span className="text-xs font-mono font-bold text-gray-500 w-24 text-right">Rp {(cat.value/1000).toFixed(0)}k</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* TOP MENU TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-10 print:border-2 print:shadow-none">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-black text-xl text-gray-800">Menu Terlaris (Top 10)</h3>
            <button onClick={handleDownloadCSV} className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold text-xs rounded-lg flex items-center gap-2 no-print transition-all"><Download size={14}/> Download Excel (CSV)</button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider print:bg-gray-200"><tr><th className="p-5">Rank</th><th className="p-5">Nama Menu</th><th className="p-5 text-center">Terjual (Qty)</th><th className="p-5 text-right">Total Pendapatan</th></tr></thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                    {stats.topProducts.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-5"><span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-yellow-400 text-black shadow-sm' : 'bg-gray-100 text-gray-500'} print:border print:bg-white`}>{idx + 1}</span></td>
                            <td className="p-5 font-bold text-gray-800">{prod.name}</td>
                            <td className="p-5 text-center"><span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-black print:border print:bg-white">{prod.qty}</span></td>
                            <td className="p-5 text-right font-mono font-bold text-gray-900">Rp {prod.omzet.toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                    {stats.topProducts.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-gray-400 italic">Belum ada data transaksi</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
};

export default ReportPage;