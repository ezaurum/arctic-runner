# Arctic Runner

MSX 남극탐험 오마주 3D 펭귄 러너 게임. Three.js + TypeScript + Vite 기반.

## 실행

```bash
mise install        # Node.js 22 설치
pnpm install        # 의존성 설치
pnpm dev            # 개발 서버 (http://localhost:5173)
pnpm build          # 프로덕션 빌드
```

## 조작

| 키 | 동작 |
|---|---|
| ← / A | 왼쪽 이동 |
| → / D | 오른쪽 이동 |
| Space | 점프 |
| Enter | 게임 시작 / 재시작 |

## 게임 시스템

### 게임 흐름

```
TITLE → STAGE_INTRO(2.5초) → PLAYING → STAGE_COMPLETE → (다음 스테이지 or GAME_OVER)
                                 ↓
                         라이프 0 / 시간 초과 → GAME_OVER → TITLE
```

### 플레이어 (펭귄)

4가지 상태를 가진다:

| 상태 | 설명 |
|---|---|
| **Running** | 기본 상태. 자동 전진 + 좌우 이동 |
| **Jumping** | Space 입력 시 포물선 점프 |
| **Stumbling** | 장애물 충돌 후 경직. 좌우 넉백 + 속도 감소 |
| **Flying** | 프로펠러 아이템 획득 시 공중 비행. 충돌 면역 |

- 속도는 자동으로 가속되며 최대속도까지 올라감
- 충돌 후 2초간 무적 (깜빡임 표시)
- 라이프 3개, 0이 되면 게임 오버

### 장애물

| 종류 | 설명 | 속도 감소 | 경직 시간 | 특수 |
|---|---|---|---|---|
| **얼음 구멍** | 도로 위 구멍 | 50% | 0.8초 | 점프로 회피 가능 |
| **크레바스** | 넓은 균열 | 80% | 2.0초 | 타이머 -5초 |
| **물개** | 도로 위 물개 | 60% | 1.0초 | 좌우 밀림 |

충돌 시:
- 장애물 반대 방향으로 넉백
- 순간 속도 감소 후 재가속
- "딩딩딩" 효과음 (3연타 상승음)

### 수집 아이템

| 종류 | 효과 |
|---|---|
| **물고기** | +100점 (빈번 출현) |
| **깃발** | +500점 (희귀) |
| **프로펠러** | 5초간 비행 + 1.5배속, 충돌 면역 |

### 스테이지

3개 스테이지를 순서대로 클리어한다. 제한 시간 내에 목표 거리를 달성하면 클리어.

| # | 이름 | 거리 | 제한시간 | 특징 |
|---|---|---|---|---|
| 1 | Base Alpha | 3,000m | 120초 | 완만한 커브, 맑은 날씨 |
| 2 | Glacier Pass | 4,000m | 140초 | 급커브, 눈 50% |
| 3 | Blizzard Peak | 5,000m | 160초 | 극한 커브, 폭설 |

스테이지가 진행될수록:
- 도로 커브와 고도 변화가 심해짐
- 장애물 출현 빈도 증가, 등장 시점 앞당겨짐
- 안개가 짙어져 시야 감소
- 눈 파티클 강도 증가

### 점수

- 아이템 수집: 물고기 100점, 깃발 500점
- 스테이지 클리어 보너스: 2,000점 + (남은 시간 × 50점)
- 전 스테이지 합산

### 충돌 판정

AABB(축 정렬 바운딩 박스) 방식:
- 펭귄: 0.4 × 0.4 반경
- 장애물: 1.5 × 1.2 반경
- 아이템: 0.5 × 0.5 반경
- 점프 중 얼음 구멍 통과 가능
- 비행 중 모든 장애물 면역

## 기술 구조

### 기술 스택

| 구성 | 기술 |
|---|---|
| 렌더링 | Three.js (WebGL 3D) |
| 언어 | TypeScript 5.x |
| 번들러 | Vite 6.x |
| 패키지 | pnpm |
| 런타임 | Node.js 22 (mise) |
| 사운드 | Web Audio API (합성) |
| UI | HTML/CSS DOM 오버레이 |

### 디렉토리

```
src/
├── main.ts                 # 엔트리 포인트
├── Game.ts                 # 게임 루프 + 상태 머신
├── config/
│   ├── types.ts            # TypeScript 인터페이스
│   └── constants.ts        # 도로 폭(12), 세그먼트 길이(10), 수(40)
├── core/
│   ├── AssetLoader.ts      # JSON 로딩
│   ├── InputManager.ts     # 키보드 입력
│   ├── EventBus.ts         # 이벤트 발행/구독
│   └── SoundManager.ts     # 효과음 (Web Audio 합성)
├── scene/
│   ├── SceneManager.ts     # Three.js 씬, 조명, 안개
│   ├── CameraController.ts # 체이스 카메라 (lerp 추적)
│   ├── RoadManager.ts      # 도로+지면 세그먼트 링 버퍼
│   └── SkyManager.ts       # 하늘, 산, 눈 파티클
├── entities/
│   ├── Penguin.ts          # 플레이어 (이동, 점프, 발 애니메이션)
│   ├── Obstacle.ts         # 장애물 (구멍, 크레바스, 물개)
│   ├── Collectible.ts      # 아이템 (물고기, 깃발, 프로펠러)
│   ├── ObstacleFactory.ts  # 오브젝트 풀
│   └── CollectibleFactory.ts
├── systems/
│   ├── CollisionSystem.ts  # AABB 충돌 판정
│   ├── SpawnSystem.ts      # 스테이지 설정 기반 스폰
│   ├── ScoreSystem.ts      # 점수 + 보너스
│   └── StageSystem.ts      # 거리/타이머/스테이지 진행
├── ui/
│   ├── HUD.ts              # 점수, 타이머, 속도, 라이프, 진행률
│   ├── TitleScreen.ts      # 타이틀 화면
│   ├── StageIntro.ts       # 스테이지 시작 연출
│   └── GameOverScreen.ts   # 게임 오버 / 올 클리어
└── utils/
    ├── math.ts             # lerp, clamp, 키프레임 보간
    └── pool.ts             # 제네릭 오브젝트 풀
```

### 핵심 메카니즘

**도로 생성 (RoadManager)**
- 40개 세그먼트를 링 버퍼로 관리
- 각 세그먼트의 4개 꼭짓점을 커브/고도 키프레임에 따라 변형 (warp)
- 인접 세그먼트의 이음새가 정확히 맞도록 보장
- 플레이어 뒤 60유닛 이상 지난 세그먼트를 앞으로 재배치
- 도로 양옆에 30유닛 폭 설원이 함께 이동

**카메라 (CameraController)**
- 펭귄 뒤 (Y+4, Z+7) 오프셋에서 추적
- 프레임 독립적 lerp (smoothing 0.15)
- 전방 15유닛 지점을 lookAt

**스폰 (SpawnSystem)**
- 세그먼트 재활용 이벤트(`segmentRecycled`)에 반응
- stages.json의 frequency/startAfter 설정에 따라 확률적 스폰
- 도로의 커브 x좌표와 고도 y를 반영하여 도로 위에 정확히 배치

**이벤트 버스**
- `segmentRecycled` → SpawnSystem (장애물/아이템 생성)
- `obstacleHit` → SoundManager (충돌음)
- `collectItem` → ScoreSystem (점수), SoundManager (수집음)

**오브젝트 풀 (pool.ts)**
- 타입별 5개 초기 생성, 부족 시 동적 확장
- 재활용 시 deactivate → 비활성화 후 풀 반환

**사운드 (SoundManager)**
- Web Audio API 오실레이터 합성 (외부 파일 불필요)
- 충돌: 600→800→1000Hz 3연타 사인파
- 수집: 880→1320Hz 상승 사인파
- 클리어: C5-E5-G5-C6 삼각파 팡파레
- 게임오버: 400→200Hz 하강 톱니파

## 밸런스 튜닝

`public/data/balance.json`과 `public/data/stages.json`을 수정하면 코드 변경 없이 게임 밸런스를 조정할 수 있다. 개발 서버 실행 중 파일 저장 후 브라우저 리로드로 즉시 반영.
