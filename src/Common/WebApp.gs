/**
 * MissVill OS — Attendance API
 * บันทึก Clock In / Clock Out ลง Google Sheets และเก็บรูปใน Google Drive
 */

const ATTENDANCE_CONFIG = {
  SPREADSHEET_ID: "1AxxlWJ0EWh8_mNxdg2eBxeXl5k8gzY_wkb6lRYZl4So",
  EMPLOYEES_SHEET: "Employees",
  ATTENDANCE_SHEET: "Attendance",
  PHOTO_FOLDER_NAME: "MissVill Attendance Photos",
  TIMEZONE: "Asia/Bangkok",
  FRONTEND_ORIGIN: "https://missvillcollection.github.io",
};

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      service: "MissVill Attendance API",
      serverTime: new Date().toISOString(),
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let response;

  try {
    const payload = parsePayload_(e);
    validatePayload_(payload);

    const ss = SpreadsheetApp.openById(ATTENDANCE_CONFIG.SPREADSHEET_ID);
    const employeeSheet = ss.getSheetByName(ATTENDANCE_CONFIG.EMPLOYEES_SHEET);
    const attendanceSheet = ss.getSheetByName(ATTENDANCE_CONFIG.ATTENDANCE_SHEET);

    if (!employeeSheet) throw new Error("ไม่พบชีต Employees");
    if (!attendanceSheet) throw new Error("ไม่พบชีต Attendance");

    const employee = findEmployee_(employeeSheet, payload.lineUserId);
    if (!employee) {
      throw new Error("ไม่พบ LINE User ID นี้ในชีต Employees");
    }

    const serverTime = new Date();
    const photoUrl = savePhoto_(
      payload.photoDataUrl,
      employee.employeeId,
      payload.action,
      serverTime
    );

    const result =
      payload.action === "clockin"
        ? clockIn_(attendanceSheet, employee, payload, photoUrl, serverTime)
        : clockOut_(attendanceSheet, employee, payload, photoUrl, serverTime);

    response = {
      ok: true,
      message: payload.action === "clockin" ? "Clock In สำเร็จ" : "Clock Out สำเร็จ",
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      row: result.row,
      serverTime: Utilities.formatDate(
        serverTime,
        ATTENDANCE_CONFIG.TIMEZONE,
        "dd/MM/yyyy HH:mm:ss"
      ),
    };
  } catch (error) {
    console.error(error);
    response = {
      ok: false,
      message: error && error.message ? error.message : String(error),
    };
  }

  return postMessageOutput_(response);
}

function parsePayload_(e) {
  if (!e) throw new Error("ไม่พบ request");

  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }

  throw new Error("ไม่พบข้อมูล Attendance");
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
  }

  if (payload.action !== "clockin" && payload.action !== "clockout") {
    throw new Error("action ไม่ถูกต้อง");
  }

  if (!payload.lineUserId) throw new Error("ไม่พบ LINE User ID");
  if (typeof payload.latitude !== "number") throw new Error("Latitude ไม่ถูกต้อง");
  if (typeof payload.longitude !== "number") throw new Error("Longitude ไม่ถูกต้อง");

  if (
    !payload.photoDataUrl ||
    !String(payload.photoDataUrl).startsWith("data:image/")
  ) {
    throw new Error("ไม่พบรูปถ่าย");
  }
}

function findEmployee_(sheet, lineUserId) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return null;

  const map = headerMap_(values[0]);
  const lineCol = headerIndex_(map, ["LINE User ID"]);
  const idCol = headerIndex_(map, ["Employee ID"]);
  const nameCol = headerIndex_(map, ["ชื่อพนักงาน", "Employee Name", "Name"]);

  if (lineCol < 0) throw new Error("ไม่พบคอลัมน์ LINE User ID");

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][lineCol]).trim() === String(lineUserId).trim()) {
      return {
        employeeId: idCol >= 0 ? String(values[r][idCol]).trim() : "",
        employeeName: nameCol >= 0 ? String(values[r][nameCol]).trim() : "",
        lineUserId: String(lineUserId).trim(),
      };
    }
  }

  return null;
}

function clockIn_(sheet, employee, payload, photoUrl, serverTime) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const map = headerMap_(headers);

  if (findOpenRow_(values, map, employee)) {
    throw new Error("มี Clock In ที่ยังไม่ได้ Clock Out อยู่แล้ว");
  }

  const row = new Array(headers.length).fill("");

  set_(row, map, ["วันที่"], new Date(
    serverTime.getFullYear(),
    serverTime.getMonth(),
    serverTime.getDate()
  ));
  set_(row, map, ["Employee ID"], employee.employeeId);
  set_(row, map, ["ชื่อพนักงาน"], employee.employeeName);
  set_(row, map, ["LINE User ID"], employee.lineUserId);
  set_(row, map, ["เวลาเช็คอิน", "เวลาเช็กอิน", "Clock In"], serverTime);
  set_(row, map, ["Latitude"], payload.latitude);
  set_(row, map, ["Longitude"], payload.longitude);
  set_(row, map, ["ความแม่นยำ GPS (เมตร)", "ความแม่นยำ GPS"], payload.accuracy);
  set_(row, map, ["รูปเช็คอิน", "รูปเช็กอิน"], photoUrl);
  set_(row, map, ["สถานะ"], "Clocked In");
  set_(row, map, ["อุปกรณ์ / Browser", "อุปกรณ์/Browser"], payload.userAgent || "");
  set_(row, map, ["เวลาที่ระบบบันทึก"], serverTime);

  sheet.appendRow(row);
  return { row: sheet.getLastRow() };
}

function clockOut_(sheet, employee, payload, photoUrl, serverTime) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];
  const map = headerMap_(headers);
  const rowNumber = findOpenRow_(values, map, employee);

  if (!rowNumber) {
    throw new Error("ไม่พบรายการ Clock In ที่รอ Clock Out");
  }

  const row = values[rowNumber - 1];

  set_(row, map, ["เวลาเช็คเอาท์", "เวลาเช็กเอาต์", "เวลาเช็คออก", "Clock Out"], serverTime);
  set_(row, map, ["Latitude Out", "Latitude เช็คเอาท์"], payload.latitude);
  set_(row, map, ["Longitude Out", "Longitude เช็คเอาท์"], payload.longitude);
  set_(row, map, ["ความแม่นยำ GPS Out (เมตร)", "ความแม่นยำ GPS เช็คเอาท์"], payload.accuracy);
  set_(row, map, ["รูปเช็คเอาท์", "รูปเช็กเอาต์", "รูปเช็คออก"], photoUrl);
  set_(row, map, ["สถานะ"], "Completed");
  set_(row, map, ["เวลาที่ระบบบันทึก"], serverTime);

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  return { row: rowNumber };
}

function findOpenRow_(values, map, employee) {
  const employeeCol = headerIndex_(map, ["Employee ID"]);
  const lineCol = headerIndex_(map, ["LINE User ID"]);
  const clockOutCol = headerIndex_(map, [
    "เวลาเช็คเอาท์",
    "เวลาเช็กเอาต์",
    "เวลาเช็คออก",
    "Clock Out",
  ]);

  // ถ้ายังไม่มีคอลัมน์ Clock Out ถือว่าไม่มีรายการเปิดสำหรับการทดสอบ Clock In
  if (clockOutCol < 0) return null;

  for (let r = values.length - 1; r >= 1; r--) {
    const sameEmployee =
      (employeeCol >= 0 &&
        String(values[r][employeeCol]).trim() === String(employee.employeeId).trim()) ||
      (lineCol >= 0 &&
        String(values[r][lineCol]).trim() === String(employee.lineUserId).trim());

    if (sameEmployee && !values[r][clockOutCol]) return r + 1;
  }

  return null;
}

function savePhoto_(dataUrl, employeeId, action, serverTime) {
  const match = String(dataUrl).match(
    /^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/
  );

  if (!match) throw new Error("รูปภาพมีรูปแบบไม่ถูกต้อง");

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const bytes = Utilities.base64Decode(match[2]);

  const fileName =
    (employeeId || "UNKNOWN") +
    "_" +
    action +
    "_" +
    Utilities.formatDate(
      serverTime,
      ATTENDANCE_CONFIG.TIMEZONE,
      "yyyyMMdd_HHmmss"
    ) +
    "." +
    extension;

  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = getPhotoFolder_();
  return folder.createFile(blob).getUrl();
}

function getPhotoFolder_() {
  const folders = DriveApp.getFoldersByName(
    ATTENDANCE_CONFIG.PHOTO_FOLDER_NAME
  );

  return folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(ATTENDANCE_CONFIG.PHOTO_FOLDER_NAME);
}

function headerMap_(headers) {
  const map = {};
  headers.forEach(function (header, index) {
    map[normalize_(header)] = index;
  });
  return map;
}

function headerIndex_(map, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const key = normalize_(aliases[i]);
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
  }
  return -1;
}

function set_(row, map, aliases, value) {
  const index = headerIndex_(map, aliases);
  if (index >= 0) row[index] = value;
}

function normalize_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()/.]+/g, "");
}

function postMessageOutput_(response) {
  const json = JSON.stringify(response).replace(/</g, "\\u003c");

  return HtmlService.createHtmlOutput(
    "<!doctype html><html><body><script>" +
      "window.parent.postMessage(" +
      json +
      ", '*');" +
      "</script></body></html>"
  );
}
