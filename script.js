const rowsEl = document.getElementById('rows');
const emptyEl = document.getElementById('emptyState');
const grandTotalEl = document.getElementById('grandTotal');
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

let debtors = [];
let currency = localStorage.getItem('currency') || '₴';
currencySelect.value = currency;

let roundStep = Number(localStorage.getItem('roundStep')) || 1;
roundSelect.value = String(roundStep);

/* ---------- Форматирование ---------- */

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
  const ms = now - then;
  return Math.max(0, Math.floor(ms / (7*24*3600*1000)));
}

function computeTotal(d){
  const w = weeksSince(d.date);
  const rate = Number(d.rate)/100;
  const total = Number(d.amount) * Math.pow(1+rate, w);
  return { weeks: w, total };
}

/* ---------- Хранение данных ---------- */

function save(){
  try{
    localStorage.setItem('debtors', JSON.stringify(debtors));
  }catch(e){ console.error('Ошибка сохранения', e); }
}

function load(){
  try{
    const raw = localStorage.getItem('debtors');
    debtors = raw ? JSON.parse(raw) : [];
  }catch(e){
    debtors = [];
  }
  render();
}

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

/* ---------- Отрисовка ---------- */

function render(){
  rowsEl.innerHTML = '';
  if(debtors.length === 0){
    emptyEl.style.display = 'block';
  } else {
    emptyEl.style.display = 'none';
  }

  let grand = 0;

  debtors
    .slice()
    .sort((a,b)=> (a.paid - b.paid) || new Date(b.date) - new Date(a.date))
    .forEach(d => {
      const { weeks, total } = computeTotal(d);
      const interest = total - Number(d.amount);
      if(!d.paid) grand += total;

      const row = document.createElement('div');
      row.className = 'row' + (d.paid ? ' paid' : '');

      row.innerHTML = `
        <div class="name">${escapeHtml(d.name)}<span class="date">с ${formatDate(d.date)}</span></div>
        <div class="amount" data-label="Сумма">${fmt(d.amount)}</div>
        <div class="rate" data-label="%/нед.">${Number(d.rate)}%</div>
        <div class="weeks" data-label="Недель">${weeks}</div>
        <div class="total" data-label="Итого">${fmt(total)}<span class="interest">+${fmt(interest)} процентов</span></div>
        <div data-label="Статус">${d.paid ? 'оплачено' : 'должен'}</div>
        <div class="actions">
          <button class="icon-btn paidbtn ${d.paid ? 'is-paid' : ''}" title="Отметить оплаченным">${d.paid ? '✓ оплачено' : 'оплатить'}</button>
          <button class="icon-btn danger" title="Удалить">удалить</button>
        </div>
      `;

      row.querySelector('.paidbtn').addEventListener('click', () => {
        d.paid = !d.paid;
        save();
        render();
      });
      row.querySelector('.danger').addEventListener('click', () => {
        if(confirm(`Удалить запись «${d.name}»?`)){
          debtors = debtors.filter(x => x.id !== d.id);
          save();
          render();
        }
      });

      rowsEl.appendChild(row);
    });

  grandTotalEl.textContent = fmt(grand);
}

function formatDate(str){
  const d = new Date(str);
  return d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Добавление записи ---------- */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('fName').value.trim();
  const amount = document.getElementById('fAmount').value;
  const rate = document.getElementById('fRate').value;
  const date = document.getElementById('fDate').value;
  if(!name || amount === '' || rate === '' || !date) return;

  debtors.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
    name, amount: Number(amount), rate: Number(rate), date, paid: false
  });
  save();
  render();
  form.reset();
  document.getElementById('fDate').valueAsDate = new Date();
  document.getElementById('fName').focus();
});

/* ---------- Резервная копия ---------- */

exportBtn.addEventListener('click', () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    currency,
    debtors
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `dolzhniki-backup-${stamp}.json`;
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
      if(!confirm(`Заменить текущий список ${debtors.length} записей на ${list.length} из файла?`)) return;
      debtors = list;
      if(data.currency){
        currency = data.currency;
        currencySelect.value = currency;
        localStorage.setItem('currency', currency);
      }
      save();
      render();
      alert('Резервная копия восстановлена');
    }catch(e){
      alert('Не удалось прочитать файл: ' + e.message);
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

/* ---------- PIN-защита ---------- */

function getPin(){ return localStorage.getItem('pin') || ''; }
function setPin(v){ localStorage.setItem('pin', v); }
function clearPin(){ localStorage.removeItem('pin'); }

function showLock(mode){
  // mode: 'enter' | 'create' | 'confirm' | 'change-old' | 'change-new'
  lockScreen.classList.remove('hidden');
  lockInput.value = '';
  lockError.textContent = '';
  lockInput.focus();

  if(mode === 'enter'){
    lockTitle.textContent = 'Введите PIN-код';
    lockSubtitle.textContent = 'Доступ к списку должников защищён';
  } else if(mode === 'create'){
    lockTitle.textContent = 'Придумайте PIN-код';
    lockSubtitle.textContent = 'Минимум 4 цифры. Запомните его — сброса нет.';
  } else if(mode === 'confirm'){
    lockTitle.textContent = 'Повторите PIN-код';
    lockSubtitle.textContent = 'Введите тот же код ещё раз';
  }
}

function hideLock(){
  lockScreen.classList.add('hidden');
}

let lockState = { mode: null, pending: null };

function startEnterFlow(){
  if(!getPin()){
    hideLock();
    return;
  }
  lockState = { mode: 'enter' };
  showLock('enter');
}

lockSubmit.addEventListener('click', handleLockSubmit);
lockInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') handleLockSubmit(); });

function handleLockSubmit(){
  const val = lockInput.value.trim();

  if(lockState.mode === 'enter'){
    if(val === getPin()){
      hideLock();
      sessionStorage.setItem('unlocked', '1');
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
    showLock('confirm');
    return;
  }

  if(lockState.mode === 'confirm'){
    if(val !== lockState.pending){
      lockError.textContent = 'Коды не совпадают, попробуйте снова';
      lockState = { mode: 'create' };
      setTimeout(() => showLock('create'), 900);
      return;
    }
    setPin(val);
    sessionStorage.setItem('unlocked', '1');
    hideLock();
    alert('Пароль установлен');
    return;
  }

  if(lockState.mode === 'change-old'){
    if(val !== getPin()){
      lockError.textContent = 'Неверный текущий PIN-код';
      return;
    }
    lockState = { mode: 'create' };
    showLock('create');
    return;
  }
}

pinBtn.addEventListener('click', () => {
  if(getPin()){
    const choice = confirm('PIN уже установлен.\nOK — сменить PIN\nОтмена — отключить PIN');
    if(choice){
      lockState = { mode: 'change-old' };
      showLock('enter');
      lockTitle.textContent = 'Введите текущий PIN-код';
      lockSubtitle.textContent = 'Чтобы сменить пароль, сначала подтвердите текущий';
    } else {
      const check = prompt('Введите текущий PIN, чтобы отключить защиту:');
      if(check === getPin()){
        clearPin();
        alert('PIN-защита отключена');
      } else if(check !== null){
        alert('Неверный PIN');
      }
    }
  } else {
    lockState = { mode: 'create' };
    showLock('create');
  }
});

/* ---------- Инициализация ---------- */

if(getPin() && sessionStorage.getItem('unlocked') !== '1'){
  startEnterFlow();
} else {
  hideLock();
}

load();
