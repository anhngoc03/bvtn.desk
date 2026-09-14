// ==========================================================
// PHAN CONG PHE DUYET (Sheet DS_Phancong) - chi Admin duoc truy cap
// - Cot Madean, Khoaphong, Tendean: TU DONG dong bo tu Sheet Dangky (dong nao da duoc Admin
//   dien Ma de an o Sheet Dangky se duoc tao 1 dong tuong ung trong DS_Phancong, neu chua co).
// - Cot Nguoicham1 / Nguoicham2: dropdown, lay tu Hoten cac tai khoan vai tro TVHĐ (Sheet DS_Nguoidung).
// - Cot Trangthai: dropdown 3 gia tri co dinh (PHANCONG_TRANGTHAI_OPTIONS trong Config.gs).
// - Du lieu doc/ghi TRUC TIEP tu Sheet (qua getSheetData/cache nhu cac man hinh khac) nen
//   sua tren Sheet <-> sua tren Web luon dong bo (cache se tu invalidate qua onEdit trong Utils.gs).
// ==========================================================


/**
* Quet toan bo Sheet Dangky, voi moi dong DA duoc dien "Madean" (Admin da tu dien tay de phan loai)
* ma CHUA co dong tuong ung trong DS_Phancong -> tao moi 1 dong trong DS_Phancong voi
* Madean/Khoaphong/Tendean dien san, Nguoicham1/Nguoicham2/Trangthai de trong cho Admin phan cong sau.
* KHONG ghi de len cac dong da co san trong DS_Phancong (tranh mat du lieu phan cong da nhap).
*
* Kiem tra "da co hay chua" UU TIEN theo cap Khoaphong+Tendean TRUOC (day la khoa DAY DU VA
* DUY NHAT cho tung de an thuc te, khong bao gio trung giua 2 de an khac nhau). CHI fallback ve
* so sanh theo Madean khi 1 trong 2 cot Khoaphong/Tendean bi rong.
* (Truoc day uu tien Madean truoc, nhung Madean co the dang duoc dat TAM/CHUA CHOT so cuoi cung
* nen 2 de an KHAC NHAU van co the trung Madean voi nhau - lam 1 trong 2 de an bi bo sot khoi
* Phan cong. Doi uu tien nhu hien tai de tranh dung phai truong hop nay.)
*/
function syncPhanCongFromDangKy_() {
 const dangkyData = getSheetData(CONFIG.SHEET_DANGKY);
 if (dangkyData.length < 2) return;


 const dkMap = headerIndexMap(dangkyData[0]);
 if (!("Madean" in dkMap) || !("LoaiDangKy" in dkMap) || !("ID" in dkMap)) return;


 const sheet = getSheet(CONFIG.SHEET_PHANCONG);
 const values = sheet.getDataRange().getValues();
 const headers = values[0] || [];
 const map = headerIndexMap(headers);
 if (!("Madean" in map)) return;


 // 3 tap "da co" - theo DangkyID (khoa ON DINH NHAT, luon uu tien tren het vi khong doi ke ca
 // khi Tendean sau nay bi doi qua bo may dong bo), roi moi den Khoaphong+Tendean, cuoi cung
 // moi fallback ve Madean (chi dung khi Khoaphong hoac Tendean bi rong)
 const existingDangkyId = {};
 const existingKhoaTen = {};
 const existingMadean = {};
 values.slice(1).forEach(function (r) {
   const rowDangkyId = "DangkyID" in map ? String(r[map["DangkyID"]] || "").trim() : "";
   if (rowDangkyId) existingDangkyId[rowDangkyId] = true;
   const khoa = "Khoaphong" in map ? String(r[map["Khoaphong"]] || "").trim() : "";
   const ten = "Tendean" in map ? String(r[map["Tendean"]] || "").trim() : "";
   if (khoa && ten) existingKhoaTen[khoa + "\u0001" + ten] = true;
   const ma = String(r[map["Madean"]] || "").trim();
   if (ma) existingMadean[ma] = true;
 });


 const rowsToAdd = [];


 dangkyData.slice(1).forEach(function (row) {
   const maDeAn = String(row[dkMap["Madean"]] || "").trim();
   if (!maDeAn) return; // van bat buoc phai co Ma de an - chua co ma thi chua the phan cong


   const loai = String(row[dkMap["LoaiDangKy"]] || "").trim();
   const khoaKey = dangKyKhoaPhongFieldKey_(loai);
   const tenKey = dangKyTenDeAnFieldKey_(loai);
   if (!khoaKey || !tenKey || !(khoaKey in dkMap) || !(tenKey in dkMap)) return;


   const khoaRaw = String(row[dkMap[khoaKey]] || "").trim();
   const tenRaw = String(row[dkMap[tenKey]] || "").trim();
   const dangkyId = String(row[dkMap["ID"]] || "").trim();


   // De an/sang kien da bi "Đã loại" (DS_Deansangkien.Trang_thai) thi KHONG duoc tao lai
   // trong DS_Phancong nua - dung ngung nhan thong tin cho toi khi Trang_thai duoc doi khac.
   if (dangkyId && isDeAnDaLoai_(dangkyId)) return;


   // Uu tien SO 1: neu DangkyID nay da ton tai trong DS_Phancong roi -> chac chan DA CO,
   // khong can kiem tra gi them (tranh tao trung khi Tendean da bi doi ten sau nay).
   if (dangkyId && existingDangkyId[dangkyId]) return;


   // Uu tien SO 2: Khoaphong+Tendean (chinh xac, khong lo trung Madean giua 2 de an khac nhau).
   // Chi khi 1 trong 2 cot nay rong moi fallback ve kiem tra theo Madean.
   if (khoaRaw && tenRaw) {
     if (existingKhoaTen[khoaRaw + "\u0001" + tenRaw]) return;
   } else if (existingMadean[maDeAn]) {
     return;
   }


   const newRow = new Array(headers.length).fill("");
   if ("ID" in map) newRow[map["ID"]] = Utilities.getUuid();
   if ("DangkyID" in map) newRow[map["DangkyID"]] = dangkyId;
   newRow[map["Madean"]] = maDeAn;
   if ("Khoaphong" in map) newRow[map["Khoaphong"]] = khoaRaw;
   if ("Tendean" in map) newRow[map["Tendean"]] = tenRaw;


   rowsToAdd.push(newRow);
   if (dangkyId) existingDangkyId[dangkyId] = true;
   if (khoaRaw && tenRaw) existingKhoaTen[khoaRaw + "\u0001" + tenRaw] = true;
   else existingMadean[maDeAn] = true;
 });


 if (rowsToAdd.length > 0) {
   sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, headers.length).setValues(rowsToAdd);
   invalidateSheetCache(CONFIG.SHEET_PHANCONG);
   // LUU Y: KHONG tu dong goi syncEngineRebuildAndPropagate_ o day nua (tung lam nhu vay nhung
   // gay CHAM khi co nhieu dong moi duoc them cung luc, vd luc dang dien hang loat Ma de an).
   // Cac de an nop MOI qua web da tu dong duoc dong bo ngay luc nop (xem submitDangKy trong
   // Dangky.gs); du lieu CU duoc dien Ma de an hang loat thi dung nut "Dong bo du lieu" tren man
   // hinh nay, hoac chay ham syncAllDeansangkienFromDangky() trong IdBackfill.gs.
 }
}


// Danh sach ten (Hoten) cac tai khoan vai tro TVHĐ, dung cho dropdown Nguoi cham 1 / Nguoi cham 2
function getTVHDNames_() {
 const data = getSheetData(CONFIG.SHEET_USER);
 if (data.length < 2) return [];


 const map = headerIndexMap(data[0]);
 requireColumns(map, ["Hoten", "Vaitro"]);


 const set = {};
 data.slice(1).forEach(function (row) {
   const vaitro = String(row[map["Vaitro"]] || "").trim();
   if (vaitro === CONFIG.ROLES.TVHD) {
     const ten = String(row[map["Hoten"]] || "").trim();
     if (ten) set[ten] = true;
   }
 });


 return Object.keys(set).sort(function (a, b) {
   return a.localeCompare(b, "vi", { sensitivity: "base" });
 });
}


// ADMIN: lay toan bo danh sach phan cong (da dong bo voi Sheet Dangky truoc khi tra ve)
function getPhanCongList(token) {
 const user = requireUser(token);
 if (!isAdmin(user)) throw new Error("Bạn không có quyền truy cập.");


 syncPhanCongFromDangKy_();


 const data = getSheetData(CONFIG.SHEET_PHANCONG);
 if (data.length < 2) {
   return { rows: [], tvhdList: getTVHDNames_(), trangthaiOptions: PHANCONG_TRANGTHAI_OPTIONS };
 }


 const map = headerIndexMap(data[0]);
 requireColumns(map, ["Madean", "Khoaphong", "Tendean"]);


 const rows = data.slice(1)
   .map(function (row, i) {
     return {
       rowNumber: i + 2, // +2 vi data[0] la header ~ Sheet hang 1
       madean: String(row[map["Madean"]] || "").trim(),
       khoaphong: String(row[map["Khoaphong"]] || "").trim(),
       tendean: String(row[map["Tendean"]] || "").trim(),
       nguoicham1: "Nguoicham1" in map ? String(row[map["Nguoicham1"]] || "").trim() : "",
       nguoicham2: "Nguoicham2" in map ? String(row[map["Nguoicham2"]] || "").trim() : "",
       trangthai: "Trangthai" in map ? String(row[map["Trangthai"]] || "").trim() : ""
     };
   })
   .filter(function (r) { return r.madean; });


 rows.sort(function (a, b) {
   const khoaCompare = a.khoaphong.localeCompare(b.khoaphong, "vi", { sensitivity: "base" });
   if (khoaCompare !== 0) return khoaCompare;
   return a.tendean.localeCompare(b.tendean, "vi", { sensitivity: "base" });
 });


 return { rows: rows, tvhdList: getTVHDNames_(), trangthaiOptions: PHANCONG_TRANGTHAI_OPTIONS };
}


// ADMIN: luu hang loat (Nguoi cham 1 / Nguoi cham 2 / Trang thai) cho cac dong da chinh sua
// updates = [ { rowNumber, nguoicham1, nguoicham2, trangthai }, ... ]  (rowNumber lay tu getPhanCongList)
function savePhanCongRows(token, updates) {
 const user = requireUser(token);
 if (!isAdmin(user)) {
   return { success: false, message: "Chỉ Admin mới có quyền chỉnh sửa phân công." };
 }
 if (!Array.isArray(updates) || updates.length === 0) {
   return { success: false, message: "Không có dữ liệu." };
 }


 const sheet = getSheet(CONFIG.SHEET_PHANCONG);
 const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 const map = headerIndexMap(headers);
 requireColumns(map, ["Madean"]);


 const lastRow = sheet.getLastRow();
 const dangkyIdsToSync = [];


 updates.forEach(function (u) {
   const rowNumber = parseInt(u && u.rowNumber, 10);
   if (!rowNumber || rowNumber < 2 || rowNumber > lastRow) return;


   if ("Nguoicham1" in map) sheet.getRange(rowNumber, map["Nguoicham1"] + 1).setValue(String((u && u.nguoicham1) || "").trim());
   if ("Nguoicham2" in map) sheet.getRange(rowNumber, map["Nguoicham2"] + 1).setValue(String((u && u.nguoicham2) || "").trim());
   if ("Trangthai" in map) sheet.getRange(rowNumber, map["Trangthai"] + 1).setValue(String((u && u.trangthai) || "").trim());


   if ("DangkyID" in map) {
     const dangkyId = String(sheet.getRange(rowNumber, map["DangkyID"] + 1).getValue() || "").trim();
     if (dangkyId) dangkyIdsToSync.push(dangkyId);
   }
 });


 invalidateSheetCache(CONFIG.SHEET_PHANCONG);


 // Dong bo lai DS_Deansangkien (Nguoi cham 1/2 vua doi) cho tung de an vua duoc sua
 dangkyIdsToSync.forEach(function (id) {
   try { syncEngineRebuildAndPropagate_(id); } catch (e) { /* bo qua loi tung dong */ }
 });


 return { success: true, message: "Đã lưu phân công." };
}
