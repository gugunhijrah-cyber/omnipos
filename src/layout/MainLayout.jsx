import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, UtensilsCrossed, Settings, PieChart, Wallet, LogOut } from 'lucide-react';

const MainLayout = () => {
  const navigate = useNavigate();

  const menuItems = [
    { path: '/pos', icon: LayoutGrid, label: 'Kasir' },
    { path: '/kitchen', icon: UtensilsCrossed, label: 'Dapur' },
    { path: '/reports', icon: PieChart, label: 'Laporan' },
    { path: '/shift', icon: Wallet, label: 'Keuangan' }, // MENU BARU
    { path: '/settings', icon: Settings, label: 'Setting' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 z-50 shadow-sm">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-200">
          <span className="text-white font-black text-xl">U</span>
        </div>
        <div className="flex-1 space-y-4 w-full px-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-white shadow-lg shadow-indigo-200 scale-105' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}
              `}
            >
              <item.icon size={20} strokeWidth={2.5} />
              <span className="text-[9px] font-bold mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
        <button onClick={() => navigate('/')} className="mb-4 text-gray-400 hover:text-red-500 p-3 rounded-xl transition-colors">
            <LogOut size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;