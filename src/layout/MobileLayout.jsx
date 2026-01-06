import React from 'react';
import { Outlet } from 'react-router-dom';

const MobileLayout = () => {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Konten akan tampil full screen di HP */}
      <Outlet />
    </div>
  );
};

export default MobileLayout;