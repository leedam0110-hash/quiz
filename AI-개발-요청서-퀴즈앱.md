# [AI 개발 요청서] Firebase 연동 HTML 기반 퀴즈 및 관리자 시스템 구축

> 다른 AI에게 이 문서 전체를 복사·붙여넣기 하면 바로 개발·코드 생성 요청이 가능합니다.  
> 현재 구현: `quize.html` + `css/quiz.css` + `js/*.js` + `firestore.rules` (2026-05-29 기준 MVP·관리자 빌더 보강 완료)

---

## 현재 진행 현황

**최종 업데이트**: 2026년 5월 29일  
**전체 상태**: **MVP + 관리자 퀴즈 빌더 안정화 완료** — 로컬 서버에서 생성·저장·공유·풀이·통계 동작 확인. QR·배포·실시간 동기화·운영용 보안 규칙은 추가 작업 단계.

### 완료된 기능

| 구분 | 요구사항 | 상태 | 비고 |
|------|----------|------|------|
| ① 시작 페이지 | Start 버튼, 우상단 통계·생성 아이콘 | ✅ 완료 | `showPage()` 기반 SPA 전환 |
| ② 퀴즈 풀이 | 공유 세트 1개, 1문항/화면, 이전·다음, 제출 | ✅ 완료 | 익명, Firestore `answers` 저장 |
| ② 결과 | `revealAnswer`에 따른 채점/완료 UI | ✅ 완료 | |
| ③ 통계 | 비밀번호, 주관식 리스트, 객관식 파이 차트 | ✅ 완료 | Chart.js는 통계 진입 시에만 로드 |
| ④ 퀴즈 생성 | 세트 CRUD, 공유 1개, 문항 추가·순서·삭제 | ✅ 완료 | `js/admin.js` (~580줄) |
| ④-a 문항 UI | 주관식/객관식 동적 폼 | ✅ 완료 | 주관식: 질문+정답 / 객관식: 질문+선지(기본 2개, +추가, 정답 체크박스) |
| ④-b 문항 관리 | 위로·아래로·삭제 | ✅ 완료 | `[위로]` `[아래로]` `[삭제]` 버튼, 입력 포커스 유지 |
| ④-c 저장·취소 | Firestore 저장, 미저장 취소 | ✅ 완료 | `serializeQuizSetData()` 정규화, 취소 시 임시 세트 목록 미반영 |
| Firebase | Firestore 연동 | ✅ 완료 | `js/config.js`, `loadSets` ID 병합 수정 |
| 관리자 인증 | 비밀번호 모달 | ✅ 완료 | `0311` (`js/state.js`), `pendingTarget` 버그 수정 (`js/ui.js`) |
| UI | 다크 모던, 모바일 대응 | ✅ 완료 | `css/quiz.css` (빌더용 `btn-order`, `correct-checkbox` 등) |
| 코드 구조 | CSS·JS 파일 분리 | ✅ 완료 | 2026-05-29 리팩터링 |
| Security Rules | 개발용 규칙 초안 | ⚠️ 파일만 | `firestore.rules` — **Firebase 콘솔에 게시 필요** |

### 프로젝트 파일 구조

```
26/
├── quize.html              ← HTML 마크업·페이지 div (~115줄)
├── firestore.rules         ← Firestore 보안 규칙 초안 (콘솔 게시 필요)
├── css/
│   └── quiz.css            ← 전체 스타일 (~413줄)
├── js/
│   ├── main.js             ← ES module 진입점
│   ├── state.js            ← 공유 상태·관리자 비밀번호
│   ├── nav.js              ← showPage, goHome
│   ├── config.js           ← Firebase·serializeQuizSetData·CRUD (~119줄)
│   ├── ui.js               ← 비밀번호 모달·관리자 아이콘
│   ├── quiz-play.js        ← 퀴즈 풀이·제출·결과
│   ├── stats.js            ← 통계·Chart.js 지연 로드
│   └── admin.js            ← 퀴즈 세트·문항 빌더 (~580줄)
└── AI-개발-요청서-퀴즈앱.md  ← 본 문서
```

### 실제 Firestore 컬렉션·필드 (구현 기준)

| 기획서(§4) | 현재 코드 |
|------------|-----------|
| `quiz_sets` | `quizSets` |
| `responses` | `answers` |
| `title` | `name` |
| `isShared` | `shared` |
| `showAnswerImmediately` | `revealAnswer` |
| `subjective` / `objective` | `short` / `multi` |

문항 객체: `id`, `type`, `question`, `options`(객관식), `correctAnswer`(주관식), 객관식 정답은 `options[].correct`.

저장 시 `config.js`의 `serializeQuizSetData()`가 타입별 필드만 남기고 `undefined`를 제거한 뒤 Firestore에 기록합니다.

### 로컬 테스트 방법

```powershell
cd "c:\Users\현\학교\동아리\26"
python -m http.server 8080
```

브라우저에서 **http://localhost:8080/quize.html** 접속.  
(`file://` 직접 열기는 ES module·Firebase 때문에 비권장.)

**테스트 순서**: 관리자(+) → 비밀번호 `0311` → 세트 생성·저장 → **공유** → 시작 화면 **START**.

**저장이 실패할 때**: Firebase 콘솔 → Firestore → **규칙** → 프로젝트 루트의 `firestore.rules` 내용 붙여넣기 → **게시**.

### 미완료·개선 예정

| 항목 | 설명 |
|------|------|
| `onSnapshot` 실시간 동기화 | 현재 `getDocs` 위주 — 공유 세트·통계 즉시 반영 미구현 |
| Firestore Rules 배포 | `firestore.rules` 작성됨 — Firebase 콘솔에 붙여넣기·게시 필요 |
| 스키마명 통일 | `quiz_sets` / `responses` 등 기획서 명칭으로 마이그레이션 미진행 |
| 배포·QR | GitHub Pages 등 호스팅·QR 연결 미진행 |
| 보안 강화 | 개발용 Rules(`allow read, write: if true`) → 운영 시 인증·제한 규칙으로 교체 |
| 관리자 PW·API 키 | 클라이언트 상수 노출 — 환경 분리·서버 검증 검토 |

### 알려진 이슈·해결 이력

| 이슈 | 원인 | 해결 |
|------|------|------|
| 흰 화면 | Chart.js가 `<head>`에서 동기 로드 | 통계 진입 시에만 동적 로드 (`stats.js`) |
| 파일 미저장 | 디스크에 코드 없음 | 에디터 저장 후 서버 재접속 |
| + 버튼 후 관리 페이지 미진입 | `closePwModal()`이 `pendingTarget`을 먼저 null 처리 | `target` 변수에 보관 후 분기 (`ui.js`) |
| 퀴즈 관리만 안 보임 | `loadSets` 완료 전까지 `showPage` 미호출 | 통계와 동일하게 화면 먼저 전환 (`admin.js`) |
| 잘못된 인터넷 오류 alert | 오류 시 `throw` + 과한 catch 메시지 | alert 제거, 목록에만 「다시 시도」 표시 |
| 저장 실패 | Firestore `undefined` 필드·문서 ID 덮어쓰기 | `serializeQuizSetData()`, `id: d.id` 병합 순서 수정 |
| 저장 권한 거부 | Security Rules 미설정 | `firestore.rules` 초안 추가 (콘솔 게시 필요) |
| 취소 시 임시 세트 노출 | 저장 전 `state.quizSets.push()` | 저장 성공 시에만 목록 반영 (`admin.js`) |
| admin.js / css 불일치 | 일부 파일만 되돌아감 | `admin.js`·`quiz.css` 동기화 |

---

## 1. 프로젝트 개요

- **목적**: QR 코드를 통해 접속하여 사용자가 퀴즈를 풀고, 관리자는 퀴즈를 생성 및 통계를 확인할 수 있는 웹 애플리케이션 개발
- **기술 스택**: HTML5, CSS3, Vanilla JavaScript (Single Page Application 형태 또는 간단한 페이지 라우팅), **Firebase (Firestore Database)**
- **핵심 특징**:
  - 별도의 회원가입 없이 사용자는 익명으로 퀴즈에 참여합니다.
  - 관리자 기능(통계 및 퀴즈 생성)은 비밀번호 인증을 통해 보호됩니다.
  - 데이터는 데이터베이스에 저장되어 새로고침하거나 브라우저를 닫아도 유지되며, 실시간 반영이 필요합니다.

---

## 2. Firebase 설정 정보 (Firebase Config)

데이터 저장 및 관리를 위해 아래의 Firebase 웹 앱 설정을 사용합니다. (Firestore 연동 필수)

```javascript
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB37CJDVRV4kGEJa7ldYPjLapwHwl5ZMk8",
  authDomain: "quiz-answer-management.firebaseapp.com",
  projectId: "quiz-answer-management",
  storageBucket: "quiz-answer-management.firebasestorage.app",
  messagingSenderId: "87045102866",
  appId: "1:87045102866:web:2853e569ab00e61f3767cb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
```

**CDN 모듈 import 예시** (기존 `quize.html` 패턴):

```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, /* ... */ } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
```

---

## 3. 상세 페이지 구성 및 요구사항

### ① 시작 페이지 (Start Page)

- **진입**: QR 코드를 통해 사용자가 가장 먼저 마주하는 페이지입니다.
- **UI 구성**:
  - **중앙**: 대형 **'Start'** 버튼 배치. (클릭 시 ② 퀴즈 풀이 페이지로 전환)
  - **우측 상단**: 작은 크기의 픽토그램 아이콘 2개가 세로로 배열됩니다.
    1. **선그래프 모양 아이콘**: 클릭 시 ③ 관리자 통계 페이지로 이동 (비밀번호 확인 창 표시)
    2. **더하기(+) 모양 아이콘**: 클릭 시 ④ 퀴즈 생성 페이지로 이동 (비밀번호 확인 창 표시, 편의상 '퀴즈 생성 버튼'이라 함)

### ② 퀴즈 풀이 페이지 (Quiz Interface)

- **동작 방식**: 현재 관리자가 **'공유(활성화)'** 상태로 지정한 1개의 퀴즈 세트를 데이터베이스에서 불러와 진행합니다.
- **사용자 정보**: 이름이나 닉네임 등 개인정보는 일절 받지 않습니다. (익명 풀이)
- **진행 흐름**:
  - 한 페이지에 **한 문제씩** 보여주는 방식입니다.
  - 하단에 **'이전'** 및 **'다음'** 버튼이 존재합니다.
  - 사용자는 최종 제출 전까지 언제든 '이전' 버튼을 눌러 앞선 문제로 돌아가 **답을 수정할 수 있습니다.**
  - 최종 문제를 풀고 **최종 제출**을 누르면 응답 데이터가 데이터베이스에 기록됩니다.
- **결과 화면**: 퀴즈가 끝난 후 정답 공개 여부는 해당 퀴즈 세트의 설정값(생성 시 관리자가 선택한 값)을 따릅니다.
  - 정답 공개 활성화 시: 제출 즉시 채점 결과 및 정답 확인 가능
  - 정답 공개 비활성화 시: 완료 안내 문구만 노출

### ③ 관리자 - 통계 페이지 (Admin Statistics)

- **접근 보안**: 누구나 접속할 수 없도록 **비밀번호 인증**을 통과해야 진입할 수 있습니다.
- **기능**: 사용자들이 최종 제출한 답변들을 실시간/누적 집계하여 보여줍니다.
- **응답 시각화 형식**:
  - **주관식 문항**: 사용자가 입력한 문자 또는 숫자 답변들을 리스트(텍스트 목록) 형태로 나열하여 보여줍니다.
  - **객관식 문항**: 선지별 선택 횟수(응답 수)를 집계하여, 숫자 표기와 함께 시각적으로 보기 편한 **파이 그래프(Pie Chart)** 형태로 구현해 주세요. (Chart.js 등 경량 라이브러리 활용 권장)

### ④ 관리자 - 퀴즈 생성 및 세트 관리 페이지 (Admin Quiz Creation)

- **접근 보안**: 통계 페이지와 마찬가지로 **비밀번호 인증**이 필요합니다.
- **개념 (퀴즈 세트)**: 여러 개의 퀴즈 문항을 묶어 하나의 '퀴즈 세트'로 관리하며, 관리자는 여러 개의 퀴즈 세트를 생성하고 저장해 둘 수 있습니다.
- **세트 관리 및 공유 기능**:
  - 저장된 여러 세트 중 **단 하나의 세트만 '공유 상태'로 지정**할 수 있습니다. (공유된 세트가 시작 페이지의 'Start' 버튼을 눌렀을 때 나오는 퀴즈가 됨)
  - 만약 현재 공유 중인 퀴즈 세트를 이 페이지에서 수정하면, 퀴즈 풀이 페이지에도 **즉각적으로 수정 사항이 반영**되어야 합니다.
  - 이미 만들어진 퀴즈 문항들의 **순서를 변경**하거나 문항을 **삭제**할 수 있는 편집 기능이 있어야 합니다.
- **퀴즈 문항 추가 규칙**:
  - 퀴즈를 만들기 전 **[주관식 / 객관식]** 유형을 먼저 선택합니다.
  - **주관식 선택 시**: 질문(질문 텍스트) 입력란 + 정답 입력란(문자 또는 숫자)으로 구성됩니다.
  - **객관식 선택 시**: 질문 입력란 + 선지 입력란으로 구성됩니다.
  - 객관식 선지는 **기본적으로 2개**가 생성됩니다.
  - 선지 아래에 있는 **`+` 버튼**을 누르면 필요에 따라 선지를 유동적으로 추가할 수 있습니다.
  - 각 선지 중 어떤 것이 정답인지 설정할 수 있는 체크 기능이 포함되어야 합니다.
- **세트 공통 설정**: 퀴즈를 다 만든 후, 이 세트의 '제출 후 정답 바로 공개 여부'를 On/Off 할 수 있는 토글이나 체크박스를 제공해 주세요.

---

## 4. 데이터베이스(Firestore) 구조 제안

코드를 짤 때 참고할 수 있도록 데이터 구조 예시입니다. 편리한 방식으로 변경해도 좋습니다.

### `quiz_sets` (컬렉션): 퀴즈 세트 정보 저장

| 필드 | 설명 |
|------|------|
| `id` | 세트 고유 ID |
| `title` | 세트 제목 |
| `isShared` | 현재 공유(활성화) 중인지 여부 (Boolean) |
| `showAnswerImmediately` | 제출 후 정답 즉시 공개 여부 (Boolean) |
| `quizzes` | 퀴즈 문항 배열 (Array of Objects) |

**문항 객체 예시**: `id`, `type` (`"subjective"` 또는 `"objective"`), `question`, `options` (객관식용 배열), `correctAnswer`, `order` (순서 정렬용)

### `responses` (컬렉션): 사용자 응답 저장

| 필드 | 설명 |
|------|------|
| `id` | 응답 고유 ID |
| `quizSetId` | 참여한 퀴즈 세트 ID |
| `submittedAt` | 제출 시간 (Timestamp) |
| `answers` | 문항 ID별 유저가 입력/선택한 답안 데이터 (Map) |

---

## 5. 기존 구현과의 매핑

신규 개발·추가 작업 시 참고용입니다. (2026-05-29: 단일 `quize.html` → `css/` + `js/` 모듈 분리 완료)

| 기획서 | 현재 `quize.html` |
|--------|-------------------|
| `quiz_sets` | `quizSets` |
| `responses` | `answers` |
| `title` | `name` |
| `isShared` | `shared` |
| `showAnswerImmediately` | `revealAnswer` |
| `subjective` | `short` |
| `objective` | `multi` |

**추가 구현 권장 사항**

1. **실시간 반영**: `getDocs`만 사용 시 공유 세트 수정이 풀이 화면에 즉시 반영되지 않을 수 있음 → `onSnapshot` 리스너 권장
2. **통계 실시간**: 제출 시 통계 페이지 자동 갱신도 리스너 적용 권장
3. **보안**: 관리자 비밀번호가 클라이언트 상수일 경우, Firestore Security Rules 및 환경 분리 검토

---

## 6. 다른 AI에 바로 붙여넣기용 — 통합 개발 프롬프트

```markdown
# [개발 요청] Firebase 연동 QR 퀴즈 웹앱

## 목표
QR 접속 → 익명 퀴즈 풀이. 관리자는 비밀번호 후 퀴즈 생성·통계 확인.
기술: HTML5, CSS3, Vanilla JS (SPA 페이지 전환), Firestore, Chart.js(객관식 통계).

## Firebase (필수)
projectId: quiz-answer-management
- apiKey: AIzaSyB37CJDVRV4kGEJa7ldYPjLapwHwl5ZMk8
- authDomain: quiz-answer-management.firebaseapp.com
- storageBucket: quiz-answer-management.firebasestorage.app
- messagingSenderId: 87045102866
- appId: 1:87045102866:web:2853e569ab00e61f3767cb
CDN 모듈 import 권장 (기존 quize.html 패턴).

## 페이지
1. 시작: 중앙 Start → 퀴즈. 우상단 세로 아이콘 2개(통계=선그래프, 생성=+) → 각각 비밀번호 모달.
2. 퀴즈: DB에서 shared=true인 세트 1개만. 1문항/화면, 이전/다음, 최종 제출 전 답 수정 가능. 제출 시 responses 저장. revealAnswer/showAnswerImmediately에 따라 결과 UI 분기.
3. 통계(관리자): 주관식=답변 리스트, 객관식=선지별 건수+파이 차트.
4. 생성(관리자): 다중 세트, 단 1개만 shared. 문항 추가(주관식: 질문+정답 / 객관식: 질문+선지2개 기본, +로 추가, 정답 체크), 순서 변경, 삭제, 세트별 정답 공개 On/Off.

## Firestore (권장 스키마, 이름 조정 가능)
quiz_sets/{id}: title, isShared, showAnswerImmediately, quizzes[{id,type,question,options?,correctAnswer,order}]
responses/{id}: quizSetId, submittedAt, answers{questionId: value}

## 기존 코드 (수정·확장 시)
파일: quize.html, css/quiz.css, js/*.js, firestore.rules (MVP+빌더 보강, 2026-05-29)
- 컬렉션: quizSets, answers
- 필드: name, shared, revealAnswer, questions[].type short|multi
- 저장: config.js → serializeQuizSetData() 필수 경유
- 관리자 PW: js/state.js (0311)
- 미구현: onSnapshot 실시간, Rules 콘솔 배포, 배포·QR

## UI
다크 모던 UI 유지, 모바일 대응, 문항 편집 UX 부드럽게.
한국어 UI.

위 요구사항을 모두 충족하며, 깔끔한 UI와 실시간 데이터 연동이 원활하게 이루어지는 HTML, CSS, JavaScript 코드를 작성해 주세요. 문항 순서 변경 및 추가/삭제 기능이 부드럽게 구현되도록 신경 써주시기 바랍니다.
```

---

## 7. 산출물 요청 예시

### 완료됨

- [x] SPA 형태 퀴즈 웹앱 (시작·풀이·결과·통계·관리자 생성)
- [x] Firebase Firestore 연동 (`quizSets`, `answers`)
- [x] `quize.html` + `css/quiz.css` + `js/*.js` 모듈 분리
- [x] 관리자 퀴즈 빌더 고도화 (`admin.js` — 유형별 UI, 순서 변경, 취소 UX, 이벤트 위임)
- [x] Firestore 저장 데이터 정규화 (`serializeQuizSetData`)
- [x] 비밀번호 모달 → 퀴즈 관리 페이지 진입 버그 수정 (`ui.js`)
- [x] `firestore.rules` 개발용 초안 (로컬 파일)

### 남은 작업 (우선순위 참고)

- [ ] `firestore.rules` Firebase 콘솔에 게시 (저장·공유 권한)
- [ ] `onSnapshot` 기반 실시간 동기화 (공유 세트·통계)
- [ ] 기획서 스키마명(`quiz_sets`, `responses`)으로 통일 리팩터링
- [ ] GitHub Pages 등 정적 호스팅·QR 코드 연결
- [ ] 운영용 Firestore Security Rules·관리자 인증 강화
