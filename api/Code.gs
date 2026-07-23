
// --- 설정 ---
const VOLUNTEERS_SHEET_NAME = 'Volunteers';
const SCHEDULE_SHEET_NAME = 'ServiceSchedule';
const INSTANCES_SHEET_NAME = 'ServiceInstances';
const CONFIG_SHEET_NAME = 'Config';

/**
 * 웹 앱으로의 POST 요청을 처리합니다.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    if (!e.postData || !e.postData.contents) {
      throw new Error("요청 데이터가 없습니다.");
    }

    const requestData = JSON.parse(e.postData.contents);
    const { action, payload } = requestData;
    let resultData;

    switch (action) {
      case 'fetchData':
        resultData = fetchData();
        break;
      case 'updateLeaderPassword':
        resultData = updateLeaderPassword(payload.newPassword);
        break;
      case 'addVolunteer':
        resultData = addVolunteer(payload);
        break;
      case 'updateVolunteer':
        resultData = updateVolunteer(payload);
        break;
      case 'removeVolunteer':
        resultData = removeVolunteer(payload.id);
        break;
      case 'saveSchedule':
        resultData = saveSchedule(payload);
        break;
      case 'removeSchedule':
        resultData = removeSchedule(payload.id);
        break;
      case 'saveServiceInstance':
        resultData = saveServiceInstance(payload);
        break;
      case 'deleteServiceInstance':
        resultData = deleteServiceInstance(payload.id);
        break;
      case 'toggleApplication':
        resultData = toggleApplication(payload.serviceId, payload.volunteer, payload.isApplying);
        break;
      case 'addComment':
        resultData = addComment(payload.serviceId, payload.comment);
        break;
      case 'updateComment':
        resultData = updateComment(payload.serviceId, payload.commentId, payload.newText);
        break;
      case 'deleteComment':
        resultData = deleteComment(payload.serviceId, payload.commentId);
        break;
      default:
        throw new Error(`지원하지 않는 액션입니다: ${action}`);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: resultData }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error: " + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 시트에 필요한 헤더가 있는지 확인하고 없으면 추가합니다.
 */
function ensureHeaders(sheet, requiredHeaders) {
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  requiredHeaders.forEach(rh => {
    if (headers.indexOf(rh) === -1) {
      const nextCol = headers.length + 1;
      sheet.getRange(1, nextCol).setValue(rh).setFontWeight('bold').setBackground('#f3f3f3');
      headers.push(rh);
    }
  });
}

function fetchData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const volunteersSheet = ss.getSheetByName(VOLUNTEERS_SHEET_NAME);
  const scheduleSheet = ss.getSheetByName(SCHEDULE_SHEET_NAME);
  const instancesSheet = ss.getSheetByName(INSTANCES_SHEET_NAME);
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);

  if (!volunteersSheet || !scheduleSheet || !instancesSheet || !configSheet) {
    throw new Error("필요한 시트가 누락되었습니다.");
  }

  // 데이터 로드 전 헤더 체크
  ensureHeaders(instancesSheet, ['applicants', 'comments', 'assignments', 'pairs']);

  const volunteers = sheetToObjects(volunteersSheet);
  const serviceSchedule = sheetToObjects(scheduleSheet);
  const serviceInstances = sheetToObjects(instancesSheet).map(instance => {
      try {
        return {
          ...instance,
          applicants: instance.applicants ? JSON.parse(instance.applicants) : [],
          comments: instance.comments ? JSON.parse(instance.comments) : [],
          assignments: instance.assignments ? JSON.parse(instance.assignments) : {},
          pairs: instance.pairs ? JSON.parse(instance.pairs) : [],
        };
      } catch (e) {
        // 파싱 실패 시 기본값
        return {
          ...instance,
          applicants: [], comments: [], assignments: {}, pairs: []
        };
      }
  });
  
  let leaderPassword = '';
  const passwordRowIndex = findKeyRowIndex(configSheet, 'leaderPassword');
  if (passwordRowIndex > 0) {
    leaderPassword = configSheet.getRange(passwordRowIndex, 2).getValue().toString();
  } else {
    leaderPassword = 'admin'; 
    configSheet.appendRow(['leaderPassword', 'admin']);
  }

  return { volunteers, serviceSchedule, serviceInstances, leaderPassword };
}

function saveServiceInstance(payload) {
  const instance = payload.instance || payload;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INSTANCES_SHEET_NAME);
  ensureHeaders(sheet, ['applicants', 'comments', 'assignments', 'pairs']);

  const isNew = !instance.id || (typeof instance.id === 'string' && instance.id.startsWith('temp_'));
  
  // 시트 저장용 복사본 생성 및 직렬화
  const dataForSheet = { ...instance };
  dataForSheet.applicants = JSON.stringify(instance.applicants || []);
  dataForSheet.comments = JSON.stringify(instance.comments || []);
  dataForSheet.assignments = JSON.stringify(instance.assignments || {});
  dataForSheet.pairs = JSON.stringify(instance.pairs || []);
  
  if (isNew) {
    const permanentId = Utilities.getUuid();
    dataForSheet.id = permanentId;
    appendObject(sheet, dataForSheet);
    instance.id = permanentId;
  } else {
    updateRowByProperty(sheet, 'id', instance.id, dataForSheet);
  }
  
  return instance;
}

// --- 공통 헬퍼 함수 ---

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const data = range.getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const timeZone = Session.getScriptTimeZone();

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      let value = row[i];
      if (value instanceof Date) {
        if (header === 'date') {
          obj[header] = Utilities.formatDate(value, timeZone, "yyyy-MM-dd");
        } else {
          obj[header] = Utilities.formatDate(value, timeZone, "HH:mm");
        }
      } else if (header === 'isHouseToHouseOnly' || header === 'canDoConvenienceStore') {
        obj[header] = (value === true || value === 'TRUE' || value === 1 || value === '1');
      } else {
        obj[header] = value;
      }
    });
    return obj;
  });
}

function appendObject(sheet, object) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => {
    const value = object[header];
    if (typeof value === 'boolean') return value ? "TRUE" : "FALSE";
    return value === undefined || value === null ? '' : value;
  });
  sheet.appendRow(row);
}

function findRowByProperty(sheet, propertyName, value) {
  if (!sheet) return -1;
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return -1;
  const headers = data[0];
  const colIndex = headers.indexOf(propertyName);
  if (colIndex === -1) return -1;
  
  const searchVal = (value !== undefined && value !== null) ? value.toString() : "";
  
  for (let i = 1; i < data.length; i++) {
    const cellVal = (data[i][colIndex] !== undefined && data[i][colIndex] !== null) ? data[i][colIndex].toString() : "";
    if (cellVal === searchVal) return i + 1;
  }
  return -1;
}

function findKeyRowIndex(sheet, key) {
  if (!sheet) return -1;
  const data = sheet.getRange("A:A").getValues();
  const searchKey = (key !== undefined && key !== null) ? key.toString() : "";
  for (let i = 0; i < data.length; i++) {
    const cellVal = (data[i][0] !== undefined && data[i][0] !== null) ? data[i][0].toString() : "";
    if (cellVal === searchKey) return i + 1;
  }
  return -1;
}

function updateRowByProperty(sheet, propertyName, value, newObject) {
  const rowIndex = findRowByProperty(sheet, propertyName, value);
  if (rowIndex !== -1) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => {
      const val = newObject[header];
      if (typeof val === 'boolean') return val ? "TRUE" : "FALSE";
      return val === undefined || val === null ? '' : val;
    });
    sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  }
}

function deleteRowByProperty(sheet, propertyName, value) {
  const rowIndex = findRowByProperty(sheet, propertyName, value);
  if (rowIndex !== -1) sheet.deleteRow(rowIndex);
}

function toggleApplication(serviceId, volunteer, isApplying) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INSTANCES_SHEET_NAME);
  const rowIndex = findRowByProperty(sheet, 'id', serviceId);
  if (rowIndex === -1) throw new Error("봉사 정보를 찾을 수 없습니다.");
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.indexOf('applicants');
  
  const currentVal = sheet.getRange(rowIndex, colIndex + 1).getValue();
  let applicants = currentVal ? JSON.parse(currentVal) : [];
  
  if (isApplying) {
    if (!applicants.find(v => v.id === volunteer.id)) {
      applicants.push(volunteer);
    }
  } else {
    applicants = applicants.filter(v => v.id !== volunteer.id);
  }
  
  sheet.getRange(rowIndex, colIndex + 1).setValue(JSON.stringify(applicants));
  return applicants;
}

function addComment(serviceId, comment) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INSTANCES_SHEET_NAME);
  const rowIndex = findRowByProperty(sheet, 'id', serviceId);
  if (rowIndex === -1) throw new Error("봉사를 찾을 수 없습니다.");
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.indexOf('comments');
  
  const currentVal = sheet.getRange(rowIndex, colIndex + 1).getValue();
  let comments = currentVal ? JSON.parse(currentVal) : [];
  comments.push(comment);
  
  sheet.getRange(rowIndex, colIndex + 1).setValue(JSON.stringify(comments));
  return comments;
}

function updateComment(serviceId, commentId, newText) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INSTANCES_SHEET_NAME);
  const rowIndex = findRowByProperty(sheet, 'id', serviceId);
  if (rowIndex === -1) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.indexOf('comments');
  
  const currentVal = sheet.getRange(rowIndex, colIndex + 1).getValue();
  let comments = currentVal ? JSON.parse(currentVal) : [];
  comments = comments.map(c => c.id === commentId ? { ...c, text: newText } : c);
  
  sheet.getRange(rowIndex, colIndex + 1).setValue(JSON.stringify(comments));
  return comments;
}

function deleteComment(serviceId, commentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INSTANCES_SHEET_NAME);
  const rowIndex = findRowByProperty(sheet, 'id', serviceId);
  if (rowIndex === -1) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.indexOf('comments');
  
  const currentVal = sheet.getRange(rowIndex, colIndex + 1).getValue();
  let comments = currentVal ? JSON.parse(currentVal) : [];
  comments = comments.filter(c => c.id !== commentId);
  
  sheet.getRange(rowIndex, colIndex + 1).setValue(JSON.stringify(comments));
  return comments;
}

function updateLeaderPassword(newPassword) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  configSheet.clear();
  configSheet.getRange("A1:B1").setValues([["Key", "Value"]]).setFontWeight("bold");
  const passwordStr = (newPassword != null) ? newPassword.toString() : "";
  configSheet.appendRow(['leaderPassword', passwordStr]);
  SpreadsheetApp.flush();
  return { success: true };
}

function addVolunteer(payload) {
  const volunteer = payload.volunteer || payload;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VOLUNTEERS_SHEET_NAME);
  const newId = Utilities.getUuid();
  const newVolunteer = { ...volunteer, id: newId };
  appendObject(sheet, newVolunteer);
  return newVolunteer;
}

function removeVolunteer(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VOLUNTEERS_SHEET_NAME);
  deleteRowByProperty(sheet, 'id', id);
  return { id };
}

function saveSchedule(payload) {
  const schedule = payload.schedule || payload;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEDULE_SHEET_NAME);
  if (schedule.id) {
    updateRowByProperty(sheet, 'id', schedule.id, schedule);
    return schedule;
  } else {
    const newId = Utilities.getUuid();
    const newSchedule = { ...schedule, id: newId };
    appendObject(sheet, newSchedule);
    return newSchedule;
  }
}

function removeSchedule(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEDULE_SHEET_NAME);
  deleteRowByProperty(sheet, 'id', id);
  return { id };
}

function deleteServiceInstance(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INSTANCES_SHEET_NAME);
  deleteRowByProperty(sheet, 'id', id);
  return { id };
}
function updateVolunteer(payload) {
  const volunteer = payload.volunteer || payload;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VOLUNTEERS_SHEET_NAME);
  updateRowByProperty(sheet, 'id', volunteer.id, volunteer);
  return volunteer;
}
