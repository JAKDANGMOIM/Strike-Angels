# Strike Angels 코드 구성 가이드

이 가이드는 [구현계획서.md](../구현계획서.md)에 정의된 프로젝트의 코드 구성 및 파일 구조에 대한 규칙을 제공합니다.

## 프로젝트 구조 (Vite + Phaser 3 기반)

### 폴더 구조

```
src/
├── assets/                 # 이미지, 스프라이트, 오디오 (비빌드 에셋의 경우 public/assets 도 사용)
├── config/                 # 게임 상수 및 JSON 데이터 관리 영역
├── scenes/                 # 씬(Scene) 관련 스크립트 모음
│   ├── index.ts
│   ├── GameScene.ts
│   └── UIScene.ts
├── entities/               # 게임 오브젝트 엔티티 스크립트 모음
│   ├── Player.ts           # 플레이어 클래스
│   ├── Enemy.ts            # 적 클래스 (추상)
│   ├── EnemyUFO.ts
│   ├── Bullet.ts
│   └── Item.ts
├── systems/                # 영역 점령 등 메인 비즈니스 로직 및 컨텍스트
│   └── TerritoryManager.ts
├── utils/                  # 수학 함수 및 유틸리티
└── main.ts                 # 게임 진입점 (Phaser.Game 인스턴스화)
```

## 코딩 컨벤션

### 네이밍 규칙

- 클래스 및 엔티티 파일: PascalCase (예: `Player.ts`, `GameScene.ts`)
- 메서드: camelCase (예: `updatePosition()`)
- 변수: camelCase (예: `moveSpeed`)
- 상수(config): UPPER_SNAKE_CASE (예: `MAX_HEALTH`)
- 인터페이스: 'I' 접두사 + PascalCase (예: `IEnemyConfig`)

### 컴포넌트 설계

- Phaser의 `Phaser.Physics.Arcade.Sprite` 등 코어 객체를 상속받아 사용
- 단일 책임 원칙(SRP)에 입각하여 엔티티별 기능 코드를 나눕니다.
- 엔티티 간 이벤트 전달은 `Phaser.Events.EventEmitter`나 Scene의 `this.events`를 활용해 결합도를 낮춥니다.

## 주요 클래스 구조

### 플레이어 시스템 (`Player.ts`)

- 직접 이동 및 입력 로직 핸들링
- 무기 발사(`fire()`) 등 통합
- 탄창/총알은 `BulletGroup` 등 물리 그룹을 활용하여 관리

### 영역 점령 시스템 (`system/TerritoryManager.ts`)

- Graphics 나 Grid 기반 점령 알고리즘
- 게임 씬에서 위임받아 영역 정보를 관리 및 계산

### 적 시스템 (`Enemy.ts`, `EnemySpawner.ts`)

- 다수의 적이 등장할 수 있도록 풀링 가능한(Phaser Group) 시스템을 설계
- 개별 엔티티에서 고유의 움직임 구현

### 게임 관리 및 상태

- 상태값(점수, 경험치, 남은 시간)은 Scene 단계에서 관리하거나 별도 `Registry`(Data Manager)에 저장
- `UIScene.ts` 등에서 덧씌워진 Scene 형태로 분리하여 업데이트를 수행
