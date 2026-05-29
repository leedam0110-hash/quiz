import { state } from './state.js';
import { showPage } from './nav.js';
import { loadSets, saveAnswer } from './config.js';

export function registerQuizPlayHandlers() {
  window.startQuiz = startQuiz;
  window.selectOption = selectOption;
  window.quizNext = quizNext;
  window.quizPrev = quizPrev;
  window.quizSubmit = quizSubmit;
}

async function startQuiz() {
  await loadSets();
  if (!state.sharedSet || !state.sharedSet.questions || state.sharedSet.questions.length === 0) {
    alert('현재 공유된 퀴즈 세트가 없습니다.');
    return;
  }
  state.quizAnswers = state.sharedSet.questions.map((q) => ({
    questionId: q.id,
    answer: q.type === 'multi' ? null : '',
  }));
  state.currentQuizIdx = 0;
  showPage('page-quiz');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = state.sharedSet.questions[state.currentQuizIdx];
  const total = state.sharedSet.questions.length;
  const progress = ((state.currentQuizIdx + 1) / total) * 100;
  const userAns = state.quizAnswers[state.currentQuizIdx];

  let answerHtml = '';
  if (q.type === 'short') {
    answerHtml = `<textarea class="quiz-input" id="quiz-answer-input" placeholder="답변을 입력하세요">${userAns.answer || ''}</textarea>`;
  } else {
    answerHtml =
      '<div class="quiz-options">' +
      q.options
        .map(
          (opt, i) => `
      <div class="quiz-option ${userAns.answer === String(i) ? 'selected' : ''}" onclick="selectOption(${i})">
        <div class="quiz-option-idx">${String.fromCharCode(65 + i)}</div>
        <span>${opt.text}</span>
      </div>`
        )
        .join('') +
      '</div>';
  }

  const isLast = state.currentQuizIdx === total - 1;
  document.getElementById('quiz-card').innerHTML = `
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${progress}%"></div></div>
    <div class="quiz-label">문제 ${state.currentQuizIdx + 1} / ${total}</div>
    <div class="quiz-question">${q.question}</div>
    ${answerHtml}
    <div class="quiz-nav">
      ${state.currentQuizIdx > 0 ? '<button class="btn btn-ghost" onclick="quizPrev()">이전</button>' : ''}
      ${
        isLast
          ? '<button class="btn btn-primary" onclick="quizSubmit()">제출하기</button>'
          : '<button class="btn btn-primary" onclick="quizNext()">다음</button>'
      }
    </div>`;
}

function selectOption(i) {
  state.quizAnswers[state.currentQuizIdx].answer = String(i);
  renderQuizQuestion();
}

function quizNext() {
  saveCurrentAnswer();
  state.currentQuizIdx++;
  renderQuizQuestion();
}

function quizPrev() {
  saveCurrentAnswer();
  state.currentQuizIdx--;
  renderQuizQuestion();
}

function saveCurrentAnswer() {
  const q = state.sharedSet.questions[state.currentQuizIdx];
  if (q.type === 'short') {
    const el = document.getElementById('quiz-answer-input');
    if (el) state.quizAnswers[state.currentQuizIdx].answer = el.value.trim();
  }
}

async function quizSubmit() {
  saveCurrentAnswer();
  const unanswered = state.quizAnswers.some((a) => a.answer === null || a.answer === '');
  if (unanswered) {
    if (!confirm('아직 답하지 않은 문제가 있습니다. 그래도 제출하시겠습니까?')) return;
  }
  await saveAnswer(state.sharedSet.id, state.quizAnswers);
  showResult();
}

function showResult() {
  showPage('page-result');
  const revealAnswer = state.sharedSet.revealAnswer;

  // [요구사항 1] 완료 메시지 — 정답 공개 여부 무관하게 항상 표시 (비어있으면 숨김)
  const completionMessage = (state.sharedSet.completionMessage || '').trim();

  let scoreHtml = '';
  let correctCount = 0;
  let answersHtml = '';

  if (revealAnswer) {
    state.sharedSet.questions.forEach((q, i) => {
      const userAns = state.quizAnswers[i]?.answer;
      let correct = false;
      let displayUserAns = '';
      let displayCorrect = '';
      if (q.type === 'short') {
        correct = userAns?.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase();
        displayUserAns = userAns || '(미응답)';
        displayCorrect = q.correctAnswer || '';
      } else {
        const correctIdx = q.options.findIndex((o) => o.correct);
        correct = userAns === String(correctIdx);
        displayUserAns =
          userAns !== null && userAns !== '' ? q.options[parseInt(userAns)]?.text : '(미응답)';
        displayCorrect = q.options[correctIdx]?.text || '';
      }
      if (correct) correctCount++;
      answersHtml += `<div class="result-answer-item ${correct ? 'correct' : 'wrong'}">
        <div class="q-label">Q${i + 1}. ${q.question}</div>
        <div>내 답: <strong>${displayUserAns}</strong></div>
        ${!correct ? `<div style="color:var(--success);font-size:0.85rem">정답: ${displayCorrect}</div>` : ''}
      </div>`;
    });
    const total = state.sharedSet.questions.length;
    scoreHtml = `<div class="result-score">${correctCount} / ${total}</div><div class="text-dim" style="margin-top:0.3rem">정답</div>`;
  }

  // [요구사항 1] 완료 메시지 HTML 블록
  const completionMsgHtml = completionMessage
    ? `<div class="completion-message-box">
        <div class="completion-message-icon">💬</div>
        <div class="completion-message-text">${completionMessage.replace(/\n/g, '<br>')}</div>
       </div>`
    : '';

  document.getElementById('result-card').innerHTML = `
    <div class="result-emoji">${revealAnswer ? (correctCount === state.sharedSet.questions.length ? '🎉' : '📝') : '✅'}</div>
    <div class="result-title">${revealAnswer ? '결과 발표' : '제출 완료!'}</div>
    <div class="result-sub">${revealAnswer ? '수고하셨습니다!' : '답변이 저장되었습니다. 감사합니다!'}</div>
    ${scoreHtml}
    ${completionMsgHtml}
    ${revealAnswer && answersHtml ? `<div class="result-answers">${answersHtml}</div>` : ''}
    <button class="btn btn-ghost full-w" style="margin-top:1.5rem" onclick="goHome()">처음으로</button>
  `;
}
