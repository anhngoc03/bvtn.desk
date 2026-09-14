function getProgressKhoaPhong(token) {
  return getAllowedKhoaPhong(token);
}




function getProgressDeAn(token, khoaPhong) {
  return getDeAnListByKhoa(token, khoaPhong);
}




// Ma de an bat dau bang "ĐA" -> co bang chi so do luong rieng trong man hinh Cap nhat tien do.
// Sang kien (ma "SK") thi khong co.
function isDeAnCode_(maDeAn) {
  return /^ĐA/i.test(String(maDeAn || "").trim());
}




/**
 * Danh sach TEN CHI SO do luong cua 1 de an (dung de ve bang nhap "Cap nhat tien do do luong"
 * o man hinh Cap nhat tien do). Chi goi ham nay khi ma de an bat dau bang "ĐA".
 * Tra ve: [ "Ten chi so 1", "Ten chi so 2", ... ] (rong neu de an chua co chi so nao khai bao).
 */
function getChiSoForProgress(token, khoaPhong, tenDeAn, maDeAn) {
  requireUser(token);
  if (!isDeAnCode_(maDeAn)) return [];


  const rows = listChiSoForDeAn(khoaPhong, tenDeAn, maDeAn);
  return rows
    .map(function (r) { return r.chiso; })
    .filter(function (v) { return v !== ""; });
}




/**
 * Them 1 (hoac nhieu) dong tien do moi vao Sheet Tiendo.
 * data = {
 *   maDeAn, khoaPhong, tenDeAn, trangThai, noiDung,
 *   files: [{name, mimeType, data(base64)}, ...],
 *   chiSoUpdates: [ { tenChiSo, tyLeHienTai }, ... ]   // CHI dung khi maDeAn bat dau bang "ĐA"
 * }
 * Toi da CONFIG.MAX_FILES file.
 * Neu chiSoUpdates co du lieu (đề án ĐA): moi chi so duoc ghi thanh 1 dong RIENG trong Tiendo
 * (dung chung Trang thai/Noi dung/File/Email/Thoi gian, chi khac o Tenchiso + Tyle_hientai),
 * va gia tri do luong cung duoc dong bo ve cot Tylehoanthanh trong Sheet DS_chisodean.
 * Neu khong co chiSoUpdates (hoac khong phai ma ĐA): chi ghi 1 dong nhu truoc, 2 cot Tenchiso/
 * Tyle_hientai de trong.
 */
function saveProgress(token, data) {
  const user = requireUser(token);
  if (!data) return { success: false, message: "Không nhận được dữ liệu." };




  const maDeAn = String(data.maDeAn || "").trim();
  const khoaPhong = String(data.khoaPhong || "").trim();
  const tenDeAn = String(data.tenDeAn || "").trim();
  const trangThai = String(data.trangThai || "").trim();
  const noiDung = String(data.noiDung || "").trim();




  if (!maDeAn) return { success: false, message: "Chưa chọn mã đề án/sáng kiến." };
  if (!khoaPhong) return { success: false, message: "Chưa chọn khoa/phòng." };
  if (!tenDeAn) return { success: false, message: "Chưa chọn tên đề án/sáng kiến." };
  if (!trangThai) return { success: false, message: "Chưa chọn trạng thái." };
  if (!noiDung) return { success: false, message: "Chưa nhập nội dung công việc." };




  if (!isAdmin(user) && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
    return { success: false, message: "Bạn không có quyền cập nhật khoa/phòng này." };
  }




  // Kiem tra de an co thuc su thuoc khoa/phong da chon khong. khoaPhong o day la 1 khoa/phong
  // DUY NHAT (nguoi dung chon tu dropdown), con o "Khoaphong" cua DS_Deansangkien co the dang
  // chua NHIEU khoa/phong (cach nhau boi dau phay) -> phai tach ra bang splitKhoaPhongValues_
  // (Utils.gs) roi kiem tra .indexOf(), khong so sanh === truc tiep ca chuoi nua.
  const deanData = getSheetData(CONFIG.SHEET_DEAN);
  const deanMap = headerIndexMap(deanData[0]);
  requireColumns(deanMap, ["Madean_sangkien", "Khoaphong", "Tendean"]);




  const matchedDeanRow = deanData.slice(1).find(function (row) {
    return (
      String(row[deanMap["Madean_sangkien"]]).trim() === maDeAn &&
      String(row[deanMap["Tendean"]]).trim() === tenDeAn &&
      splitKhoaPhongValues_(row[deanMap["Khoaphong"]]).indexOf(khoaPhong) !== -1
    );
  });
  const validDeAn = !!matchedDeanRow;
  const dangkyId = (matchedDeanRow && "DangkyID" in deanMap) ? String(matchedDeanRow[deanMap["DangkyID"]] || "").trim() : "";




  if (!validDeAn) {
    return { success: false, message: "Đề án/sáng kiến không thuộc khoa/phòng đã chọn." };
  }


  // De an/sang kien da bi "Đã loại" thi khong nhan cap nhat tien do nua
  if ("Trang_thai" in deanMap && String(matchedDeanRow[deanMap["Trang_thai"]] || "").trim() === "Đã loại") {
    return { success: false, message: "Đề án/Sáng kiến đã bị loại." };
  }




  // Xu ly file minh chung (toi da MAX_FILES file)
  const files = Array.isArray(data.files) ? data.files.slice(0, CONFIG.MAX_FILES) : [];
  const fileUrls = [];




  if (files.length > 0) {
    try {
      const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
      files.forEach(function (f) {
        if (!f || !f.data) return;
        const bytes = Utilities.base64Decode(f.data);
        const blob = Utilities.newBlob(bytes, f.mimeType || "application/octet-stream", f.name || "Minh_chung");
        const file = folder.createFile(blob);
        fileUrls.push(file.getUrl());
      });
    } catch (error) {
      return { success: false, message: "Không thể tải file minh chứng lên Drive: " + error.message };
    }
  }




  const sheet = getSheet(CONFIG.SHEET_PROGRESS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = headerIndexMap(headers);




  requireColumns(map, [
    "Madean_sangkien", "Khoaphong", "Tendean", "Trangthai",
    "NoidungCV_dang_thuc_hien", "File_minh_chung_neuco", "Email", "Thoi_gian"
  ]);




  // Cac dong "chi so" hop le: chi ap dung cho ma ĐA, va chi tinh nhung dong nguoi dung co dien gia tri
  const chiSoUpdates = (isDeAnCode_(maDeAn) && Array.isArray(data.chiSoUpdates))
    ? data.chiSoUpdates
        .map(function (c) {
          return {
            tenChiSo: String((c && c.tenChiSo) || "").trim(),
            tyLeHienTai: String((c && c.tyLeHienTai) || "").trim()
          };
        })
        .filter(function (c) { return c.tenChiSo && c.tyLeHienTai; })
    : [];




  const thoiGian = new Date();
  const rowsToWrite = chiSoUpdates.length > 0
    ? chiSoUpdates.map(function (c) { return c; })
    : [{ tenChiSo: "", tyLeHienTai: "" }]; // dong "binh thuong", 2 cot chi so de trong




  rowsToWrite.forEach(function (chiSo) {
    const newRow = new Array(headers.length).fill("");
    const id = Utilities.getUuid();




    if ("ID" in map) newRow[map["ID"]] = id;
    if ("DangkyID" in map) newRow[map["DangkyID"]] = dangkyId;
    newRow[map["Madean_sangkien"]] = maDeAn;
    newRow[map["Khoaphong"]] = khoaPhong;
    newRow[map["Tendean"]] = tenDeAn;
    newRow[map["Trangthai"]] = trangThai;
    newRow[map["NoidungCV_dang_thuc_hien"]] = noiDung;
    if ("Tenchiso" in map) newRow[map["Tenchiso"]] = chiSo.tenChiSo;
    if ("Tyle_hientai" in map) newRow[map["Tyle_hientai"]] = chiSo.tyLeHienTai;
    newRow[map["File_minh_chung_neuco"]] = fileUrls.join(", ");
    newRow[map["Email"]] = user.email;
    newRow[map["Thoi_gian"]] = thoiGian;




    sheet.appendRow(newRow);




    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, map["Thoi_gian"] + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");




    if (chiSo.tenChiSo) {
      updateTyLeHoanThanhInChiSoSheet_(khoaPhong, tenDeAn, maDeAn, chiSo.tenChiSo, chiSo.tyLeHienTai);
    }
  });




  invalidateSheetCache(CONFIG.SHEET_PROGRESS);




  return {
    success: true,
    message: "Đã cập nhật thành công.",
    time: Utilities.formatDate(thoiGian, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss")
  };
}




// Toan bo lich su cap nhat cua 1 de an (moi nhat len tren)
function getProgressHistory(token, maDeAn) {
  const user = requireUser(token);
  maDeAn = String(maDeAn || "").trim();
  if (!maDeAn) return [];




  const data = getSheetData(CONFIG.SHEET_PROGRESS);
  if (data.length < 2) return [];




  const map = headerIndexMap(data[0]);
  requireColumns(map, [
    "Madean_sangkien", "Khoaphong", "Tendean", "Trangthai",
    "NoidungCV_dang_thuc_hien", "File_minh_chung_neuco", "Email", "Thoi_gian"
  ]);




  const admin = isAdmin(user);
  const allowedKhoa = user.khoaPhong || [];




  const result = [];




  data.slice(1).forEach(function (row) {
    if (String(row[map["Madean_sangkien"]]).trim() !== maDeAn) return;




    // Cot "Khoaphong" cua Sheet Tiendo CHI luu 1 khoa/phong duy nhat / dong (chinh khoa/phong ma
    // nguoi cap nhat da chon luc ghi log), nen van so sanh === binh thuong o day - KHONG lien quan
    // den o "Khoaphong" (co the nhieu gia tri) ben Sheet DS_Deansangkien.
    const khoa = String(row[map["Khoaphong"]]).trim();
    if (!admin && allowedKhoa.indexOf(khoa) === -1) return;




    result.push({
      id: "ID" in map ? String(row[map["ID"]] || "") : "",
      madean: String(row[map["Madean_sangkien"]] || ""),
      khoaPhong: khoa,
      tenDeAn: String(row[map["Tendean"]] || ""),
      trangThai: String(row[map["Trangthai"]] || ""),
      noiDung: String(row[map["NoidungCV_dang_thuc_hien"]] || ""),
      tenChiSo: "Tenchiso" in map ? String(row[map["Tenchiso"]] || "") : "",
      tyLeHienTai: "Tyle_hientai" in map ? String(row[map["Tyle_hientai"]] || "") : "",
      fileUrl: String(row[map["File_minh_chung_neuco"]] || ""),
      email: String(row[map["Email"]] || ""),
      thoiGian: formatCellValue(row[map["Thoi_gian"]]),
      daChinhSua: "DaChinhSua" in map ? String(row[map["DaChinhSua"]] || "") : ""
    });
  });




  result.reverse();
  return result;
}




/**
 * Tra ve ten file that (tren Google Drive) ung voi tung URL trong danh sach.
 * Dung de hien thi trong modal Sua thay vi ghi chung chung "File 1", "File 2".
 * Neu khong doc duoc ten (file bi xoa, sai dinh dang URL...) thi name se la "".
 * urls = [url1, url2, ...]
 * Tra ve: [ {url, name}, ... ]  (cung thu tu voi urls dau vao)
 */
function getFileNamesForUrls(token, urls) {
  requireUser(token);
  if (!Array.isArray(urls)) return [];




  return urls.map(function (url) {
    const match = String(url || "").match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return { url: url, name: "" };




    try {
      const file = DriveApp.getFileById(match[1]);
      return { url: url, name: file.getName() };
    } catch (error) {
      return { url: url, name: "" };
    }
  });
}




/**
 * ADMIN: sua 1 dong tien do da co (ghi de len dong do, KHONG tao dong moi).
 * Sua duoc: Trang thai, Noi dung cong viec, va File minh chung.
 * data = {
 *   trangThai, noiDung,
 *   keepFileUrls: [ ...url cac file cu muon GIU LAI... ],
 *   files: [ {name, mimeType, data(base64)}, ... ]  // file MOI can them
 * }
 * Tong so file (keepFileUrls + files moi) toi da CONFIG.MAX_FILES.
 * Luu y: xoa 1 url khoi keepFileUrls chi go lien ket khoi dong du lieu,
 * KHONG xoa file that su tren Google Drive.
 * Cot "DaChinhSua" se duoc ghi THOI GIAN chinh sua (dd/MM/yyyy HH:mm:ss), khong chi la 1 nhan co dinh,
 * de nguoi dung biet CHINH XAC dong nay duoc sua luc nao.
 */
function updateProgressRow(token, id, data) {
  const user = requireUser(token);
  if (!isAdmin(user)) {
    return { success: false, message: "Không có quyền truy cập." };
  }
  if (!id) return { success: false, message: "Thiếu ID dòng cần sửa." };
  if (!data) return { success: false, message: "Không nhận được dữ liệu." };




  const sheet = getSheet(CONFIG.SHEET_PROGRESS);
  const values = sheet.getDataRange().getValues();
  const map = headerIndexMap(values[0]);
  requireColumns(map, ["ID", "Trangthai", "NoidungCV_dang_thuc_hien", "File_minh_chung_neuco"]);




  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][map["ID"]]) === String(id)) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex === -1) return { success: false, message: "Không tìm thấy dòng cần sửa." };




  const rowNumber = rowIndex + 1;
  const trangThai = String(data.trangThai || "").trim();
  const noiDung = String(data.noiDung || "").trim();




  if (!trangThai) return { success: false, message: "Chưa chọn trạng thái." };
  if (!noiDung) return { success: false, message: "Chưa nhập nội dung công việc." };




  // File cu duoc giu lai (nguoi dung co the da bo bot vai file o modal Sua)
  const keepFileUrls = Array.isArray(data.keepFileUrls)
    ? data.keepFileUrls.map(function (u) { return String(u || "").trim(); }).filter(Boolean)
    : [];




  // File moi can upload len Drive (toi da MAX_FILES tinh ca file cu giu lai)
  const newFiles = Array.isArray(data.files) ? data.files.slice(0, CONFIG.MAX_FILES) : [];




  if (keepFileUrls.length + newFiles.length > CONFIG.MAX_FILES) {
    return { success: false, message: "Chỉ được tối đa " + CONFIG.MAX_FILES + " file minh chứng." };
  }




  const newUploadedUrls = [];
  if (newFiles.length > 0) {
    try {
      const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
      newFiles.forEach(function (f) {
        if (!f || !f.data) return;
        const bytes = Utilities.base64Decode(f.data);
        const blob = Utilities.newBlob(bytes, f.mimeType || "application/octet-stream", f.name || "Minh_chung");
        const file = folder.createFile(blob);
        newUploadedUrls.push(file.getUrl());
      });
    } catch (error) {
      return { success: false, message: "Không thể tải file minh chứng lên Drive: " + error.message };
    }
  }




  const finalFileUrls = keepFileUrls.concat(newUploadedUrls);




  sheet.getRange(rowNumber, map["Trangthai"] + 1).setValue(trangThai);
  sheet.getRange(rowNumber, map["NoidungCV_dang_thuc_hien"] + 1).setValue(noiDung);
  sheet.getRange(rowNumber, map["File_minh_chung_neuco"] + 1).setValue(finalFileUrls.join(", "));




  if ("DaChinhSua" in map) {
    const thoiGianSua = new Date();
    const nhanChinhSua = "Đã chỉnh sửa lúc " +
      Utilities.formatDate(thoiGianSua, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    sheet.getRange(rowNumber, map["DaChinhSua"] + 1).setValue(nhanChinhSua);
  }




  invalidateSheetCache(CONFIG.SHEET_PROGRESS);
  return { success: true, message: "Đã lưu chỉnh sửa." };
}




// ADMIN: xoa han 1 dong tien do
function deleteProgressRow(token, id) {
  const user = requireUser(token);
  if (!isAdmin(user)) {
    return { success: false, message: "Không có quyền truy cập." };
  }
  if (!id) return { success: false, message: "Thiếu ID dòng cần xóa." };




  const sheet = getSheet(CONFIG.SHEET_PROGRESS);
  const values = sheet.getDataRange().getValues();
  const map = headerIndexMap(values[0]);
  requireColumns(map, ["ID"]);




  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][map["ID"]]) === String(id)) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex === -1) return { success: false, message: "Không tìm thấy dòng cần xóa." };




  sheet.deleteRow(rowIndex + 1);
  invalidateSheetCache(CONFIG.SHEET_PROGRESS);
  return { success: true, message: "Đã xóa." };
}




/**
 * CHAY 1 LAN THU CONG tu Apps Script editor (khong goi tu web app)
 * de dien ID cho cac dong du lieu Tiendo cu (truoc khi co cot ID / truoc ban nay).
 * Sau khi chay xong, cac dong cu se sua/xoa duoc.
 */
function backfillProgressIds() {
  const sheet = getSheet(CONFIG.SHEET_PROGRESS);
  const values = sheet.getDataRange().getValues();
  const map = headerIndexMap(values[0]);




  if (!("ID" in map)) {
    throw new Error('Sheet Tiendo chưa có cột "ID". Hãy thêm cột ID (cột đầu tiên) trước.');
  }




  for (let i = 1; i < values.length; i++) {
    if (!values[i][map["ID"]]) {
      sheet.getRange(i + 1, map["ID"] + 1).setValue(Utilities.getUuid());
    }
  }




  invalidateSheetCache(CONFIG.SHEET_PROGRESS);
}
