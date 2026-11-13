export function collectionUrl(mapAddress: string, model?: string): string {
  const base = new URL(mapAddress);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Нужен адрес HTTP или HTTPS');
  if (!base.pathname.endsWith('/') && !base.pathname.endsWith('.html')) base.pathname += '/';
  const collection = new URL('collection.html', base);
  collection.searchParams.set('embedded', '1');
  const version = base.searchParams.get('v'); if (version) collection.searchParams.set('v', version);
  if (model) collection.searchParams.set('model', model);
  return collection.href;
}
