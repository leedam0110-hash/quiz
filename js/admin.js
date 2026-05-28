import { state } from './state.js';
import { showPage } from './nav.js';
import {
  loadSets,
  deleteSet,
  createQuizSet,
  updateQuizSet,
  commitShareBatch,
} from './config.js';

const MAX_OPTIONS = 6;

export function registerAdminHandlers() {
  window.createNewSet = createNewSet;
  window.editSet = editSet;
  window.toggleReveal = toggleReveal;
  window.openTypeModal = openTypeModal;
  window.closeTypeModal = closeTypeModal;
  window.addQuestion = addQuestion;
  window.removeQuestion = removeQuestion;
  window.moveQuestion = moveQuestion;
  window.updateQuestionText = updateQuestionText;
  window.updateCorrectAnswer = updateCorrectAnswer;
  window.setCorrectOption = setCorrectOption;
  window.updateOptionText = updateOptionText;
  window.addOption = addOption;
  window.removeOption = removeOption;
  window.saveCurrentSet = saveCurrentSet;
  window.cancelEdit = cancelEdit;
  window.toggleShare = toggleShare;
  window.removeSet = removeSet;

  document.getElementById('btn-new-set')?.addEventListener('click', createNewSet);
  document.getElementById('sets-list')?.addEventListener('click', onSetsListClick);
}

function onSetsListClick(e) {
  const shareEl = e.target.closest('[data-share-id]');
  if (shareEl) {
    e.stopPropagation();
    toggleShare(shareEl.dataset.shareId);
    return;
  }
  const removeEl = e.target.closest('[data-remove-id]');
  if (removeEl) {
    e.stopPropagation();
    removeSet(removeEl.dataset.removeId);
    return;
  }
  const item = e.target.closest('.set-item[data-set-id]');
  if (item && !e.target.closest('.set-actions')) {
    editSet(item.dataset.setId);
  }
}

export async function openBuilder() {
  showPage('page-builder');
  const cont = document.getElementById('sets-list');
  if (cont) {
    cont.innerHTML = '<div class="no-sets-msg">세트 목록 불러오는 중...</div>';
  }
  try {
    await loadSets();
    renderSetsList();
  } catch (err) {
    console.error('세트 목록 로드 실패:', err);
    if (cont) {
      cont.innerHTML =
        '<div class="no-sets-msg">세트 목록을 불러오지 못했습니다.<br><button type="button" class="btn btn-ghost mt-1" id="btn-reload-sets">다시 시도</button></div>';
      document.getElementById('btn-reload-sets')?.addEventListener('click', () => openBuilder());
    }
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getEditorWrap() {
  return document.getElementById('set-editor-wrap');
}

function getEditingSet() {
  return getEditorWrap()?._editingSet ?? null;
}

function syncEditingSetFromDom() {
  const s = getEditingSet();
  if (!s) return;
  const nameInput = document.getElementById('set-name-input');
  if (nameInput) s.name = nameInput.value;
}

function renderSetsList() {
  const cont = document.getElementById('sets-list');
  if (!cont) return;

  const sets = Array.isArray(state.quizSets) ? state.quizSets : [];
  if (sets.length === 0) {
    cont.innerHTML =
      '<div class="no-sets-msg">퀴즈 세트가 없습니다.<br>위 버튼을 눌러 만들어보세요!</div>';
    return;
  }

  cont.innerHTML = sets
    .filter((s) => s && s.id)
    .map(
      (s) => `
    <div class="set-item ${s.shared ? 'shared' : ''}" data-set-id="${escapeAttr(s.id)}">
      <div class="set-item-name">${escapeHtml(s.name) || '(이름 없음)'}</div>
      <div class="set-item-count">${(s.questions || []).length}문제</div>
      ${s.shared ? '<span class="shared-badge">공유중</span>' : ''}
      <div class="set-actions">
        <div class="icon-btn" data-share-id="${escapeAttr(s.id)}" title="${s.shared ? '공유 해제' : '공유하기'}">
          ${
            s.shared
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>'
          }
        </div>
        <div class="icon-btn danger" data-remove-id="${escapeAttr(s.id)}" title="삭제">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
      </div>
    </div>`
    )
    .join('');
}

function createNewSet() {
  const wrap = getEditorWrap();
  if (!wrap) return;
  if (wrap._editingSet && wrap._isNew) {
    wrap.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const newSet = {
    name: '새 퀴즈 세트',
    questions: [],
    shared: false,
    revealAnswer: false,
  };
  state.editingSetId = null;
  renderSetEditor(newSet, true);
}

function editSet(id) {
  const s = state.quizSets.find((x) => x.id === id);
  if (!s) return;
  state.editingSetId = id;
  renderSetEditor(s, false);
  getEditorWrap().scrollIntoView({ behavior: 'smooth' });
}

function normalizeQuestion(q) {
  if (q.type === 'multi') {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      q.options = [
        { text: '', correct: true },
        { text: '', correct: false },
      ];
    }
    if (!q.options.some((o) => o.correct)) q.options[0].correct = true;
  }
  return q;
}

function renderSetEditor(set, isNew) {
  const wrap = getEditorWrap();
  if (!wrap) return;
  const draft = JSON.parse(JSON.stringify(set));
  draft.questions = (draft.questions || []).map(normalizeQuestion);
  const questions = draft.questions;
  const questionsHtml = questions
    .map((q, qi) => renderQCard(q, qi, questions.length))
    .join('');

  wrap.innerHTML = `
    <div class="set-editor">
      <div class="set-editor-header">
        <input type="text" id="set-name-input" value="${escapeHtml(draft.name || '')}" placeholder="세트 이름"/>
      </div>
      <label class="reveal-toggle" onclick="toggleReveal()">
        <div class="toggle-switch ${draft.revealAnswer ? 'on' : ''}" id="reveal-toggle"></div>
        정답 공개 (제출 후 정답 여부 표시)
      </label>
      <div class="divider"></div>
      <div class="question-cards" id="question-cards">${questionsHtml}</div>
      <button type="button" class="btn btn-ghost full-w mt-1" onclick="openTypeModal()">+ 문제 추가</button>
      <div class="divider"></div>
      <div class="flex-row">
        <button type="button" class="btn btn-ghost" onclick="cancelEdit()">취소</button>
        <button type="button" class="btn btn-primary" style="flex:1" onclick="saveCurrentSet()">저장</button>
      </div>
    </div>`;

  wrap._editingSet = draft;
  wrap._isNew = isNew;
}

function renderShortFields(q) {
  return `
    <div class="q-fields q-fields-short">
      <div class="q-label-sm">질문</div>
      <textarea
        data-field="question"
        placeholder="질문을 입력하세요"
        oninput="updateQuestionText('${q.id}', this.value)"
      >${escapeHtml(q.question || '')}</textarea>
      <div class="q-label-sm">정답</div>
      <div class="answer-input-wrap">
        <input
          type="text"
          data-field="answer"
          value="${escapeHtml(q.correctAnswer || '')}"
          placeholder="정답 입력 (문자 또는 숫자)"
          oninput="updateCorrectAnswer('${q.id}', this.value)"
        />
      </div>
    </div>`;
}

function renderMultiFields(q) {
  const optionsHtml = (q.options || [])
    .map(
      (opt, oi) => `
    <div class="option-row">
      <label class="correct-check-wrap" title="정답으로 지정">
        <input
          type="checkbox"
          class="correct-checkbox"
          ${opt.correct ? 'checked' : ''}
          onchange="setCorrectOption('${q.id}', ${oi}, this.checked)"
        />
        <span class="correct-label">정답</span>
      </label>
      <input
        type="text"
        data-field="option"
        data-oi="${oi}"
        value="${escapeHtml(opt.text)}"
        placeholder="선지 ${oi + 1}"
        oninput="updateOptionText('${q.id}', ${oi}, this.value)"
      />
      ${
        (q.options || []).length > 2
          ? `<button type="button" class="icon-btn danger" title="선지 삭제" onclick="removeOption('${q.id}', ${oi})">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>`
          : ''
      }
    </div>`
    )
    .join('');

  return `
    <div class="q-fields q-fields-multi">
      <div class="q-label-sm">질문</div>
      <textarea
        data-field="question"
        placeholder="질문을 입력하세요"
        oninput="updateQuestionText('${q.id}', this.value)"
      >${escapeHtml(q.question || '')}</textarea>
      <div class="q-label-sm">선지</div>
      <div class="options-list" id="options-${q.id}">${optionsHtml}</div>
      <button
        type="button"
        class="btn btn-ghost btn-add-option mt-1"
        onclick="addOption('${q.id}')"
        ${(q.options || []).length >= MAX_OPTIONS ? 'disabled' : ''}
      >+ 선지 추가</button>
    </div>`;
}

function renderQCard(q, qi, total) {
  const typeLabel = q.type === 'short' ? '주관식' : '객관식';
  const bodyHtml = q.type === 'short' ? renderShortFields(q) : renderMultiFields(q);
  const canUp = qi > 0;
  const canDown = qi < total - 1;

  return `<div class="q-card" id="qcard-${q.id}">
    <div class="q-card-header">
      <span class="q-card-num">Q${qi + 1} · ${typeLabel}</span>
      <div class="order-btns">
        <button type="button" class="btn-order" ${canUp ? '' : 'disabled'} onclick="moveQuestion('${q.id}', -1)">위로</button>
        <button type="button" class="btn-order" ${canDown ? '' : 'disabled'} onclick="moveQuestion('${q.id}', 1)">아래로</button>
        <button type="button" class="btn-order danger" onclick="removeQuestion('${q.id}')">삭제</button>
      </div>
    </div>
    ${bodyHtml}
  </div>`;
}

function captureFocusInQuestions() {
  const cont = document.getElementById('question-cards');
  const active = document.activeElement;
  if (!cont || !active || !cont.contains(active)) return null;

  const card = active.closest('.q-card');
  const qid = card?.id?.replace('qcard-', '');
  if (!qid) return null;

  return {
    qid,
    field: active.dataset?.field || null,
    oi: active.dataset?.oi != null ? Number(active.dataset.oi) : null,
    selStart: active.selectionStart,
    selEnd: active.selectionEnd,
  };
}

function restoreFocusInQuestions(focusInfo) {
  if (!focusInfo?.qid) return;
  const card = document.getElementById('qcard-' + focusInfo.qid);
  if (!card) return;

  let el = null;
  if (focusInfo.field === 'question') {
    el = card.querySelector('textarea[data-field="question"]');
  } else if (focusInfo.field === 'answer') {
    el = card.querySelector('.answer-input-wrap input');
  } else if (focusInfo.field === 'option' && focusInfo.oi != null) {
    el = card.querySelector(`input[data-field="option"][data-oi="${focusInfo.oi}"]`);
  }

  if (!el) return;
  el.focus();
  if (typeof el.setSelectionRange === 'function' && focusInfo.selStart != null) {
    try {
      el.setSelectionRange(focusInfo.selStart, focusInfo.selEnd);
    } catch {
      /* ignore */
    }
  }
}

function refreshQuestionCards(s) {
  const cont = document.getElementById('question-cards');
  if (!cont) return;
  const focusInfo = captureFocusInQuestions();
  cont.innerHTML = s.questions
    .map((q, qi) => renderQCard(q, qi, s.questions.length))
    .join('');
  restoreFocusInQuestions(focusInfo);
}

function toggleReveal() {
  const s = getEditingSet();
  if (!s) return;
  s.revealAnswer = !s.revealAnswer;
  const tog = document.getElementById('reveal-toggle');
  if (tog) tog.classList.toggle('on', s.revealAnswer);
}

function openTypeModal() {
  if (!getEditingSet()) return;
  document.getElementById('type-modal')?.classList.add('open');
}

function closeTypeModal() {
  document.getElementById('type-modal')?.classList.remove('open');
}

function addQuestion(type) {
  closeTypeModal();
  const s = getEditingSet();
  if (!s) return;

  const id = 'q_' + Date.now();
  const q =
    type === 'short'
      ? { id, type: 'short', question: '', correctAnswer: '' }
      : {
          id,
          type: 'multi',
          question: '',
          options: [
            { text: '', correct: true },
            { text: '', correct: false },
          ],
        };
  s.questions.push(q);
  refreshQuestionCards(s);
  requestAnimationFrame(() => {
    document.getElementById('qcard-' + id)?.querySelector('textarea')?.focus();
  });
}

function removeQuestion(qid) {
  const s = getEditingSet();
  if (!s) return;
  s.questions = s.questions.filter((q) => q.id !== qid);
  refreshQuestionCards(s);
}

function moveQuestion(qid, dir) {
  const s = getEditingSet();
  if (!s) return;
  const idx = s.questions.findIndex((q) => q.id === qid);
  if (idx < 0 || idx + dir < 0 || idx + dir >= s.questions.length) return;
  [s.questions[idx], s.questions[idx + dir]] = [s.questions[idx + dir], s.questions[idx]];
  refreshQuestionCards(s);
}

function updateQuestionText(qid, val) {
  const q = getEditingSet()?.questions.find((x) => x.id === qid);
  if (q) q.question = val;
}

function updateCorrectAnswer(qid, val) {
  const q = getEditingSet()?.questions.find((x) => x.id === qid);
  if (q) q.correctAnswer = val;
}

function setCorrectOption(qid, oi, checked) {
  const s = getEditingSet();
  const q = s?.questions.find((x) => x.id === qid);
  if (!q || q.type !== 'multi' || !Array.isArray(q.options)) return;

  if (checked) {
    q.options.forEach((o, i) => {
      o.correct = i === oi;
    });
    refreshQuestionCards(s);
    return;
  }

  if (!q.options.some((o, i) => i !== oi && o.correct)) {
    q.options[oi].correct = true;
    refreshQuestionCards(s);
  }
}

function updateOptionText(qid, oi, val) {
  const q = getEditingSet()?.questions.find((x) => x.id === qid);
  if (q?.options?.[oi]) q.options[oi].text = val;
}

function addOption(qid) {
  const s = getEditingSet();
  const q = s?.questions.find((x) => x.id === qid);
  if (!q || q.type !== 'multi') return;
  if (!Array.isArray(q.options)) q.options = [];
  if (q.options.length >= MAX_OPTIONS) return;
  q.options.push({ text: '', correct: false });
  refreshQuestionCards(s);
}

function removeOption(qid, oi) {
  const s = getEditingSet();
  const q = s?.questions.find((x) => x.id === qid);
  if (!q || q.type !== 'multi' || !Array.isArray(q.options) || q.options.length <= 2) return;

  const wasCorrect = q.options[oi].correct;
  q.options.splice(oi, 1);
  if (wasCorrect && !q.options.some((o) => o.correct)) {
    q.options[0].correct = true;
  }
  refreshQuestionCards(s);
}

function closeEditor() {
  const wrap = getEditorWrap();
  wrap.innerHTML = '';
  wrap._editingSet = null;
  wrap._isNew = false;
  state.editingSetId = null;
}

function cancelEdit() {
  const wasNew = getEditorWrap()._isNew;
  closeEditor();
  if (wasNew) renderSetsList();
}

function validateEditingSet(s) {
  if (!s.questions.length) {
    alert('최소 1개 이상의 문항을 추가해 주세요.');
    return false;
  }
  for (let i = 0; i < s.questions.length; i++) {
    const q = s.questions[i];
    if (!q.question?.trim()) {
      alert(`Q${i + 1}: 질문을 입력해 주세요.`);
      return false;
    }
    if (q.type === 'multi') {
      const filled = q.options.filter((o) => o.text?.trim());
      if (filled.length < 2) {
        alert(`Q${i + 1}: 객관식 선지를 2개 이상 입력해 주세요.`);
        return false;
      }
      if (!q.options.some((o) => o.correct)) {
        q.options[0].correct = true;
      }
    }
  }
  return true;
}

async function saveCurrentSet() {
  syncEditingSetFromDom();
  const s = getEditingSet();
  if (!s) return;

  s.name = s.name?.trim() || '(이름 없음)';
  if (!validateEditingSet(s)) return;

  const wrap = getEditorWrap();
  const isNew = wrap._isNew;

  const payload = {
    name: s.name,
    questions: s.questions,
    shared: Boolean(s.shared),
    revealAnswer: Boolean(s.revealAnswer),
  };

  try {
    if (isNew || !s.id) {
      const id = await createQuizSet({ ...payload, shared: false });
      s.id = id;
      s.shared = false;
      state.quizSets.push({ ...s });
    } else {
      await updateQuizSet(s.id, payload);
      const idx = state.quizSets.findIndex((x) => x.id === s.id);
      if (idx !== -1) state.quizSets[idx] = { ...s };
    }
    state.sharedSet = state.quizSets.find((x) => x.shared) || null;
    closeEditor();
    renderSetsList();
  } catch (err) {
    console.error('퀴즈 세트 저장 실패:', err);
    if (err.code === 'permission-denied') {
      alert(
        '저장 권한이 없습니다.\nFirebase 콘솔 → Firestore → 규칙에서 quizSets 컬렉션 쓰기를 허용해 주세요.'
      );
    } else {
      alert('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }
}

async function toggleShare(id) {
  await loadSets();
  const updates = [];
  state.quizSets.forEach((s) => {
    if (s.shared) updates.push({ id: s.id, shared: false });
  });
  const target = state.quizSets.find((s) => s.id === id);
  if (target && !target.shared) {
    updates.push({ id, shared: true });
  }
  if (updates.length > 0) await commitShareBatch(updates);
  await loadSets();
  renderSetsList();
}

async function removeSet(id) {
  if (!confirm('이 세트를 삭제하시겠습니까?')) return;
  await deleteSet(id);
  await loadSets();
  renderSetsList();
  if (state.editingSetId === id) closeEditor();
}
