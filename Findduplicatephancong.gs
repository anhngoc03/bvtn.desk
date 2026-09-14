// ==========================================================
// TIEN ICH: DO CAC DONG DANG BI TRUNG trong DS_Phancong (cung 1 de an nhung nam o 2+ dong khac
// nhau - thuong do Ma de an bi trung truoc day, hoac do chua chay backfill ID day du).
//
// CHI BAO CAO, KHONG TU DONG XOA GI CA - vi moi dong trung co the da duoc gan Nguoi cham 1/2/
// Trang thai KHAC NHAU, xoa nham se mat du lieu phan cong that su. Admin can TU KIEM TRA va
// tu tay giu lai 1 dong dung, xoa dong con lai (nho chuyen Nguoi cham/Trang thai dung sang
// dong duoc giu lai truoc khi xoa, neu co).
//
// CACH DO: nhom cac dong theo DangkyID (neu co) - 2+ dong CUNG 1 DangkyID chac chan la trung
// nhau. Voi dong nao chua co DangkyID, nhom du phong theo Khoaphong (giong nhau) + Ma de an
// (giong nhau) - de bat duoc truong hop trung do chua backfill.
//
// CACH DUNG: chay ham "timDongTrungODSPhancong", xem log de biet cac dong (so thu tu tren
// Sheet) dang trung nhau. Sau khi don xong, xoa file nay di.
// ==========================================================
function timDongTrungODSPhancong() {
  const sheet = getSheet(CONFIG.SHEET_PHANCONG);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) { Logger.log("DS_Phancong đang trống."); return; }

  const map = headerIndexMap(values[0]);

  const groupsByDangkyId = {};
  const groupsByKhoaMadean = {};

  for (let i = 1; i < values.length; i++) {
    const rowNumber = i + 1;
    const dangkyId = "DangkyID" in map ? String(values[i][map["DangkyID"]] || "").trim() : "";
    const madean = "Madean" in map ? String(values[i][map["Madean"]] || "").trim() : "";
    const khoa = "Khoaphong" in map ? String(values[i][map["Khoaphong"]] || "").trim() : "";
    const ten = "Tendean" in map ? String(values[i][map["Tendean"]] || "").trim() : "";
    if (!madean) continue; // dong rong -> bo qua

    if (dangkyId) {
      if (!groupsByDangkyId[dangkyId]) groupsByDangkyId[dangkyId] = [];
      groupsByDangkyId[dangkyId].push({ rowNumber: rowNumber, tendean: ten, madean: madean, khoa: khoa });
    } else {
      // Chua co DangkyID -> nhom du phong theo Khoaphong + Ma de an
      const key = khoa + "\u0001" + madean;
      if (!groupsByKhoaMadean[key]) groupsByKhoaMadean[key] = [];
      groupsByKhoaMadean[key].push({ rowNumber: rowNumber, tendean: ten, madean: madean, khoa: khoa });
    }
  }

  let foundAny = false;

  Logger.log("=== Nhom trung theo DangkyID ===");
  Object.keys(groupsByDangkyId).forEach(function (id) {
    const group = groupsByDangkyId[id];
    if (group.length > 1) {
      foundAny = true;
      Logger.log("DangkyID=" + id + " -> TRÙNG ở " + group.length + " dòng:");
      group.forEach(function (g) {
        Logger.log("  - Dòng " + g.rowNumber + ": Khoa/phòng=\"" + g.khoa + "\", Mã đề án=\"" + g.madean + "\", Tên đề án=\"" + g.tendean + "\"");
      });
    }
  });

  Logger.log("=== Nhom trung theo Khoaphong+Madean (rieng cac dong CHUA co DangkyID) ===");
  Object.keys(groupsByKhoaMadean).forEach(function (key) {
    const group = groupsByKhoaMadean[key];
    if (group.length > 1) {
      foundAny = true;
      Logger.log("Khoa/phòng+Mã đề án=\"" + key.replace("\u0001", " | ") + "\" -> TRÙNG ở " + group.length + " dòng:");
      group.forEach(function (g) {
        Logger.log("  - Dòng " + g.rowNumber + ": Tên đề án=\"" + g.tendean + "\"");
      });
    }
  });

  if (!foundAny) {
    Logger.log("Không phát hiện dòng nào bị trùng.");
  } else {
    Logger.log("=== Đã liệt kê xong. Vào đúng các dòng trên trong DS_Phancong để tự kiểm tra Người chấm 1/2/Trạng thái, giữ lại 1 dòng đúng và xóa dòng còn lại. ===");
  }
}
