import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileStack, ArrowLeft, ShieldCheck, HardDrive } from 'lucide-react';
import { TOOL_MAP } from '../data/tools';

export default function Header() {
  const [status, setStatus] = useState('checking...');
  const location = useLocation();

  const isHome = location.pathname === '/';
  const toolId = location.pathname.startsWith('/tool/')
    ? location.pathname.replace('/tool/', '')
    : null;
  const currentTool = toolId ? TOOL_MAP[toolId] : null;

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => {
        if (!active) return;
        setStatus(res.ok ? 'Local · Ready' : 'Offline');
      })
      .catch(() => {
        if (active) setStatus('Offline');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="site-header wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <Link to="/" className="brand" title="กลับหน้าหลัก">
          <div className="brand-logo-icon">
            <FileStack size={18} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>pdflover</strong>
              <span className="app-version-badge">v1.0 local</span>
            </div>
            <span>เครื่องมือเอกสารในเครื่องของคุณ</span>
          </div>
        </Link>

        {!isHome && currentTool && (
          <div className="header-nav-crumb">
            <span className="crumb-sep">/</span>
            <Link to="/" className="crumb-link" title="กลับไปหน้ารวมเครื่องมือ">
              <ArrowLeft size={14} /> เครื่องมือ
            </Link>
            <span className="crumb-sep">/</span>
            <span className="crumb-active">{currentTool.name}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="local-privacy-pill" title="ไฟล์ของคุณถูกประมวลผลบนเครื่องนี้ ไม่มีการส่งขึ้น Cloud">
          <HardDrive size={13} strokeWidth={2} />
          <span>Local Engine</span>
        </div>
        <span className={`status-pill ${status.toLowerCase().includes('ready') ? 'is-ready' : ''}`}>
          {status}
        </span>
      </div>
    </header>
  );
}
