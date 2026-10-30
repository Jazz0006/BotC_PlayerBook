// All state is limited to this open document. Switching tabs never recreates content.
const state = {tab: 'home', lang: 'zh', script: 'trouble_brewing', flow: '5', step: 0};
const TABS = ['home', 'rules', 'process', 'roles', 'counts'];
const TAB_ICONS = {home:'home', rules:'book', process:'flow', roles:'search', counts:'counts'};
const TYPES = ['townsfolk', 'outsider', 'minion', 'demon'];
const $ = id => document.getElementById(id);
const t = key => UI[state.lang][key];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const roleText = id => ROLES[id][state.lang];

function navButton(id) {
  return `<button class="tab" type="button" data-tab="${id}" onclick="showTab('${id}')" aria-label="${t(id)}"><span class="navIcon" aria-hidden="true">${ICONS[TAB_ICONS[id]]}</span><span class="navLabel">${t(id)}</span></button>`;
}
function renderNavigation() {
  $('bottomTabs').innerHTML = TABS.map(navButton).join('');
}
function showTab(tab) {
  if (!TABS.includes(tab)) return;
  state.tab = tab;
  document.body.dataset.tab = tab;
  for (const id of TABS) $(id).classList.toggle('active', id === tab);
  $('bottomTabs').querySelectorAll('[data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tab);
    button.setAttribute('aria-current', button.dataset.tab === tab ? 'page' : 'false');
  });
}
function renderHome() {
  // Preserve the original artwork; CSS hides only the painted navigation strip.
  $('home').innerHTML = `<div class="posterHome"><div class="posterArtwork"><img src="${ASSETS[state.lang === 'zh' ? 'homeZh' : 'homeEn']}" width="941" height="1672" alt="${t('posterAlt')}"></div></div>`;
}
function renderRoles() {
  const choices = Object.entries(SCRIPTS).map(([id,s]) => `<button class="scriptChooserBtn ${state.script === id ? 'active' : ''}" type="button" onclick="setScript('${id}')">${escapeHtml(s[state.lang].name)}</button>`).join('');
  $('roles').innerHTML = `<div class="rolePageHeader"><div class="scriptChooserLine" role="group" aria-label="${t('script')}"><span class="scriptChooserLabel">${t('script')}:</span>${choices}</div></div><div class="roleQuickScroller" aria-label="${t('sheets')}"><section class="roleQuickSheet">${renderRoleBlock('townsfolk')}</section><section class="roleQuickSheet">${TYPES.slice(1).map(renderRoleBlock).join('')}</section></div>`;
}
function renderRoleBlock(type) {
  const ids = SCRIPTS[state.script].roles.filter(id => ROLES[id].type === type);
  if (!ids.length) return '';
  const rows = ids.map(id => {
    const copy = roleText(id);
    const isNew = state.script === 'advanced_7_9' && !SCRIPTS.trouble_brewing.roles.includes(id);
    return `<tr class="roleQuickRow${isNew ? ' advancedNew' : ''}" data-role="${id}"><th class="roleQuickRole" scope="row"><button class="roleQuickNameButton" type="button" onclick="openRole('${id}')">${escapeHtml(copy.name)}</button></th><td class="roleQuickPhase">${escapeHtml(copy.quickPhase)}</td><td class="roleQuickAbility">${escapeHtml(copy.quickAbility)}</td></tr>`;
  }).join('');
  return `<div class="roleQuickBlock ${type}"><h2 class="roleQuickTitle">${t(type)}<span class="roleQuickCount">${ids.length}</span></h2><table class="roleQuickTable"><colgroup><col class="roleQuickRoleCol"><col class="roleQuickPhaseCol"><col class="roleQuickAbilityCol"></colgroup><thead><tr>${['role','timing','effect'].map(key => `<th scope="col">${t(key)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function setScript(id) {
  if (!Object.hasOwn(SCRIPTS, id) || id === state.script) return;
  state.script = id;
  closeModal();
  renderRoles();
}
function openRole(id) {
  if (!Object.hasOwn(ROLES, id)) return;
  const role = ROLES[id], copy = roleText(id);
  const note = SCRIPTS[state.script].roleNotes?.[id]?.[state.lang];
  $('modalBox').innerHTML = `<div class="roleModal ${role.type} ${role.team}"><button class="roleModalClose" type="button" onclick="closeModal()" aria-label="${t('close')}">×</button><div class="roleModalHead"><span class="roleModalToken token ${role.type}" aria-hidden="true">${role.icon}</span><div class="roleModalTitle"><div class="roleModalName">${escapeHtml(copy.name)}</div><div class="roleModalEn">${escapeHtml(state.lang === 'zh' ? role.en.name : t(role.type))}</div></div></div><div class="roleModalMeta"><span class="pill ${role.team}">${t(role.type)} · ${t(role.team)}</span><span class="pill info">${escapeHtml(copy.phase)}</span></div><div class="roleModalSection"><b>${t('ability')}</b><p>${escapeHtml(copy.ability)}</p></div><div class="roleModalSection"><b>${t('player')}</b><p>${escapeHtml(copy.player)}</p></div>${note ? `<div class="scriptNotice">${t('scriptNote')} ${escapeHtml(note)}</div>` : ''}</div>`;
  $('modal').classList.add('show');
}
function closeModal() { $('modal').classList.remove('show'); }
function renderPlayerCounts() {
  const rows = Array.from({length:11}, (_,i) => {
    const n = i+5, minions = n < 10 ? 1 : n < 13 ? 2 : 3, outsiders = n < 7 ? n-5 : (n-7)%3;
    return [n,n-minions-outsiders-1,outsiders,minions,1];
  });
  const headings = ['players',...TYPES].map(key => `<th scope="col">${t(key)}</th>`).join('');
  const table = `<div class="setupTableWrap"><table class="setupTable"><thead><tr>${headings}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${row[0]}</th>${row.slice(1).map(n => `<td>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="setupTableNote">${t('baseSetup')}</p>`;
  $('counts').innerHTML = `<h2>${t('setup')}</h2>${table}`;
}
function renderProcess() {
  $('process').innerHTML = TEMPLATES['flow'+state.flow][state.lang];
  setQuickFlowStep(state.step, false);
}
function showFlow(flow) {
  if (!['5','8'].includes(flow)) return;
  if (state.flow !== flow) { state.flow = flow; state.step = 0; renderProcess(); }
  showTab('process');
}
function setQuickFlowStep(step, scroll = true) {
  const deck = $('process').querySelector('.quickDeck');
  const slides = [...deck.querySelectorAll('.quickSlide')];
  state.step = Math.max(0,Math.min(slides.length-1,Number(step)||0));
  deck.dataset.step = String(state.step);
  deck.classList.toggle('is-last',state.step === slides.length-1);
  slides.forEach((slide,i) => {slide.classList.toggle('active',i === state.step);slide.setAttribute('aria-hidden',String(i !== state.step));});
  deck.querySelectorAll('.quickProgressDot').forEach((dot,i) => dot.classList.toggle('active',i === state.step));
  deck.querySelector('.quickDeckLabel').textContent = slides[state.step].dataset.label;
  deck.querySelector('.quickProgressCount').textContent = `${state.step+1}/${slides.length}`;
  const back = deck.querySelector('.quickBack'); back.hidden = state.step === 0; back.setAttribute('aria-label',t('back'));
  deck.querySelector('.quickTap').textContent = state.step === slides.length-1 ? t('replay') : t('continue')+slides[state.step+1].dataset.label;
  if (scroll) window.scrollTo(0,0);
}
function quickFlowAdvance(ev) {
  if (ev?.target?.closest('button,a') && !ev.target.closest('.quickTap')) return;
  ev?.stopPropagation();
  const count = $('process').querySelectorAll('.quickSlide').length;
  setQuickFlowStep(state.step >= count-1 ? 0 : state.step+1);
}
function quickFlowBack(ev) {ev?.stopPropagation();setQuickFlowStep(state.step-1);}
function quickFlowKey(ev) {
  if (ev.target.closest('button,a')) return;
  if (['ArrowRight','Enter',' '].includes(ev.key)) {ev.preventDefault();quickFlowAdvance(ev);}
  if (ev.key === 'ArrowLeft') {ev.preventDefault();quickFlowBack(ev);}
}
function renderLanguage() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('title');
  document.body.dataset.lang = state.lang;
  $('languageToggle').textContent = state.lang === 'zh' ? 'EN' : '中文';
  $('languageToggle').setAttribute('aria-label',state.lang === 'zh' ? 'Switch to English' : '切换到中文');
  renderHome();renderNavigation();renderRoles();renderPlayerCounts();renderProcess();
  $('rules').innerHTML = TEMPLATES.rules[state.lang];
  $('rules').querySelector('.ruleBackdrop').src = ASSETS.rules;
  showTab(state.tab);
}
function toggleLanguage() {
  const scroll = $('roles').querySelector('.roleQuickScroller').scrollTop;
  state.lang = state.lang === 'zh' ? 'en' : 'zh';
  closeModal(); renderLanguage();
  $('roles').querySelector('.roleQuickScroller').scrollTop = scroll;
}

$('modal').addEventListener('click', ev => { if (ev.target.id === 'modal') closeModal(); });
window.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeModal(); });
renderLanguage();
