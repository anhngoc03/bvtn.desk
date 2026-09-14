// ==========================================================
// GUI LAI SAU PHE DUYET (Sheet DS_noplan2)
// - TAT CA tai khoan (Admin/TVHĐ/User) duoc truy cap man hinh, nhung chi tai khoan thuoc dung
//   khoa/phong (hoac Admin) moi nop/sua duoc du lieu cua khoa/phong do.
// - Chi Admin duoc bat/tat "nhan phan hoi" (giong co che bat/tat cua man hinh Dang ky).
// - Moi (Khoaphong, Tendean) chi co 1 dong du lieu duy nhat trong DS_noplan2: lan nop dau tao moi,
//   cac lan sau ghi de (cap nhat) len chinh dong do.
// ==========================================================


const NOPLAN2_STATUS_PROP_KEY = "NOPLAN2_STATUS";


// Ai da dang nhap cung xem duoc trang thai bat/tat (mac dinh: dang mo)
function getNopLan2Status(token) {
 requireUser(token);
 const raw = PropertiesService.getScriptProperties().getProperty(NOPLAN2_STATUS_PROP_KEY);
 if (raw === null) return true;
 return raw === "true";
}


// Chi Admin duoc bat/tat
function setNopLan2Status(token, isOpen) {
 const user = requireUser(token);
 if (!isAdmin(user)) {
   return { success: false, message: "Chỉ Admin mới có quyền bật/tắt nhận phản hồi." };
 }
 PropertiesService.getScriptProperties().setProperty(NOPLAN2_STATUS_PROP_KEY, isOpen ? "true" : "false");
 return { success: true, message: "Đã cập nhật.", status: !!isOpen };
}


/**
* Lay du lieu da nop (neu co) cho 1 de an/sang kien cu the, dung de:
* - Kiem tra da tung nop chua (quyet dinh hien nut "Gửi" hay "Chỉnh sửa" ben client).
* - Dien san lai "Ten de an sau chinh sua" va hien link file da nop.
* Tra ve null neu chua tung nop.
*/
function getNopLan2Detail(token, khoaPhong, tenDeAn, maDeAn) {
 const user = requireUser(token);
 khoaPhong = String(khoaPhong || "").trim();
 tenDeAn = String(tenDeAn || "").trim();
 if (!khoaPhong || !tenDeAn) return null;


 if (!isAdmin(user) && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
   throw new Error("Bạn không có quyền xem thông tin khoa/phòng này.");
 }


 const data = getSheetData(CONFIG.SHEET_NOPLAN2);
 if (data.length < 2) return null;


 const map = headerIndexMap(data[0]);
 requireColumns(map, ["Madean", "Khoaphong", "Tendean"]);


 const row = data.slice(1).find(function (r) {
   return String(r[map["Khoaphong"]] || "").trim() === khoaPhong &&
          String(r[map["Tendean"]] || "").trim() === tenDeAn;
 });


 if (!row) return null;


 return {
   tendeanNeuSua: "Tendean_neusua" in map ? String(row[map["Tendean_neusua"]] || "").trim() : "",
   fileUrl: "File" in map ? String(row[map["File"]] || "").trim() : ""
 };
}


/**
* Nop moi hoac cap nhat 1 dong trong DS_noplan2.
* data = { maDeAn, khoaPhong, tenDeAn, tenDeAnNeuSua, file: {name, mimeType, data(base64)} | null }
* Neu chua tung nop cho (Khoaphong, Tendean) nay -> tao dong moi (bat buoc phai co file).
* Neu da tung nop -> cap nhat dong cu (file la tuy chon - khong chon file moi thi giu nguyen file cu).
*/
function submitNopLan2(token, data) {
 const user = requireUser(token);
 if (!data) return { success: false, message: "Không nhận được dữ liệu." };


 const maDeAn = String(data.maDeAn || "").trim();
 const khoaPhong = String(data.khoaPhong || "").trim();
 const tenDeAn = String(data.tenDeAn || "").trim();
 const tenDeAnNeuSua = String(data.tenDeAnNeuSua || "").trim();
 let dangkyId = String(data.dangkyId || "").trim();


 if (!maDeAn) return { success: false, message: "Chưa chọn mã đề án/sáng kiến." };
 if (!khoaPhong) return { success: false, message: "Chưa chọn khoa/phòng." };
 if (!tenDeAn) return { success: false, message: "Chưa chọn tên đề án/sáng kiến." };


 // De an/sang kien da bi "Đã loại" thi khong nhan gui lai sau phe duyet nua
 if (dangkyId && isDeAnDaLoai_(dangkyId)) {
   return { success: false, message: "Đề án/Sáng kiến đã bị loại." };
 }
 const deanRowCheck = getSheetData(CONFIG.SHEET_DEAN);
 if (!dangkyId && deanRowCheck.length >= 2) {
   const deanMapCheck = headerIndexMap(deanRowCheck[0]);
   const foundRow = deanRowCheck.slice(1).find(function (r) {
     return "Tendean" in deanMapCheck && String(r[deanMapCheck["Tendean"]] || "").trim() === tenDeAn &&
            "Khoaphong" in deanMapCheck && splitKhoaPhongValues_(r[deanMapCheck["Khoaphong"]]).indexOf(khoaPhong) !== -1;
   });
   if (foundRow && "Trang_thai" in deanMapCheck && String(foundRow[deanMapCheck["Trang_thai"]] || "").trim() === "Đã loại") {
     return { success: false, message: "Đề án/Sáng kiến đã bị loại." };
   }
 }


 if (!isAdmin(user) && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
   return { success: false, message: "Bạn không có quyền nộp cho khoa/phòng này." };
 }


 if (!isAdmin(user) && !getNopLan2Status(token)) {
   return { success: false, message: "Chức năng hiện đang tạm ngừng nhận phản hồi. Vui lòng liên hệ Admin." };
 }


 const sheet = getSheet(CONFIG.SHEET_NOPLAN2);
 const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 const map = headerIndexMap(headers);
 requireColumns(map, ["Madean", "Khoaphong", "Tendean"]);


 // Neu client CHUA gui san DangkyID (vd du lieu cu, hoac man hinh cu chua cap nhat), fallback ve
 // do qua DS_Phancong khop theo Madean nhu truoc day.
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
   if (matchByDangkyId || matchByKhoaTen) {
     rowIndex = i;
     break;
   }
 }


 // Lan dau nop (chua co dong nao) -> bat buoc phai co file dinh kem
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
     const folder = DriveApp.getFolderById(CONFIG.NOPLAN2_DRIVE_FOLDER_ID);
     const bytes = Utilities.base64Decode(f.data);
     const blob = Utilities.newBlob(bytes, "application/pdf", f.name || "Dinh_kem.pdf");
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
   if ("Tendean_neusua" in map) newRow[map["Tendean_neusua"]] = tenDeAnNeuSua;
   if ("File" in map) newRow[map["File"]] = fileUrl;
   sheet.appendRow(newRow);
 } else {
   const rowNumber = rowIndex + 1;
   if ("Tendean_neusua" in map) sheet.getRange(rowNumber, map["Tendean_neusua"] + 1).setValue(tenDeAnNeuSua);
   if (fileUrl && "File" in map) sheet.getRange(rowNumber, map["File"] + 1).setValue(fileUrl);
 }


 invalidateSheetCache(CONFIG.SHEET_NOPLAN2);


 if (dangkyId) {
   try { syncEngineRebuildAndPropagate_(dangkyId); } catch (e) { /* khong lam gian doan viec gui phieu chinh */ }
 }


 return { success: true, message: "Đã gửi thành công." };
}
