/* =========================================================
   ЭЛЕМЕНТЫ
========================================================= */

const app = document.getElementById('app');
const rowsEl = document.getElementById('rows');
const emptyEl = document.getElementById('emptyState');
const grandTotalEl = document.getElementById('grandTotal');
const statCountEl = document.getElementById('statCount');
const statInterestEl = document.getElementById('statInterest');
const rowsCountEl = document.getElementById('rowsCount');
const form = document.getElementById('addForm');

const currencySelect = document.getElementById('currencySelect');
const roundSelect = document.getElementById('roundSelect');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const pinBtn = document.getElementById('pinBtn');

const lockScreen = document.getElementById('lockScreen');
const lockTitle = document.getElementById('lockTitle');
const lockSubtitle = document.getElementById('lockSubtitle');
const lockInput = document.getElementById('lockInput');
const lockError = document.getElementById('lockError');
const lockSubmit = document.getElementById('lockSubmit');

document.getElementById('fDate').valueAsDate = new Date();

/* =========================================================
   СОСТОЯНИЕ
========================================================= */

let debtors = [];
let currency = localStorage.getItem('currency') || '₴';
let roundStep = Number(localStorage.getItem('roundStep')) || 1;

currencySelect.value = currency;
roundSelect.value = String(roundStep);

/* =========================================================
   ФОРМАТИРОВАНИЕ
========================================================= */

function fmt(n){
  const rounded = Math.round(n / roundStep) * roundStep;
  if(roundStep < 1){
    return rounded.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
  }
  return Math.round(rounded).toLocaleString('ru-RU') + ' ' + currency;
}

function weeksSince(dateStr){
  const then = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now - then) / (7 * 24 * 3600 * 1000)));
}

function roundTo(n, step){
  return Math.round(n / step) * step;
}

function computeTotal(d){
  const weeks = weeksSince(d.date);
  const rate = Number(d.rate) / 100;
  let total = Number(d.amount);
  for(let i = 0; i < weeks; i++){
    total = total * (1 + rate);
    total = roundTo(total, roundStep);
  }
  return { weeks, total };
}

function formatDate(str){
  return new Date(str).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function initials(name){
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '?';
  const second = parts[1]?.[0] || '';
  return (first + second).toUpperCase();
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* =========================================================
   ХРАНЕНИЕ
========================================================= */

function saveDebtors(){
  try{ localStorage.setItem('debtors', JSON.stringify(debtors)); }
  catch(e){ console.error('Ошибка сохранения', e); }
}

function loadDebtors(){
  try{
    const raw = localStorage.getItem('debtors');
    debtors = raw ? JSON.parse(raw) : [];
  }catch(e){
    debtors = [];
  }
}

/* =========================================================
   РЕНДЕР
========================================================= */

function render(){
  rowsEl.innerHTML = '';
  emptyEl.style.display = debtors.length === 0 ? 'block' : 'none';
  rowsCountEl.textContent = `${debtors.length} ${pluralRecords(debtors.length)}`;

  let grand = 0;
  let interestSum = 0;

  debtors
    .slice()
    .sort((a, b) => (a.paid - b.paid) || (new Date(b.date) - new Date(a.date)))
    .forEach(d => {
      const { weeks, total } = computeTotal(d);
      const interest = total - Number(d.amount);
      if(!d.paid){ grand += total; interestSum += interest; }

      const row = document.createElement('div');
      row.className = 'row' + (d.paid ? ' paid' : '');

      row.innerHTML = `
        <div class="row-name">
          <span class="row-avatar">${initials(d.name)}</span>
          <span class="row-name-text">${escapeHtml(d.name)}<span class="row-date">с ${formatDate(d.date)}</span></span>
        </div>
        <div class="mono" data-label="Сумма">${fmt(d.amount)}</div>
        <div class="mono" data-label="Ставка">${Number(d.rate)}%</div>
        <div class="row-weeks" data-label="Недель">${weeks}</div>
        <div class="row-total" data-label="К получению">${fmt(total)}<span class="row-interest">+${fmt(interest)}</span></div>
        <div data-label="Статус"><span class="status-pill ${d.paid ? 'paid' : 'due'}">${d.paid ? 'оплачено' : 'должен'}</span></div>
        <div class="row-actions">
          <button class="icon-btn paid-btn ${d.paid ? 'is-paid' : ''}">${d.paid ? '✓ оплачено' : 'оплатить'}</button>
          <button class="icon-btn danger">удалить</button>
        </div>
      `;

      row.querySelector('.paid-btn').addEventListener('click', () => {
        d.paid = !d.paid;
        saveDebtors();
        render();
      });

      row.querySelector('.danger').addEventListener('click', () => {
        if(confirm(`Удалить запись «${d.name}»?`)){
          debtors = debtors.filter(x => x.id !== d.id);
          saveDebtors();
          render();
        }
      });

      rowsEl.appendChild(row);
    });

  grandTotalEl.textContent = fmt(grand);
  statCountEl.textContent = debtors.filter(d => !d.paid).length;
  statInterestEl.textContent = fmt(interestSum);
}

function pluralRecords(n){
  const mod10 = n % 10, mod100 = n % 100;
  if(mod10 === 1 && mod100 !== 11) return 'запись';
  if([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'записи';
  return 'записей';
}

/* =========================================================
   НАСТРОЙКИ: ВАЛЮТА / ОКРУГЛЕНИЕ
========================================================= */

currencySelect.addEventListener('change', () => {
  currency = currencySelect.value;
  localStorage.setItem('currency', currency);
  render();
});

roundSelect.addEventListener('change', () => {
  roundStep = Number(roundSelect.value);
  localStorage.setItem('roundStep', roundStep);
  render();
});

/* =========================================================
   ДОБАВЛЕНИЕ ЗАПИСИ
========================================================= */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('fName').value.trim();
  const amount = document.getElementById('fAmount').value;
  const rate = document.getElementById('fRate').value;
  const date = document.getElementById('fDate').value;
  if(!name || amount === '' || rate === '' || !date) return;

  debtors.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name, amount: Number(amount), rate: Number(rate), date, paid: false
  });

  saveDebtors();
  render();
  form.reset();
  document.getElementById('fDate').valueAsDate = new Date();
  document.getElementById('fName').focus();
});

/* =========================================================
   РЕЗЕРВНАЯ КОПИЯ
========================================================= */

exportBtn.addEventListener('click', () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    currency,
    roundStep,
    debtors
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dolzhniki-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      const list = Array.isArray(data) ? data : data.debtors;
      if(!Array.isArray(list)) throw new Error('Неверный формат файла');

      if(!confirm(`Заменить текущий список (${debtors.length}) на список из файла (${list.length})?`)) return;

      debtors = list;
      if(data.currency){
        currency = data.currency;
        currencySelect.value = currency;
        localStorage.setItem('currency', currency);
      }
      if(data.roundStep){
        roundStep = Number(data.roundStep);
        roundSelect.value = String(roundStep);
        localStorage.setItem('roundStep', roundStep);
      }

      saveDebtors();
      render();
      alert('Резервная копия восстановлена');
    }catch(err){
      alert('Не удалось прочитать файл: ' + err.message);
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

/* =========================================================
   PIN-ЗАЩИТА
========================================================= */

function getPin(){ return localStorage.getItem('pin') || ''; }
function setPin(v){ localStorage.setItem('pin', v); }
function clearPin(){ localStorage.removeItem('pin'); }
function isUnlocked(){ return sessionStorage.getItem('unlocked') === '1'; }

function showApp(){
  lockScreen.style.display = 'none';
  app.style.display = 'block';
}

function showLockScreen(){
  app.style.display = 'none';
  lockScreen.style.display = 'flex';
}

let lockState = { mode: null, pending: null };

function openLock(mode){
  lockState.mode = mode;
  lockInput.value = '';
  lockError.textContent = '';
  showLockScreen();
  setTimeout(() => lockInput.focus(), 50);

  if(mode === 'enter'){
    lockTitle.textContent = 'Введите PIN-код';
    lockSubtitle.textContent = 'Доступ к списку должников защищён';
  } else if(mode === 'create'){
    lockTitle.textContent = 'Придумайте PIN-код';
    lockSubtitle.textContent = 'Минимум 4 цифры. Запомните его — сброса нет.';
  } else if(mode === 'confirm'){
    lockTitle.textContent = 'Повторите PIN-код';
    lockSubtitle.textContent = 'Введите тот же код ещё раз';
  } else if(mode === 'change-old'){
    lockTitle.textContent = 'Введите текущий PIN-код';
    lockSubtitle.textContent = 'Чтобы сменить пароль, подтвердите текущий';
  }
}

lockSubmit.addEventListener('click', handleLockSubmit);
lockInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') handleLockSubmit(); });

function handleLockSubmit(){
  const val = lockInput.value.trim();

  if(lockState.mode === 'enter'){
    if(val === getPin()){
      sessionStorage.setItem('unlocked', '1');
      showApp();
    } else {
      lockError.textContent = 'Неверный PIN-код';
      lockInput.value = '';
      lockInput.focus();
    }
    return;
  }

  if(lockState.mode === 'create'){
    if(val.length < 4){
      lockError.textContent = 'Минимум 4 цифры';
      return;
    }
    lockState = { mode: 'confirm', pending: val };
    openLock('confirm');
    return;
  }

  if(lockState.mode === 'confirm'){
    if(val !== lockState.pending){
      lockError.textContent = 'Коды не совпадают, попробуйте снова';
      setTimeout(() => openLock('create'), 900);
      return;
    }
    setPin(val);
    sessionStorage.setItem('unlocked', '1');
    showApp();
    alert('Пароль установлен');
    return;
  }

  if(lockState.mode === 'change-old'){
    if(val !== getPin()){
      lockError.textContent = 'Неверный текущий PIN-код';
      return;
    }
    openLock('create');
    return;
  }
}

pinBtn.addEventListener('click', () => {
  if(getPin()){
    const wantsChange = confirm('PIN уже установлен.\nOK — сменить PIN\nОтмена — отключить PIN');
    if(wantsChange){
      openLock('change-old');
    } else {
      const check = prompt('Введите текущий PIN, чтобы отключить защиту:');
      if(check === null) return;
      if(check === getPin()){
        clearPin();
        alert('PIN-защита отключена');
      } else {
        alert('Неверный PIN');
      }
    }
  } else {
    openLock('create');
  }
});

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
========================================================= */

function init(){
  loadDebtors();
  render();

  if(getPin() && !isUnlocked()){
    openLock('enter');
  } else {
    showApp();
  }
}

init();
