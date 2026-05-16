// APRÈS
// src/utils/sanitize.js
export function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  /** Bloque les URL javascript: / data: dans les href/src */
  export function safeUrl(url) {
    if (!url) return '#';
    const trimmed = String(url).trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return '#';
    return url;
  }