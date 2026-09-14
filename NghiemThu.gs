// ==========================================================
// NGHIEM THU (Sheet Nghiem_thu)
// - Dung CHUNG Nguoicham1/Nguoicham2 o DS_Phancong - KHONG phan cong rieng.
// - CHI 1 LAN duy nhat (khac Phe duyet co lan 1/lan 2).
// - Mo/dong theo dung Trang thai "Nghiệm thu" / "Đóng nghiệm thu" o TUNG DONG DS_Phancong -
//   KHONG co cong tac chung cua Admin (khac Phe duyet).
// - File de an lay tu BC_nghiemthu. Neu CHUA co file: bang diem hien nhung MO, khong dien duoc.
// - Sau khi nop: lan xuong DS_Deansangkien 2 cot Diemnghiemthu_NC1/NC2 (cot DiemTB_nghiemthu
//   la CONG THUC tren Sheet, code KHONG dung vao).
// ==========================================================

// Danh sach de an de chon o dropdown - dung logic giong het getPheDuyetDeAnList
function getNghiemThuDeAnList(token) {
  const user = requireUser(token);
  if (!isAdmin(user) && !isTVHD(user)) throw new Error("Bạn không có quyền truy cập.");

  const data = getSheetData(CONFIG.SHEET_PHANCONG);
  if (data.length < 2) return [];

  const map = headerIndexMap(data[0]);
  requireColumns(map, ["Madean", "Khoaphong", "Tendean"]);

  const admin = isAdmin(user);
  const hoTen = user.hoTen;

  const rows = data.slice(1)
    .map(function (row) {
      return {
        madean: String(row[map["Madean"]] || "").trim(),
        khoaphong: String(row[map["Khoaphong"]] || "").trim(),
        tendean: String(row[map["Tendean"]] || "").trim(),
        dangkyId: "DangkyID" in map ? String(row[map["DangkyID"]] || "").trim() : "",
        nguoicham1: "Nguoicham1" in map ? String(row[map["Nguoicham1"]] || "").trim() : "",
        nguoicham2: "Nguoicham2" in map ? String(row[map["Nguoicham2"]] || "").trim() : ""
      };
    })
    .filter(function (r) { return r.madean; })
    .filter(function (r) {
      if (admin) return true;
      return r.nguoicham1 === hoTen || r.nguoicham2 === hoTen;
    });

  rows.sort(function (a, b) {
    return (a.khoaphong + a.tendean).localeCompare(b.khoaphong + b.tendean, "vi", { sensitivity: "base" });
  });

  return rows.map(function (r) {
    return { madean: r.madean, khoaphong: r.khoaphong, tendean: r.tendean, dangkyId: r.dangkyId };
  });
}

// File BC_nghiemthu tuong ung 1 de an (khop uu tien DangkyID, fallback Khoaphong+Tendean)
function getNghiemThuFileUrl_(khoaPhong, tenDeAn, dangkyId) {
  const data = getSheetData(CONFIG.SHEET_BCNGHIEMTHU);
  if (data.length < 2) return "";
  const map = headerIndexMap(data[0]);

  let row = null;
  if (dangkyId && ("DangkyID" in map)) {
    row = data.slice(1).find(function (r) { return String(r[map["DangkyID"]] || "").trim() === dangkyId; });
  }
  if (!row && ("Khoaphong" in map) && ("Tendean" in map)) {
    row = data.slice(1).find(function (r) {
      return String(r[map["Khoaphong"]] || "").trim() === khoaPhong &&
             String(r[map["Tendean"]] || "").trim() === tenDeAn;
    });
  }
  if (!row) return "";
  return "File" in map ? String(row[map["File"]] || "").trim() : "";
}

function getNghiemThuData(token, khoaPhong, tenDeAn, maDeAn, dangkyIdHint) {
  const user = requireUser(token);
  if (!isAdmin(user) && !isTVHD(user)) throw new Error("Bạn không có quyền truy cập.");

  khoaPhong = String(khoaPhong || "").trim();
  tenDeAn = String(tenDeAn || "").trim();
  maDeAn = String(maDeAn || "").trim();
  dangkyIdHint = String(dangkyIdHint || "").trim();
  if (!khoaPhong || !tenDeAn || !maDeAn) return null;

  const phancongRow = getPhanCongRowForMaDean_(maDeAn, khoaPhong, tenDeAn, dangkyIdHint);
  if (!phancongRow) throw new Error("Không tìm thấy đề án/sáng kiến trong danh sách phân công.");

  const admin = isAdmin(user);
  const isAssigned = !admin && (phancongRow.nguoicham1 === user.hoTen || phancongRow.nguoicham2 === user.hoTen);
  if (!admin && !isAssigned) throw new Error("Bạn không được phân công nghiệm thu đề án/sáng kiến này.");

  const loai = pheDuyetLoaiTuMaDean_(maDeAn);
  const tieuChi = loai === "DA" ? NGHIEMTHU_TIEUCHI_DA : NGHIEMTHU_TIEUCHI_SK;
  const ketLuanOptions = loai === "DA" ? NGHIEMTHU_KETLUAN_OPTIONS_DA : NGHIEMTHU_KETLUAN_OPTIONS_SK;
  const formTitle = loai === "DA"
    ? "Bảng kiểm nghiệm thu đề án cải tiến chất lượng"
    : "Bảng kiểm nghiệm thu sáng kiến cải tiến chất lượng";

  const fileUrl = getNghiemThuFileUrl_(khoaPhong, tenDeAn, phancongRow.dangkyId || dangkyIdHint);
  const hasFile = !!fileUrl;

  const rowStatusOk = phancongRow.trangthai === "Nghiệm thu";
  const canSubmit = !admin && isAssigned && rowStatusOk && hasFile;

  const data = getSheetData(CONFIG.SHEET_NGHIEMTHU);
  let phieuRows = [];
  if (data.length >= 2) {
    const map = headerIndexMap(data[0]);
    if ("Madean" in map) {
      const dId = phancongRow.dangkyId || dangkyIdHint;
      phieuRows = data.slice(1)
        .filter(function (r) {
          const rowDangkyId = "DangkyID" in map ? String(r[map["DangkyID"]] || "").trim() : "";
          if (dId && rowDangkyId) return rowDangkyId === dId;
          return String(r[map["Madean"]] || "").trim() === maDeAn;
        })
        .map(function (row) {
          const diem = {};
          tieuChi.forEach(function (tc) {
            diem[tc.key] = (tc.key in map) ? (parseFloat(row[map[tc.key]]) || 0) : 0;
          });
          const thoiGianRaw = "ThoiGian" in map ? row[map["ThoiGian"]] : "";
          return {
            nguoichamEmail: "NguoiChamEmail" in map ? String(row[map["NguoiChamEmail"]] || "").trim() : "",
            nguoichamHoTen: "NguoiChamHoTen" in map ? String(row[map["NguoiChamHoTen"]] || "").trim() : "",
            diem: diem,
            tongdiem: "TongDiem" in map ? row[map["TongDiem"]] : "",
            dexuat: "DeXuatCapThanhPho" in map ? !!row[map["DeXuatCapThanhPho"]] : false,
            ykien: "YKienNhanXet" in map ? String(row[map["YKienNhanXet"]] || "") : "",
            ketluan: "KetLuan" in map ? String(row[map["KetLuan"]] || "") : "",
            thoigian: formatCellValue(thoiGianRaw)
          };
        });
    }
  }

  let ownPhieu = null;
  const phieuList = phieuRows.map(function (p) {
    const isOwner = p.nguoichamEmail === user.email;
    if (isOwner) ownPhieu = p;
    return {
      hoTen: (admin || isOwner) ? p.nguoichamHoTen : "---",
      diem: p.diem,
      tongdiem: p.tongdiem,
      dexuat: p.dexuat,
      ykien: p.ykien,
      ketluan: p.ketluan,
      thoigian: p.thoigian,
      isOwner: isOwner
    };
  });

  return {
    loai: loai,
    formTitle: formTitle,
    tieuChi: tieuChi,
    ketLuanOptions: ketLuanOptions,
    dexuatLabel: NGHIEMTHU_DEXUAT_THANHPHO_LABEL,
    fileUrl: fileUrl,
    hasFile: hasFile,
    canSubmit: canSubmit,
    blockedMessage: (!admin && isAssigned && !canSubmit)
      ? (!hasFile ? "Chưa có báo cáo nghiệm thu để chấm." : "Đợt nghiệm thu hiện chưa mở hoặc đã đóng, không thể nộp/chỉnh sửa.")
      : "",
    isAdmin: admin,
    isAssigned: isAssigned,
    ownPhieu: ownPhieu ? {
      diem: ownPhieu.diem, dexuat: ownPhieu.dexuat, ykien: ownPhieu.ykien, ketluan: ownPhieu.ketluan, tongdiem: ownPhieu.tongdiem
    } : null,
    phieuList: phieuList
  };
}

function saveNghiemThuPhieu(token, data) {
  const user = requireUser(token);
  if (!isTVHD(user)) {
    return { success: false, message: "Chỉ Thành viên Hội đồng mới có quyền chấm phiếu nghiệm thu." };
  }
  if (!data) return { success: false, message: "Không nhận được dữ liệu." };

  const maDeAn = String(data.maDeAn || "").trim();
  const khoaPhong = String(data.khoaPhong || "").trim();
  const tenDeAn = String(data.tenDeAn || "").trim();
  const dangkyIdHint = String(data.dangkyId || "").trim();
  const ykienNhanXet = String(data.ykienNhanXet || "").trim();
  const ketLuan = String(data.ketLuan || "").trim();
  const dexuatThanhPho = !!data.dexuatThanhPho;
  const diemInput = data.diem || {};

  if (!maDeAn || !khoaPhong || !tenDeAn) return { success: false, message: "Thiếu thông tin đề án/sáng kiến." };

  if (dangkyIdHint && isDeAnDaLoai_(dangkyIdHint)) {
    return { success: false, message: "Đề án/Sáng kiến đã bị loại." };
  }

  const loai = pheDuyetLoaiTuMaDean_(maDeAn);
  const tieuChi = loai === "DA" ? NGHIEMTHU_TIEUCHI_DA : NGHIEMTHU_TIEUCHI_SK;

  const diemToSave = {};
  for (let i = 0; i < tieuChi.length; i++) {
    const tc = tieuChi[i];
    const v = parseFloat(diemInput[tc.key]);
    if (isNaN(v) || v < 0 || v > tc.max) {
      return { success: false, message: "Điểm tiêu chí \"" + tc.label + "\" không hợp lệ (0 - " + tc.max + ")." };
    }
    diemToSave[tc.key] = v;
  }
  if (!ketLuan) return { success: false, message: "Vui lòng chọn Kết luận." };

  const phancongRow = getPhanCongRowForMaDean_(maDeAn, khoaPhong, tenDeAn, dangkyIdHint);
  if (!phancongRow) return { success: false, message: "Không tìm thấy đề án/sáng kiến trong danh sách phân công." };

  const isAssigned = phancongRow.nguoicham1 === user.hoTen || phancongRow.nguoicham2 === user.hoTen;
  if (!isAssigned) return { success: false, message: "Quý Thầy/Cô chỉ có thể sửa phiếu do chính mình phụ trách." };

  if (phancongRow.trangthai !== "Nghiệm thu") {
    return { success: false, message: "Đợt nghiệm thu hiện chưa mở hoặc đã đóng, không thể nộp/chỉnh sửa." };
  }

  const dangkyId = phancongRow.dangkyId || dangkyIdHint;
  const fileUrl = getNghiemThuFileUrl_(khoaPhong, tenDeAn, dangkyId);
  if (!fileUrl) {
    return { success: false, message: "Chưa có báo cáo nghiệm thu để chấm." };
  }

  const sheet = getSheet(CONFIG.SHEET_NGHIEMTHU);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = headerIndexMap(headers);
  requireColumns(map, ["Madean", "Khoaphong", "Tendean", "NguoiChamEmail"]);

  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    const rowDangkyId = "DangkyID" in map ? String(values[i][map["DangkyID"]] || "").trim() : "";
    const matchByDangkyId = dangkyId && rowDangkyId && rowDangkyId === dangkyId;
    const matchByMadean = (!dangkyId || !rowDangkyId) && String(values[i][map["Madean"]]).trim() === maDeAn;
    if ((matchByDangkyId || matchByMadean) && String(values[i][map["NguoiChamEmail"]]).trim() === user.email) {
      rowIndex = i;
      break;
    }
  }

  let rowNumber;
  if (rowIndex === -1) {
    const newRow = new Array(headers.length).fill("");
    if ("ID" in map) newRow[map["ID"]] = Utilities.getUuid();
    if ("DangkyID" in map) newRow[map["DangkyID"]] = dangkyId;
    newRow[map["Madean"]] = maDeAn;
    newRow[map["Khoaphong"]] = khoaPhong;
    newRow[map["Tendean"]] = tenDeAn;
    newRow[map["NguoiChamEmail"]] = user.email;
    if ("NguoiChamHoTen" in map) newRow[map["NguoiChamHoTen"]] = user.hoTen;
    sheet.appendRow(newRow);
    rowNumber = sheet.getLastRow();
  } else {
    rowNumber = rowIndex + 1;
  }

  const diemColNumbers = [];
  tieuChi.forEach(function (tc) {
    if (tc.key in map) {
      sheet.getRange(rowNumber, map[tc.key] + 1).setValue(diemToSave[tc.key]);
      diemColNumbers.push(map[tc.key] + 1);
    }
  });

  if ("TongDiem" in map && diemColNumbers.length > 0) {
    const formula = "=" + diemColNumbers.map(function (c) { return columnToLetter_(c) + rowNumber; }).join("+");
    sheet.getRange(rowNumber, map["TongDiem"] + 1).setFormula(formula);
  }

  if ("DeXuatCapThanhPho" in map) sheet.getRange(rowNumber, map["DeXuatCapThanhPho"] + 1).setValue(dexuatThanhPho);
  if ("YKienNhanXet" in map) sheet.getRange(rowNumber, map["YKienNhanXet"] + 1).setValue(ykienNhanXet);
  if ("KetLuan" in map) sheet.getRange(rowNumber, map["KetLuan"] + 1).setValue(ketLuan);
  if ("ThoiGian" in map) {
    sheet.getRange(rowNumber, map["ThoiGian"] + 1).setValue(new Date()).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  }

  invalidateSheetCache(CONFIG.SHEET_NGHIEMTHU);

  if (dangkyId) {
    try { syncEngineRebuildAndPropagate_(dangkyId); } catch (e) { /* khong lam gian doan viec luu phieu chinh */ }
  }

  return { success: true, message: "Đã lưu phiếu nghiệm thu." };
}
