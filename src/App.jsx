import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ToolCatalog from './components/ToolCatalog';
import ToolPage from './components/ToolPage';

export default function App() {
  return (
    <LanguageProvider>
      <Header />
      <Routes>
        <Route path="/" element={<ToolCatalog />} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </LanguageProvider>
  );
}
