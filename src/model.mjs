export const STORAGE_KEY = 'campus-leave-demo-record-v1';
export const RECORDS_KEY = 'campus-leave-demo-records-v1';

export const DEFAULT_RECORD = Object.freeze({
  name: '林晓',
  nickname: '林晓',
  studentId: '26200303951',
  signature: '',
  gender: '请选择',
  hometown: '请选择',
  birthday: '请选择',
  school: '长垣烹饪职业技术学院',
  college: '信息工程学院',
  major: '虚拟现实技术应用',
  grade: '2026',
  className: '26虚拟现实1班',
  leaveType: '病假',
  status: '已通过',
  startTime: '2026-10-26T08:30',
  endTime: '2026-10-26T18:30',
  applyTime: '2026-10-25T21:12',
  reason: '身体不适，需要休息。',
  courseImpact: '无',
  origin: '长垣烹饪职业技术学院',
  leaveSchool: '是',
  destination: '河南省/新乡市/长垣市',
  address: '家中',
  contact: '家长',
  contactPhone: '13800000000',
  studentPhone: '13900000000',
});

export function calculateDuration(startTime, endTime) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return '时间设置有误';
  }

  const totalMinutes = Math.floor((end - start) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}天${hours}时${minutes}分`;
}

export function calculateTotalDuration(records) {
  const totalMinutes = records.reduce((total, item) => {
    const start = new Date(item.startTime).getTime();
    const end = new Date(item.endTime).getTime();
    return total + (Number.isFinite(start) && Number.isFinite(end) && end > start
      ? Math.floor((end - start) / 60000)
      : 0);
  }, 0);
  return `${Math.floor(totalMinutes / 1440)}天${Math.floor((totalMinutes % 1440) / 60)}时${totalMinutes % 60}分`;
}

export function formatDateTime(value) {
  return String(value || '').replace('T', ' ');
}

export function validateRecord(record) {
  if (!String(record.name || '').trim()) return '请填写姓名';
  if (!String(record.startTime || '').trim() || !String(record.endTime || '').trim()) {
    return '请填写开始和结束时间';
  }
  if (calculateDuration(record.startTime, record.endTime) === '时间设置有误') {
    return '结束时间必须晚于开始时间';
  }
  return '';
}

export function validateProfile(record) {
  if (!String(record.name || '').trim()) return '请填写姓名';
  if (!String(record.studentId || '').trim()) return '请填写学号';
  return '';
}

export function loadRecord(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object'
      ? { ...DEFAULT_RECORD, ...saved }
      : { ...DEFAULT_RECORD };
  } catch {
    return { ...DEFAULT_RECORD };
  }
}

export function saveRecord(record, storage = globalThis.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function loadRecords(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(RECORDS_KEY);
    if (raw === null) return [loadRecord(storage)];
    const saved = JSON.parse(raw);
    return Array.isArray(saved)
      ? saved.map((item) => ({ ...DEFAULT_RECORD, ...item }))
      : [loadRecord(storage)];
  } catch {
    return [loadRecord(storage)];
  }
}

export function saveRecords(records, storage = globalThis.localStorage) {
  storage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function storeRecord(records, nextRecord, editIndex = null) {
  if (Number.isInteger(editIndex) && editIndex >= 0 && editIndex < records.length) {
    return records.map((item, index) => index === editIndex ? nextRecord : item);
  }
  return [nextRecord, ...records];
}

export function deleteRecord(records, index) {
  return records.filter((_, itemIndex) => itemIndex !== index);
}
