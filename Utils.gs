function getSheet(sheetName) {
 const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
 const sheet = ss.getSheetByName(sheetName);
 if (!sheet) throw new Error("Không tìm thấy Sheet: " + sheetName);
 return sheet;
}




/**
* Doc toan bo du lieu 1 sheet, co cache (CacheService) de giam do tre.
* Neu ban them cot moi trong Sheet, ham nay se tu dong doc them
* (vi lay theo getDataRange(), khong gioi han so cot).
*/
function getSheetData(sheetName) {
 const cache = CacheService.getScriptCache();
 const cacheKey = "SHEETDATA_" + sheetName;
 const cached = cache.get(cacheKey);




 if (cached) {
   try {
     return JSON.parse(cached);
   } catch (e) {
     // cache hong, doc lai tu Sheet
   }
 }




 const sheet = getSheet(sheetName);
 const data = sheet.getDataRange().getValues();




 // Chuyen Date thanh chuoi ISO de luu duoc vao cache (JSON)
 const serializable = data.map(function (row) {
   return row.map(function (cell) {
     return cell instanceof Date ? cell.toISOString() : cell;
   });
 });




 try {
   cache.put(cacheKey, JSON.stringify(serializable), CONFIG.CACHE_SECONDS);
 } catch (e) {
   // Du lieu qua lon de cache (>100KB) - bo qua, van tra ve du lieu binh thuong
 }




 return serializable;
}




// Goi ham nay sau khi GHI du lieu vao sheet, de lan doc tiep theo lay du lieu moi nhat
function invalidateSheetCache(sheetName) {
 CacheService.getScriptCache().remove("SHEETDATA_" + sheetName);
}




// Tra ve { "TenCot": viTriCot(0-based) }
function headerIndexMap(headers) {
 const map = {};
 headers.forEach(function (h, i) {
   map[String(h).trim()] = i;
 });
 return map;
}




function requireColumns(map, names) {
 const missing = names.filter(function (n) {
   return !(n in map);
 });
 if (missing.length > 0) {
   throw new Error("Sheet đang thiếu (các) cột: " + missing.join(", "));
 }
}




// Chuan hoa 1 gia tri o de hien thi (Date -> chuoi dd/MM/yyyy HH:mm:ss)
function formatCellValue(value) {
 if (value === null || value === undefined || value === "") return "";
 if (value instanceof Date) {
   return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
 }
 if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
   return Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
 }
 return String(value);
}




// Giong formatCellValue nhung CHI hien ngay, khong kem gio:phut:giay (dd/MM/yyyy)
// Dung cho Thoigian_batdau / Thoigian_ketthuc trong Sheet DS_Deansangkien
function formatCellValueDateOnly(value) {
 if (value === null || value === undefined || value === "") return "";
 if (value instanceof Date) {
   return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy");
 }
 if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
   return Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), "dd/MM/yyyy");
 }
 return String(value);
}




// Chuyen so cot (1-based) thanh chu cai cot kieu Sheet (1 -> A, 27 -> AA...)
// Dung de dung cong thuc SUM tu dong trong PheDuyet.gs (cot Tong diem)
function columnToLetter_(column) {
 let letter = "";
 let temp = column;
 while (temp > 0) {
   const rem = (temp - 1) % 26;
   letter = String.fromCharCode(65 + rem) + letter;
   temp = Math.floor((temp - 1) / 26);
 }
 return letter;
}




// Tach 1 gia tri o "Khoa/phong" (co the chua NHIEU khoa/phong cach nhau boi dau phay, vi du
// "Khoa A, Khoa B, Khoa C" - vi 1 de an/sang kien co the do nhieu khoa/phong cung thuc hien)
// thanh mang cac khoa/phong rieng le, da trim khoang trang, bo cac phan tu rong.
// QUY UOC: moi noi can tra cuu/loc/kiem tra quyen theo Khoa/phong PHAI dung ham nay + .indexOf()
// hoac .some(), TUYET DOI KHONG so sanh === truc tiep voi ca chuoi trong o nua.
function splitKhoaPhongValues_(raw) {
 return String(raw || "")
   .split(",")
   .map(function (s) { return s.trim(); })
   .filter(function (s) { return s !== ""; });
}




// Trigger don gian: tu dong chay khi co nguoi sua truc tiep tren Google Sheet
function onEdit(e) {
 try {
   const sheet = e.range.getSheet();
   const sheetName = sheet.getName();
   if (sheetName === CONFIG.SHEET_DEAN ||
       sheetName === CONFIG.SHEET_USER ||
       sheetName === CONFIG.SHEET_PROGRESS ||
       sheetName === CONFIG.SHEET_CHISO ||
       sheetName === CONFIG.SHEET_DANGKY ||
       sheetName === CONFIG.SHEET_PHANCONG ||
       sheetName === CONFIG.SHEET_NOPLAN2 ||
       sheetName === CONFIG.SHEET_PHEDUYET_LAN1 ||
       sheetName === CONFIG.SHEET_PHEDUYET_LAN2 ||
       sheetName === CONFIG.SHEET_FILECHOT ||
       sheetName === CONFIG.SHEET_BCNGHIEMTHU ||
       sheetName === CONFIG.SHEET_NGHIEMTHU ||
       sheetName === CONFIG.SHEET_YEUCAUSUA) {
     invalidateSheetCache(sheetName);
   }


   // DS_Deansangkien: cot Nguoi_cham_1/Nguoi_cham_2 la du lieu CHI DOC (luon lay theo DS_Phancong,
   // KHONG cho sua tay truc tiep tai day) - neu ai lo sua, tu dong khoi phuc lai dung gia tri.
   if (sheetName === CONFIG.SHEET_DEAN) {
     revertLockedNguoiChamEdit_(sheet, e.range);
   }


   // DS_Deansangkien: cot Nguoi_cham_1/Nguoi_cham_2 la du lieu CHI DOC (luon lay theo DS_Phancong,
   // KHONG cho sua tay truc tiep tai day) - neu ai lo sua, tu dong khoi phuc lai dung gia tri.
   if (sheetName === CONFIG.SHEET_DEAN) {
     revertLockedNguoiChamEdit_(sheet, e.range);
     xuLyDoiTrangThaiDaLoaiTrucTiepTrenSheet_(sheet, e.range);
   }


   // Sua TRUC TIEP tren Dangky/DS_Phancong/DS_noplan2/Phe_duyet_lan1/lan2 (khong qua web) cung
   // tu dong dong bo lai DS_Deansangkien + lan truyen xuong cac Sheet khac, giong het khi thao
   // tac qua web - tranh tinh trang "sua tren Sheet thi khong dong bo, sua qua web moi dong bo"
   // ma truoc day hay gap.
   const dangkyId = resolveDangkyIdFromEditedRow_(sheet, sheetName, e.range.getRow());
   if (dangkyId) {
     syncEngineRebuildAndPropagate_(dangkyId);
   }
 } catch (err) {
   // bo qua loi de khong lam gian doan viec sua sheet
 }
}


// Neu vung vua sua trong DS_Deansangkien co dung cot "Trang_thai" VA gia tri MOI la "Đã loại",
// xoa han du lieu lien quan o cac Sheet phu (xem xoaDeAnDaLoaiKhoiCacSheetPhu_ trong SyncEngine.gs).
// Ho tro ca truong hop sua/dan nhieu o cung luc.
function xuLyDoiTrangThaiDaLoaiTrucTiepTrenSheet_(sheet, range) {
 const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 const map = headerIndexMap(headers);
 if (!("Trang_thai" in map) || !("DangkyID" in map)) return;


 const startRow = range.getRow();
 if (startRow < 2) return;
 const numRows = range.getNumRows();
 const startCol = range.getColumn();
 const numCols = range.getNumColumns();


 const trangThaiCol = map["Trang_thai"] + 1;
 if (trangThaiCol < startCol || trangThaiCol > startCol + numCols - 1) return; // vung sua khong dung cot Trang_thai


 for (let r = 0; r < numRows; r++) {
   const rowNumber = startRow + r;
   const trangThai = String(sheet.getRange(rowNumber, trangThaiCol).getValue() || "").trim();
   if (trangThai !== "Đã loại") continue;


   const dangkyId = String(sheet.getRange(rowNumber, map["DangkyID"] + 1).getValue() || "").trim();
   const deansangkienId = ("ID" in map) ? String(sheet.getRange(rowNumber, map["ID"] + 1).getValue() || "").trim() : "";
   if (dangkyId) xoaDeAnDaLoaiKhoiCacSheetPhu_(dangkyId, deansangkienId);
 }
}


// Neu vung vua sua trong DS_Deansangkien co dung cot "Nguoi_cham_1"/"Nguoi_cham_2", ghi de lai
// NGAY LAP TUC bang gia tri DUNG lay tu DS_Phancong (khop theo DangkyID cua dong do) - lam cho
// 2 cot nay tro thanh "chi doc" tren thuc te, du Sheet khong co co che khoa o that su.
// Ho tro ca truong hop sua/dan NHIEU o cung luc (vd bôi den paste 1 vung).
function revertLockedNguoiChamEdit_(sheet, range) {
 const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 const map = headerIndexMap(headers);
 if (!("DangkyID" in map)) return;


 const lockedCols = ["Nguoi_cham_1", "Nguoi_cham_2"].filter(function (c) { return c in map; });
 if (lockedCols.length === 0) return;


 const startRow = range.getRow();
 if (startRow < 2) return; // dong header -> bo qua
 const numRows = range.getNumRows();
 const startCol = range.getColumn();
 const numCols = range.getNumColumns();


 for (let r = 0; r < numRows; r++) {
   const rowNumber = startRow + r;
   const dangkyId = String(sheet.getRange(rowNumber, map["DangkyID"] + 1).getValue() || "").trim();
   if (!dangkyId) continue;


   const phancongRow = findRowByColumnValue_(CONFIG.SHEET_PHANCONG, "DangkyID", dangkyId);
   const correctNc1 = phancongRow && ("Nguoicham1" in phancongRow.map) ? String(phancongRow.row[phancongRow.map["Nguoicham1"]] || "").trim() : "";
   const correctNc2 = phancongRow && ("Nguoicham2" in phancongRow.map) ? String(phancongRow.row[phancongRow.map["Nguoicham2"]] || "").trim() : "";


   for (let c = 0; c < numCols; c++) {
     const colNumber = startCol + c;
     lockedCols.forEach(function (colName) {
       if (map[colName] + 1 !== colNumber) return;
       const correctValue = colName === "Nguoi_cham_1" ? correctNc1 : correctNc2;
       sheet.getRange(rowNumber, colNumber).setValue(correctValue);
     });
   }
 }
}


// Xac dinh DangkyID cua dong VUA duoc sua truc tiep tren Sheet (dung cho onEdit o tren).
// Voi Sheet Dangky: chinh cot "ID" cua dong do LA dangkyId. Voi cac Sheet phu con lai
// (DS_Phancong, DS_noplan2, Phe_duyet_lan1/lan2): doc cot "DangkyID" cua dong do.
function resolveDangkyIdFromEditedRow_(sheet, sheetName, rowNumber) {
 if (rowNumber < 2) return null; // dong header hoac khong hop le -> bo qua


 const relevantSheets = [
   CONFIG.SHEET_DANGKY, CONFIG.SHEET_PHANCONG,
   CONFIG.SHEET_PHEDUYET_LAN1, CONFIG.SHEET_PHEDUYET_LAN2, CONFIG.SHEET_NOPLAN2,
   CONFIG.SHEET_FILECHOT, CONFIG.SHEET_BCNGHIEMTHU, CONFIG.SHEET_NGHIEMTHU
 ];
 if (relevantSheets.indexOf(sheetName) === -1) return null;


 const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 const map = headerIndexMap(headers);
 const idCol = sheetName === CONFIG.SHEET_DANGKY ? "ID" : "DangkyID";
 if (!(idCol in map)) return null;


 const value = sheet.getRange(rowNumber, map[idCol] + 1).getValue();
 const id = String(value || "").trim();
 return id || null;
}
