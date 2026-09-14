// ==========================================================
// HAN CHOT THUC HIEN - 1 gia tri DUY NHAT dung chung cho toan he thong, hien thi tren 7 man
// hinh (Dang ky, Gui lai sau phe duyet, Gui ban hoan chinh, Cap nhat tien do, Phe duyet,
// Bao cao nghiem thu, Nghiem thu). Chi Admin duoc chon/sua (qua <input type="datetime-local">
// ben client); cac vai tro khac chi xem dang van ban da dinh dang.
// Luu duoi dang chuoi tu <input type="datetime-local"> (vd "2026-12-31T17:00") trong
// PropertiesService - KHONG can Sheet rieng vi day la 1 "cong tac/cau hinh" cua he thong,
// giong cach lam voi cac trang thai bat/tat khac (DANGKY_STATUS, PHEDUYET_STATUS...).
// ==========================================================

const SYSTEM_DEADLINE_PROP_KEY = "SYSTEM_DEADLINE";

// Ai da dang nhap cung xem duoc (mac dinh rong neu Admin chua tung dat)
function getSystemDeadline(token) {
  requireUser(token);
  return PropertiesService.getScriptProperties().getProperty(SYSTEM_DEADLINE_PROP_KEY) || "";
}

// Chi Admin duoc dat/sua. value = chuoi tu <input type="datetime-local"> (vd "2026-12-31T17:00")
function setSystemDeadline(token, value) {
  const user = requireUser(token);
  if (!isAdmin(user)) {
    return { success: false, message: "Chỉ Admin mới có quyền đặt hạn chót thực hiện." };
  }
  const v = String(value || "").trim();
  PropertiesService.getScriptProperties().setProperty(SYSTEM_DEADLINE_PROP_KEY, v);
  return { success: true, message: "Đã cập nhật hạn chót thực hiện.", value: v };
}
