const entityMap: Record<string, string> = {
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
  return String(string).replace(/[&<>"'`=/]/g, function fromEntityMap(s) {
    return entityMap[s] as string;
  });
}
