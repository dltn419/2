import { AVATARS, STATS } from './content.mjs';

const PATHS = {
  sprout: 'M7 8h2v6H7zM2 2h3v1h2v2h1v4H5V8H3V6H2zm10 0h2v4h-1v2h-2v1H8V5h1V3h3zM5 13h6v2H5z',
  heart: 'M3 2h3v1h1v1h2V3h1V2h3v1h1v1h1v4h-1v1h-1v1h-1v1h-1v1h-1v1H9v1H7v-1H6v-1H5v-1H4v-1H3V9H2V8H1V4h1V3h1z',
  book: 'M2 2h5v1h2V2h5v1h1v10H9v1H7v-1H1V3h1zm1 2v7h4V4zm6 0v7h4V4z',
  coin: 'M5 1h6v1h2v2h1v8h-1v2h-2v1H5v-1H3v-2H2V4h1V2h2zm0 3v1H4v6h1v1h6v-1h1V5h-1V4zM7 5h2v6H7z',
  sun: 'M7 0h2v3H7zm0 13h2v3H7zM0 7h3v2H0zm13 0h3v2h-3zM5 4h6v1h1v6h-1v1H5v-1H4V5h1zM2 2h2v2H2zm10 0h2v2h-2zM2 12h2v2H2zm10 0h2v2h-2z',
  spark: 'M7 0h2v4h1v2h2v1h4v2h-4v1h-2v2H9v4H7v-4H6v-2H4V9H0V7h4V6h2V4h1z',
  link: 'M4 2h5v2H4v1H3v4h1v1h3v2H4v-1H2V9H1V5h1V3h2zm5 2h3v1h2v2h1v4h-1v2h-2v1H7v-2h5v-1h1V7h-1V6H9zM5 7h6v2H5z',
  leaf: 'M11 1h4v4h-1v3h-1v2h-2v2H8v1H4v2H2v-2h1V9h1V6h2V4h2V3h3zM5 10v2h2v-2h2V8h2V6H9v2H7v2z',
  ghost: 'M5 1h6v1h2v2h1v11h-2v-2h-2v2H7v-2H5v2H2V5h1V3h2zm0 5v3h2V6zm4 0v3h2V6z',
  flower: 'M6 1h4v3h3v4h-3v3H6V8H3V4h3zm1 4v2h2V5zm0 6h2v4H7zm3 1h4v2h-4z',
  house: 'M7 1h2v1h1v1h1v1h1v1h1v1h1v1h1v2h-2v6H3V9H1V7h1V6h1V5h1V4h1V3h1V2h1zm0 8v4h3V9z',
  users: 'M2 3h4v4H2zm8 0h4v4h-4zM1 9h6v1h1v4H0v-4h1zm8 0h6v1h1v4H9z',
  clock: 'M5 1h6v1h2v2h1v2h1v4h-1v2h-1v2h-2v1H5v-1H3v-2H2v-2H1V6h1V4h1V2h2zm0 2v1H4v2H3v4h1v2h1v1h6v-1h1v-2h1V6h-1V4h-1V3zm2 1h2v4h3v2H7z',
  copy: 'M2 1h8v3h4v11H5v-3H2zm2 2v7h1V4h3V3zm3 3v7h5V6z',
  qr: 'M1 1h6v6H1zm1 1v4h4V2zm1 1h2v2H3zm6-2h6v6H9zm1 1v4h4V2zm1 1h2v2h-2zM1 9h6v6H1zm1 1v4h4v-4zm1 1h2v2H3zm6-2h2v2H9zm4 0h2v4h-2zm-2 2h2v2h-2zm-2 2h2v2H9zm4 0h2v2h-2z',
  check: 'M12 3h3v3h-2v2h-2v2H9v2H7v2H5v-2H3v-2H1V7h3v2h2v2h1V9h2V7h2V5h1z',
  lock: 'M5 1h6v1h1v1h1v4h1v8H2V7h1V3h1V2h1zm1 2v1H5v3h6V4h-1V3zm1 6v3h2V9z',
  flag: 'M2 1h2v1h10v7H4v6H2zm2 3v3h8V4z',
  play: 'M4 2h2v1h2v1h2v1h2v1h2v4h-2v1h-2v1H8v1H6v1H4z',
  pause: 'M3 2h3v12H3zm7 0h3v12h-3z',
  settings: 'M2 3h12v2H2zm0 4h12v2H2zm0 4h12v2H2zM5 1h3v6H5zm5 4h3v6h-3zm-6 4h3v6H4z',
  trophy: 'M4 1h8v2h3v5h-2v2h-3v2h3v3H3v-3h3v-2H3V8H1V3h3zm-1 4v2h1V5zm9 0v2h1V5z',
  arrow: 'M8 2h2v2h2v2h2v4h-2v2h-2v2H8v-2h2v-2h2V9H1V7h11V6h-2V4H8z',
  down: 'M7 1h2v11h1v-2h2V8h2v2h-2v2h-2v2H6v-2H4v-2H2V8h2v2h2v2h1z',
  close: 'M2 2h2v2h2v2h2v2h2v2h2v2h2v2h-2v-2h-2v-2H8V8H6v2H4v2H2v2H0v-2h2v-2h2V8h2V6H4V4H2zm10 0h2v2h-2v2h-2v2H8V6h2V4h2z',
  board: 'M1 1h14v11H9v2h3v2H4v-2h3v-2H1zm2 2v7h10V3zm2 2h6v2H5z',
};

export function icon(name, className = '') {
  return `<svg class="pixel-icon ${className}" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="${PATHS[name] ?? PATHS.spark}"/></svg>`;
}

export function avatar(index, mode = 'alive', sex = null) {
  const item = AVATARS[index] ?? AVATARS[0];
  if (mode === 'spirit') return `<span class="avatar avatar-ghost">${icon('ghost')}</span>`;
  const longerHair = sex === 'female';
  const hair = longerHair ? 'M5 1h6v1h2v2h1v8h-3v-2H5v3H2V5h1V3h2z' : 'M5 1h6v1h2v2h1v5h-2v1H4V9H2V5h1V3h2z';
  return `<span class="avatar"><svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">
    <path fill="${item.hair}" d="${hair}"/>
    <path fill="${item.skin}" d="M5 4h7v2h1v3h-1v2H4V9H3V7h2z"/>
    ${longerHair ? `<path fill="${item.hair}" d="M4 4h2v2H5v5H3V7h1zm6 0h3v1h1v5h-2V6h-2z"/><path fill="#f5d98a" d="M11 3h2v1h-2z"/>` : ''}
    <path fill="#523e35" d="M6 6h1v2H6zm4 0h1v2h-1z"/>
    <path fill="${item.shirt}" d="M5 11h6v1h2v3H3v-3h2z"/>
    <path fill="#fff3d6" d="M7 11h2v2H7z"/>
  </svg></span>`;
}

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
export const numeral = (number) => number.toLocaleString('ko-KR');
export const deltaText = (delta) => `${delta > 0 ? '+' : '−'}${numeral(Math.abs(delta))}`;

export function changes(effect = {}) {
  return Object.entries(STATS).filter(([stat]) => effect[stat]).map(([stat, { label, color }]) => {
    const change = effect[stat];
    return `<span class="delta ${color}${change < 0 ? ' minus' : ''}">${label} ${deltaText(change)}</span>`;
  }).join('') + (effect.affection ? `<span class="delta rose${effect.affection < 0 ? ' minus' : ''}">애정 ${deltaText(effect.affection)}</span>` : '');
}

export function statGrid(stats, romance = null) {
  return `<div class="stat-grid">${Object.entries(STATS).map(([key, item]) => `<div class="stat-tile ${item.color}" data-stat="${key}">
    <span class="stat-label">${icon(item.mark)} ${item.label}</span>
    <strong>${numeral(stats[key])} <small>${item.unit ?? '점'}</small></strong>
  </div>`).join('')}
  ${romance ? `<div class="stat-tile rose affection-tile" data-stat="affection">
    <span class="stat-label">${icon('heart')} 애정</span>
    <strong>${numeral(romance.affection ?? 55)} <small>/ 100</small></strong>
  </div>` : ''}</div>`;
}
