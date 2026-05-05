"use client";

import { useEffect, useRef, useState } from "react";

const MAP_ELEMENT_ID = "naver-map";
const NAVER_MAP_SCRIPT_ID = "naver-map-sdk";

export function NaverMapView() {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  const naverMapClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  useEffect(() => {
    window.navermap_authFailure = () => {
      setAuthFailed(true);
    };

    return () => {
      delete window.navermap_authFailure;
    };
  }, []);

  useEffect(() => {
    if (!naverMapClientId) return;

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
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverMapClientId}`;
    script.async = true;
    script.onload = () => setIsSdkLoaded(true);
    script.onerror = () => setAuthFailed(true);
    document.head.appendChild(script);
  }, [naverMapClientId]);

  useEffect(() => {
    if (!isSdkLoaded || !window.naver?.maps || mapRef.current) return;

    mapRef.current = new window.naver.maps.Map(MAP_ELEMENT_ID, {
      center: new window.naver.maps.LatLng(37.5666103, 126.9783882),
      zoom: 13,
    });
  }, [isSdkLoaded]);

  return (
    <main className="h-dvh w-screen overflow-hidden bg-slate-100">
      <div id={MAP_ELEMENT_ID} className="h-full w-full" />

      {!naverMapClientId ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6">
          <div className="rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">Naver Maps API key required</p>
            <p className="mt-2 text-sm text-slate-700">
              <code>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID</code>를 <code>.env.local</code>에 넣어주세요.
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
