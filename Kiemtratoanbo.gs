// ==========================================================
// KIEM TRA TOAN BO DU LIEU - CHAY 1 LENH DUY NHAT DE KIEM TRA HET
// (gop lai tu cac cong cu rieng le da co + them phan kiem tra Ma de an bi trung MOI)
//
// Bao gom 4 phan:
// 1. Ma de an bi trung giua CAC DE AN KHAC NHAU (khac Khoa/phong hoac Ten de an) - quet TREN
//    TAT CA cac Sheet (DS_Deansangkien, DS_Phancong, Phe_duyet_lan1/2, DS_noplan2, Tiendo).
//    Day la nguyen nhan goc re cua rat nhieu loi da gap (lay nham dong, gop nham nhom...).
// 2. Cac dong con thieu ID/DangkyID (goi lai chanDoanBackfillId trong IdBackfill.gs).
// 3. Cac dong bi trung trong DS_Phancong (goi lai timDongTrungODSPhancong trong
//    FindDuplicatePhanCong.gs).
// 4. Dong bo Nguoi cham giua DS_Phancong <-> DS_Deansangkien <-> phieu da nop thuc te (goi lai
//    kiemTraDongBoNguoiCham trong CheckNguoiChamSync.gs).
//
// CHI BAO CAO, KHONG TU SUA GI CA.
// YEU CAU: can co san ca 3 file IdBackfill.gs, FindDuplicatePhanCong.gs, CheckNguoiChamSync.gs
// trong cung du an Apps Script (neu thieu file nao, phan tuong ung se bao loi - bo qua phan do).
//
// CACH DUNG: chay ham "kiemTraToanBoDuLieu", xem het log tu tren xuong duoi.
// ==========================================================

function kiemTraTrungMaDeAnToanHeThong_() {
  const sheets = [
    { name: CONFIG.SHEET_DEAN, label: "DS_Deansangkien", madeanCol: "Madean_sangkien" },
    { name: CONFIG.SHEET_PHANCONG, label: "DS_Phancong", madeanCol: "Madean" },
    { name: CONFIG.SHEET_PHEDUYET_LAN1, label: "Phe_duyet_lan1", madeanCol: "Madean" },
    { name: CONFIG.SHEET_PHEDUYET_LAN2, label: "Phe_duyet_lan2", madeanCol: "Madean" },
    { name: CONFIG.SHEET_NOPLAN2, label: "DS_noplan2", madeanCol: "Madean" },
    { name: CONFIG.SHEET_PROGRESS, label: "Tiendo", madeanCol: "Madean_sangkien" }
  ];

  let foundAny = false;

  sheets.forEach(function (s) {
    let data;
    try {
      data = getSheetData(s.name);
    } catch (e) {
      Logger.log(s.label + ": không đọc được Sheet này.");
      return;
    }
    if (data.length < 2) return;

    const map = headerIndexMap(data[0]);
    if (!(s.madeanCol in map) || !("Khoaphong" in map) || !("Tendean" in map)) {
      Logger.log(s.label + ": thiếu cột cần thiết (" + s.madeanCol + "/Khoaphong/Tendean), bỏ qua.");
      return;
    }

    const byMadean = {};
    data.slice(1).forEach(function (row, i) {
      const madean = String(row[map[s.madeanCol]] || "").trim();
      if (!madean) return;
      const khoa = String(row[map["Khoaphong"]] || "").trim();
      const ten = String(row[map["Tendean"]] || "").trim();
      if (!byMadean[madean]) byMadean[madean] = [];
      byMadean[madean].push({ rowNumber: i + 2, khoa: khoa, ten: ten });
    });

    Object.keys(byMadean).forEach(function (madean) {
      const rows = byMadean[madean];
      const distinctCombos = {};
      rows.forEach(function (r) { distinctCombos[r.khoa + "\u0001" + r.ten] = true; });
      if (Object.keys(distinctCombos).length > 1) {
        foundAny = true;
        Logger.log(s.label + ": Mã đề án \"" + madean + "\" đang ứng với NHIỀU đề án KHÁC NHAU:");
        rows.forEach(function (r) {
          Logger.log("  - Dòng " + r.rowNumber + ": Khoa/phòng=\"" + r.khoa + "\", Tên đề án=\"" + r.ten + "\"");
        });
      }
    });
  });

  if (!foundAny) {
    Logger.log("Không phát hiện Mã đề án nào bị trùng giữa các đề án khác nhau.");
  } else {
    Logger.log("=> Gợi ý: Admin cần sửa lại Mã đề án cho các dòng trên trong Sheet Dangky để mỗi đề án có 1 mã DUY NHẤT, sau đó chạy syncAllDeansangkienFromDangky() để cập nhật lại.");
  }
}

function kiemTraToanBoDuLieu() {
  Logger.log("========== 1. KIỂM TRA MÃ ĐỀ ÁN BỊ TRÙNG GIỮA CÁC ĐỀ ÁN KHÁC NHAU ==========");
  try { kiemTraTrungMaDeAnToanHeThong_(); } catch (e) { Logger.log("Lỗi: " + e.message); }

  Logger.log("");
  Logger.log("========== 2. KIỂM TRA THIẾU ID/DangkyID Ở CÁC SHEET ==========");
  try { chanDoanBackfillId(); } catch (e) { Logger.log("Không chạy được (thiếu file IdBackfill.gs?): " + e.message); }

  Logger.log("");
  Logger.log("========== 3. KIỂM TRA DÒNG BỊ TRÙNG TRONG DS_Phancong ==========");
  try { timDongTrungODSPhancong(); } catch (e) { Logger.log("Không chạy được (thiếu file FindDuplicatePhanCong.gs?): " + e.message); }

  Logger.log("");
  Logger.log("========== 4. KIỂM TRA ĐỒNG BỘ NGƯỜI CHẤM ==========");
  try { kiemTraDongBoNguoiCham(); } catch (e) { Logger.log("Không chạy được (thiếu file CheckNguoiChamSync.gs?): " + e.message); }

  Logger.log("");
  Logger.log("========== HOÀN TẤT KIỂM TRA TOÀN BỘ DỮ LIỆU ==========");
}
