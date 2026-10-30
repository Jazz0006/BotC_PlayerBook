import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFile(path.join(root,p),'utf8');
const json = async p => JSON.parse(await read(p));
const asset = async (p,type) => `data:image/${type};base64,${(await readFile(path.join(root,p))).toString('base64')}`;
const assets = {rules:await asset('assets/rules.jpg','jpeg'),homeZh:await asset('assets/home-zh.png','png'),homeEn:await asset('assets/home-en.png','png')};
const templates = {};
for (const name of ['rules','flow5','flow8']) {
  templates[name] = {};
  for (const lang of ['zh','en']) templates[name][lang] = (await read(`src/views/${name}.${lang}.html`)).replaceAll('{{asset:rules}}','');
}
const home = `<div class="posterHome"><div class="posterArtwork"><img src="${assets.homeZh}" width="941" height="1672" alt="血染钟楼玩家助手：离线速查，新手友好。"></div></div>`;
// The initial poster is real HTML, visible even when a preview disables JavaScript.
// Read its source back at runtime so the image is embedded only once.
const values = {ROLES:await json('src/data/roles.json'),SCRIPTS:await json('src/data/scripts.json'),ICONS:await json('src/data/icons.json'),UI:await json('src/i18n.json'),ASSETS:{rules:assets.rules,homeEn:assets.homeEn},TEMPLATES:templates};
const data = Object.entries(values).map(([key,value]) => `const ${key} = ${JSON.stringify(value).replaceAll('<','\\u003c')};`).join('\n') + `\nASSETS.homeZh = document.querySelector('#home img').getAttribute('src');`;
const styles = await read('src/styles/app.css');
const app = await read('src/app.js');
const output = (await read('src/shell.html')).replace('{{home}}',()=>home).replace('{{styles}}',()=>styles).replace('{{data}}',()=>data).replace('{{app}}',()=>app);
await writeFile(path.join(root,'index.html'),output);
console.log(`Built index.html (${Buffer.byteLength(output).toLocaleString()} bytes); all assets embedded.`);
