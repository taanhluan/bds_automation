import React from 'react';
import { createRoot } from 'react-dom/client';
import PublicSite, { AdminAccess } from './PublicSite.jsx';
import './styles.css';
import './public.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {location.pathname === '/admin' || location.pathname.startsWith('/admin/') ? <AdminAccess /> : <PublicSite />}
  </React.StrictMode>,
);
