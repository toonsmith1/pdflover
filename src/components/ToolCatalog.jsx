import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import Icon from './common/Icon';
import PartnerSpotlight from './common/PartnerSpotlight';

export default function ToolCatalog() {
  const { tools, categories, t } = useI18n();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchCat = filter === 'all' || tool.category === filter;
      const matchSearch =
        !search.trim() ||
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.desc.toLowerCase().includes(search.toLowerCase()) ||
        tool.id.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [tools, filter, search]);

  const categoryCounts = useMemo(() => {
    const counts = { all: tools.length };
    categories.forEach((cat) => {
      if (cat.id !== 'all') {
        counts[cat.id] = tools.filter((t) => t.category === cat.id).length;
      }
    });
    return counts;
  }, [tools, categories]);

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

  const renderUpcomingTool = (tool) => (
    <article key={tool.id} className="tool tool-upcoming" aria-disabled="true">
      <div className="tool-card-top">
        <div className="tool-icon-wrapper"><Icon name={tool.iconName} size={22} strokeWidth={1.8} /></div>
        <span className="tool-badge">กำลังพัฒนา</span>
      </div>
      <strong>{tool.name}</strong><span>{tool.desc}</span>
      <div className="tool-card-footer"><small>{tool.id.toUpperCase()}</small><small>เร็ว ๆ นี้</small></div>
    </article>
  );

  const isUpcoming = (tool) => ['กำลังเตรียม', 'Coming soon', '準備中'].includes(tool.badge);

  return (
    <main className="wrap">
      {/* Hero Section */}
      <section className="catalog-hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            {t('hero.eyebrow')}
          </p>
          <h1>
            {t('hero.titleLine1')}
            <br />
            <span className="hero-sub">{t('hero.subtitle')}</span>
          </h1>

          {/* Search Bar */}
          <div className="catalog-search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={t('hero.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title={t('hero.clearSearch')}
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
      <nav className="filters" aria-label="Tool categories">
        {categories.map((cat) => (
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
        {filteredTools.filter((tool) => tool.category !== 'external' && !isUpcoming(tool)).map(renderTool)}
      </section>
      {filteredTools.some((tool) => tool.category === 'external') && (
        <section className="external-tools-section">
          <div className="external-tools-heading">
            <div>
              <small>{t('external.badge')}</small>
              <h2>{t('external.title')}</h2>
            </div>
            <span>{t('external.warning')}</span>
          </div>
          <div className="grid external-tools-grid">
            {filteredTools.filter((tool) => tool.category === 'external').map(renderTool)}
          </div>
        </section>
      )}

      {filteredTools.some(isUpcoming) && (
        <section className="upcoming-tools-section">
          <div className="upcoming-tools-heading">
            <div>
              <small>{t('upcoming.badge')}</small>
              <h2>{t('upcoming.title')}</h2>
            </div>
            <span>{t('upcoming.description')}</span>
          </div>
          <div className="grid upcoming-tools-grid">
            {filteredTools.filter(isUpcoming).map(renderUpcomingTool)}
          </div>
        </section>
      )}

      {filteredTools.length === 0 && (
        <div className="catalog-empty-search">
          <p>{t('hero.emptySearch', { search })}</p>
          <button
            type="button"
            className="button small secondary"
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
          >
            {t('hero.viewAll')}
          </button>
        </div>
      )}
    </main>
  );
}
