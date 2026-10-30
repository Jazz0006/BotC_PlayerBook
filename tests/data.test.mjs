import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read = p => readFile(new URL('../'+p,import.meta.url),'utf8');
const roles = JSON.parse(await read('src/data/roles.json'));
const scripts = JSON.parse(await read('src/data/scripts.json'));
const ui = JSON.parse(await read('src/i18n.json'));
test('all scripts reference distinct valid roles with complete bilingual copy', () => {
  assert.equal(Object.keys(roles).length,52);
  assert.equal(Object.keys(scripts).length,4);
  for (const script of Object.values(scripts)) {
    assert.equal(new Set(script.roles).size,script.roles.length);
    for (const id of script.roles) assert.ok(roles[id],id);
  }
  for (const [id,role] of Object.entries(roles)) {
    assert.match(id,/^[a-z_]+$/);
    assert.ok(role.icon.startsWith('<svg'));
    for (const lang of ['zh','en']) for (const key of ['name','ability','player','phase','quickPhase','quickAbility']) assert.ok(role[lang][key],`${id}.${lang}.${key}`);
  }
  assert.deepEqual(Object.keys(ui.zh).sort(),Object.keys(ui.en).sort());
});
test('generated single file is valid JavaScript, embeds assets, and has no removed features', async () => {
  const html = await read('index.html');
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  assert.doesNotMatch(html,/localStorage|sessionStorage|myRole|myHidden|drawingStrokes|noteText|holdStart|localizeTree|translateTextValue|<canvas|<textarea/);
  assert.doesNotMatch(html,/(?:src|href)=["'](?:https?:|assets\/)/);
  assert.doesNotMatch(html,/\{\{(?:home|styles|app|data|asset:)/);
  const initial = html.split('<script>')[0];
  assert.match(initial,/<body data-tab="home" data-lang="zh">/);
  assert.match(initial,/<section id="home" class="section active"><div class="posterHome"><div class="posterArtwork"><img src="data:image\/png;base64,/);
  for (const name of ['rules','flow5','flow8']) {
    const en = await read(`src/views/${name}.en.html`);
    assert.doesNotMatch(en,/\p{Script=Han}/u);
  }
});
