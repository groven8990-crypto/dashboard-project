import React, { useState } from 'react';
import {
  getCloudConfig,
  saveCloudConfig,
  validateToken,
  createGist,
  fetchGistData,
  findDashboardGist,
  updateGist,
  listGistRevisions,
  fetchGistRevision
} from '../utils/cloudSync.js';

export default function CloudSync({ rows, adCosts = [], bizInfo = [], csInfo = {}, priceTable = [], onPull }) {
  const [config, setConfig] = useState(getCloudConfig());
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [showSetup, setShowSetup] = useState(!config);
  const [revisions, setRevisions] = useState(null);

  const connect = async () => {
    if (!token.trim()) {
      setStatus({ type: 'error', msg: '토큰을 입력해주세요.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const user = await validateToken(token);
      const existing = await findDashboardGist(token);
      let cfg;
      if (existing) {
        cfg = {
          token,
          gistId: existing.gistId,
          gistUrl: existing.htmlUrl,
          user: user.login,
          createdAt: new Date().toISOString()
        };
        setStatus({
          type: 'info',
          msg: `기존 dashboard gist 발견. ${user.login} 계정에 연결됨. "지금 다운로드"로 데이터를 가져오세요.`
        });
      } else {
        const created = await createGist(token, { rows, adCosts, bizInfo, csInfo, priceTable });
        cfg = {
          token,
          gistId: created.gistId,
          gistUrl: created.htmlUrl,
          user: user.login,
          createdAt: new Date().toISOString()
        };
        setStatus({
          type: 'success',
          msg: `${user.login} 계정에 새 gist를 만들고 현재 데이터를 업로드했습니다.`
        });
      }
      saveCloudConfig(cfg);
      setConfig(cfg);
      setShowSetup(false);
      setToken('');
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  const push = async () => {
    if (!config) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await updateGist(config.token, config.gistId, { rows, adCosts, bizInfo, csInfo, priceTable });
      setStatus({
        type: 'success',
        msg: `클라우드 업로드 완료 (${result.updatedAt.slice(0, 19).replace('T', ' ')}, ${rows.length}건)`
      });
      saveCloudConfig({ ...config, lastSync: result.updatedAt });
      setConfig({ ...config, lastSync: result.updatedAt });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  const pull = async () => {
    if (!config) return;
    if (rows.length > 0 && !confirm('현재 로컬 데이터를 클라우드 데이터로 덮어쓸까요?')) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await fetchGistData(config.token, config.gistId);
      onPull(result.rows, result.adCosts || [], result.bizInfo || [], result.csInfo || {}, result.priceTable || []);
      setStatus({
        type: 'success',
        msg: `클라우드 다운로드 완료 (${result.rows.length}건, ${result.updatedAt.slice(0, 19).replace('T', ' ')})`
      });
      saveCloudConfig({ ...config, lastSync: result.updatedAt });
      setConfig({ ...config, lastSync: result.updatedAt });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    if (!confirm('클라우드 연결을 끊으시겠어요? (gist는 그대로 유지됩니다)')) return;
    saveCloudConfig(null);
    setConfig(null);
    setShowSetup(true);
    setStatus(null);
  };

  const loadRevisions = async () => {
    if (!config) return;
    setBusy(true);
    setStatus(null);
    try {
      const list = await listGistRevisions(config.token, config.gistId);
      setRevisions(list.slice(0, 30));
      if (!list.length) setStatus({ type: 'info', msg: '이전 버전 기록이 없습니다.' });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  const restoreRevision = async (rev) => {
    if (!config) return;
    const when = rev.committedAt ? rev.committedAt.slice(0, 19).replace('T', ' ') : rev.version.slice(0, 8);
    if (!confirm(`${when} 시점의 클라우드 버전으로 복구합니다.\n현재 데이터는 이 버전으로 덮어써집니다. 진행할까요?`)) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await fetchGistRevision(config.token, config.gistId, rev.version);
      onPull(result.rows, result.adCosts || [], result.bizInfo || [], result.csInfo || {}, result.priceTable || []);
      setStatus({ type: 'success', msg: `${when} 버전으로 복구 완료 (${result.rows.length}건)` });
      setRevisions(null);
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">☁️ 클라우드 동기화 (GitHub Gist)</div>
          <div className="card-subtitle">
            데이터를 개인 비공개 gist에 저장. 다른 기기에서 동일 토큰으로 접속하면 같은 데이터를 볼 수 있습니다.
          </div>
        </div>
        {config && (
          <div className="filter-group">
            <span className="badge green">@{config.user}</span>
            <button className="btn sm" onClick={() => setShowSetup(!showSetup)}>
              {showSetup ? '닫기' : '설정 보기'}
            </button>
          </div>
        )}
      </div>

      {config && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginBottom: 14
          }}
        >
          <button
            className="btn primary"
            onClick={push}
            disabled={busy || !rows.length}
            style={{ padding: '12px 16px', fontSize: 14 }}
          >
            ☁️⬆ 현재 데이터 업로드 ({rows.length}건)
          </button>
          <button
            className="btn"
            onClick={pull}
            disabled={busy}
            style={{ padding: '12px 16px', fontSize: 14 }}
          >
            ☁️⬇ 클라우드에서 가져오기
          </button>
          <a
            href={config.gistUrl}
            target="_blank"
            rel="noreferrer"
            className="btn"
            style={{ padding: '12px 16px', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}
          >
            🔗 gist 보기
          </a>
          <button
            className="btn danger"
            onClick={disconnect}
            disabled={busy}
            style={{ padding: '12px 16px', fontSize: 14 }}
          >
            연결 해제
          </button>
          <button
            className="btn"
            onClick={loadRevisions}
            disabled={busy}
            style={{ padding: '12px 16px', fontSize: 14 }}
          >
            🕘 이전 버전 복구
          </button>
        </div>
      )}

      {config && revisions && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 8
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            이전 클라우드 버전 ({revisions.length}개) — 사고 직전 시각의 버전을 선택해 복구하세요
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 6 }}>
            {revisions.map((rev, i) => (
              <div
                key={rev.version}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 13
                }}
              >
                <span>
                  {rev.committedAt ? rev.committedAt.slice(0, 19).replace('T', ' ') : rev.version.slice(0, 10)}
                  {i === 0 && <span className="muted"> (현재/최신)</span>}
                </span>
                <button className="btn sm" onClick={() => restoreRevision(rev)} disabled={busy}>
                  이 버전으로 복구
                </button>
              </div>
            ))}
          </div>
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setRevisions(null)}>
            닫기
          </button>
        </div>
      )}

      {config?.lastSync && (
        <div className="muted text-sm" style={{ marginBottom: 8 }}>
          마지막 동기화: {config.lastSync.slice(0, 19).replace('T', ' ')}
        </div>
      )}

      {showSetup && (
        <div style={{ marginTop: 12 }}>
          {!config && <SetupGuide />}

          <div
            style={{
              padding: 14,
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}
          >
            <div className="text-sm" style={{ marginBottom: 8, fontWeight: 600 }}>
              {config ? '토큰 재설정' : '🔑 GitHub Personal Access Token 입력'}
            </div>
            <input
              type="password"
              className="input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_... 또는 github_pat_..."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
            />
            <div className="muted text-xs" style={{ marginTop: 6 }}>
              토큰은 이 브라우저의 localStorage에만 저장됩니다. 네트워크로 전송되는 곳은 GitHub API뿐입니다.
            </div>
            <button
              className="btn primary"
              onClick={connect}
              disabled={busy || !token.trim()}
              style={{ marginTop: 10 }}
            >
              {busy ? '확인 중...' : config ? '토큰 변경' : '연결하기'}
            </button>
          </div>
        </div>
      )}

      {status && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 6,
            background:
              status.type === 'error'
                ? 'var(--danger-soft)'
                : status.type === 'success'
                ? 'var(--success-soft)'
                : 'var(--primary-soft)',
            color:
              status.type === 'error'
                ? 'var(--danger)'
                : status.type === 'success'
                ? 'var(--success)'
                : 'var(--primary)',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          {status.msg}
        </div>
      )}
    </div>
  );
}

function SetupGuide() {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: 14,
        background: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: 8,
        fontSize: 13
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>📝 처음 한 번만 설정 (약 2분)</div>
      <ol style={{ marginLeft: 18, lineHeight: 1.8 }}>
        <li>
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--primary)', fontWeight: 600 }}
          >
            github.com/settings/tokens
          </a>{' '}
          접속 → <strong>"Generate new token"</strong> 클릭
        </li>
        <li>
          <strong>Token name</strong>: "Sales Dashboard" (아무거나)
        </li>
        <li>
          <strong>Expiration</strong>: 원하는 만료일 (1년 권장)
        </li>
        <li>
          <strong>Repository access</strong>: "Public Repositories (read-only)" 선택
        </li>
        <li>
          <strong>Account permissions</strong> → <code>Gists</code> 항목 찾아서 →{' '}
          <strong>"Read and write"</strong> 선택
        </li>
        <li><strong>"Generate token"</strong> 클릭 → 화면에 표시되는 토큰 복사 (한 번만 보임)</li>
        <li>아래 입력란에 붙여넣고 <strong>"연결하기"</strong></li>
      </ol>
      <div className="muted text-xs" style={{ marginTop: 10 }}>
        💡 한 번 연결하면 자동으로 비공개 gist를 만들고 데이터를 저장합니다. 다른 기기/브라우저에서는
        같은 토큰을 입력하면 동일한 데이터를 가져옵니다.
      </div>
    </div>
  );
}
