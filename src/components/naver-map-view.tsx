"use client";

import { MaterialOverlay } from "@/components/materials/material-overlay";
import { useEffect, useRef, useState } from "react";

const MAP_ELEMENT_ID = "naver-map";
const NAVER_MAP_SCRIPT_ID = "naver-map-sdk";

type ApartmentPin = {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  unitTypes: string[];
  materialCount: number;
};

type ApartmentPinResponse = {
  apartments: ApartmentPin[];
  error?: string;
};

type NaverMapViewProps = {
  ncpKeyId?: string;
};

function createMarkerContent(apartment: ApartmentPin) {
  const unitLabel = apartment.unitTypes.length > 0 ? apartment.unitTypes.join(" · ") : "평형 미등록";

  return `
    <button type="button" style="display:flex;align-items:center;gap:8px;border:0;border-radius:999px;background:#111827;color:white;padding:9px 13px;font-size:14px;font-weight:800;box-shadow:0 12px 28px rgba(15,23,42,.28);white-space:nowrap;cursor:pointer;">
      <span style="width:8px;height:8px;border-radius:999px;background:#34d399;"></span>
      <span>${apartment.name}</span>
      <span style="border-radius:999px;background:rgba(255,255,255,.15);padding:2px 7px;font-size:11px;">${unitLabel}</span>
    </button>
  `;
}

export function NaverMapView({ ncpKeyId }: NaverMapViewProps) {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [apartments, setApartments] = useState<ApartmentPin[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentPin | null>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [isApartmentsLoading, setIsApartmentsLoading] = useState(true);
  const [apartmentsError, setApartmentsError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    fetch("/api/apartments", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("아파트 목록을 불러오지 못했습니다.");
        return response.json() as Promise<ApartmentPinResponse>;
      })
      .then((data) => {
        if (ignore) return;
        setApartments(data.apartments);
        setSelectedApartment(data.apartments[0] ?? null);
        setApartmentsError(data.error ?? null);
      })
      .catch((error) => {
        if (!ignore) setApartmentsError(error instanceof Error ? error.message : "아파트 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!ignore) setIsApartmentsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    window.navermap_authFailure = () => {
      setAuthFailed(true);
    };

    return () => {
      delete window.navermap_authFailure;
    };
  }, []);

  useEffect(() => {
    if (!ncpKeyId) return;

    if (window.naver?.maps) {
      queueMicrotask(() => setIsSdkLoaded(true));
      return;
    }

    const existingScript = document.getElementById(NAVER_MAP_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsSdkLoaded(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = NAVER_MAP_SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${ncpKeyId}`;
    script.async = true;
    script.onload = () => setIsSdkLoaded(true);
    script.onerror = () => setAuthFailed(true);
    document.head.appendChild(script);
  }, [ncpKeyId]);

  useEffect(() => {
    if (!isSdkLoaded || !window.naver?.maps || apartments.length === 0) return;

    const maps = window.naver.maps;
    const firstApartment = apartments[0];
    const firstPosition = new maps.LatLng(firstApartment.latitude, firstApartment.longitude);

    const map =
      mapRef.current ??
      new maps.Map(MAP_ELEMENT_ID, {
        center: firstPosition,
        zoom: 16,
      });

    mapRef.current = map;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = apartments.map((apartment) => {
      const position = new maps.LatLng(apartment.latitude, apartment.longitude);
      const marker = new maps.Marker({
        position,
        title: apartment.name,
        icon: {
          content: createMarkerContent(apartment),
          anchor: new maps.Point(92, 42),
          size: new maps.Size(184, 42),
        },
      });

      maps.Event.addListener(marker, "click", () => {
        setSelectedApartment(apartment);
        map.panTo(position);
      });

      marker.setMap(map);
      return marker;
    });

    map.panTo(firstPosition);
  }, [apartments, isSdkLoaded]);

  const isMaterialOverlayOpen = selectedApartment !== null;

  return (
    <main className="h-dvh w-screen overflow-hidden bg-slate-100">
      <div id={MAP_ELEMENT_ID} className="h-full w-full" />
      <MaterialOverlay
        open={isMaterialOverlayOpen}
        onClose={() => setSelectedApartment(null)}
        apartmentName={selectedApartment?.name}
        apartmentSummary={
          selectedApartment
            ? `${selectedApartment.unitTypes.join(" · ") || "평형 미등록"} · 자재 ${selectedApartment.materialCount.toLocaleString("ko-KR")}개`
            : undefined
        }
      />

      {!ncpKeyId ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6">
          <div className="rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">Naver Maps API key required</p>
            <p className="mt-2 text-sm text-slate-700">
              <code>NAVER_CLOUD_MAPS_API_KEY_ID</code>를 <code>.env.local</code>에 넣어주세요.
            </p>
          </div>
        </div>
      ) : null}

      {isApartmentsLoading ? (
        <div className="absolute left-4 top-4 rounded-xl bg-white/95 px-4 py-3 text-sm font-bold text-slate-700 shadow-lg ring-1 ring-slate-200">
          아파트 핀을 불러오는 중…
        </div>
      ) : null}

      {apartmentsError ? (
        <div className="absolute left-4 top-4 max-w-sm rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {apartmentsError}
        </div>
      ) : null}

      {authFailed ? (
        <div className="absolute left-4 top-20 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          네이버지도 로드/인증에 실패했습니다. ncpKeyId와 서비스 도메인 설정을 확인해주세요.
        </div>
      ) : null}
    </main>
  );
}
