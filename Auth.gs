/**
 * Dang nhap: tra ve 1 "token" phien rieng, luu trong PropertiesService.
 * Token nay se duoc client luu vao localStorage va gui kem trong moi lan goi ham server.
 * Cach nay KHONG phu thuoc tai khoan Google cua nguoi mo trinh duyet,
 * nen an toan khi nhieu nguoi dung chung 1 may/trinh duyet.
 *
 * LUU Y (21/08/2026): truoc day dung CacheService de luu phien, nhung CacheService
 * cua Google la bo nho "best-effort" - Google KHONG cam ket giu du lieu du suot
 * thoi gian dat (vd 6 tieng), co the tu xoa som bat cu luc nao vi ly do noi bo cua Google.
 * Da doi sang PropertiesService (ScriptProperties) - luu ben vung, on dinh hon nhieu,
 * va tu quan ly thoi han 6 tieng bang cach luu kem "expiresAt" trong chinh du lieu phien.
 */
function login(email, password) {
if (!email || !password) {
  return { success: false, message: "Vui lòng nhập đầy đủ email và mật khẩu." };
}




email = String(email).trim().toLowerCase();




const data = getSheetData(CONFIG.SHEET_USER);
if (data.length < 2) {
  return { success: false, message: "Danh sách người dùng đang trống." };
}




const map = headerIndexMap(data[0]);
requireColumns(map, ["Email", "Password", "Hoten", "Khoaphong", "Vaitro"]);




const rows = data.slice(1).filter(function (r) {
  return String(r[map["Email"]]).trim().toLowerCase() === email;
});




if (rows.length === 0) {
  return { success: false, message: "Email chưa được cấp quyền truy cập." };
}




const ok = rows.some(function (r) {
  return String(r[map["Password"]]) === String(password);
});




if (!ok) {
  return { success: false, message: "Mật khẩu không đúng." };
}




const hoTen = String(rows[0][map["Hoten"]]);
const vaiTro = String(rows[0][map["Vaitro"]]);




const khoaPhong = [
  ...new Set(
    rows
      .map(function (r) {
        return String(r[map["Khoaphong"]]).trim();
      })
      .filter(function (v) {
        return v !== "";
      })
  )
];




const token = Utilities.getUuid();
const now = Date.now();
const session = {
  email: email,
  hoTen: hoTen,
  vaiTro: vaiTro,
  khoaPhong: khoaPhong,
  expiresAt: now + CONFIG.SESSION_SECONDS * 1000
};




PropertiesService.getScriptProperties().setProperty(
  "SESSION_" + token,
  JSON.stringify(session)
);




// Nhan tien don dep cac phien da het han cu (tranh Properties bi day theo thoi gian)
cleanupExpiredSessions_();




return {
  success: true,
  token: token,
  email: email,
  hoTen: hoTen,
  vaiTro: vaiTro,
  khoaPhong: khoaPhong
};
}




function getCurrentUser(token) {
if (!token) return { success: false };




const props = PropertiesService.getScriptProperties();
const raw = props.getProperty("SESSION_" + token);
if (!raw) return { success: false };




let session;
try {
  session = JSON.parse(raw);
} catch (e) {
  props.deleteProperty("SESSION_" + token);
  return { success: false };
}




if (!session.expiresAt || Date.now() > session.expiresAt) {
  // Het han that su (qua 6 tieng) -> xoa phien cu
  props.deleteProperty("SESSION_" + token);
  return { success: false };
}




// Gia han phien khi nguoi dung con thao tac
session.expiresAt = Date.now() + CONFIG.SESSION_SECONDS * 1000;
props.setProperty("SESSION_" + token, JSON.stringify(session));




session.success = true;
session.token = token;
return session;
}




function logout(token) {
if (token) {
  PropertiesService.getScriptProperties().deleteProperty("SESSION_" + token);
}
return true;
}




/**
 * Doi mat khau cho CHINH tai khoan dang dang nhap (khong lien quan Admin/vai tro - ai cung
 * doi duoc mat khau cua chinh minh).
 * - Mat khau cu phai KHOP voi du lieu dang co trong Sheet DS_Nguoidung (cot Password), giong
 *   dung cach kiem tra o luc dang nhap (login()).
 * - Neu 1 email co NHIEU dong trong Sheet (vd gan nhieu khoa/phong khac nhau), mat khau MOI se
 *   duoc ghi vao TAT CA cac dong do, giu dong bo (khong de moi dong 1 mat khau khac nhau).
 */
function changePassword(token, oldPassword, newPassword) {
  const user = requireUser(token);
  oldPassword = String(oldPassword || "");
  newPassword = String(newPassword || "").trim();

  if (!oldPassword) return { success: false, message: "Vui lòng nhập mật khẩu cũ." };
  if (!newPassword) return { success: false, message: "Vui lòng nhập mật khẩu mới." };

  const sheet = getSheet(CONFIG.SHEET_USER);
  const values = sheet.getDataRange().getValues();
  const map = headerIndexMap(values[0]);
  requireColumns(map, ["Email", "Password"]);

  const emailLower = String(user.email || "").trim().toLowerCase();
  const matchedRowNumbers = [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][map["Email"]] || "").trim().toLowerCase() === emailLower) {
      matchedRowNumbers.push(i + 1); // so dong that tren Sheet (1-based, +1 vi values[0] la header)
    }
  }
  if (matchedRowNumbers.length === 0) {
    return { success: false, message: "Không tìm thấy tài khoản." };
  }

  // Kiem tra mat khau cu: khop voi IT NHAT 1 trong cac dong cung email (giong dung logic dang nhap)
  const oldPasswordValid = matchedRowNumbers.some(function (rowNumber) {
    const currentPassword = String(sheet.getRange(rowNumber, map["Password"] + 1).getValue());
    return currentPassword === oldPassword;
  });
  if (!oldPasswordValid) {
    return { success: false, message: "Mật khẩu cũ không đúng." };
  }

  // Ghi mat khau MOI vao TAT CA cac dong cung email, giu dong bo
  matchedRowNumbers.forEach(function (rowNumber) {
    sheet.getRange(rowNumber, map["Password"] + 1).setValue(newPassword);
  });

  invalidateSheetCache(CONFIG.SHEET_USER);
  return { success: true, message: "Đã đổi mật khẩu thành công." };
}




// Dung o dau cac ham can dang nhap - nem loi neu chua dang nhap / phien het han
function requireUser(token) {
const user = getCurrentUser(token);
if (!user.success) {
  throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
}
return user;
}




// Xoa cac phien da het han khoi PropertiesService, goi tu login() moi luot dang nhap moi
// de Properties khong bi day dan theo thoi gian (gioi han ~500 property / du an).
function cleanupExpiredSessions_() {
try {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const now = Date.now();




  Object.keys(all).forEach(function (key) {
    if (key.indexOf("SESSION_") !== 0) return;
    try {
      const session = JSON.parse(all[key]);
      if (!session.expiresAt || now > session.expiresAt) {
        props.deleteProperty(key);
      }
    } catch (e) {
      // Du lieu hong / dinh dang cu -> xoa luon cho sach
      props.deleteProperty(key);
    }
  });
} catch (e) {
  // Khong de loi don dep lam gian doan qua trinh dang nhap
}
}




// ==========================================================
// PHAN QUYEN THEO VAI TRO (Admin > TVHĐ > User)
// ==========================================================
function isAdmin(user) {
return String(user.vaiTro).trim().toLowerCase() === "admin";
}




// TVHĐ = Thanh vien Hoi dong: quyen nhieu hon User, it hon Admin
function isTVHD(user) {
return String(user.vaiTro).trim().toLowerCase() === "tvhđ";
}




// Dung cho cac chuc nang ma ca Admin va TVHĐ deu duoc truy cap
// (Phe duyet, Nghiem thu, xem toan bo thong tin o Tra cuu...)
function isAdminOrTVHD(user) {
return isAdmin(user) || isTVHD(user);
}




// ==========================================================
// QUYEN TRUY CAP TUNG CHUC NANG (dung chung cho ca server va de doi chieu voi client)
// ==========================================================
// Dang ky: TAT CA tai khoan (Admin, TVHĐ, User)
function canAccessDangKy(user) {
return true;
}




// Phe duyet: chi Admin va TVHĐ
function canAccessPheDuyet(user) {
return isAdminOrTVHD(user);
}




// Nghiem thu: chi Admin va TVHĐ
function canAccessNghiemThu(user) {
return isAdminOrTVHD(user);
}




// Bao cao: Admin xem duoc VA thao tac (xuat file); TVHĐ CHI xem, khong co nut xuat file
// (viec an/hien nut xuat file do JavaScript.html tu kiem tra rieng vai tro Admin, ham nay
// chi quyet dinh CO duoc vao man hinh Bao cao hay khong).
function canAccessBaoCao(user) {
return isAdminOrTVHD(user);
}


// Phan cong phe duyet: chi Admin
function canAccessPhanCong(user) {
  return isAdmin(user);
}
