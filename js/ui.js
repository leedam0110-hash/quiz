import { ADMIN_PW, state } from './state.js';
import { goHome } from './nav.js';

let onStatsOpen = null;
let onBuilderOpen = null;

export function initUI({ onStats, onBuilder }) {
  onStatsOpen = onStats;
  onBuilderOpen = onBuilder;

  window.goHome = goHome;
  window.closePwModal = closePwModal;
  window.checkPassword = checkPassword;

  document.getElementById('pw-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkPassword();
  });

  document.getElementById('icon-stats').addEventListener('click', () => openPwModal('stats'));
  document.getElementById('icon-builder').addEventListener('click', () => openPwModal('builder'));
}

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
