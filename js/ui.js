import { ADMIN_PW, state } from './state.js';
import { goHome } from './nav.js';

let onStatsOpen = null;
let onBuilderOpen = null;

// ── LocalStorage 키 ──────────────────────────────────────────────
const LS_BG_KEY = 'quiz_bg_image';
const LS_LOGO_KEY = 'quiz_logo_image';

export function initUI({ onStats, onBuilder }) {
  onStatsOpen = onStats;
  onBuilderOpen = onBuilder;

  window.goHome = goHome;
  window.closePwModal = closePwModal;
  window.checkPassword = checkPassword;

  // [요구사항 2] 설정 모달 관련 전역 함수 등록
  window.closeSettingsModal = closeSettingsModal;
  window.onBgUpload = onBgUpload;
  window.onLogoUpload = onLogoUpload;
  window.clearBgImage = clearBgImage;
  window.clearLogoImage = clearLogoImage;

  document.getElementById('pw-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkPassword();
  });

  document.getElementById('icon-stats').addEventListener('click', () => openPwModal('stats'));
  document.getElementById('icon-builder').addEventListener('click', () => openPwModal('builder'));

  // [요구사항 2] 설정 버튼
  document.getElementById('settings-btn')?.addEventListener('click', openSettingsModal);

  // [요구사항 2] 오버레이 바깥 클릭 시 닫기
  document.getElementById('settings-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-modal')) closeSettingsModal();
  });

  // [요구사항 2] 저장된 이미지 복원
  restoreImages();
}

// ── 비밀번호 모달 ────────────────────────────────────────────────
function openPwModal(target) {
  state.pendingTarget = target;
  document.getElementById('pw-modal').classList.add('open');
  document.getElementById('pw-input').value = '';
  document.getElementById('pw-err').textContent = '';
  setTimeout(() => document.getElementById('pw-input').focus(), 50);
}

function closePwModal() {
  document.getElementById('pw-modal').classList.remove('open');
  state.pendingTarget = null;
}

async function checkPassword() {
  const val = document.getElementById('pw-input').value;
  if (val === ADMIN_PW) {
    const target = state.pendingTarget;
    closePwModal();
    if (target === 'stats' && onStatsOpen) await onStatsOpen();
    else if (target === 'builder' && onBuilderOpen) await onBuilderOpen();
  } else {
    document.getElementById('pw-err').textContent = '비밀번호가 틀렸습니다.';
    document.getElementById('pw-input').classList.add('error');
    setTimeout(() => document.getElementById('pw-input').classList.remove('error'), 600);
  }
}

// ── [요구사항 2] 설정 모달 ──────────────────────────────────────
function openSettingsModal() {
  document.getElementById('settings-modal').classList.add('open');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.remove('open');
}

// ── 배경화면 ─────────────────────────────────────────────────────
function onBgUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    applyBgImage(dataUrl);
    try { localStorage.setItem(LS_BG_KEY, dataUrl); } catch { /* 용량 초과 무시 */ }
  };
  reader.readAsDataURL(file);
  // 같은 파일 재업로드 허용
  event.target.value = '';
}

function applyBgImage(dataUrl) {
  const startPage = document.getElementById('page-start');
  if (dataUrl) {
    startPage.style.backgroundImage = `url(${dataUrl})`;
    startPage.style.backgroundSize = 'cover';
    startPage.style.backgroundPosition = 'center';
    startPage.style.backgroundRepeat = 'no-repeat';

    // 미리보기
    const img = document.getElementById('bg-preview-img');
    const placeholder = document.getElementById('bg-preview-placeholder');
    if (img) { img.src = dataUrl; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  } else {
    // 기본 gradient 복원
    startPage.style.backgroundImage = '';
    startPage.style.backgroundSize = '';
    startPage.style.backgroundPosition = '';
    startPage.style.backgroundRepeat = '';
    const img = document.getElementById('bg-preview-img');
    const placeholder = document.getElementById('bg-preview-placeholder');
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'flex';
  }
}

function clearBgImage() {
  applyBgImage(null);
  try { localStorage.removeItem(LS_BG_KEY); } catch { /* ignore */ }
}

// ── 로고 이미지 ──────────────────────────────────────────────────
function onLogoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    applyLogoImage(dataUrl);
    try { localStorage.setItem(LS_LOGO_KEY, dataUrl); } catch { /* 용량 초과 무시 */ }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function applyLogoImage(dataUrl) {
  const textEl = document.getElementById('start-title-text');
  const imgEl = document.getElementById('start-logo-img');
  const previewImg = document.getElementById('logo-preview-img');
  const previewPlaceholder = document.getElementById('logo-preview-placeholder');

  if (dataUrl) {
    if (textEl) textEl.style.display = 'none';
    if (imgEl) { imgEl.src = dataUrl; imgEl.style.display = 'block'; }
    if (previewImg) { previewImg.src = dataUrl; previewImg.style.display = 'block'; }
    if (previewPlaceholder) previewPlaceholder.style.display = 'none';
  } else {
    if (textEl) textEl.style.display = '';
    if (imgEl) { imgEl.src = ''; imgEl.style.display = 'none'; }
    if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
    if (previewPlaceholder) previewPlaceholder.style.display = 'flex';
  }
}

function clearLogoImage() {
  applyLogoImage(null);
  try { localStorage.removeItem(LS_LOGO_KEY); } catch { /* ignore */ }
}

// ── 새로고침 후 복원 ─────────────────────────────────────────────
function restoreImages() {
  try {
    const bg = localStorage.getItem(LS_BG_KEY);
    if (bg) applyBgImage(bg);

    const logo = localStorage.getItem(LS_LOGO_KEY);
    if (logo) applyLogoImage(logo);
  } catch { /* ignore */ }
}