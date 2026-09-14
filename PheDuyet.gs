// ==========================================================
// PHE DUYET (Sheet Phe_duyet_lan1 / Phe_duyet_lan2)
// - Chi TVHĐ duoc cham/sua phieu (dung cot Nguoicham1/Nguoicham2 trong DS_Phancong de xac dinh
//   ai duoc phan cong cham de an nao). Admin CHI XEM, khong cham, chi co quyen bat/tat nhan phieu.
// - Moi TVHĐ toi da 1 phieu / 1 de an / 1 lan phe duyet. "Phieu phe duyet 1/2" = danh so theo
//   THU TU NOP (ai luu truoc la Phieu 1), khong gan voi vai tro Nguoi cham 1/2.
// - File de an: Phe duyet lan 1 lay tu Sheet Dangky (cot File tuong ung loai dang ky);
//   Phe duyet lan 2 lay tu Sheet DS_noplan2 (cot File).
// - Cong tac bat/tat (rieng cho lan 1 va lan 2) do Admin dieu khien, luu trong PropertiesService.
// - Cot Trangthai trong DS_Phancong (xem PhanCong.gs) quyet dinh de an dang o dot phe duyet nao;
//   phai KHOP ca cong tac Admin (bien global) VA Trangthai cua chinh de an do thi TVHĐ moi nop/sua duoc.
// ==========================================================




const PHEDUYET_STATUS_PROP_KEY = "PHEDUYET_STATUS";




// Ai da dang nhap cung xem duoc trang thai bat/tat cua 2 lan phe duyet (mac dinh: dang mo ca 2)
function getPheDuyetStatus(token) {
requireUser(token);
const status = { lan1: true, lan2: true };
const raw = PropertiesService.getScriptProperties().getProperty(PHEDUYET_STATUS_PROP_KEY);
if (raw) {
  try {
    const saved = JSON.parse(raw);
    if (typeof saved.lan1 === "boolean") status.lan1 = saved.lan1;
    if (typeof saved.lan2 === "boolean") status.lan2 = saved.lan2;
  } catch (e) {
    // du lieu hong -> dung mac dinh
  }
}
return status;
}




// Chi Admin duoc bat/tat. lan = 1 hoac 2.
function setPheDuyetStatus(token, lan, isOpen) {
const user = requireUser(token);
if (!isAdmin(user)) {
  return { success: false, message: "Chỉ Admin mới có quyền bật/tắt nhận phê duyệt." };
}
lan = parseInt(lan, 10);
if ([1, 2].indexOf(lan) === -1) {
  return { success: false, message: "Lần phê duyệt không hợp lệ." };
}
const status = getPheDuyetStatus(token);
status["lan" + lan] = !!isOpen;
PropertiesService.getScriptProperties().setProperty(PHEDUYET_STATUS_PROP_KEY, JSON.stringify(status));
return { success: true, message: "Đã cập nhật.", status: status };
}




// Lay 1 dong DS_Phancong khop theo Madean (dung chung cho ca doc va ghi phieu phe duyet)
// khoaPhong/tenDeAn la 2 tham so TUY CHON - neu co, se uu tien khop CHINH XAC ca Madean+Khoaphong+
// Tendean (tranh lay nham dong khac neu 2 de an KHAC NHAU lo trung Madean); neu khong khop duoc
// hoac khong truyen 2 tham so nay, fallback ve khop theo DUY NHAT Madean (dong DAU TIEN tim thay).
// dangkyId (tham so moi, TUY CHON) - neu client da biet san DangkyID (vd tu getPheDuyetDeAnList),
// truyen vao day se KHOP CHINH XAC NGAY, khong can dò theo Madean/Khoaphong/Tendean nua (tranh
// hoan toan rui ro trung Madean giua 2 de an khac nhau). Neu khong truyen, fallback ve cach cu.
function getPhanCongRowForMaDean_(maDeAn, khoaPhong, tenDeAn, dangkyId) {
const data = getSheetData(CONFIG.SHEET_PHANCONG);
if (data.length < 2) return null;




const map = headerIndexMap(data[0]);
if (!("Madean" in map)) return null;




let row = null;
if (dangkyId && ("DangkyID" in map)) {
  row = data.slice(1).find(function (r) {
    return String(r[map["DangkyID"]] || "").trim() === dangkyId;
  });
}
if (!row && khoaPhong && tenDeAn && ("Khoaphong" in map) && ("Tendean" in map)) {
  row = data.slice(1).find(function (r) {
    return String(r[map["Madean"]] || "").trim() === maDeAn &&
           String(r[map["Khoaphong"]] || "").trim() === khoaPhong &&
           String(r[map["Tendean"]] || "").trim() === tenDeAn;
  });
}
if (!row) {
  row = data.slice(1).find(function (r) {
    return String(r[map["Madean"]] || "").trim() === maDeAn;
  });
}
if (!row) return null;




return {
  dangkyId: "DangkyID" in map ? String(row[map["DangkyID"]] || "").trim() : "",
  khoaphong: "Khoaphong" in map ? String(row[map["Khoaphong"]] || "").trim() : "",
  tendean: "Tendean" in map ? String(row[map["Tendean"]] || "").trim() : "",
  nguoicham1: "Nguoicham1" in map ? String(row[map["Nguoicham1"]] || "").trim() : "",
  nguoicham2: "Nguoicham2" in map ? String(row[map["Nguoicham2"]] || "").trim() : "",
  trangthai: "Trangthai" in map ? String(row[map["Trangthai"]] || "").trim() : ""
};
}




// Link file de an: lan 1 lay tu Sheet Dangky, lan 2 lay tu Sheet DS_noplan2
// dangkyId la tham so TUY CHON - neu co, uu tien tim CHINH XAC theo DangkyID (khong lo trung
// Madean giua 2 de an khac nhau); neu khong co se fallback ve tim theo Madean (dong DAU TIEN).
function getPheDuyetFileUrl_(khoaPhong, tenDeAn, maDeAn, lan, dangkyId) {
if (lan === 1) {
  const dangkyData = getSheetData(CONFIG.SHEET_DANGKY);
  if (dangkyData.length < 2) return "";
  const map = headerIndexMap(dangkyData[0]);
  if (!("Madean" in map) || !("LoaiDangKy" in map)) return "";




  let row = null;
  if (dangkyId && ("ID" in map)) {
    row = dangkyData.slice(1).find(function (r) {
      return String(r[map["ID"]] || "").trim() === dangkyId;
    });
  }
  if (!row) {
    row = dangkyData.slice(1).find(function (r) {
      return String(r[map["Madean"]] || "").trim() === maDeAn;
    });
  }
  if (!row) return "";




  const loai = String(row[map["LoaiDangKy"]] || "").trim();
  const fileKey = dangKyFileFieldKey_(loai);
  if (!fileKey || !(fileKey in map)) return "";




  return String(row[map[fileKey]] || "").trim();
}




const np2Data = getSheetData(CONFIG.SHEET_NOPLAN2);
if (np2Data.length < 2) return "";
const map2 = headerIndexMap(np2Data[0]);




// Uu tien tim theo DangkyID (on dinh, khong doi ke ca khi Tendean o DS_Phancong/DS_Deansangkien
// da duoc cap nhat theo Tendean_neusua sau nay - luc do Tendean hien tai se KHONG con khop voi
// cot "Tendean" GOC dang bi dong bang trong chinh DS_noplan2 nua, neu chi so khop theo chu se
// tim khong ra dong dung). Fallback ve Khoaphong+Tendean cho du lieu cu chua co DangkyID.
let row2 = null;
if (dangkyId && ("DangkyID" in map2)) {
  row2 = np2Data.slice(1).find(function (r) {
    return String(r[map2["DangkyID"]] || "").trim() === dangkyId;
  });
}
if (!row2 && ("Khoaphong" in map2) && ("Tendean" in map2)) {
  row2 = np2Data.slice(1).find(function (r) {
    return String(r[map2["Khoaphong"]] || "").trim() === khoaPhong &&
           String(r[map2["Tendean"]] || "").trim() === tenDeAn;
  });
}
if (!row2) return "";




return "File" in map2 ? String(row2[map2["File"]] || "").trim() : "";
}




/**
* Danh sach de an/sang kien de chon o dropdown man hinh Phe duyet.
* - Admin: xem TAT CA de an/sang kien co trong DS_Phancong (khong gioi han).
* - TVHĐ: chi xem de an/sang kien ma chinh minh duoc phan cong (Nguoicham1 hoac Nguoicham2 == Hoten).
*/
function getPheDuyetDeAnList(token) {
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




/**
* Danh sach "Lich su phe duyet" cua 1 lan (1 hoac 2), GOM NHOM theo tung de an (1 de an = 1
* nhom, chua toi da 2 phieu - vi 1 de an toi da 2 nguoi cham):
* - Admin: xem duoc TAT CA nhom cua lan do (moi de an co it nhat 1 phieu).
* - TVHĐ: CHI xem duoc nhom nao co IT NHAT 1 phieu la CHINH MINH da nop (khop NguoiChamEmail).
* Moi phieu trong nhom co co "isOwn" (co phai la phieu cua chinh nguoi dang xem hay khong) de
* client quyet dinh nhan nut ("cua thay/co" / "cua Nguoi cham con lai" cho TVHĐ; ten that cho Admin).
* Nhom cung kem theo fileUrl (file de an/sang kien tuong ung voi lan do), tieuChi, ketLuanOptions
* (dung khi client hien form chinh sua tai cho trong tab "Da phe duyet"), va canEditOwn (TVHĐ co
* con duoc sua phieu cua chinh minh hay khong - dua theo cong tac Admin + Trangthai cua de an).
*/
function getPheDuyetRoundHistory(token, lan) {
const user = requireUser(token);
lan = parseInt(lan, 10);
if ([1, 2].indexOf(lan) === -1) throw new Error("Lần phê duyệt không hợp lệ.");
if (!isAdmin(user) && !isTVHD(user)) throw new Error("Bạn không có quyền truy cập.");




const admin = isAdmin(user);
const userEmail = String(user.email || "").trim().toLowerCase();




const sheetName = lan === 1 ? CONFIG.SHEET_PHEDUYET_LAN1 : CONFIG.SHEET_PHEDUYET_LAN2;
const data = getSheetData(sheetName);
if (data.length < 2) return [];




const map = headerIndexMap(data[0]);




// Ban do DangkyID -> Trangthai (DS_Phancong), dung de tinh canEditOwn cho tung nhom
const statusGlobal = getPheDuyetStatus(token)["lan" + lan];
const trangthaiByDangkyId = {};
try {
  const pcData = getSheetData(CONFIG.SHEET_PHANCONG);
  if (pcData.length >= 2) {
    const pcMap = headerIndexMap(pcData[0]);
    if ("DangkyID" in pcMap && "Trangthai" in pcMap) {
      pcData.slice(1).forEach(function (r) {
        const id = String(r[pcMap["DangkyID"]] || "").trim();
        if (id) trangthaiByDangkyId[id] = String(r[pcMap["Trangthai"]] || "").trim();
      });
    }
  }
} catch (e) { /* bo qua, canEditOwn se mac dinh false neu khong doc duoc */ }




// Nhom theo DangkyID (on dinh nhat); fallback nhom theo Madean cho du lieu cu chua co DangkyID
const groups = {};
const groupOrder = [];




data.slice(1).forEach(function (r) {
  const madean = "Madean" in map ? String(r[map["Madean"]] || "").trim() : "";
  if (!madean) return;
  const dangkyId = "DangkyID" in map ? String(r[map["DangkyID"]] || "").trim() : "";
  const groupKey = dangkyId || ("madean:" + madean);




  if (!groups[groupKey]) {
    groups[groupKey] = {
      dangkyId: dangkyId,
      madean: madean,
      khoaphong: "Khoaphong" in map ? String(r[map["Khoaphong"]] || "").trim() : "",
      tendean: "Tendean" in map ? String(r[map["Tendean"]] || "").trim() : "",
      phieus: []
    };
    groupOrder.push(groupKey);
  }




  const email = "NguoiChamEmail" in map ? String(r[map["NguoiChamEmail"]] || "").trim().toLowerCase() : "";
  const diem = [];
  for (let i = 1; i <= 10; i++) {
    const key = "Diem" + i;
    diem.push(key in map ? (parseFloat(r[map[key]]) || 0) : 0);
  }
  const thoiGianRaw = "ThoiGian" in map ? r[map["ThoiGian"]] : "";




  groups[groupKey].phieus.push({
    hoTen: "NguoiChamHoTen" in map ? String(r[map["NguoiChamHoTen"]] || "").trim() : "",
    isOwn: !!email && email === userEmail,
    diem: diem,
    tongdiem: "TongDiem" in map ? r[map["TongDiem"]] : "",
    ykien: "YKienNhanXet" in map ? String(r[map["YKienNhanXet"]] || "") : "",
    ketluan: "KetLuan" in map ? String(r[map["KetLuan"]] || "") : "",
    thoigian: formatCellValue(thoiGianRaw)
  });
});




let result = groupOrder.map(function (key) { return groups[key]; });




// TVHĐ: chi giu lai cac nhom co IT NHAT 1 phieu la cua chinh minh
if (!admin) {
  result = result.filter(function (g) {
    return g.phieus.some(function (p) { return p.isOwn; });
  });
}




// Voi tung nhom: phieu cua chinh minh (neu co) len truoc, kem tieu chi + file tuong ung
result.forEach(function (g) {
  g.phieus.sort(function (a, b) { return (b.isOwn ? 1 : 0) - (a.isOwn ? 1 : 0); });
  const loai = pheDuyetLoaiTuMaDean_(g.madean);
  g.tieuChi = loai === "DA" ? PHEDUYET_TIEUCHI_DA : PHEDUYET_TIEUCHI_SK;
  g.ketLuanOptions = lan === 2 ? PHEDUYET_KETLUAN_OPTIONS_LAN2 : (loai === "DA" ? PHEDUYET_KETLUAN_OPTIONS_DA : PHEDUYET_KETLUAN_OPTIONS_SK);
  g.fileUrl = getPheDuyetFileUrl_(g.khoaphong, g.tendean, g.madean, lan, g.dangkyId);
  const rowStatusOk = trangthaiByDangkyId[g.dangkyId] === ("Phê duyệt lần " + lan);
  g.canEditOwn = !admin && statusGlobal && rowStatusOk;
});




// Sap xep nhom theo Khoa/phong (A-Z) roi Ten de an, cho de tim
result.sort(function (a, b) {
  const c = a.khoaphong.localeCompare(b.khoaphong, "vi", { sensitivity: "base" });
  if (c !== 0) return c;
  return a.tendean.localeCompare(b.tendean, "vi", { sensitivity: "base" });
});




return result;
}




/**
* Toan bo du lieu can hien thi cho 1 de an/sang kien da chon o 1 lan phe duyet cu the:
* - Tieu chi cham diem + tuy chon Ket luan (theo dung mau ĐA hoac SK).
* - Link file de an (nguon tuong ung voi lan).
* - Phieu cua chinh minh (neu la TVHĐ da tung nop) de dien san form.
* - Danh sach TAT CA phieu da nop (danh so theo thu tu nop truoc/sau), an ten nguoi cham
*   neu nguoi xem KHONG PHAI Admin va KHONG PHAI chu phieu do (hien "---").
*/
function getPheDuyetData(token, lan, khoaPhong, tenDeAn, maDeAn, dangkyIdHint) {
const user = requireUser(token);
lan = parseInt(lan, 10);
if ([1, 2].indexOf(lan) === -1) throw new Error("Lần phê duyệt không hợp lệ.");
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
if (!admin && !isAssigned) throw new Error("Bạn không được phân công chấm đề án/sáng kiến này.");




const loai = pheDuyetLoaiTuMaDean_(maDeAn);
const tieuChi = loai === "DA" ? PHEDUYET_TIEUCHI_DA : PHEDUYET_TIEUCHI_SK;
const ketLuanOptions = lan === 2
  ? PHEDUYET_KETLUAN_OPTIONS_LAN2
  : (loai === "DA" ? PHEDUYET_KETLUAN_OPTIONS_DA : PHEDUYET_KETLUAN_OPTIONS_SK);
const formTitle = loai === "DA"
  ? "Bảng kiểm phê duyệt đề án cải tiến chất lượng"
  : "Bảng kiểm phê duyệt sáng kiến cải tiến chất lượng";




const fileUrl = getPheDuyetFileUrl_(khoaPhong, tenDeAn, maDeAn, lan, phancongRow.dangkyId);




const statusGlobal = getPheDuyetStatus(token)["lan" + lan];
const rowStatusOk = phancongRow.trangthai === ("Phê duyệt lần " + lan);
const canSubmit = !admin && isAssigned && statusGlobal && rowStatusOk;




const sheetName = lan === 1 ? CONFIG.SHEET_PHEDUYET_LAN1 : CONFIG.SHEET_PHEDUYET_LAN2;
const data = getSheetData(sheetName);




let phieuRows = [];
if (data.length >= 2) {
  const map = headerIndexMap(data[0]);
  if ("Madean" in map) {
    phieuRows = data.slice(1)
      .filter(function (r) {
        // Uu tien khop theo DangkyID (on dinh, khong lo trung Madean giua 2 de an khac nhau).
        // Fallback ve Madean cho du lieu cu chua co DangkyID.
        const rowDangkyId = "DangkyID" in map ? String(r[map["DangkyID"]] || "").trim() : "";
        if (phancongRow.dangkyId && rowDangkyId) return rowDangkyId === phancongRow.dangkyId;
        return String(r[map["Madean"]] || "").trim() === maDeAn;
      })
      .map(function (row) {
        const diem = [];
        for (let i = 1; i <= 10; i++) {
          const key = "Diem" + i;
          diem.push(key in map ? (parseFloat(row[map[key]]) || 0) : 0);
        }
        const thoiGianRaw = "ThoiGian" in map ? row[map["ThoiGian"]] : "";
        return {
          nguoichamEmail: "NguoiChamEmail" in map ? String(row[map["NguoiChamEmail"]] || "").trim() : "",
          nguoichamHoTen: "NguoiChamHoTen" in map ? String(row[map["NguoiChamHoTen"]] || "").trim() : "",
          diem: diem,
          tongdiem: "TongDiem" in map ? row[map["TongDiem"]] : "",
          ykien: "YKienNhanXet" in map ? String(row[map["YKienNhanXet"]] || "") : "",
          ketluan: "KetLuan" in map ? String(row[map["KetLuan"]] || "") : "",
          thoigian: formatCellValue(thoiGianRaw),
          _sort: thoiGianRaw ? new Date(thoiGianRaw).getTime() : 0
        };
      });
  }
}
phieuRows.sort(function (a, b) { return a._sort - b._sort; });




let ownPhieu = null;
const phieuList = phieuRows.map(function (p, i) {
  const isOwner = p.nguoichamEmail === user.email;
  if (isOwner) ownPhieu = p;
  return {
    index: i + 1,
    hoTen: (admin || isOwner) ? p.nguoichamHoTen : "---",
    diem: p.diem,
    tongdiem: p.tongdiem,
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
  maxDiem: PHEDUYET_MAX_DIEM,
  diemStep: PHEDUYET_DIEM_STEP,
  fileUrl: fileUrl,
  canSubmit: canSubmit,
  blockedMessage: (!admin && isAssigned && !canSubmit) ? ("Đã hết thời gian phê duyệt lần " + lan + ", không thể chỉnh sửa.") : "",
  isAdmin: admin,
  isAssigned: isAssigned,
  ownPhieu: ownPhieu ? {
    diem: ownPhieu.diem, ykien: ownPhieu.ykien, ketluan: ownPhieu.ketluan, tongdiem: ownPhieu.tongdiem
  } : null,
  phieuList: phieuList
};
}




/**
* TVHĐ: luu (tao moi hoac cap nhat) phieu phe duyet cua CHINH MINH cho 1 de an, 1 lan phe duyet.
* data = { maDeAn, khoaPhong, tenDeAn, diem: [10 so], ykienNhanXet, ketLuan }
* Cot "Tong diem" duoc ghi bang CONG THUC (=SUM cac o Diem1..Diem10 cua chinh dong do), khong
* phai gia tri tinh san, de dam bao Sheet luon tu dong tinh dung ke ca khi sua truc tiep tren Sheet.
*/
function savePheDuyetPhieu(token, lan, data) {
const user = requireUser(token);
if (!isTVHD(user)) {
  return { success: false, message: "Chỉ Thành viên Hội đồng mới có quyền chấm phiếu phê duyệt." };
}
lan = parseInt(lan, 10);
if ([1, 2].indexOf(lan) === -1) return { success: false, message: "Lần phê duyệt không hợp lệ." };
if (!data) return { success: false, message: "Không nhận được dữ liệu." };




const maDeAn = String(data.maDeAn || "").trim();
const khoaPhong = String(data.khoaPhong || "").trim();
const tenDeAn = String(data.tenDeAn || "").trim();
const dangkyIdHint = String(data.dangkyId || "").trim();
const ykienNhanXet = String(data.ykienNhanXet || "").trim();
const ketLuan = String(data.ketLuan || "").trim();
const diem = Array.isArray(data.diem) ? data.diem : [];




if (!maDeAn || !khoaPhong || !tenDeAn) return { success: false, message: "Thiếu thông tin đề án/sáng kiến." };
if (diem.length !== 10) return { success: false, message: "Vui lòng nhập đủ điểm cho 10 tiêu chí." };




// De an/sang kien da bi "Đã loại" thi khong nhan phieu phe duyet moi/sua nua
if (dangkyIdHint && isDeAnDaLoai_(dangkyIdHint)) {
  return { success: false, message: "Đề án/Sáng kiến đã bị loại." };
}
const deanRowCheck = getSheetData(CONFIG.SHEET_DEAN);
if (!dangkyIdHint && deanRowCheck.length >= 2) {
  const deanMapCheck = headerIndexMap(deanRowCheck[0]);
  const foundRow = deanRowCheck.slice(1).find(function (r) {
    return "Tendean" in deanMapCheck && String(r[deanMapCheck["Tendean"]] || "").trim() === tenDeAn &&
           "Khoaphong" in deanMapCheck && splitKhoaPhongValues_(r[deanMapCheck["Khoaphong"]]).indexOf(khoaPhong) !== -1;
  });
  if (foundRow && "Trang_thai" in deanMapCheck && String(foundRow[deanMapCheck["Trang_thai"]] || "").trim() === "Đã loại") {
    return { success: false, message: "Đề án/Sáng kiến đã bị loại." };
  }
}




for (let i = 0; i < 10; i++) {
  const v = parseFloat(diem[i]);
  if (isNaN(v) || v < 0 || v > PHEDUYET_MAX_DIEM) {
    return { success: false, message: "Điểm tiêu chí " + (i + 1) + " không hợp lệ (0 - " + PHEDUYET_MAX_DIEM + ")." };
  }
}
if (!ketLuan) return { success: false, message: "Vui lòng chọn Kết luận." };




const phancongRow = getPhanCongRowForMaDean_(maDeAn, khoaPhong, tenDeAn, dangkyIdHint);
if (!phancongRow) return { success: false, message: "Không tìm thấy đề án/sáng kiến trong danh sách phân công." };




const isAssigned = phancongRow.nguoicham1 === user.hoTen || phancongRow.nguoicham2 === user.hoTen;
if (!isAssigned) return { success: false, message: "Quý Thầy/Cô chỉ có thể sửa phiếu do chính mình phê duyệt." };




const statusGlobal = getPheDuyetStatus(token)["lan" + lan];
const rowStatusOk = phancongRow.trangthai === ("Phê duyệt lần " + lan);
if (!statusGlobal || !rowStatusOk) {
  return { success: false, message: "Đã hết thời gian phê duyệt lần " + lan + ", không thể chỉnh sửa." };
}




const sheetName = lan === 1 ? CONFIG.SHEET_PHEDUYET_LAN1 : CONFIG.SHEET_PHEDUYET_LAN2;
const sheet = getSheet(sheetName);
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
const map = headerIndexMap(headers);
requireColumns(map, ["Madean", "Khoaphong", "Tendean", "NguoiChamEmail"]);




const dangkyId = phancongRow.dangkyId || "";




const values = sheet.getDataRange().getValues();
let rowIndex = -1;
for (let i = 1; i < values.length; i++) {
  // Uu tien tim theo DangkyID (on dinh, khong doi ke ca khi Madean duoc chinh lai sau nay).
  // Fallback ve so sanh Madean cho du lieu cu chua co DangkyID.
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




const diemCols = [];
for (let i = 1; i <= 10; i++) {
  const key = "Diem" + i;
  if (key in map) {
    sheet.getRange(rowNumber, map[key] + 1).setValue(diem[i - 1]);
    diemCols.push(map[key] + 1);
  }
}




if ("TongDiem" in map && diemCols.length > 0) {
  const formula = "=" + diemCols.map(function (c) { return columnToLetter_(c) + rowNumber; }).join("+");
  sheet.getRange(rowNumber, map["TongDiem"] + 1).setFormula(formula);
}




if ("YKienNhanXet" in map) sheet.getRange(rowNumber, map["YKienNhanXet"] + 1).setValue(ykienNhanXet);
if ("KetLuan" in map) sheet.getRange(rowNumber, map["KetLuan"] + 1).setValue(ketLuan);
if ("ThoiGian" in map) {
  sheet.getRange(rowNumber, map["ThoiGian"] + 1).setValue(new Date()).setNumberFormat("dd/MM/yyyy HH:mm:ss");
}




invalidateSheetCache(sheetName);




if (dangkyId) {
  try { syncEngineRebuildAndPropagate_(dangkyId); } catch (e) { /* khong lam gian doan viec luu phieu chinh */ }
}




return { success: true, message: "Đã lưu phiếu phê duyệt." };
}
