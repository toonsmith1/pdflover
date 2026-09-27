import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, X, Shield, ArrowUpRight } from 'lucide-react';
import { TOOLS, CATEGORIES } from '../data/tools';
import Icon from './common/Icon';
import PartnerSpotlight from './common/PartnerSpotlight';

export default function ToolCatalog() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchCat = filter === 'all' || tool.category === filter;
      const matchSearch =
        !search.trim() ||
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.desc.toLowerCase().includes(search.toLowerCase()) ||
        tool.id.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [filter, search]);

  const categoryCounts = useMemo(() => {
    const counts = { all: TOOLS.length };
    CATEGORIES.forEach((cat) => {
      if (cat.id !== 'all') {
        counts[cat.id] = TOOLS.filter((t) => t.category === cat.id).length;
      }
    });
    return counts;
  }, []);

  const renderTool = (tool) => (
    <Link key={tool.id} to={`/tool/${tool.id}`} className={`tool ${tool.category === 'external' ? 'tool-external' : ''}`}>
      <div className="tool-card-top">
        <div className="tool-icon-wrapper"><Icon name={tool.iconName} size={22} strokeWidth={1.8} /></div>
        {tool.badge && <span className="tool-badge">{tool.badge}</span>}
        <ArrowUpRight size={16} className="tool-arrow-icon" />
      </div>
      <strong>{tool.name}</strong><span>{tool.desc}</span>
      <div className="tool-card-footer"><small>{tool.id.toUpperCase()}</small></div>
    </Link>
  );

  return (
    <main className="wrap">
      {/* Hero Section (Compact Split Grid with Partner Spotlight) */}
      <section className="catalog-hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            LOCAL-FIRST WORKSPACE • ปลอดภัย 100%
          </p>
          <h1>
            จัดการไฟล์ PDF บนเครื่องของคุณ
            <br />
            <span className="hero-sub">🔒 ไฟล์ไม่ออกนอกเครื่อง • ปลอดภัย รวดเร็ว ทำงานออฟไลน์ได้</span>
          </h1>

          {/* Search Bar */}
          <div className="catalog-search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="ค้นหาเครื่องมือ เช่น รวมไฟล์, ลดขนาด, เพิ่มข้อความ, หมุนหน้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="ล้างคำค้นหา"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Partner Spotlight / Buy Me a Coffee */}
        <div className="hero-spotlight-wrapper">
          <PartnerSpotlight />
        </div>
      </section>

      {/* Category Filter Pills */}
      <nav className="filters" aria-label="กลุ่มเครื่องมือ">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={filter === cat.id ? 'active' : ''}
            onClick={() => setFilter(cat.id)}
          >
            <span>{cat.label}</span>
            <span className="filter-count">{categoryCounts[cat.id]}</span>
          </button>
        ))}
      </nav>

      {/* Tools Grid */}
      <section className="grid" id="tools">
        {filteredTools.filter((tool) => tool.category !== 'external').map(renderTool)}
      </section>
      {filteredTools.some((tool) => tool.category === 'external') && (
        <section className="external-tools-section">
          <div className="external-tools-heading"><div><small>API / INTERNET REQUIRED</small><h2>บริการที่ส่งไฟล์ไปประมวลผลภายนอก</h2></div><span>ตรวจสอบนโยบายข้อมูลก่อนใช้งาน</span></div>
          <div className="grid external-tools-grid">{filteredTools.filter((tool) => tool.category === 'external').map(renderTool)}</div>
        </section>
      )}

      {filteredTools.length === 0 && (
        <div className="catalog-empty-search">
          <p>ไม่พบเครื่องมือที่ตรงกับ "{search}"</p>
          <button
            type="button"
            className="button small secondary"
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
          >
            ดูเครื่องมือทั้งหมด
          </button>
        </div>
      )}
    </main>
  );
}
