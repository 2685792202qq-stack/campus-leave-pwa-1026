import {
  calculateDuration,
  calculateTotalDuration,
  deleteRecord,
  formatDateTime,
  loadRecord,
  loadRecords,
  saveRecord,
  saveRecords,
  storeRecord,
  validateProfile,
  validateRecord,
} from './model.mjs';

const preventZoom = (event) => event.preventDefault();
['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
  document.addEventListener(type, preventZoom, { passive: false });
});
document.addEventListener('touchmove', (event) => {
  if (event.touches.length > 1) event.preventDefault();
}, { passive: false });

let records = loadRecords();
let activeIndex = 0;
let record = records[activeIndex] || loadRecord();
let editingIndex = null;
let recordClicks = { index: -1, count: 0, at: 0, timer: null };
const form = document.querySelector('#record-form');
const profileForm = document.querySelector('#profile-form');
const toast = document.querySelector('#toast');
const deleteButton = document.querySelector('.delete-button');

function showScreen(name) {
  document.querySelector('#app').dataset.activeScreen = name;
  document.querySelectorAll('[data-screen]').forEach((screen) => {
    screen.hidden = screen.dataset.screen !== name;
    screen.classList.toggle('is-active', screen.dataset.screen === name);
  });
  window.scrollTo(0, 0);
}

function renderRecord() {
  document.querySelectorAll('[data-field]').forEach((element) => {
    element.textContent = record[element.dataset.field] || '-';
  });
  document.querySelectorAll('[data-date-field]').forEach((element) => {
    element.textContent = formatDateTime(record[element.dataset.dateField]);
  });
  document.querySelectorAll('[data-duration]').forEach((element) => {
    element.textContent = calculateDuration(record.startTime, record.endTime);
  });
  document.querySelectorAll('[data-record-title]').forEach((element) => {
    element.textContent = `${record.name}的${record.leaveType}`;
  });
  document.querySelectorAll('[data-profile-summary]').forEach((element) => {
    element.textContent = `${record.college} | ${record.major} ${record.grade}`;
  });
  renderRecordCards();
}

function renderRecordCards() {
  const list = document.querySelector('[data-record-card-list]');
  const template = document.querySelector('#record-card-template');
  list.replaceChildren(...records.map((item, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.recordIndex = index;
    card.querySelector('[data-record-title]').textContent = `${item.name}的${item.leaveType}`;
    card.querySelectorAll('[data-field]').forEach((element) => {
      element.textContent = item[element.dataset.field] || '-';
    });
    card.querySelectorAll('[data-date-field]').forEach((element) => {
      element.textContent = formatDateTime(item[element.dataset.dateField]);
    });
    return card;
  }));
  document.querySelector('[data-record-count]').textContent = records.length;
  document.querySelector('[data-total-duration]').textContent = calculateTotalDuration(records);
}

function fillForm() {
  Object.entries(record).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field) field.value = value;
  });
}

function fillProfileForm() {
  ['nickname', 'signature', 'gender', 'hometown', 'birthday', 'name', 'studentId', 'school', 'college', 'major', 'grade', 'className'].forEach((name) => {
    const field = profileForm.elements.namedItem(name);
    field.value = record[name] || '';
    field.readOnly = true;
    field.closest('.profile-edit-row').classList.remove('is-editing');
  });
  updateProfileCounters();
}

function updateProfileCounters() {
  profileForm.querySelectorAll('input[maxlength], textarea[maxlength]').forEach((field) => {
    const counter = field.closest('.profile-edit-row').querySelector('small');
    if (counter) counter.textContent = `${field.value.length}/${field.maxLength}`;
  });
}

function unlockProfileRow(row) {
  const field = row?.querySelector('input, textarea');
  if (!field) return;
  field.readOnly = false;
  row.classList.add('is-editing');
  field.focus();
  field.select?.();
}

let lastProfileTap = { row: null, at: 0 };
profileForm.addEventListener('click', (event) => {
  const row = event.target.closest('.profile-edit-row');
  const now = Date.now();
  if (row && row === lastProfileTap.row && now - lastProfileTap.at < 450) unlockProfileRow(row);
  lastProfileTap = { row, at: now };
});
profileForm.addEventListener('dblclick', (event) => unlockProfileRow(event.target.closest('.profile-edit-row')));
profileForm.addEventListener('input', updateProfileCounters);

document.addEventListener('click', (event) => {
  const demoAction = event.target.closest('[data-demo-action]');
  if (demoAction) {
    toast.textContent = demoAction.dataset.demoMessage || '本地演示不支持对外发送';
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 1500);
    return;
  }
  const recordCard = event.target.closest('[data-record-index]');
  if (recordCard) {
    const index = Number(recordCard.dataset.recordIndex);
    const now = Date.now();
    recordClicks.count = recordClicks.index === index && now - recordClicks.at < 500
      ? recordClicks.count + 1
      : 1;
    recordClicks.index = index;
    recordClicks.at = now;
    clearTimeout(recordClicks.timer);
    if (recordClicks.count >= 9) {
      editingIndex = index;
      activeIndex = index;
      record = records[index];
      fillForm();
      document.querySelector('.save-button').textContent = '保存修改';
      deleteButton.hidden = false;
      recordClicks = { index: -1, count: 0, at: 0, timer: null };
      showScreen('editor');
      return;
    }
    recordClicks.timer = setTimeout(() => {
      activeIndex = index;
      record = records[index];
      renderRecord();
      recordClicks = { index: -1, count: 0, at: 0, timer: null };
      showScreen('detail');
    }, 550);
    return;
  }
  const trigger = event.target.closest('[data-go]');
  if (!trigger) return;
  if (trigger.dataset.go === 'editor') {
    editingIndex = null;
    fillForm();
    document.querySelector('.save-button').textContent = '新增假条';
    deleteButton.hidden = true;
  }
  if (trigger.dataset.go === 'profile-editor') fillProfileForm();
  showScreen(trigger.dataset.go);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const nextRecord = Object.fromEntries(new FormData(form));
  const error = validateRecord(nextRecord);
  document.querySelector('#form-error').textContent = error;
  if (error) return;

  record = { ...record, ...nextRecord };
  records = storeRecord(records, record, editingIndex);
  activeIndex = editingIndex === null ? 0 : editingIndex;
  record = records[activeIndex];
  editingIndex = null;
  document.querySelector('.save-button').textContent = '新增假条';
  deleteButton.hidden = true;
  saveRecord(record);
  saveRecords(records);
  renderRecord();
  showScreen('records');
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 1500);
});

deleteButton.addEventListener('click', () => {
  if (editingIndex === null || !window.confirm('确定删除该假条吗？')) return;
  records = deleteRecord(records, editingIndex);
  saveRecords(records);
  activeIndex = 0;
  record = records[0] || record;
  if (records.length) saveRecord(record);
  editingIndex = null;
  deleteButton.hidden = true;
  document.querySelector('.save-button').textContent = '新增假条';
  renderRecord();
  showScreen('records');
  toast.textContent = '假条已删除';
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 1500);
});

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const nextProfile = Object.fromEntries(new FormData(profileForm));
  const error = validateProfile(nextProfile);
  document.querySelector('#profile-form-error').textContent = error;
  if (error) return;

  record = { ...record, ...nextProfile };
  records = records.map((item) => ({ ...item, ...nextProfile }));
  record = records[activeIndex] || record;
  saveRecord(record);
  saveRecords(records);
  renderRecord();
  showScreen('profile');
  toast.textContent = '个人资料已保存';
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 1500);
});

renderRecord();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js');
}
