export type Material = {
  part: string;
  category: string;
  brand: string;
  model: string;
  spec: string;
  price?: number | null;
  price_min?: number;
  price_max?: number;
  price_cut_10cm?: number;
  price_roll?: number;
  unit: string;
  note: string;
};

export type MaterialRoom = {
  name: string;
  materials: Material[];
};

export type MaterialDatabase = {
  complex_type: string;
  data_type: string;
  currency: "KRW";
  price_note: string;
  rooms: MaterialRoom[];
};

export const materialDatabase: MaterialDatabase = {
  complex_type: "84㎡ sample",
  data_type: "sample_material_database",
  currency: "KRW",
  price_note: "온라인 판매가 예시. 배송비, 시공비, 옵션, 부자재 별도 가능.",
  rooms: [
    {
      name: "거실",
      materials: [
        { part: "바닥", category: "강마루", brand: "동화자연마루", model: "나투스진 소폭 JP002 퓨어아이보리", spec: "1박스 약 1평", price: 67100, unit: "box", note: "거실/방 공통 바닥재 후보" },
        { part: "벽", category: "실크벽지", brand: "LX하우시스 Z:IN", model: "디아망 PR043-01", spec: "폭 106cm × 길이 15.5m, 시공 가능 면적 약 5평", price: null, unit: "roll", note: "가격 확인 필요" },
        { part: "벽", category: "실크벽지", brand: "LX하우시스 Z:IN", model: "디아망 PR029-01 프레스코 화이트", spec: "풀바른벽지, 셀프도배용 판매 사례", price: 65000, unit: "product", note: "거실/방 벽지 후보" },
        { part: "천장/조명", category: "스위치", brand: "르그랑", model: "아테오 화이트 KS규격 국내형 사각 1구 스위치", spec: "매립형 전등 스위치", price: 24200, unit: "ea", note: "프리미엄 스위치류 예시" },
        { part: "천장/조명", category: "스위치", brand: "르그랑", model: "아테오 유럽형 스위치 1구", spec: "유럽형 1구 스위치", price_min: 24420, price_max: 24550, unit: "ea", note: "대체 스위치 후보" },
      ],
    },
    {
      name: "방1 / 안방",
      materials: [
        { part: "바닥", category: "강마루", brand: "동화자연마루", model: "나투스진 소폭 JP010 퓨어브라운", spec: "1박스 약 1평", price: 67100, unit: "box", note: "거실과 다른 색상 옵션 예시" },
        { part: "바닥", category: "강마루", brand: "동화자연마루", model: "나투스진 테라 JE5002 테라허니", spec: "테라 라인", price: 76300, unit: "box", note: "상위/다른 라인 대체 예시" },
        { part: "벽", category: "실크벽지", brand: "LX하우시스 Z:IN", model: "디아망 PR031-02 내추럴회벽 크림 화이트", spec: "풀바른벽지, 셀프도배용 판매 사례", price: 65000, unit: "product", note: "안방 벽지 후보" },
        { part: "붙박이장", category: "가구 경첩", brand: "BLUM", model: "블룸 덮방 타입 110˚ 경첩, 인세르타 고정, 댐퍼 외장형", spec: "소프트클로징, 탈부착 가능", price: 4000, unit: "ea", note: "붙박이장/싱크장 하드웨어 후보" },
        { part: "붙박이장", category: "가구 경첩", brand: "BLUM", model: "블룸 110도/107도 댐퍼 경첩", spec: "싱크경첩/가구경첩", price: 4200, unit: "ea", note: "대체 경첩 후보" },
      ],
    },
    {
      name: "방2",
      materials: [
        { part: "바닥", category: "장판/모노륨", brand: "LX하우시스", model: "지아자연애 ZJ34332-11 웜 오크", spec: "2.2T, 1롤 30m, 부자재 포함 판매 사례", price: 550000, unit: "roll", note: "방 바닥재 후보" },
        { part: "바닥", category: "장판/모노륨", brand: "LX하우시스", model: "지아자연애 ZJ34331-11 윈터 오크", spec: "2.2T, 1롤 30m", price: 550000, unit: "roll", note: "대체 색상 예시" },
        { part: "바닥", category: "장판/모노륨", brand: "LX하우시스", model: "지아자연애 ZJ44241-22 로즈 마블", spec: "2.2T, 1롤 30m", price: 550000, unit: "roll", note: "마블 패턴 예시" },
        { part: "바닥", category: "장판/모노륨", brand: "KCC", model: "숲옥 2.2T 모노륨 장판", spec: "10cm 절단판매 / 롤판매", price_cut_10cm: 1570, price_roll: 390000, unit: "10cm_or_roll", note: "장판 대체재 후보" },
        { part: "벽", category: "합지/실크벽지", brand: "LX하우시스 Z:IN", model: "만능 풀바른벽지 49553-05 심플텍스쳐 그레이", spec: "장폭합지, 셀프도배용", price: 23000, unit: "product", note: "작은방 벽지 후보" },
      ],
    },
    {
      name: "주방",
      materials: [
        { part: "주방 벽", category: "벽타일", brand: "이즈세라믹", model: "ISBWM 37107 IV", spec: "300×600 벽타일, 욕실/주방 벽타일", price: 20500, unit: "sales_unit_unknown", note: "주방 벽타일 후보" },
        { part: "주방 벽", category: "벽타일", brand: "이즈세라믹", model: "ISBWM 37083", spec: "300×600 벽타일, 화장실/주방 벽타일", price: 20500, unit: "sales_unit_unknown", note: "주방 벽타일 후보" },
        { part: "주방 벽", category: "벽타일", brand: "이즈세라믹", model: "ISBWM 37009 까라라", spec: "300×600 까라라 패턴 벽타일", price: 20500, unit: "sales_unit_unknown", note: "대체 타일 예시" },
        { part: "싱크볼", category: "싱크볼", brand: "한샘 MSYS", model: "엠시스 CDS85 싱크볼", spec: "주방 싱크볼", price: 99000, unit: "ea", note: "싱크볼 후보" },
        { part: "싱크볼", category: "싱크볼", brand: "도요우라/한샘 직수입", model: "N760Z 싱크볼 세트", spec: "종속부속 포함, 한샘 직수입 판매 사례", price: 357880, unit: "set", note: "고급형 싱크볼 후보" },
        { part: "주방 후드", category: "렌지후드", brand: "하츠", model: "K60S", spec: "통후드, 200CMH, 최대소음 53dB, 598×415×600mm", price: 110000, unit: "ea", note: "기본형 렌지후드 후보" },
        { part: "주방 후드", category: "렌지후드", brand: "하츠", model: "IB90S-HZ 매립형 히든 후드", spec: "매립형 후드", price: 240000, unit: "ea", note: "매립형 후드 후보" },
        { part: "주방 후드", category: "렌지후드", brand: "하츠", model: "CSLP60P-WHHZCI 포세린 프리미엄 후드", spec: "프리미엄 후드", price: 376000, unit: "ea", note: "고급형 후드 후보" },
        { part: "싱크장 하드웨어", category: "경첩", brand: "BLUM", model: "블룸 덮방 타입 110˚ 경첩", spec: "소프트클로징, 탈부착 가능", price: 4000, unit: "ea", note: "싱크장 문짝 경첩 예시" },
      ],
    },
    {
      name: "화장실1 / 공용욕실",
      materials: [
        { part: "바닥/벽", category: "벽타일", brand: "이즈세라믹", model: "ISBWM 37105M", spec: "300×600 벽타일, 욕실 타일", price: 16500, unit: "sales_unit_unknown", note: "공용욕실 벽타일 후보" },
        { part: "벽", category: "벽타일", brand: "이즈세라믹", model: "ISBWM 37107 IV", spec: "300×600 욕실 벽타일", price: 20500, unit: "sales_unit_unknown", note: "공용욕실 벽타일 후보" },
        { part: "양변기", category: "원피스 양변기", brand: "대림바스", model: "CC-214", spec: "원피스형, 치마형, 로우탱크, 도자기, 69×40×55cm", price: 465000, unit: "ea", note: "욕실 양변기 후보" },
        { part: "세면/샤워 수전", category: "세면샤워 겸용 수전", brand: "대림바스", model: "DL-YB6A15 / BFB425", spec: "4인치 세면샤워수전", price: 52000, unit: "ea", note: "세면/샤워 겸용 수전 후보" },
        { part: "세면 수전", category: "원홀 세면수전", brand: "대림바스", model: "BFL-410 바트라", spec: "세면대 원홀수전", price: 52470, unit: "ea", note: "세면 수전 후보" },
        { part: "세면 수전", category: "세면기용 겸용수전", brand: "대림바스", model: "DL-YB6A15", spec: "4인치 절수형 겸용수전", price: 43989, unit: "ea", note: "저가 판매처 기준 예시, VAT 포함" },
      ],
    },
    {
      name: "화장실2 / 안방욕실",
      materials: [
        { part: "벽", category: "벽타일", brand: "이즈세라믹", model: "ISBWM 37009 까라라", spec: "300×600 까라라 패턴 벽타일", price: 20500, unit: "sales_unit_unknown", note: "안방욕실 포인트 벽타일 후보" },
        { part: "벽", category: "벽타일", brand: "이즈세라믹", model: "ISBWM 37205M 컷팅 LB", spec: "300×600 벽타일", price: null, unit: "sales_unit_unknown", note: "동일 카테고리 내 후보 제품, 가격 확인 필요" },
        { part: "양변기", category: "원피스 양변기", brand: "대림바스", model: "CC-214", spec: "원피스형, 치마형, 로우탱크", price: 465000, unit: "ea", note: "공용욕실과 동일 모델 반복 적용 예시" },
        { part: "세면/샤워 수전", category: "세면샤워 겸용 수전", brand: "대림바스", model: "DL-YB6A15", spec: "4인치 세면샤워수전", price: 52000, unit: "ea", note: "욕실2 수전 후보" },
        { part: "세면 수전", category: "필터 세면수전", brand: "대림 도비도스", model: "DFL-2000", spec: "필터 내장 세면수전", price: 95060, unit: "ea", note: "교체/업그레이드 대체재 예시" },
        { part: "세면 수전", category: "브러쉬드 니켈 세면수전", brand: "대림바스", model: "HFL A20LN3 로톤도", spec: "1홀 세면기 수전", price: 145270, unit: "ea", note: "고급형 대체재 예시" },
      ],
    },
  ],
};
