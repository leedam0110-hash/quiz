/** 화면 전환 */
export function showPage(id) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

export function goHome() {
  showPage('page-start');
}