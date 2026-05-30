# apt-repairman DB Schema

Canonical schema: [`schema.mysql.sql`](./schema.mysql.sql)  
ER diagram: [`ER.mermaid`](./ER.mermaid)

이 DB는 아파트 단지/평형별 마감재 정보를 원본 문서와 함께 추적하기 위한 스키마다.

공통 정책:

- 모든 레코드는 immutable로 취급한다.
- 레코드를 수정할 때는 기존 레코드를 직접 변경하지 않는다. 기존 레코드는 `deleted = 1`로 논리 삭제하고, 변경된 내용을 새 레코드로 추가한다.
- 레코드를 삭제할 때도 물리 삭제하지 않는다. 반드시 `deleted = 1`로 변경하고, `modified_at = NOW()`가 함께 반영되어야 한다.
- `deleted`는 논리 삭제 플래그다. `0=정상`, `1=삭제`.
- `modified_at`은 MySQL의 `ON UPDATE CURRENT_TIMESTAMP`로 마지막 수정 시각을 자동 갱신한다. 명시 업데이트가 필요하면 `modified_at = NOW()`를 함께 설정한다.
- 지도 좌표는 `apartments.location POINT SRID 4326`에 저장한다.
- MySQL `POINT(x, y)` 순서는 `POINT(longitude, latitude)`이다.
- 현재 DB 레벨 immutable 강제 trigger는 `materials`에만 있다. 다른 테이블도 애플리케이션/운영 정책상 동일하게 append-only로 다룬다.

---

## apartments

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS apartments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '아파트 단지 고유 ID',
  sido VARCHAR(100) NOT NULL COMMENT '시/도 행정구역명',
  sigungu VARCHAR(100) NOT NULL COMMENT '시/군/구 행정구역명',
  eupmyeondong VARCHAR(100) NULL COMMENT '읍/면/동 행정구역명',
  name VARCHAR(255) NOT NULL COMMENT '아파트 단지명',
  address TEXT NULL COMMENT '도로명 또는 지번 주소',
  location POINT SRID 4326 NULL COMMENT '지도 검색용 WGS84 좌표. POINT(경도, 위도) 순서로 저장',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성 시각',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  UNIQUE KEY uq_apartments_location_name (sido, sigungu, name),
  KEY idx_apartments_location_name (sido, sigungu, eupmyeondong, name, deleted),
  SPATIAL INDEX idx_apartments_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='아파트 단지 기본 정보와 지도 좌표';
```

### 목적

아파트 단지의 기본 정보와 지도 좌표를 저장한다. 지도 화면에서 현재 viewport 안의 단지를 빠르게 찾는 기준 테이블이다.

### 다른 테이블과의 관계

- `unit_types.apartment_id` → `apartments.id`
- `source_documents.apartment_id` → `apartments.id`
- `source_files.apartment_id` → `apartments.id`
- `spaces.apartment_id` → `apartments.id`
- `materials.apartment_id` → `apartments.id`
- `media_refs`는 `owner_type='apartment'`, `owner_id=apartments.id`로 다형 참조한다. DB FK는 없다.

### 컬럼 설명

- `location`: WGS84 좌표. `POINT(longitude, latitude)` 순서로 저장한다.
- `deleted`: 논리 삭제 플래그. 일반 조회에서는 `deleted = 0` 조건을 붙인다.

좌표 조회 예:

```sql
SELECT ST_Y(location) AS latitude, ST_X(location) AS longitude
FROM apartments;
```

### 인덱스 설명

- `uq_apartments_location_name`: 같은 시/도 + 시/군/구 안에서 같은 단지명이 중복되지 않게 한다.
- `idx_apartments_location_name`: 지역/단지명 검색 및 삭제 제외 조회용 B-Tree 인덱스.
- `idx_apartments_location`: 지도 bounds 검색용 spatial index.

---

## unit_types

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS unit_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '평형/타입 고유 ID',
  apartment_id BIGINT UNSIGNED NOT NULL COMMENT '소속 아파트 ID',
  name VARCHAR(100) NOT NULL COMMENT '평형 또는 타입명. 예: 84A, 84C',
  area_m2 DOUBLE NULL COMMENT '대표 면적 값. 공급/전용 구분이 없을 때 사용',
  supply_area_m2 DOUBLE NULL COMMENT '공급면적 제곱미터',
  exclusive_area_m2 DOUBLE NULL COMMENT '전용면적 제곱미터',
  description TEXT NULL COMMENT '평형/타입 설명',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성 시각',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  UNIQUE KEY uq_unit_types_apartment_name (apartment_id, name),
  KEY idx_unit_types_apartment_name (apartment_id, name, deleted),
  CONSTRAINT fk_unit_types_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='아파트별 평형/세대 타입';
```

### 목적

아파트 단지별 평형/세대 타입을 저장한다. 예: `84A`, `84C`, `112`.

### 다른 테이블과의 관계

- `unit_types.apartment_id`는 `apartments.id`를 참조한다.
- `source_documents`, `source_files`, `spaces`, `materials`가 `unit_type_id`로 이 테이블을 참조한다.
- `media_refs`는 `owner_type='unit_type'`으로 다형 참조 가능하다.

### 컬럼 설명

- `area_m2`: 공급/전용 구분이 불확실하거나 대표 면적 하나만 있을 때 사용한다.
- `supply_area_m2`: 공급면적.
- `exclusive_area_m2`: 전용면적.

### 인덱스 설명

- `uq_unit_types_apartment_name`: 같은 아파트 안에서 타입명이 중복되지 않게 한다.
- `idx_unit_types_apartment_name`: 아파트별 타입 목록 조회 및 삭제 제외 조회를 빠르게 한다.

---

## source_documents

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS source_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '출처 문서 고유 ID',
  apartment_id BIGINT UNSIGNED NOT NULL COMMENT '문서가 속한 아파트 ID',
  unit_type_id BIGINT UNSIGNED NOT NULL COMMENT '문서가 속한 평형/타입 ID',
  title VARCHAR(255) NOT NULL COMMENT '출처 문서 제목. 예: 84C 마감재 리스트',
  document_type ENUM('image', 'pdf', 'excel', 'manual', 'web', 'other') NOT NULL COMMENT '문서의 논리적 유형',
  original_filename TEXT NULL COMMENT '사용자가 제공한 원본 파일명',
  source_label TEXT NULL COMMENT '출처 라벨. 예: Telegram sample images, 분양사 PDF',
  imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '문서 가져오기/등록 시각',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  notes TEXT NULL COMMENT '문서에 대한 운영 메모',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  KEY idx_source_documents_apartment_unit (apartment_id, unit_type_id, deleted),
  CONSTRAINT fk_source_documents_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_source_documents_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='자재 추출의 논리적 출처 문서 단위';
```

### 목적

자재 정보를 추출한 “논리적 문서”를 저장한다. 예를 들어 `84C 마감재 리스트`라는 문서 묶음 하나가 여기에 해당한다.

### 다른 테이블과의 관계

- `apartments`, `unit_types`에 속한다.
- `source_files.source_document_id`가 이 테이블을 참조한다.
- `materials.source_document_id`가 자재 정보의 출처로 이 테이블을 참조한다.
- `media_refs`는 `owner_type='source_document'`로 다형 참조 가능하다.

### 컬럼 설명

- `document_type`: 문서의 논리적 유형이다. 실제 파일이 여러 장이어도 문서 자체의 성격을 나타낸다.
- `source_label`: “어디서 온 자료인지” 사람이 알아보기 위한 라벨이다.
- `imported_at`: `created_at` 대신 문서 수집/등록 시각을 의미한다.

### 인덱스 설명

- `idx_source_documents_apartment_unit`: 특정 아파트/평형의 출처 문서 목록 조회에 사용한다.

---

## source_files

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS source_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '출처 파일 고유 ID',
  source_document_id BIGINT UNSIGNED NOT NULL COMMENT '소속 출처 문서 ID',
  apartment_id BIGINT UNSIGNED NOT NULL COMMENT '파일이 속한 아파트 ID. 조회 최적화를 위한 중복 FK',
  unit_type_id BIGINT UNSIGNED NULL COMMENT '파일이 속한 평형/타입 ID. 문서 전체 파일이면 NULL 가능',
  type ENUM('image', 'pdf', 'url') NOT NULL COMMENT '파일/원본의 매체 유형',
  source_type ENUM('blob', 'url') NOT NULL COMMENT '원본 저장 방식. blob=DB 내부 저장, url=외부 URL',
  source TEXT NULL COMMENT 'source_type=url일 때 원본 URL',
  mime_type VARCHAR(100) NULL COMMENT 'MIME 타입. 예: image/jpeg, application/pdf',
  filename TEXT NULL COMMENT '저장 또는 표시용 파일명',
  data LONGBLOB NULL COMMENT 'source_type=blob일 때 원본 바이너리 데이터',
  width INT NULL COMMENT '이미지 너비 픽셀',
  height INT NULL COMMENT '이미지 높이 픽셀',
  size_bytes BIGINT NULL COMMENT '파일 크기 바이트',
  sha256 CHAR(64) NULL COMMENT '중복 감지용 SHA-256 해시',
  caption TEXT NULL COMMENT '파일 설명 또는 캡션',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '같은 문서 안에서 파일 표시 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성 시각',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  KEY idx_source_files_document (source_document_id, deleted),
  KEY idx_source_files_apartment (apartment_id, unit_type_id, deleted),
  KEY idx_source_files_sha256 (sha256, deleted),
  CONSTRAINT fk_source_files_document FOREIGN KEY (source_document_id) REFERENCES source_documents(id) ON DELETE RESTRICT,
  CONSTRAINT fk_source_files_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_source_files_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT,
  CONSTRAINT chk_source_files_payload CHECK (
    (type IN ('image', 'pdf') AND source_type = 'blob' AND data IS NOT NULL)
    OR (type = 'url' AND source_type = 'url' AND source IS NOT NULL)
    OR (type = 'pdf' AND source_type = 'url' AND source IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='출처 문서를 구성하는 실제 이미지/PDF/URL 원본';
```

### 목적

`source_documents`가 논리적 문서라면, `source_files`는 그 문서를 구성하는 실제 원본 파일/URL이다. 이미지 여러 장, PDF 한 개, 외부 URL 등을 보존한다.

### 다른 테이블과의 관계

- `source_document_id` → `source_documents.id`
- `apartment_id` → `apartments.id`
- `unit_type_id` → `unit_types.id` nullable

### 컬럼 설명

- `type`: 원본의 매체 유형이다.
- `source_type`: 실제 저장 방식이다. `blob`이면 `data`, `url`이면 `source`를 사용한다.
- `data`: DB 안에 직접 저장하는 원본 바이너리.
- `sha256`: 같은 파일 재업로드를 감지하기 위한 해시.
- `sort_order`: 다중 이미지 문서에서 페이지 순서를 표현한다.

### 인덱스 설명

- `idx_source_files_document`: 문서별 원본 파일 목록 조회에 사용한다.
- `idx_source_files_apartment`: 아파트/평형별 원본 파일 조회에 사용한다.
- `idx_source_files_sha256`: 중복 파일 검사에 사용한다.

---

## image_blobs

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS image_blobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 Blob 고유 ID',
  mime_type VARCHAR(100) NOT NULL COMMENT '이미지 MIME 타입',
  filename TEXT NULL COMMENT '원본 또는 표시용 파일명',
  data LONGBLOB NOT NULL COMMENT '이미지 바이너리 데이터',
  width INT NULL COMMENT '이미지 너비 픽셀',
  height INT NULL COMMENT '이미지 높이 픽셀',
  size_bytes BIGINT NULL COMMENT '이미지 크기 바이트',
  sha256 CHAR(64) NULL COMMENT '중복 감지용 SHA-256 해시',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성 시각',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  UNIQUE KEY uq_image_blobs_sha256 (sha256),
  KEY idx_image_blobs_sha256 (sha256, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='재사용 가능한 이미지 바이너리 저장소';
```

### 목적

자재 사진, crop 이미지, 썸네일 등 재사용 가능한 이미지 바이너리를 저장한다.

### 다른 테이블과의 관계

- 명시 FK는 없다.
- `media_refs.source_type='blob'`일 때 `media_refs.source`에 `image_blobs.id` 문자열을 저장하는 방식으로 참조한다.

### 컬럼 설명

- `data`: 이미지 바이너리 본문.
- `sha256`: 이미지 중복 저장 방지에 사용한다.

### 인덱스 설명

- `uq_image_blobs_sha256`: 같은 이미지 해시 중복 저장을 방지한다.
- `idx_image_blobs_sha256`: 삭제 제외 조건을 포함한 해시 검색용이다.

---

## spaces

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS spaces (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '공간 고유 ID',
  apartment_id BIGINT UNSIGNED NOT NULL COMMENT '공간이 속한 아파트 ID',
  unit_type_id BIGINT UNSIGNED NOT NULL COMMENT '공간이 속한 평형/타입 ID',
  name VARCHAR(255) NOT NULL COMMENT '공간명. 예: 현관, 거실, 주방, 욕실',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '공간 표시 순서',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  UNIQUE KEY uq_spaces_apartment_unit_name (apartment_id, unit_type_id, name),
  KEY idx_spaces_apartment_unit_name (apartment_id, unit_type_id, name, deleted),
  CONSTRAINT fk_spaces_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spaces_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='평형별 실내 공간 분류';
```

### 목적

평형별 공간 분류를 저장한다. 예: 현관, 거실, 주방, 침실, 욕실.

### 다른 테이블과의 관계

- `spaces.apartment_id` → `apartments.id`
- `spaces.unit_type_id` → `unit_types.id`
- `materials.space_id`가 이 테이블을 참조한다.

### 컬럼 설명

- `sort_order`: UI에서 공간을 보여줄 순서다.

### 인덱스 설명

- `uq_spaces_apartment_unit_name`: 같은 아파트/평형 안에서 공간명이 중복되지 않게 한다.
- `idx_spaces_apartment_unit_name`: 평형별 공간 목록 조회 및 삭제 제외 조회에 사용한다.

---

## material_categories

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS material_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '자재 카테고리 고유 ID',
  name VARCHAR(255) NOT NULL COMMENT '카테고리명. 예: 바닥재, 벽지, 조명',
  parent_id BIGINT UNSIGNED NULL COMMENT '상위 카테고리 ID. NULL이면 최상위 카테고리',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '카테고리 표시 순서',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  UNIQUE KEY uq_material_categories_name_parent (name, parent_id),
  KEY idx_categories_parent_sort (parent_id, sort_order, deleted),
  CONSTRAINT fk_material_categories_parent FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='자재 카테고리 트리';
```

### 목적

자재 카테고리 트리를 저장한다. 예: 바닥재, 벽지, 타일, 가구, 조명.

### 다른 테이블과의 관계

- `parent_id`로 자기 자신을 참조해 계층 구조를 만든다.
- `materials.category_id`가 이 테이블을 참조한다.

### 컬럼 설명

- `parent_id`: 상위 카테고리. NULL이면 루트 카테고리다.
- `sort_order`: 같은 parent 안에서 표시 순서다.

### 인덱스 설명

- `uq_material_categories_name_parent`: 같은 parent 아래 동일 카테고리명 중복을 방지한다.
- `idx_categories_parent_sort`: 카테고리 트리 조회와 정렬에 사용한다.

---

## materials

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '자재 레코드 고유 ID',
  apartment_id BIGINT UNSIGNED NOT NULL COMMENT '자재가 속한 아파트 ID',
  unit_type_id BIGINT UNSIGNED NOT NULL COMMENT '자재가 속한 평형/타입 ID',
  space_id BIGINT UNSIGNED NULL COMMENT '자재가 배치된 공간 ID. 미분류 시 NULL',
  category_id BIGINT UNSIGNED NULL COMMENT '자재 카테고리 ID. 미분류 시 NULL',
  source_document_id BIGINT UNSIGNED NULL COMMENT '자재 정보의 출처 문서 ID. 출처 미상 시 NULL',
  room_name TEXT NULL COMMENT '원문 또는 OCR에서 추출된 공간명. spaces 정규화 전/보조값',
  location TEXT NULL COMMENT '공간 내 위치 설명. 예: 벽, 바닥, 주방 상판',
  item_name TEXT NOT NULL COMMENT '자재/품목명',
  manufacturer TEXT NULL COMMENT '제조사명',
  brand TEXT NULL COMMENT '브랜드명',
  model_name TEXT NULL COMMENT '모델명',
  product_code TEXT NULL COMMENT '제품 코드 또는 품번',
  color TEXT NULL COMMENT '색상 정보',
  size TEXT NULL COMMENT '규격/크기 정보',
  specification TEXT NULL COMMENT '상세 사양',
  finish TEXT NULL COMMENT '마감 정보',
  notes TEXT NULL COMMENT '운영 메모 또는 보충 설명',
  raw_text TEXT NULL COMMENT 'OCR/LLM 추출 전후의 원문 근거 텍스트',
  confidence DOUBLE NULL COMMENT '추출 신뢰도. 0~1 범위',
  version_group_id VARCHAR(255) NULL COMMENT '같은 자재의 버전들을 묶는 논리 그룹 ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성 시각',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  KEY idx_materials_apartment_unit (apartment_id, unit_type_id, deleted),
  KEY idx_materials_apartment_unit_space (apartment_id, unit_type_id, space_id, deleted),
  KEY idx_materials_apartment_unit_category (apartment_id, unit_type_id, category_id, deleted),
  KEY idx_materials_model (manufacturer(100), brand(100), model_name(100), deleted),
  KEY idx_materials_version_group (version_group_id, deleted),
  CONSTRAINT fk_materials_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_materials_unit_type FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_materials_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL,
  CONSTRAINT fk_materials_category FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_materials_source_document FOREIGN KEY (source_document_id) REFERENCES source_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='평형별 마감재/자재 추출 결과. 내용은 append-only 정책';
```

### 목적

아파트/평형/공간별 자재 정보를 저장한다. OCR/LLM 추출 결과와 사람이 검수한 정보를 함께 담는 핵심 테이블이다.

### 다른 테이블과의 관계

- `apartment_id` → `apartments.id`
- `unit_type_id` → `unit_types.id`
- `space_id` → `spaces.id`, 삭제 시 NULL 처리
- `category_id` → `material_categories.id`, 삭제 시 NULL 처리
- `source_document_id` → `source_documents.id`, 삭제 시 NULL 처리
- `media_refs`는 `owner_type='material'`로 다형 참조 가능하다.

### 컬럼 설명

- `room_name`: 원문/OCR의 공간명. 정규화된 `spaces`와 다를 수 있다.
- `location`: 자재가 공간 내부에서 놓이는 위치다. 지도 좌표가 아니다.
- `raw_text`: 추출 근거가 되는 원문 텍스트다.
- `confidence`: 추출 신뢰도. `0~1` 범위로 사용한다.
- `version_group_id`: 자재 row는 append-only라서 수정 대신 새 row를 넣을 때, 같은 논리 자재를 묶기 위한 값이다.

### 인덱스 설명

- `idx_materials_apartment_unit`: 특정 아파트/평형의 자재 목록 조회용.
- `idx_materials_apartment_unit_space`: 공간별 자재 목록 조회용.
- `idx_materials_apartment_unit_category`: 카테고리별 자재 목록 조회용.
- `idx_materials_model`: 제조사/브랜드/모델명 검색용 prefix index.
- `idx_materials_version_group`: 같은 논리 자재의 버전 이력 조회용.

---

## media_refs

### Create 쿼리

```sql
CREATE TABLE IF NOT EXISTS media_refs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '미디어 참조 고유 ID',
  owner_type ENUM('material', 'source_document', 'apartment', 'unit_type') NOT NULL COMMENT '미디어가 연결되는 대상 타입',
  owner_id BIGINT UNSIGNED NOT NULL COMMENT 'owner_type에 해당하는 대상 레코드 ID',
  media_type ENUM('image') NOT NULL COMMENT '미디어 유형. 현재는 image만 사용',
  source_type ENUM('blob', 'url') NOT NULL COMMENT '미디어 저장 방식. blob=image_blobs 참조, url=외부 URL',
  source TEXT NOT NULL COMMENT 'source_type=blob이면 image_blobs.id 문자열, url이면 외부 URL',
  role ENUM('reference', 'crop', 'original', 'before', 'after', 'thumbnail') NOT NULL DEFAULT 'reference' COMMENT '미디어 역할. reference/crop/original/thumbnail 등',
  caption TEXT NULL COMMENT '미디어 설명 또는 캡션',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '같은 대상 안에서 미디어 표시 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성 시각',
  modified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 최종 수정 시각',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '논리 삭제 여부. 0=정상, 1=삭제',
  KEY idx_media_refs_owner (owner_type, owner_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='여러 엔티티에 연결 가능한 이미지 참조';
```

### 목적

자재, 출처 문서, 아파트, 평형 등에 이미지를 연결한다. 특정 테이블 하나에 종속되지 않도록 다형 참조 구조를 사용한다.

### 다른 테이블과의 관계

- 명시 FK는 없다.
- `owner_type + owner_id`로 다음 테이블을 다형 참조한다.
  - `material` → `materials.id`
  - `source_document` → `source_documents.id`
  - `apartment` → `apartments.id`
  - `unit_type` → `unit_types.id`
- `source_type='blob'`이면 `source` 값이 `image_blobs.id`를 의미한다.
- `source_type='url'`이면 `source` 값이 외부 이미지 URL이다.

### 컬럼 설명

- `owner_type`: 어떤 종류의 엔티티에 붙는 이미지인지 나타낸다.
- `owner_id`: `owner_type`에 해당하는 테이블의 ID다.
- `source`: blob 참조와 URL을 모두 담기 위해 TEXT로 둔다.
- `role`: 원본, crop, 썸네일, before/after 등 이미지 용도를 구분한다.

### 인덱스 설명

- `idx_media_refs_owner`: 특정 엔티티에 연결된 이미지 목록을 빠르게 조회한다.

---

## source_documents와 source_files의 차이

- `source_documents`: 논리적 출처 문서. 예: “84C 마감재 리스트”.
- `source_files`: 그 문서를 구성하는 실제 원본 파일/URL. 예: 이미지 3장, PDF 1개, 웹 URL 1개.

관계 예:

```text
source_documents 1개
  └─ source_files N개
```

---

## 지도 viewport 검색 예시

```sql
SELECT
  id,
  name,
  address,
  ST_Y(location) AS latitude,
  ST_X(location) AS longitude
FROM apartments
WHERE deleted = 0
  AND location IS NOT NULL
  AND MBRContains(
    ST_SRID(
      ST_MakeEnvelope(
        POINT(:west, :south),
        POINT(:east, :north)
      ),
      4326
    ),
    location
  );
```

- `west/east`: longitude
- `south/north`: latitude
- `POINT(:west, :south)`처럼 경도, 위도 순서로 넣는다.
