type EntityMap = {
  [key: string]: string;
};

const entityMap: EntityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

export function escapeHtml(string: string | null | undefined): string {
  if (string === null || string === undefined) {
    return '';
  }
  return String(string).replace(/[&<>"'`=/]/g, (s: string): string => {
    return entityMap[s] || s;
  });
}
