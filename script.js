const rowsEl = document.getElementById('rows');
const emptyEl = document.getElementById('emptyState');
const grandTotalEl = document.getElementById('grandTotal');
const form = document.getElementById('addForm');
document.getElementById('fDate').valueAsDate = new Date();

let debtors = [];

function fmt(n){
  return Math.round(n).toLocaleString('ru-RU') + ' ₴';
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

async function save(){
  try{
    await window.storage.set('debtors', JSON.stringify(debtors), false);
  }catch(e){ console.error('Ошибка сохранения', e); }
}

async function load(){
  try{
    const res = await window.storage.get('debtors', false);
    debtors = res ? JSON.parse(res.value) : [];
  }catch(e){
    debtors = [];
  }
  render();
}

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

load();

