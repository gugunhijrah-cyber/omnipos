import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, UtensilsCrossed, ClipboardList, Settings, DollarSign, Package, LogOut } from 'lucide-react';

const Sidebar = () => {
  
  const menuItems = [
    { path: '/pos', icon: <LayoutGrid size={24} />, label: 'Kasir' },
    { path: '/kitchen', icon: <UtensilsCrossed size={24} />, label: 'Dapur' },
    { path: '/shift', icon: <DollarSign size={24} />, label: 'Keuangan' },
    { path: '/inventory', icon: <Package size={24} />, label: 'Gudang' }, // Menu Inventory
    { path: '/reports', icon: <ClipboardList size={24} />, label: 'Laporan' },
    { path: '/settings', icon: <Settings size={24} />, label: 'Setting' },
  ];

  return (
    <div className="w-24 bg-white h-screen flex flex-col items-center py-6 border-r border-gray-200 shadow-sm z-50 flex-shrink-0">
      
      {/* Logo Brand */}
      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-8 shadow-lg shadow-blue-200">
        <span className="text-white font-black text-xl">U</span>
      </div>

      {/* Menu List */}
      <div className="flex-1 w-full px-4 space-y-4 flex flex-col items-center overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-y-[-2px]'
                  : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] font-bold mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Logout / Footer */}
      <div className="mt-auto pt-4 border-t w-full flex justify-center">
        <button className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50" title="Keluar Aplikasi">
            <LogOut size={20}/>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;