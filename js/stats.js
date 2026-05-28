import { state } from './state.js';
import { showPage } from './nav.js';
import { loadSets, loadAnswers, clearAnswers } from './config.js';

let chartLoadPromise = null;

function loadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!chartLoadPromise) {
    chartLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => resolve(window.Chart);
      script.onerror = () => reject(new Error('Chart.js 로드 실패'));
      document.head.appendChild(script);
    });
  }
  return chartLoadPromise;
}

export function registerStatsHandlers() {
  window.clearAllStats = clearAllStats;
}

export async function openStats() {
  showPage('page-stats');
  await loadSets();
  const cont = document.getElementById('stats-content');

  Object.values(state.chartInstances).forEach((c) => c.destroy());
  state.chartInstances = {};

  if (!state.sharedSet) {
    cont.innerHTML = '<div class="stats-empty">현재 공유된 퀴즈 세트가 없습니다.</div>';
    return;
  }

  const allAnswers = await loadAnswers(state.sharedSet.id);

  if (allAnswers.length === 0) {
    cont.innerHTML = `<div class="stats-set-info">세트: <strong>${state.sharedSet.name}</strong></div><div class="stats-empty">아직 제출된 답변이 없습니다.</div>`;
    return;
  }

  let html = `<div class="stats-set-info">세트: <strong>${state.sharedSet.name}</strong> &nbsp;·&nbsp; 총 응답 <strong>${allAnswers.length}명</strong></div>`;

  const hasMulti = state.sharedSet.questions.some((q) => q.type === 'multi');
  let Chart = null;
  if (hasMulti) {
    try {
      Chart = await loadChartJs();
    } catch {
      cont.innerHTML =
        '<div class="stats-empty">차트 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</div>';
      return;
    }
  }

  state.sharedSet.questions.forEach((q, qi) => {
    const badge =
      q.type === 'short'
        ? '<span class="stats-type-badge badge-sub">주관식</span>'
        : '<span class="stats-type-badge badge-multi">객관식</span>';
    html += `<div class="stats-question-block">
      <div class="stats-q-label">문제 ${qi + 1}</div>
      ${badge}
      <div class="stats-q-text">${q.question}</div>`;

    if (q.type === 'short') {
      const answers = allAnswers
        .map((a) => a.answers?.find((x) => x.questionId === q.id)?.answer)
        .filter(Boolean);
      if (answers.length === 0) {
        html += '<div class="stats-empty">답변 없음</div>';
      } else {
        html += `<div class="stats-answers-list">${answers.map((a) => `<div class="stats-answer-chip">${a}</div>`).join('')}</div>`;
      }
    } else {
      const counts = q.options.map((_, oi) =>
        allAnswers.filter((a) => a.answers?.find((x) => x.questionId === q.id)?.answer === String(oi)).length
      );
      html += `<div class="chart-wrap"><canvas id="chart-${qi}"></canvas></div>`;
      html += q.options
        .map(
          (opt, oi) => `
        <div class="stats-option-row">
          <span class="opt-label">${String.fromCharCode(65 + oi)}. ${opt.text}</span>
          <span>${counts[oi]}명</span>
        </div>`
        )
        .join('');
    }
    html += '</div>';
  });
  cont.innerHTML = html;

  if (!Chart) return;

  state.sharedSet.questions.forEach((q, qi) => {
    if (q.type === 'multi') {
      const counts = q.options.map((_, oi) =>
        allAnswers.filter((a) => a.answers?.find((x) => x.questionId === q.id)?.answer === String(oi)).length
      );
      const canvas = document.getElementById(`chart-${qi}`);
      if (!canvas) return;
      state.chartInstances[qi] = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.text}`),
          datasets: [
            {
              data: counts,
              backgroundColor: ['#7c6aff', '#ff6a9e', '#4ade80', '#facc15', '#38bdf8', '#fb923c'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#8888aa', font: { size: 11 } } },
          },
        },
      });
    }
  });
}

async function clearAllStats() {
  if (!state.sharedSet) return;
  if (!confirm('모든 답변을 삭제하시겠습니까?')) return;
  await clearAnswers(state.sharedSet.id);
  await openStats();
}
