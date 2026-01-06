import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Admin Pages
import POSPage from './pages/admin/POSPage';
import KitchenPage from './pages/admin/KitchenPage';
import ShiftPage from './pages/admin/ShiftPage';
import ReportPage from './pages/admin/ReportPage';
import SettingsPage from './pages/admin/SettingsPage';
import InventoryPage from './pages/admin/InventoryPage';

// Customer Pages
import LandingPage from './pages/customer/LandingPage';       // HALAMAN AWAL BARU
import CustomerOrderPage from './pages/customer/CustomerOrderPage'; // HALAMAN ORDER

// Components
import Sidebar from './components/Sidebar';

const AppLayout = ({ children }) => {
  const location = useLocation();
  
  // Logic: Sidebar HILANG di halaman Customer & Kitchen
  const isCustomerArea = location.pathname === '/' || location.pathname === '/order';
  const isKitchenPage = location.pathname === '/kitchen';
  
  const showSidebar = !isCustomerArea && !isKitchenPage;

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {showSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* HALAMAN CUSTOMER */}
          <Route path="/" element={<LandingPage />} />          {/* Halaman Depan (Welcome) */}
          <Route path="/order" element={<CustomerOrderPage />} /> {/* Halaman Menu Order */}
          
          {/* HALAMAN ADMIN */}
          <Route path="/pos" element={<POSPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/shift" element={<ShiftPage />} />
          <Route path="/reports" element={<ReportPage />} />
          <Route path="/inventory" element={<InventoryPage />} /> 
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

export default App;