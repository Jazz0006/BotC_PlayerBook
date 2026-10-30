// Real offline-file smoke checks using Chrome's DevTools protocol, without dependencies.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary = await mkdtemp(path.join(tmpdir(),'playbook-browser-'));
await copyFile(path.join(root,'index.html'),path.join(temporary,'reference.html'));
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const child = spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${path.join(temporary,'profile')}`],{windowsHide:true,stdio:'ignore'});
let socket;
try {
  let port;
  for (let i=0;i<150;i++) {try {port=(await readFile(path.join(temporary,'profile','DevToolsActivePort'),'utf8')).split('\n')[0];break;} catch {await new Promise(r=>setTimeout(r,100));}}
  assert.ok(port,'Chrome did not start');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${pathToFileURL(path.join(temporary,'reference.html')).href}`,{method:'PUT'})).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {socket.onopen=resolve;socket.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  socket.onmessage = ev => {const message=JSON.parse(ev.data);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);};
  const call = (method,params={}) => new Promise((resolve,reject) => {const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
  const evaluate = async expression => {const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
  await call('Runtime.enable');await call('Page.enable');
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  // Page may already be ready before Runtime.enable.
  for (let attempt=0;attempt<100 && await evaluate('document.readyState') !== 'complete';attempt++) await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await evaluate('document.readyState'), 'complete');
  const audit = process.env.CSS_AUDIT === '1';
  const snapshots = {};
  if (audit) await evaluate(`
    window.cssTree = Array.from(document.styleSheets[0].cssRules, function visit(rule) {
      if (rule.type === CSSRule.STYLE_RULE) return {selector:rule.selectorText, css:rule.style.cssText, declarations:Array.from(rule.style,p=>[p,rule.style.getPropertyValue(p),rule.style.getPropertyPriority(p)])};
      if (rule.type === CSSRule.MEDIA_RULE) return {media:rule.conditionText, children:Array.from(rule.cssRules,visit)};
      if (rule.type === CSSRule.KEYFRAMES_RULE) return {keyframes:rule.name, css:rule.cssText};
      throw new Error('Unexpected CSS rule '+rule.type);
    });
    window.cssSelectors = new Set();
    window.cssUsed = new Set();
    (function walk(rules) {for (const rule of rules) {if(rule.selector) cssSelectors.add(rule.selector);if(rule.children) walk(rule.children);}})(cssTree);
    window.sampleCSS = function() {
      for (const selector of cssSelectors) {
        const query = selector.replace(/::?(before|after)/g,'').replace(/:(hover|focus-visible|focus|active)(?![\\w-])/g,'');
        if(document.querySelector(query)) cssUsed.add(selector);
      }
    }; sampleCSS();
  `);
  assert.equal(await evaluate('Object.keys(ROLES).length'),52);
  assert.deepEqual(await evaluate(`Array.from($('bottomTabs').querySelectorAll('.navLabel'),node=>node.textContent)`),['首页','规则','流程','剧本','人数']);
  assert.equal(await evaluate(`$('counts').querySelectorAll('tbody tr').length`),11);
  assert.equal(await evaluate(`$('counts').querySelectorAll('details,button').length`),0);
  await evaluate(`document.querySelector('#bottomTabs [data-tab=roles]').click()`);
  assert.equal(await evaluate('state.tab'),'roles');
  await evaluate(`document.querySelector('.roleQuickNameButton').click()`);
  assert.equal(await evaluate(`$('modal').classList.contains('show')`),true);
  await evaluate('closeModal()');
  await evaluate(`showFlow('8');setQuickFlowStep(4,false);window.originalDeck=$('process').firstElementChild;showTab('roles');window.originalRoles=$('roles').firstElementChild;$('roles').querySelector('.roleQuickScroller').scrollTop=100;showTab('counts');showTab('roles')`);
  assert.equal(await evaluate(`originalRoles===$('roles').firstElementChild`),true);
  assert.equal(await evaluate(`$('roles').querySelector('.roleQuickScroller').scrollTop`),100);
  await evaluate(`showTab('process')`);
  assert.equal(await evaluate(`originalDeck===$('process').firstElementChild && state.step===4`),true);
  await evaluate(`toggleLanguage()`);
  assert.deepEqual(await evaluate(`[state.lang,state.tab,state.flow,state.step]`),['en','process','8',4]);
  for (const lang of ['en','zh']) {
    if (await evaluate('state.lang') !== lang) await evaluate('toggleLanguage()');
    for (const script of ['trouble_brewing','no_greater_joy','advanced_7_9','bad_moon_rising']) {
      await evaluate(`setScript('${script}');showTab('roles')`);
      if (lang==='en') assert.equal(await evaluate(`$('bottomTabs').querySelector('button[data-tab=roles] .navLabel').textContent`),'Scripts');
      assert.equal(await evaluate(`document.querySelectorAll('.roleQuickRow').length`),await evaluate(`SCRIPTS[state.script].roles.length`));
      for (const id of await evaluate('SCRIPTS[state.script].roles')) {
        await evaluate(`openRole('${id}')`);
        if (audit) await evaluate('sampleCSS()');
        assert.equal(await evaluate(`$('modal').classList.contains('show') && $('modalBox').innerText.includes(roleText('${id}').name)`),true);
      }
      await evaluate('closeModal()');
    }
    for (const tab of ['home','roles','rules','counts','process']) {
      await evaluate(`showTab('${tab}')`);
      if (tab==='home') {
        assert.equal(await evaluate(`getComputedStyle($('bottomTabs')).display !== 'none'`),true);
        assert.equal(await evaluate(`document.querySelectorAll('.posterNav,.referenceHero').length`),0);
        assert.equal(await evaluate(`document.querySelector('.posterArtwork img').naturalWidth`),941);
      }
      if (lang==='en') assert.equal(await evaluate(`/\\p{Script=Han}/u.test($('${tab}').innerText)`),false,tab);
    }
    for (const flow of ['5','8']) {
      await evaluate(`showFlow('${flow}')`);
      const count=await evaluate(`document.querySelectorAll('.quickSlide').length`);
      assert.equal(count,flow==='5'?5:9);
      for (let i=0;i<count;i++) {await evaluate(`setQuickFlowStep(${i},false)`);assert.equal(await evaluate(`document.querySelectorAll('.quickSlide.active').length`),1);if(audit) await evaluate('sampleCSS()');}
      await evaluate(`document.querySelector('.quickTap').click()`);
      assert.equal(await evaluate('state.step'),0);
    }
    for (const width of (audit ? [320,350,360,380,390,430,560,768,1280] : [360,390,1280])) {
      await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
      for (const tab of ['home','roles','rules','counts','process']) {
        await evaluate(`showTab('${tab}')`);
        assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true,`${lang}/${tab}/${width} overflows`);
        if (tab==='roles') assert.equal(await evaluate(`Array.from(document.querySelectorAll('.roleQuickNameButton')).every(button=>button.scrollWidth<=button.clientWidth)`),true,`${lang}/${width}: role names overflow`);
        const image=await call('Page.captureScreenshot',{format:'png'});
        await writeFile(path.join(temporary,`${lang}-${tab}-${width}.png`),Buffer.from(image.data,'base64'));
        if (audit) {
          await evaluate('sampleCSS()');
          snapshots[`${lang}-${tab}-${width}`] = await evaluate(`Array.from(document.querySelectorAll('#${tab}, #${tab} *, #bottomTabs, #bottomTabs *, #languageToggle'),el=>{
            const style=getComputedStyle(el), props=['display','position','width','height','min-width','max-width','min-height','max-height','padding','margin','gap','grid-template-columns','grid-column','flex-direction','align-items','justify-content','font-family','font-size','font-weight','line-height','color','background','border','border-radius','box-shadow','overflow','opacity','visibility','transform'];
            return {tag:el.tagName,cls:el.className.baseVal??el.className,style:Object.fromEntries(props.map(p=>[p,style.getPropertyValue(p)]))};
          })`);
        }
      }
    }
  }
  assert.equal(await evaluate(`Array.from(document.images).every(image => image.complete && image.naturalWidth>0)`),true);
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.setupTable tbody tr:first-child > *'),cell=>Number(cell.textContent))`),[5,3,0,1,1]);
  assert.deepEqual(errors,[]);
  if (audit) {
    const cssAudit = await evaluate('({tree:cssTree,used:[...cssUsed],unmatched:[...cssSelectors].filter(selector=>!cssUsed.has(selector))})');
    assert.deepEqual(cssAudit.unmatched,[], 'CSS selectors without a sampled runtime producer');
    await writeFile(path.join(temporary,'css-audit.json'),JSON.stringify(cssAudit));
    await writeFile(path.join(temporary,'styles.json'),JSON.stringify(snapshots));
  }
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await call('Page.reload',{ignoreCache:true});
  await new Promise(resolve=>setTimeout(resolve,200));
  for (let attempt=0;attempt<100 && !(await evaluate(`document.readyState==='complete' && !!document.querySelector('#home img')?.naturalWidth`));attempt++) await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await evaluate(`getComputedStyle(document.getElementById('home')).display !== 'none' && document.querySelector('#home img').naturalWidth === 941`),true,'Poster must display even with JavaScript disabled');
  console.log(`Browser checks passed. Isolated offline HTML and screenshots: ${temporary}`);
} finally {socket?.close();child.kill();}
