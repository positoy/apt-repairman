"use client";

import { MaterialOverlay } from "@/components/materials/material-overlay";
import { useEffect, useRef, useState } from "react";

const MAP_ELEMENT_ID = "naver-map";
const NAVER_MAP_SCRIPT_ID = "naver-map-sdk";

const FOCUS_APARTMENT = {
  name: "더파크비스타데시앙아파트",
  lat: 37.4030798,
  lng: 127.2468939,
};

type NaverMapViewProps = {
  ncpKeyId?: string;
};

export function NaverMapView({ ncpKeyId }: NaverMapViewProps) {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markerRef = useRef<naver.maps.Marker | null>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [isMaterialOverlayOpen, setIsMaterialOverlayOpen] = useState(false);

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
    if (!isSdkLoaded || !window.naver?.maps || mapRef.current) return;

    const maps = window.naver.maps;
    const position = new maps.LatLng(FOCUS_APARTMENT.lat, FOCUS_APARTMENT.lng);

    const map = new maps.Map(MAP_ELEMENT_ID, {
      center: position,
      zoom: 16,
    });

    const marker = new maps.Marker({
      position,
      title: FOCUS_APARTMENT.name,
      icon: {
        content: `<div style="display:flex;align-items:center;gap:8px;border-radius:999px;background:#111827;color:white;padding:9px 13px;font-size:14px;font-weight:800;box-shadow:0 12px 28px rgba(15,23,42,.28);white-space:nowrap;"><span style="width:8px;height:8px;border-radius:999px;background:#34d399;"></span>${FOCUS_APARTMENT.name}</div>`,
        anchor: new maps.Point(92, 42),
      },
    });

    maps.Event.addListener(marker, "click", () => {
      setIsMaterialOverlayOpen(true);
      map.panTo(position);
    });

    marker.setMap(map);
    mapRef.current = map;
    markerRef.current = marker;
  }, [isSdkLoaded]);

  return (
    <main className="h-dvh w-screen overflow-hidden bg-slate-100">
      <div id={MAP_ELEMENT_ID} className="h-full w-full" />
      <MaterialOverlay open={isMaterialOverlayOpen} onClose={() => setIsMaterialOverlayOpen(false)} />

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

      {authFailed ? (
        <div className="absolute left-4 top-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          네이버지도 로드/인증에 실패했습니다. ncpKeyId와 서비스 도메인 설정을 확인해주세요.
        </div>
      ) : null}
    </main>
  );
}
