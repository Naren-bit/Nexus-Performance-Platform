import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
