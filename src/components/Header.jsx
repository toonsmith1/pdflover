import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, HardDrive } from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import logoImage from '../assets/pdflover-logo.png';

const CURRENT_VERSION = '1.0.1';
const GITHUB_REPO = 'toonsmith1/pdflover';

// Semver compare helper: returns 1 if v2 > v1
function compareVersions(v1, v2) {
  const clean = (v) => String(v).replace(/^v/, '').trim();
  const p1 = clean(v1).split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = clean(v2).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n2 > n1) return 1;
    if (n1 > n2) return -1;
  }
  return 0;
}

export default function Header() {
  const { lang, changeLang, supportedLangs, t, toolMap } = useI18n();
  const [status, setStatus] = useState('checking...');
  const [updateInfo, setUpdateInfo] = useState(null); // { version, url }
  const location = useLocation();

  const isHome = location.pathname === '/';
  const toolId = location.pathname.startsWith('/tool/')
    ? location.pathname.replace('/tool/', '')
    : null;
  const currentTool = toolId ? toolMap[toolId] : null;

  // 1. Health check on localhost engine
  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => {
        if (!active) return;
        setStatus(res.ok ? 'ready' : 'offline');
      })
      .catch(() => {
        if (active) setStatus('offline');
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Check latest release via GitHub Releases API (cached 24h)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    const CACHE_KEY = 'pdflover_github_release_check';
    const CACHE_HOURS = 24;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp, release } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_HOURS * 60 * 60 * 1000) {
          if (release && compareVersions(CURRENT_VERSION, release.version) > 0) {
            setUpdateInfo(release);
          }
          return;
        }
      }
    } catch {
      // Ignore cache errors
    }

    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Release not found or rate limited');
        return res.json();
      })
      .then((data) => {
        const remoteTag = data.tag_name || data.name;
        if (remoteTag && compareVersions(CURRENT_VERSION, remoteTag) > 0) {
          const info = {
            version: remoteTag.startsWith('v') ? remoteTag : `v${remoteTag}`,
            url: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
          };
          setUpdateInfo(info);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), release: info })
          );
        } else {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), release: null })
          );
        }
      })
      .catch(() => {
        // Silently skip if offline, repo has no release yet, or rate-limited
      });
  }, []);

  const displayStatus =
    status === 'ready'
      ? t('header.ready')
      : status === 'offline'
      ? t('header.offline')
      : '...';

  return (
    <header className="site-header wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <Link to="/" className="brand" title={t('toolPage.back')}>
          <div className="brand-logo-icon"><img src={logoImage} alt="pdflover" /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>pdflover</strong>

              {/* Version Badge with GitHub Update Notification */}
              {updateInfo ? (
                <a
                  href={updateInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-version-badge has-update"
                  title={`${t('header.updateBadge')} ${updateInfo.version}`}
                >
                  <span className="update-pulse-dot" />
                  <span>v{CURRENT_VERSION} • {t('header.updateTo')} {updateInfo.version} ↗</span>
                </a>
              ) : (
                <span className="app-version-badge">v{CURRENT_VERSION} local</span>
              )}
            </div>
            <span>{t('header.subtitle')}</span>
          </div>
        </Link>

        {!isHome && currentTool && (
          <div className="header-nav-crumb">
            <span className="crumb-sep">/</span>
            <Link to="/" className="crumb-link" title={t('header.toolsNav')}>
              <ArrowLeft size={14} /> {t('header.toolsNav')}
            </Link>
            <span className="crumb-sep">/</span>
            <span className="crumb-active">{currentTool.name}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Language Switcher */}
        <div className="lang-switcher" role="group" aria-label="Language selection">
          {supportedLangs.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`lang-btn ${lang === item.code ? 'active' : ''}`}
              onClick={() => changeLang(item.code)}
              title={item.label}
            >
              <span>{item.flag}</span>
              <span className="lang-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div
          className="local-privacy-pill"
          title="Local-first processing"
        >
          <HardDrive size={13} strokeWidth={2} />
          <span>{t('header.localEngine')}</span>
        </div>
        <span className={`status-pill ${status === 'ready' ? 'is-ready' : ''}`}>
          {displayStatus}
        </span>
      </div>
    </header>
  );
}
