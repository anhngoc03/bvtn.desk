// ==========================================================
// GUI BAN HOAN CHINH (Sheet File_chot)
// - Chi khoa/phong SO HUU de an moi duoc nop (giong Gui lai sau phe duyet).
// - Toi da 1 file PDF / de an. Admin bat/tat nhan, cho sua khi con mo.
// - Nop/sua thanh cong -> tu dong dien File_cuoi o DS_Deansangkien (qua bo may dong bo trung tam).
// ==========================================================

const FILECHOT_STATUS_PROP_KEY = "FILECHOT_STATUS";

function getFileChotStatus(token) {
  requireUser(token);
  const raw = PropertiesService.getScriptProperties().getProperty(FILECHOT_STATUS_PROP_KEY);
  if (raw === null) return true;
  return raw === "true";
}

function setFileChotStatus(token, isOpen) {
  const user = requireUser(token);
  if (!isAdmin(user)) {
    return { success: false, message: "Chỉ Admin mới có quyền bật/tắt nhận bản hoàn chỉnh." };
  }
  PropertiesService.getScriptProperties().setProperty(FILECHOT_STATUS_PROP_KEY, isOpen ? "true" : "false");
  return { success: true, message: "Đã cập nhật.", status: !!isOpen };
}

// Da tung nop chua (dung de quyet dinh hien nut "Gửi" hay "Chỉnh sửa" ben client)
function getFileChotDetail(token, khoaPhong, tenDeAn, maDeAn) {
  const user = requireUser(token);
  khoaPhong = String(khoaPhong || "").trim();
  tenDeAn = String(tenDeAn || "").trim();
  if (!khoaPhong || !tenDeAn) return null;

  if (!isAdmin(user) && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
    throw new Error("Bạn không có quyền xem thông tin khoa/phòng này.");
  }

  const data = getSheetData(CONFIG.SHEET_FILECHOT);
  if (data.length < 2) return null;

  const map = headerIndexMap(data[0]);
  requireColumns(map, ["Madean", "Khoaphong", "Tendean"]);

  const row = data.slice(1).find(function (r) {
    return String(r[map["Khoaphong"]] || "").trim() === khoaPhong &&
           String(r[map["Tendean"]] || "").trim() === tenDeAn;
  });
  if (!row) return null;

  return {
    fileUrl: "File" in map ? String(row[map["File"]] || "").trim() : ""
  };
}

function submitFileChot(token, data) {
  const user = requireUser(token);
  if (!data) return { success: false, message: "Không nhận được dữ liệu." };

  const maDeAn = String(data.maDeAn || "").trim();
  const khoaPhong = String(data.khoaPhong || "").trim();
  const tenDeAn = String(data.tenDeAn || "").trim();
  let dangkyId = String(data.dangkyId || "").trim();

  if (!maDeAn) return { success: false, message: "Chưa chọn mã đề án/sáng kiến." };
  if (!khoaPhong) return { success: false, message: "Chưa chọn khoa/phòng." };
  if (!tenDeAn) return { success: false, message: "Chưa chọn tên đề án/sáng kiến." };

  if (dangkyId && isDeAnDaLoai_(dangkyId)) {
    return { success: false, message: "Đề án/Sáng kiến đã bị loại." };
  }

  if (!isAdmin(user) && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
    return { success: false, message: "Bạn không có quyền nộp cho khoa/phòng này." };
  }

  if (!isAdmin(user) && !getFileChotStatus(token)) {
    return { success: false, message: "Chức năng hiện đang tạm ngừng nhận bản hoàn chỉnh. Vui lòng liên hệ Admin." };
  }

  const sheet = getSheet(CONFIG.SHEET_FILECHOT);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = headerIndexMap(headers);
  requireColumns(map, ["Madean", "Khoaphong", "Tendean"]);

  if (!dangkyId) {
    const phancongLookup = findRowByColumnValue_(CONFIG.SHEET_PHANCONG, "Madean", maDeAn);
    if (phancongLookup && "DangkyID" in phancongLookup.map) {
      dangkyId = String(phancongLookup.row[phancongLookup.map["DangkyID"]] || "").trim();
    }
  }

  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    const rowDangkyId = "DangkyID" in map ? String(values[i][map["DangkyID"]] || "").trim() : "";
    const matchByDangkyId = dangkyId && rowDangkyId && rowDangkyId === dangkyId;
    const matchByKhoaTen = (!dangkyId || !rowDangkyId) &&
      String(values[i][map["Khoaphong"]]).trim() === khoaPhong &&
      String(values[i][map["Tendean"]]).trim() === tenDeAn;
    if (matchByDangkyId || matchByKhoaTen) { rowIndex = i; break; }
  }

  const f = data.file;
  if (rowIndex === -1 && (!f || !f.data)) {
    return { success: false, message: "Vui lòng đính kèm file PDF." };
  }
  if (f && f.data) {
    const nameLower = String(f.name || "").toLowerCase();
    const mimeLower = String(f.mimeType || "").toLowerCase();
    if (mimeLower !== "application/pdf" && nameLower.slice(-4) !== ".pdf") {
      return { success: false, message: "File đính kèm phải ở định dạng PDF (.pdf)." };
    }
  }

  let fileUrl = "";
  if (f && f.data) {
    try {
      const folder = DriveApp.getFolderById(getDriveFolderIds_().FILE_CHOT);
      const bytes = Utilities.base64Decode(f.data);
      const blob = Utilities.newBlob(bytes, "application/pdf", f.name || "Ban_hoan_chinh.pdf");
      const file = folder.createFile(blob);
      fileUrl = file.getUrl();
    } catch (error) {
      return { success: false, message: "Không thể tải file lên Drive: " + error.message };
    }
  }

  if (rowIndex === -1) {
    const newRow = new Array(headers.length).fill("");
    if ("ID" in map) newRow[map["ID"]] = Utilities.getUuid();
    if ("DangkyID" in map) newRow[map["DangkyID"]] = dangkyId;
    newRow[map["Madean"]] = maDeAn;
    newRow[map["Khoaphong"]] = khoaPhong;
    newRow[map["Tendean"]] = tenDeAn;
    if ("File" in map) newRow[map["File"]] = fileUrl;
    if ("TaiKhoanGui" in map) newRow[map["TaiKhoanGui"]] = user.email;
    if ("ThoiGian" in map) newRow[map["ThoiGian"]] = new Date();
    sheet.appendRow(newRow);
    const lastRow = sheet.getLastRow();
    if ("ThoiGian" in map) sheet.getRange(lastRow, map["ThoiGian"] + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  } else {
    const rowNumber = rowIndex + 1;
    if (fileUrl && "File" in map) sheet.getRange(rowNumber, map["File"] + 1).setValue(fileUrl);
    if ("TaiKhoanGui" in map) sheet.getRange(rowNumber, map["TaiKhoanGui"] + 1).setValue(user.email);
    if ("ThoiGian" in map) sheet.getRange(rowNumber, map["ThoiGian"] + 1).setValue(new Date()).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  }

  invalidateSheetCache(CONFIG.SHEET_FILECHOT);

  if (dangkyId) {
    try { syncEngineRebuildAndPropagate_(dangkyId); } catch (e) { /* khong lam gian doan viec gui phieu chinh */ }
  }

  return { success: true, message: "Đã gửi thành công." };
}
