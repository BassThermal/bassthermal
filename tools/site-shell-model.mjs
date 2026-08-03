export function titleCase(value) {
  return String(value || '').split(/[-\s]+/).filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function routeModel(pathname, label = '') {
  let path = String(pathname || '/').replace(/\/{2,}/g, '/');
  if (path === '/index.html') path = '/';
  if (!path.endsWith('/')) path += '/';
  const parts = path.split('/').filter(Boolean);
  const root = { label: 'bassthermal', href: '/' };
  if (path === '/') return [root];
  if (parts[0] === 'apps') return [root, { label: label || titleCase(parts[1]), current: true }];
  if (parts[0] === 'guides') {
    if (parts.length === 1) return [root, { label: 'Guides', current: true }];
    return [root, { label: 'Guides', href: '/guides/' }, { label: label || titleCase(parts[1]), current: true }];
  }
  if (parts[0] === 'privacy') {
    if (parts.length === 1) return [root, { label: 'Privacy', current: true }];
    return [root, { label: 'Privacy', href: '/privacy/' }, { label: label || titleCase(parts[1]), current: true }];
  }
  return [root, { label: label || titleCase(parts[0]), current: true }];
}
