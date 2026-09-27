import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileStack, ArrowLeft, HardDrive, Sparkles } from 'lucide-react';
import { TOOL_MAP } from '../data/tools';

const CURRENT_VERSION = '1.0.0';
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
  const [status, setStatus] = useState('checking...');
  const [updateInfo, setUpdateInfo] = useState(null); // { version, url }
  const location = useLocation();

  const isHome = location.pathname === '/';
  const toolId = location.pathname.startsWith('/tool/')
    ? location.pathname.replace('/tool/', '')
    : null;
  const currentTool = toolId ? TOOL_MAP[toolId] : null;

  // 1. Health check on localhost engine
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

  // 2. Approach 1: Check latest release via GitHub Releases API (cached 24h)
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

    // Fetch from GitHub Releases API
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

              {/* Version Badge with GitHub Update Notification (Approach 1) */}
              {updateInfo ? (
                <a
                  href={updateInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-version-badge has-update"
                  title={`มีเวอร์ชันใหม่ ${updateInfo.version} บน GitHub คลิกเพื่อดูรายละเอียด`}
                >
                  <span className="update-pulse-dot" />
                  <span>v{CURRENT_VERSION} • อัปเดต {updateInfo.version} ↗</span>
                </a>
              ) : (
                <span className="app-version-badge">v{CURRENT_VERSION} local</span>
              )}
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
        <div
          className="local-privacy-pill"
          title="ไฟล์ของคุณถูกประมวลผลบนเครื่องนี้ ไม่มีการส่งขึ้น Cloud"
        >
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
