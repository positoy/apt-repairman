"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

type NaverMaps = typeof naver.maps;

type ApartmentMarker = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  priceLabel: string;
  tradeCount: number;
};

const demoApartments: ApartmentMarker[] = [
  {
    id: "raemian-one-bailey",
    name: "래미안 원베일리",
    address: "서울 서초구 반포동",
    lat: 37.5038,
    lng: 127.0023,
    priceLabel: "43.5억",
    tradeCount: 12,
  },
  {
    id: "banpo-xi",
    name: "반포자이",
    address: "서울 서초구 반포동",
    lat: 37.5065,
    lng: 127.0112,
    priceLabel: "34.8억",
    tradeCount: 9,
  },
  {
    id: "acro-river-park",
    name: "아크로리버파크",
    address: "서울 서초구 반포동",
    lat: 37.506,
    lng: 126.9962,
    priceLabel: "48.2억",
    tradeCount: 7,
  },
];

function createPriceMarker(maps: NaverMaps, apt: ApartmentMarker) {
  return new maps.Marker({
    position: new maps.LatLng(apt.lat, apt.lng),
    title: apt.name,
    icon: {
      content: `<button style="border:0;border-radius:999px;background:#111827;color:white;padding:8px 12px;font-weight:700;font-size:13px;box-shadow:0 10px 24px rgba(15,23,42,.22);cursor:pointer;white-space:nowrap;">${apt.priceLabel}</button>`,
      anchor: new maps.Point(34, 18),
    },
  });
}

export function NaverMapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [selectedId, setSelectedId] = useState(demoApartments[0].id);
  const [isMapReady, setIsMapReady] = useState(false);

  const naverMapClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const selectedApartment = useMemo(
    () => demoApartments.find((apt) => apt.id === selectedId) ?? demoApartments[0],
    [selectedId],
  );

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.naver?.maps) return;
    if (mapInstanceRef.current) return;

    const maps = window.naver.maps;
    const map = new maps.Map(mapRef.current, {
      center: new maps.LatLng(selectedApartment.lat, selectedApartment.lng),
      zoom: 15,
      minZoom: 10,
      mapTypeControl: false,
      scaleControl: false,
      logoControlOptions: {
        position: maps.Position.BOTTOM_LEFT,
      },
    });

    markersRef.current = demoApartments.map((apt) => {
      const marker = createPriceMarker(maps, apt);
      marker.setMap(map);
      maps.Event.addListener(marker, "click", () => {
        setSelectedId(apt.id);
        map.panTo(new maps.LatLng(apt.lat, apt.lng));
      });
      return marker;
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [isMapReady, selectedApartment.lat, selectedApartment.lng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;
    map.panTo(new window.naver.maps.LatLng(selectedApartment.lat, selectedApartment.lng));
  }, [selectedApartment]);

  return (
    <section className="relative h-dvh overflow-hidden bg-slate-950 text-slate-950">
      {naverMapClientId ? (
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverMapClientId}`}
          strategy="afterInteractive"
          onReady={() => setIsMapReady(true)}
          onLoad={() => setIsMapReady(true)}
        />
      ) : null}

      <div ref={mapRef} className="absolute inset-0 bg-slate-200" />

      {!naverMapClientId ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 px-6">
          <div className="max-w-md rounded-3xl bg-white/95 p-6 text-center shadow-2xl ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-emerald-600">네이버지도 연동 준비 완료</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">지도 API 키가 필요해요</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              프로젝트 루트에 <code className="rounded bg-slate-100 px-1.5 py-0.5">.env.local</code>을 만들고
              <br />
              <code className="rounded bg-slate-100 px-1.5 py-0.5">NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=...</code>
              를 넣으면 첫 화면이 네이버지도 뷰로 표시됩니다.
            </p>
          </div>
        </div>
      ) : null}

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 p-4 sm:p-6">
        <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-lg ring-1 ring-slate-200/70 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">Apt Repairman</p>
            <h1 className="text-lg font-black tracking-tight sm:text-2xl">지도에서 아파트를 찾고, 수리 포인트를 관리하세요</h1>
          </div>
          <button className="hidden rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 sm:block">
            매물 등록
          </button>
        </div>
      </header>

      <aside className="absolute bottom-4 left-4 right-4 z-10 sm:bottom-6 sm:left-6 sm:right-auto sm:w-[380px]">
        <div className="rounded-3xl bg-white/95 p-4 shadow-2xl ring-1 ring-slate-200 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">현재 선택 단지</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">{selectedApartment.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedApartment.address}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
              <p className="text-xs font-semibold text-emerald-700">최근 실거래</p>
              <p className="text-lg font-black text-emerald-900">{selectedApartment.priceLabel}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="font-black">{selectedApartment.tradeCount}</p>
              <p className="text-xs text-slate-500">거래</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="font-black">3</p>
              <p className="text-xs text-slate-500">수리 이슈</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="font-black">A</p>
              <p className="text-xs text-slate-500">관리 등급</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {demoApartments.map((apt) => (
              <button
                key={apt.id}
                onClick={() => setSelectedId(apt.id)}
                className={`shrink-0 rounded-full px-3 py-2 text-sm font-bold transition ${
                  selectedId === apt.id
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {apt.name}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}
