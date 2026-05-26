// GitHub Gist를 백엔드로 사용하는 클라우드 동기화
// 사용자는 PAT(Personal Access Token, gist 권한)만 발급하면 됨

const GIST_FILENAME = 'sales-dashboard-data.json';
const GIST_DESCRIPTION = '매출·마진 대시보드 데이터 (자동 생성)';
const CONFIG_KEY = 'sales-dashboard:cloud:v1';

export function getCloudConfig() {
  try {
    const v = localStorage.getItem(CONFIG_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function saveCloudConfig(cfg) {
  if (!cfg) localStorage.removeItem(CONFIG_KEY);
  else localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

async function gistRequest(method, url, token, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// PAT 토큰 유효성 검증
export async function validateToken(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });
  if (!res.ok) {
    throw new Error('토큰이 유효하지 않습니다. 권한과 만료일을 확인하세요.');
  }
  const user = await res.json();
  return { login: user.login, name: user.name };
}

function normalizePayload(payload) {
  // 하위호환: rows 배열만 넘어오면 { rows } 로 감싼다
  if (Array.isArray(payload)) return { rows: payload, adCosts: [], bizInfo: [] };
  return {
    rows: payload?.rows || [],
    adCosts: payload?.adCosts || [],
    bizInfo: payload?.bizInfo || []
  };
}

function serializeContent(payload) {
  const { rows, adCosts, bizInfo } = normalizePayload(payload);
  return JSON.stringify({
    version: 2,
    updatedAt: new Date().toISOString(),
    rows,
    adCosts,
    bizInfo
  });
}

// 새 gist 생성
export async function createGist(token, payload) {
  const data = await gistRequest('POST', 'https://api.github.com/gists', token, {
    description: GIST_DESCRIPTION,
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: serializeContent(payload)
      }
    }
  });
  return { gistId: data.id, htmlUrl: data.html_url };
}

// 기존 gist 업데이트
export async function updateGist(token, gistId, payload) {
  await gistRequest('PATCH', `https://api.github.com/gists/${gistId}`, token, {
    files: {
      [GIST_FILENAME]: {
        content: serializeContent(payload)
      }
    }
  });
  return { ok: true, updatedAt: new Date().toISOString() };
}

// gist에서 데이터 가져오기
export async function fetchGistData(token, gistId) {
  const data = await gistRequest('GET', `https://api.github.com/gists/${gistId}`, token);
  const file = data.files[GIST_FILENAME];
  if (!file) throw new Error('gist에 데이터 파일이 없습니다. 새로 생성하세요.');
  let content = file.content;
  if (file.truncated && file.raw_url) {
    const res = await fetch(file.raw_url);
    content = await res.text();
  }
  try {
    const parsed = JSON.parse(content);
    return {
      rows: parsed.rows || [],
      adCosts: parsed.adCosts || [],
      bizInfo: parsed.bizInfo || [],
      updatedAt: parsed.updatedAt || data.updated_at
    };
  } catch (e) {
    throw new Error('gist 내용을 파싱할 수 없습니다: ' + e.message);
  }
}

// 사용자의 모든 gist 중 dashboard용 gist를 찾음
export async function findDashboardGist(token) {
  const data = await gistRequest('GET', 'https://api.github.com/gists?per_page=100', token);
  for (const g of data) {
    if (g.files && g.files[GIST_FILENAME]) {
      return { gistId: g.id, htmlUrl: g.html_url, updatedAt: g.updated_at };
    }
  }
  return null;
}

// 자동 동기화 매니저 (debounce + 충돌 방지)
export function createSyncManager({ getConfig, getData, getRows, onStatus }) {
  let timer = null;
  let inFlight = false;
  let pending = false;

  async function doSync() {
    const cfg = getConfig();
    if (!cfg || !cfg.token || !cfg.gistId) return;
    if (inFlight) {
      pending = true;
      return;
    }
    inFlight = true;
    onStatus?.({ state: 'syncing' });
    try {
      const payload = getData ? getData() : { rows: getRows ? getRows() : [], adCosts: [] };
      const result = await updateGist(cfg.token, cfg.gistId, payload);
      onStatus?.({ state: 'synced', updatedAt: result.updatedAt });
    } catch (e) {
      onStatus?.({ state: 'error', error: e.message });
    } finally {
      inFlight = false;
      if (pending) {
        pending = false;
        scheduleSync();
      }
    }
  }

  function scheduleSync(delayMs = 2000) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(doSync, delayMs);
  }

  return {
    scheduleSync,
    syncNow: doSync
  };
}
