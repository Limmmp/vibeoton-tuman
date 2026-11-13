// Start Vite and a headless Chromium browser with --remote-debugging-port=9224 first.
// Usage: node scripts/check-render.mjs [map URL] [DevTools URL] [screenshot path]
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const mapUrl = process.argv[2] || 'http://127.0.0.1:5173/?embedded';
const devtools = process.argv[3] || 'http://127.0.0.1:9224';
const target = await (await fetch(`${devtools}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
let sequence = 0;
const pending = new Map();
const exceptions = [];
const mockTile = (await readFile(new URL('../mobile/public/images/pin-study.png', import.meta.url))).toString('base64');
ws.addEventListener('message', ({ data }) => {
  const event = JSON.parse(data);
  if (event.id) {
    pending.get(event.id)?.(event);
    pending.delete(event.id);
  } else if (event.method === 'Runtime.exceptionThrown') exceptions.push(event.params.exceptionDetails);
  else if (event.method === 'Fetch.requestPaused') {
    void call('Fetch.fulfillRequest', { requestId: event.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'image/png' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: mockTile });
  }
});
async function call(method, params = {}) {
  const id = ++sequence;
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`DevTools timeout: ${method}`)); }, 30000);
    pending.set(id, value => { clearTimeout(timer); resolve(value); });
    ws.send(JSON.stringify({ id, method, params }));
  });
  if (result.error) throw new Error(JSON.stringify(result.error));
  return result.result;
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression) {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(200); }
  throw new Error(`Map timeout: ${expression}`);
}

try {
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await call('Page.navigate', { url: mapUrl });
  await waitFor(`!!window.tuman && window.tuman.state().basemap.ready && window.tuman.map.queryRenderedFeatures().some(feature => feature.sourceLayer === 'transportation')`);
  await evaluate(`window.tuman.exec({type:'setRenderQuality',quality:'low'})`);
  assert.equal(await evaluate('window.tuman.map.getPixelRatio()'), 1);
  assert.equal(await evaluate('window.tuman.renderProfile.mobile'), true);
  assert.ok(await evaluate(`window.tuman.map.queryRenderedFeatures().some(feature => feature.sourceLayer === 'transportation')`));
  assert.equal(await evaluate(`window.tuman.map.getPaintProperty('background','background-color')`), '#f8f4f0');
  assert.ok(await evaluate(`window.tuman.map.queryRenderedFeatures().some(feature => feature.layer.id === 'building')`), 'Low/2D lost flat buildings');

  assert.equal(await evaluate(`document.querySelector('.tuman-tilt-control').hidden`), false);
  await evaluate(`document.querySelector('.tuman-tilt-control button').click();true`);
  await waitFor(`Math.abs(window.tuman.map.getPitch()-45)<0.1 && !window.tuman.map.isMoving()`);
  assert.equal(await evaluate('window.tuman.state().viewMode'), '2d');
  assert.equal(await evaluate('window.tuman.map.getTerrain()'), null);
  assert.equal(await evaluate(`window.tuman.map.getLayoutProperty('building-3d','visibility')`), 'none');
  await evaluate(`document.querySelector('.tuman-tilt-control button').click();true`);
  await waitFor(`window.tuman.map.getPitch()<0.1 && !window.tuman.map.isMoving()`);

  await evaluate(`window.tuman.exec({type:'setViewMode',mode:'3d'})`);
  assert.equal(await evaluate(`document.querySelector('.tuman-tilt-control').hidden`), true);
  assert.equal(await evaluate('window.tuman.map.getTerrain()'), null);
  assert.equal(await evaluate(`window.tuman.map.getLayoutProperty('hillshade-over-fog','visibility')`), 'none');
  await evaluate(`window.tuman.exec({type:'setRenderQuality',quality:'high'})`);
  assert.equal(await evaluate('window.tuman.map.getPixelRatio()'), 2);
  assert.ok(await evaluate('!!window.tuman.map.getTerrain()'));
  await evaluate(`window.tuman.exec({type:'setRenderQuality',quality:'low'})`);
  assert.equal(await evaluate('window.tuman.map.getPixelRatio()'), 1);
  assert.equal(await evaluate('window.tuman.map.getTerrain()'), null);
  await evaluate(`window.tuman.exec({type:'setViewMode',mode:'2d'})`);
  await delay(400);

  const movement = await evaluate(`(async () => {
    const engine = window.tuman;
    await engine.exec({type:'setPlayerMode',mode:'external'});
    let count = 0;
    engine.on(event => { if (event.type === 'playerMoved') count++; });
    for (let i = 0; i < 100; i++) await engine.exec({type:'gpsFix',lat:43.1155,lon:131.8855 + i * 0.000001});
    await new Promise(resolve => setTimeout(resolve, 350));
    return {count,lon:engine.state().player.lon};
  })()`);
  assert.ok(movement.count <= 3, `Movement burst crossed bridge ${movement.count} times`);
  assert.equal(movement.lon, 131.8855 + 99 * 0.000001);

  await evaluate(`window.tuman.exec({type:'setRenderQuality',quality:'balanced'})`);
  await evaluate(`window.tuman.exec({type:'revealAt',lat:43.1155,lon:131.8855,radius:350})`);
  await evaluate(`window.tuman.exec({type:'setViewMode',mode:'3d'})`);
  await waitFor(`window.tuman.map.querySourceFeatures('lit-buildings').length > 0`);
  for (const zoom of [16, 18, 20]) {
    await evaluate(`window.tuman.map.jumpTo({zoom:${zoom}}); true`);
    for (const mode of ['day', 'night']) {
      await evaluate(`window.tuman.exec({type:'setLighting',mode:'${mode}'})`);
      const material = await evaluate(`({
        layers: window.tuman.map.getStyle().layers.filter(layer => layer.type === 'fill-extrusion').map(layer => layer.id),
        pattern: window.tuman.map.getPaintProperty('building-3d','fill-extrusion-pattern') ?? null,
        opacity: window.tuman.map.getPaintProperty('building-3d','fill-extrusion-opacity'),
        dayImage: window.tuman.map.hasImage('windows-day'), nightImage: window.tuman.map.hasImage('windows-night')
      })`);
      assert.deepEqual(material, {layers:['building-3d'],pattern:null,opacity:1,dayImage:false,nightImage:false});
    }
  }
  await evaluate(`window.tuman.map.jumpTo({zoom:17,pitch:50}); true`);
  await waitFor(`window.tuman.map.areTilesLoaded() && window.tuman.map.queryRenderedFeatures({layers:['building-3d']}).length > 0`);
  if (process.argv[4]) {
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(process.argv[4].replace(/\.png$/, '-3d.png'), Buffer.from(screenshot.data, 'base64'));
  }
  await evaluate(`window.tuman.exec({type:'setViewMode',mode:'2d'})`);
  await delay(400);
  await evaluate(`window.tuman.exec({type:'setFogEffects',enabled:true})`);
  await delay(400);
  await evaluate(`window.tuman.exec({type:'setRenderActivity',active:false})`);
  const still = await evaluate(`(async () => {
    const layer = window.tuman.fogLayer;
    const before = layer.canvas.toDataURL();
    await new Promise(resolve => setTimeout(resolve, 700));
    return before === layer.canvas.toDataURL();
  })()`);
  assert.equal(still, true, 'Hidden map kept animating fog');
  await evaluate(`window.tuman.exec({type:'setRenderActivity',active:true})`);
  await evaluate(`window.tuman.exec({type:'setFogEffects',enabled:false})`);
  assert.equal(await evaluate(`window.tuman.map.getLayoutProperty('fog-puffs','visibility')`), 'none');
  await evaluate(`window.tuman.exec({type:'setRenderQuality',quality:'low'})`);
  await evaluate(`window.tuman.exec({type:'revealAt',lat:43.1155,lon:131.8855,radius:350})`);
  await delay(1000);
  if (process.argv[4]) {
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(process.argv[4], Buffer.from(screenshot.data, 'base64'));
  }
  assert.deepEqual(exceptions, [], 'Browser raised uncaught exceptions');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `window.__mapEvents = []; window.ReactNativeWebView = {postMessage: raw => window.__mapEvents.push(JSON.parse(raw))};` });
  await call('Network.enable');
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  // Mock community raster tiles: exercise rendering without automated requests to OSM tile servers.
  await call('Fetch.enable', { patterns: [{ urlPattern: 'https://tile.openstreetmap.org/*' }] });
  await call('Network.setBlockedURLs', { urls: ['*tiles.openfreemap.org/planet*'] });
  await call('Page.reload', { ignoreCache: true });
  await waitFor(`window.tuman?.state().basemap.provider === 'raster' && window.tuman.state().basemap.ready`);
  assert.ok(await evaluate(`!!window.tuman.map.getLayer('fog') && !!window.tuman.map.getLayer('basemap-raster')`));
  await call('Network.setBlockedURLs', { urls: ['*tiles.openfreemap.org/styles/liberty*'] });
  await call('Page.reload', { ignoreCache: true });
  await waitFor(`window.tuman?.state().basemap.provider === 'raster' && window.tuman.state().basemap.ready`);
  assert.equal(await evaluate('window.tuman.state().engineVersion'), 'tilt-performance-7');
  console.log('PASS: vector streets, readable style, live pixel ratio, low terrain, movement coalescing, hidden fog, effects toggle, tile/style failures');
} finally {
  const closed = new Promise(resolve => ws.addEventListener('close', resolve));
  ws.close();
  await closed;
  await fetch(`${devtools}/json/close/${target.id}`);
}
