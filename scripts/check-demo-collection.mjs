// Usage: node scripts/check-demo-collection.mjs [site URL] [DevTools URL] [screenshot prefix]
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:4175/';
const devtools = process.argv[3] || 'http://127.0.0.1:9225';
const target = await (await fetch(`${devtools}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve));
let sequence = 0;
const pending = new Map(), exceptions = [];
let glbFixture, glbStatus = 200;
ws.addEventListener('message', ({ data }) => {
  const event = JSON.parse(data);
  if (event.id) { pending.get(event.id)?.(event); pending.delete(event.id); }
  else if (event.method === 'Runtime.exceptionThrown') exceptions.push(event.params.exceptionDetails);
  else if (event.method === 'Fetch.requestPaused') void call('Fetch.fulfillRequest', {
    requestId: event.params.requestId, responseCode: glbStatus,
    responseHeaders: [{ name: 'Content-Type', value: 'model/gltf-binary' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: glbFixture,
  });
});
async function call(method, params = {}) {
  const id = ++sequence;
  const message = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`DevTools timeout: ${method}`)); }, 30000);
    pending.set(id, value => { clearTimeout(timer); resolve(value); });
    ws.send(JSON.stringify({ id, method, params }));
  });
  if (message.error) throw new Error(JSON.stringify(message.error));
  return message.result;
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression) {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(200); }
  throw new Error(`Timeout: ${expression}`);
}
async function screenshot(suffix) {
  if (!process.argv[4]) return;
  const result = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${process.argv[4]}-${suffix}.png`, Buffer.from(result.data, 'base64'));
}

// A small valid GLB verifies the real loader separately from missing-file placeholders.
function triangleGlb() {
  const bin = Buffer.alloc(36);
  [-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0].forEach((value, index) => bin.writeFloatLE(value, index * 4));
  const gltf = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.2, 0.8, 0.7, 1], metallicFactor: 0, roughnessFactor: 1 } }],
    buffers: [{ byteLength: bin.length }], bufferViews: [{ buffer: 0, byteLength: bin.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-0.5, 0, 0], max: [0.5, 1, 0] }] };
  let json = Buffer.from(JSON.stringify(gltf)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(json.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, json, binHeader, bin]).toString('base64');
}

try {
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await call('Page.navigate', { url: new URL('?embedded=1&v=tilt-performance-7', base).href });
  await wait('!!window.tuman && window.tuman.state().basemap.ready');
  const movement = await evaluate(`(async () => {
    const e=window.tuman,p=e.player,origin={lat:43.1155,lon:131.8855},target={lat:43.1155,lon:131.95};
    await e.exec({type:'setPlayerMode',mode:'sim'});
    const beforeGps={...p.pos};await e.exec({type:'gpsFix',lat:0,lon:0});const staleGpsIgnored=p.pos.lat===beforeGps.lat&&p.pos.lon===beforeGps.lon;
    p.teleport(origin);p.setSimSpeed(1);p.walkTo(target);p.tick(1);const slow=p.pos.lon-origin.lon;
    p.teleport(origin);p.setSimSpeed(32);p.walkTo(target);p.tick(1);const fast=p.pos.lon-origin.lon;
    p.teleport(origin);p.tick(1);const stopped=p.pos.lon===origin.lon;
    await e.exec({type:'setPlayerMode',mode:'external'});let rejected=false;
    try{await e.exec({type:'setSimSpeed',multiplier:32})}catch{rejected=true}
    await e.exec({type:'setPlayerMode',mode:'sim'});
    await e.exec({type:'setDemoTapMode',mode:'teleport'});
    e.map.fire('click',{point:{x:20,y:200},lngLat:{lat:43.13,lng:131.92},originalEvent:{target:e.map.getCanvas()}});
    return {ratio:fast/slow,stopped,rejected,staleGpsIgnored,teleported:p.pos.lat===43.13&&p.pos.lon===131.92,midpointRevealed:e.fog.isRevealed({lat:43.12275,lon:131.90275})};
  })()`);
  assert.ok(Math.abs(movement.ratio - 32) < 0.01); assert.equal(movement.stopped, true);
  assert.equal(movement.rejected, true); assert.equal(movement.teleported, true); assert.equal(movement.midpointRevealed, false);
  assert.equal(movement.staleGpsIgnored, true);

  await wait('!!document.querySelector(".demo-tools")');
  await evaluate(`document.querySelector('.demo-tools').open=true;document.querySelector('[data-speed="32"]').click();true`);
  await wait('window.tuman.player.simSpeed===32');
  await evaluate(`(async()=>{const e=window.tuman;await e.exec({type:'setPlayerMode',mode:'sim'});await e.exec({type:'teleport',lat:43.113375,lon:131.891218});await e.exec({type:'follow',on:true});await e.exec({type:'setRenderQuality',quality:'balanced'});await e.exec({type:'setViewMode',mode:'2d'});e.map.jumpTo({zoom:17,pitch:0});})()`);
  await wait(`window.tuman.map.getLayer('landmark-models')?.implementation.entries.size > 0`);
  assert.equal(await evaluate(`window.tuman.map.getLayer('landmark-models').implementation.entries.get('s56').placeholder`), false);
  const avatar = await evaluate(`(()=>{const img=document.querySelector('.tuman-avatar__image'),cursor=document.querySelector('.tuman-avatar__cursor');const a=img.getBoundingClientRect(),c=cursor.getBoundingClientRect();const p=window.tuman.map.project([window.tuman.player.pos.lon,window.tuman.player.pos.lat]);return {isImage:img.tagName==='IMG',loaded:img.complete&&img.naturalWidth>0,above:a.bottom<c.top,aligned:Math.abs(c.x+c.width/2-p.x)<2&&Math.abs(c.y+c.height/2-p.y)<2}})()`);
  assert.deepEqual(avatar, {isImage:true,loaded:true,above:true,aligned:true});
  await evaluate(`document.querySelector('.demo-tools').open=false;true`);
  await wait(`window.tuman.map.areTilesLoaded()`);
  await screenshot('map-model-2d');
  await evaluate(`document.querySelector('.tuman-tilt-control button').click();true`);
  await wait(`Math.abs(window.tuman.map.getPitch()-45)<0.1 && !window.tuman.map.isMoving()`);
  assert.equal(await evaluate('window.tuman.state().viewMode'), '2d');
  assert.equal(await evaluate('window.tuman.map.getTerrain()'), null);
  assert.equal(await evaluate(`window.tuman.map.getLayoutProperty('building-3d','visibility')`), 'none');
  assert.equal(await evaluate('window.tuman.map.getPixelRatio()'), 1.25);
  await evaluate(`window.tuman.exec({type:'setRenderQuality',quality:'high'})`);
  await wait(`Math.abs(window.tuman.map.getPitch()-45)<0.1 && !window.tuman.map.isMoving()`);
  await screenshot('map-model-2d-tilted');
  await evaluate(`window.tuman.exec({type:'setRenderQuality',quality:'balanced'})`);
  await evaluate(`window.tuman.exec({type:'setViewMode',mode:'3d'})`);
  assert.equal(await evaluate(`document.querySelector('.tuman-tilt-control').hidden`), true);
  await delay(700);
  assert.equal(await evaluate(`document.querySelector('.tuman-avatar__image').tagName`), 'IMG');
  await screenshot('map-model');
  await evaluate(`(async()=>{const e=window.tuman;await e.exec({type:'teleport',lat:43.073056,lon:131.843056});await e.exec({type:'follow',on:true});e.map.jumpTo({zoom:18,pitch:50});})()`);
  await wait(`window.tuman.map.getLayer('landmark-models')?.implementation.entries.get('lighthouse')?.placeholder === false && window.tuman.map.areTilesLoaded()`);
  await delay(600);
  assert.equal(await evaluate(`(async()=>{const data=await window.tuman.map.getSource('lit-buildings').getData();return data.features.some(f=>{const p=f.geometry.coordinates[0][0];return Math.hypot((p[0]-131.843056)*111320*Math.cos(43.073056*Math.PI/180),(p[1]-43.073056)*111320)<22})})()`), false, 'Procedural lighthouse geometry overlaps GLB');
  await screenshot('lighthouse-3d');
  await evaluate(`(async()=>{await window.tuman.exec({type:'setViewMode',mode:'2d'});await window.tuman.exec({type:'setRenderQuality',quality:'high'});})()`);
  await wait(`Math.abs(window.tuman.map.getPitch()-45)<0.1 && !window.tuman.map.isMoving()`);
  assert.equal(await evaluate(`document.querySelector('.tuman-tilt-control').hidden`), false);
  assert.equal(await evaluate(`!!window.tuman.map.getLayer('landmark-models')`), true);
  await evaluate(`window.tuman.exec({type:'setRenderQuality',quality:'low'})`);
  assert.equal(await evaluate(`!!window.tuman.map.getLayer('landmark-models')`), false);

  const collection = new URL('collection.html?embedded=1&v=tilt-performance-7', base).href;
  await call('Page.navigate', { url: collection });
  await wait(`document.querySelector('#status')?.textContent === 'GLB-модель'`);
  assert.equal(await evaluate(`document.querySelectorAll('#cards button').length`), 4);
  for (const id of ['s56', 'lighthouse', 'bridge', 'funicular']) {
    await evaluate(`document.querySelector('[data-id="${id}"]').click();true`);
    await wait(`document.querySelector('#status')?.textContent === 'GLB-модель'`);
  }
  assert.equal(await evaluate(`document.querySelectorAll('#canvas canvas').length`), 1);
  await evaluate(`document.querySelector('#preview').scrollIntoView({behavior:'instant'});true`);
  await screenshot('collection');
  await evaluate(`window.__collectionMessage=null;window.ReactNativeWebView={postMessage:raw=>{window.__collectionMessage=JSON.parse(raw)}};document.querySelector('#on-map').click();true`);
  assert.deepEqual(await evaluate('window.__collectionMessage'), {type:'collectionLocate',id:'funicular'});
  glbStatus = 404; glbFixture = '';
  await call('Fetch.enable', { patterns: [{ urlPattern: '*models/landmarks/*.glb*' }] });
  await call('Page.reload', { ignoreCache: true });
  await wait(`document.querySelector('#status')?.textContent === 'Заглушка'`);
  glbStatus = 200; glbFixture = triangleGlb();
  await call('Page.reload', { ignoreCache: true });
  await wait(`document.querySelector('#status')?.textContent === 'GLB-модель'`);
  assert.deepEqual(exceptions, [], 'Browser threw an exception');
  console.log('PASS: demo movement, GLB on balanced/2D and high/2D, no procedural lighthouse duplicate, 2D avatar above position cursor, low disposal, four GLBs, missing-file fallback');
} finally {
  const closed = new Promise(resolve => ws.addEventListener('close', resolve)); ws.close(); await closed;
  await fetch(`${devtools}/json/close/${target.id}`);
}
