import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { state } from './state.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB37CJDVRV4kGEJa7ldYPjLapwHwl5ZMk8',
  authDomain: 'quiz-answer-management.firebaseapp.com',
  projectId: 'quiz-answer-management',
  storageBucket: 'quiz-answer-management.firebasestorage.app',
  messagingSenderId: '87045102866',
  appId: '1:87045102866:web:2853e569ab00e61f3767cb',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function loadSets() {
  const snap = await getDocs(collection(db, 'quizSets'));
  state.quizSets = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  state.sharedSet = state.quizSets.find((s) => s.shared) || null;
}

export async function deleteSet(setId) {
  await deleteDoc(doc(db, 'quizSets', setId));
  const snap = await getDocs(query(collection(db, 'answers'), where('setId', '==', setId)));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function saveAnswer(setId, answers) {
  await addDoc(collection(db, 'answers'), {
    setId,
    answers,
    createdAt: Date.now(),
  });
}

export async function loadAnswers(setId) {
  const snap = await getDocs(query(collection(db, 'answers'), where('setId', '==', setId)));
  return snap.docs.map((d) => d.data());
}

export async function clearAnswers(setId) {
  const snap = await getDocs(query(collection(db, 'answers'), where('setId', '==', setId)));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/** Firestore는 undefined를 허용하지 않음 — 저장 전 정규화 */
export function serializeQuizSetData(data) {
  const questions = (data.questions || []).map((q) => {
    const type = q.type === 'multi' ? 'multi' : 'short';
    const item = {
      id: String(q.id || `q_${Date.now()}`),
      type,
      question: String(q.question || ''),
    };
    if (type === 'short') {
      item.correctAnswer = String(q.correctAnswer ?? '');
    } else {
      let options = (q.options || [])
        .filter((o) => o != null)
        .map((o) => ({
          text: String(o.text ?? ''),
          correct: Boolean(o.correct),
        }));
      if (options.length < 2) {
        options = [
          { text: '', correct: true },
          { text: '', correct: false },
        ];
      }
      if (!options.some((o) => o.correct)) options[0].correct = true;
      item.options = options;
    }
    return item;
  });

  return {
    name: String(data.name || '(이름 없음)'),
    questions,
    shared: Boolean(data.shared),
    revealAnswer: Boolean(data.revealAnswer),
  };
}

export async function createQuizSet(data) {
  const payload = serializeQuizSetData(data);
  const ref = await addDoc(collection(db, 'quizSets'), payload);
  return ref.id;
}

export async function updateQuizSet(id, data) {
  if (!id) throw new Error('INVALID_ID');
  const payload = serializeQuizSetData(data);
  await setDoc(doc(db, 'quizSets', id), payload, { merge: false });
}

export async function commitShareBatch(updates) {
  const batch = writeBatch(db);
  updates.forEach(({ id, shared }) => {
    batch.set(doc(db, 'quizSets', id), { shared }, { merge: true });
  });
  await batch.commit();
}
