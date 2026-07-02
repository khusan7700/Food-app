import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

interface KakaoMapProps {
  latitude: number;
  longitude: number;
  markerTitle?: string;
}

export interface KakaoMapHandle {
  updateMarker: (latitude: number, longitude: number) => void;
}

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "";

// Minimal types for Kakao Maps JS SDK (no official @types package).
type KakaoLatLng = object;
interface KakaoMapSdkInstance { panTo(latlng: KakaoLatLng): void; }
interface KakaoMarkerSdkInstance { setPosition(latlng: KakaoLatLng): void; }
interface KakaoMapsNS {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (container: HTMLElement, options: object) => KakaoMapSdkInstance;
  Marker: new (options: object) => KakaoMarkerSdkInstance;
  MarkerImage: new (src: string, size: KakaoSize, options?: object) => object;
  Size: new (w: number, h: number) => KakaoSize;
  Point: new (x: number, y: number) => object;
}
type KakaoSize = object;
interface KakaoSDK { maps: KakaoMapsNS; }

// ─── Native (iOS/Android): WebView + inline HTML ─────────────────────────────
// baseUrl must be 'https://dapi.kakao.com' so the inline page shares the same
// origin as the SDK script — without it the WebView loads from about:blank and
// the external script load is blocked by the OS security policy.
function buildHtml(latitude: number, longitude: number, markerTitle: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body,#map{width:100%;height:100%;}
    #err{display:none;position:absolute;inset:0;align-items:center;justify-content:center;background:#fee2e2;color:#dc2626;font-size:13px;text-align:center;padding:16px;}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="err"></div>
  <script>
    function showErr(msg){var e=document.getElementById('err');e.style.display='flex';e.textContent=msg;}
    window.onerror=function(m){showErr('Map error: '+m);};
  </script>
  <script
    src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"
    onerror="showErr('Kakao SDK load failed. Check API key & allowed domains.')"
  ></script>
  <script>
    var map=null,marker=null;
    function makeScooterImage(){
      var canvas=document.createElement('canvas');
      canvas.width=48;canvas.height=48;
      var ctx=canvas.getContext('2d');
      ctx.font='36px serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText('\\uD83D\\uDEF5',24,24);
      return new kakao.maps.MarkerImage(
        canvas.toDataURL(),
        new kakao.maps.Size(48,48),
        {offset:new kakao.maps.Point(24,24)}
      );
    }
    function init(){
      try{
        var c=new kakao.maps.LatLng(${latitude},${longitude});
        map=new kakao.maps.Map(document.getElementById('map'),{center:c,level:4});
        marker=new kakao.maps.Marker({position:c,map:map,title:${JSON.stringify(markerTitle)},image:makeScooterImage()});
      }catch(e){showErr('Map init failed: '+e.message);}
    }
    function updateMarker(lat,lng){
      if(!map||!marker)return;
      var p=new kakao.maps.LatLng(lat,lng);
      marker.setPosition(p);map.panTo(p);
    }
    function onMsg(e){
      try{var d=JSON.parse(e.data);if(d.type==='updateMarker')updateMarker(d.latitude,d.longitude);}catch(x){}
    }
    document.addEventListener('message',onMsg);
    window.addEventListener('message',onMsg);
    if(typeof kakao!=='undefined'&&kakao.maps){
      kakao.maps.load(init);
    } else {
      showErr('Kakao SDK not loaded. Key: ${KAKAO_JS_KEY ? "set" : "MISSING"}');
    }
  </script>
</body>
</html>`;
}

// ─── Web (browser): SDK injected as <script>, map in a View/div ──────────────
// updateMarker() calls the Kakao JS API directly — no postMessage bridge needed.
const KakaoMapWeb = forwardRef<KakaoMapHandle, KakaoMapProps>(
  function KakaoMapWeb({ latitude, longitude, markerTitle = "Driver" }, ref) {
    const containerRef = useRef<View>(null);
    const mapInstanceRef = useRef<KakaoMapSdkInstance | null>(null);
    const markerInstanceRef = useRef<KakaoMarkerSdkInstance | null>(null);

    useEffect(() => {
      const container = containerRef.current as unknown as HTMLElement;
      if (!container) return;

      function makeScooterImage(kakao: KakaoSDK) {
        const canvas = document.createElement("canvas");
        canvas.width = 48; canvas.height = 48;
        const ctx = canvas.getContext("2d")!;
        ctx.font = "36px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🛵", 24, 24);
        return new kakao.maps.MarkerImage(
          canvas.toDataURL(),
          new kakao.maps.Size(48, 48),
          { offset: new kakao.maps.Point(24, 24) },
        );
      }

      function initMap() {
        const kakao = (window as unknown as { kakao: KakaoSDK }).kakao;
        const center = new kakao.maps.LatLng(latitude, longitude);
        mapInstanceRef.current = new kakao.maps.Map(container, {
          center,
          level: 4,
        });
        markerInstanceRef.current = new kakao.maps.Marker({
          position: center,
          map: mapInstanceRef.current,
          title: markerTitle,
          image: makeScooterImage(kakao),
        });
      }

      const win = window as unknown as { kakao?: KakaoSDK };
      if (win.kakao?.maps) {
        win.kakao.maps.load(initMap);
        return;
      }

      if (!document.getElementById("kakao-map-sdk")) {
        const script = document.createElement("script");
        script.id = "kakao-map-sdk";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
        script.onload = () =>
          (window as unknown as { kakao: KakaoSDK }).kakao.maps.load(initMap);
        document.head.appendChild(script);
      } else {
        const poll = setInterval(() => {
          const k = (window as unknown as { kakao?: KakaoSDK }).kakao;
          if (k?.maps) {
            clearInterval(poll);
            k.maps.load(initMap);
          }
        }, 100);
        return () => clearInterval(poll);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      updateMarker: (lat: number, lng: number) => {
        const kakao = (window as unknown as { kakao?: KakaoSDK }).kakao;
        if (!kakao?.maps || !mapInstanceRef.current || !markerInstanceRef.current)
          return;
        const next = new kakao.maps.LatLng(lat, lng);
        markerInstanceRef.current.setPosition(next);
        mapInstanceRef.current.panTo(next);
      },
    }));

    return <View ref={containerRef} collapsable={false} style={styles.map} />;
  },
);

// ─── Main export: routes to WebView (native) or direct SDK (web) ─────────────
// Per CLAUDE.md: updateMarker() moves only the marker/pans the camera —
// the map is never recreated on each GPS tick.
const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  { latitude, longitude, markerTitle = "Driver" },
  ref,
) {
  const webviewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    updateMarker: (lat: number, lng: number) => {
      webviewRef.current?.postMessage(
        JSON.stringify({ type: "updateMarker", latitude: lat, longitude: lng }),
      );
    },
  }));

  if (Platform.OS === "web") {
    return (
      <KakaoMapWeb
        ref={ref}
        latitude={latitude}
        longitude={longitude}
        markerTitle={markerTitle}
      />
    );
  }

  return (
    <WebView
      ref={webviewRef}
      style={styles.map}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      source={{
        html: buildHtml(latitude, longitude, markerTitle),
        baseUrl: "https://dapi.kakao.com",
      }}
    />
  );
});

export default KakaoMap;

const styles = StyleSheet.create({
  map: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
  },
});
