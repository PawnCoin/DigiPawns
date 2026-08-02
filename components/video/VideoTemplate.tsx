import { useEffect, useRef, useState } from 'react';
import { useVideoPlayer } from '../../lib/video';
import { AnimatePresence } from 'framer-motion';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

// ─── Scene config ────────────────────────────────────────────────────────────
const SCENE_DURATIONS = {
  problem: 8500,
  solution: 11000,
  tokens: 10500,
  shop: 10500,
  multichain: 9000,
  outro: 9000,
};
const TOTAL_SECONDS = Math.round(
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) / 1000,
); // 59

// ─── FFmpeg singleton (lazy-loaded once, then reused) ────────────────────────
// Declared outside the component so WASM is only fetched once per page load.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ffmpegInstance: any = null;
let ffmpegLoaded = false;

async function getFFmpeg() {
  if (!ffmpegInstance) {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    ffmpegInstance = new FFmpeg();
  }
  if (!ffmpegLoaded) {
    const { toBlobURL } = await import('@ffmpeg/util');
    // Load single-threaded core from CDN — no SharedArrayBuffer headers needed
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegLoaded = true;
  }
  return ffmpegInstance;
}

async function convertWebmToMp4(
  webmBlob: Blob,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress(Math.round(Math.min(progress, 1) * 100));
  };
  ffmpeg.on('progress', progressHandler);

  try {
    await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p', // broad device compatibility
      '-movflags', '+faststart', // move moov atom to front for streaming
      'output.mp4',
    ]);
    const data = await ffmpeg.readFile('output.mp4');
    return new Blob([data], { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progressHandler);
    try { await ffmpeg.deleteFile('input.webm'); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile('output.mp4'); } catch { /* ignore */ }
  }
}

// ─── Inner player component — keyed so bumping the key restarts from scene 0 ─
function VideoPlayer() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });
  return (
    <AnimatePresence mode="sync">
      {currentScene === 0 && <Scene1 key="scene1" />}
      {currentScene === 1 && <Scene2 key="scene2" />}
      {currentScene === 2 && <Scene3 key="scene3" />}
      {currentScene === 3 && <Scene4 key="scene4" />}
      {currentScene === 4 && <Scene5 key="scene5" />}
      {currentScene === 5 && <Scene6 key="scene6" />}
    </AnimatePresence>
  );
}

// ─── Recording state machine ─────────────────────────────────────────────────
type Stage = 'idle' | 'recording' | 'loading' | 'converting';

export default function VideoTemplate() {
  const [playerKey, setPlayerKey] = useState(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [elapsed, setElapsed] = useState(0);        // seconds into recording
  const [convertPct, setConvertPct] = useState(0);  // 0-100 during transcode
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refs so closures in window.* hooks always see fresh values
  const stageRef = useRef<Stage>('idle');
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setStageSync = (s: Stage) => { stageRef.current = s; setStage(s); };

  // Wire up the global hooks called by useVideoPlayer
  useEffect(() => {
    window.startRecording = async () => {
      if (stageRef.current !== 'recording' || !streamRef.current) return;

      const stream = streamRef.current;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      const mr = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(250);
      mediaRecorderRef.current = mr;

      const t0 = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - t0) / 1000));
      }, 500);
    };

    window.stopRecording = async () => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') return;

      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

      // Stop the MediaRecorder; handle transcoding in onstop
      mr.onstop = async () => {
        // Stop tab-capture stream now that we have all chunks
        mr.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
        streamRef.current = null;

        const webmBlob = new Blob(chunksRef.current, { type: mr.mimeType });
        chunksRef.current = [];

        // ── Transcode WebM → MP4 ──────────────────────────────────────────
        try {
          // First time: load the 20 MB WASM bundle
          if (!ffmpegLoaded) {
            setStageSync('loading');
          } else {
            setStageSync('converting');
            setConvertPct(0);
          }

          const mp4Blob = await convertWebmToMp4(webmBlob, (pct) => {
            if (stageRef.current !== 'converting') {
              setStageSync('converting');
            }
            setConvertPct(pct);
          });

          // Trigger download
          const url = URL.createObjectURL(mp4Blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'digipawns-promo.mp4';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('MP4 conversion failed:', err);
          setErrorMsg('Conversion failed — try again or use a screen recorder.');
        } finally {
          setStageSync('idle');
          setElapsed(0);
          setConvertPct(0);
        }
      };

      mr.stop();
    };

    return () => {
      window.startRecording = undefined;
      window.stopRecording = undefined;
    };
  }, []); // runs once — all live values accessed via refs

  // ── Button click handler (must be called directly for getDisplayMedia) ─────
  const handleDownload = async () => {
    if (stage !== 'idle') return;
    setErrorMsg(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
        // Chrome hints — pre-selects current tab in the share dialog
        // @ts-ignore non-standard
        preferCurrentTab: true,
        // @ts-ignore non-standard
        selfBrowserSurface: 'include',
      });

      streamRef.current = stream;
      // Set ref synchronously before React batches the state flush,
      // so window.startRecording() sees the correct stage when called by
      // the re-mounted VideoPlayer's useEffect.
      stageRef.current = 'recording';
      setStageSync('recording');
      setElapsed(0);
      // Bump key → VideoPlayer re-mounts → useVideoPlayer fires startRecording()
      setPlayerKey((k) => k + 1);
    } catch (err: unknown) {
      const e = err as { name?: string };
      if (e?.name !== 'NotAllowedError') {
        setErrorMsg('Screen capture unavailable. Try Chrome or Edge.');
        console.error('getDisplayMedia failed:', err);
      }
    }
  };

  // ── UI helpers ───────────────────────────────────────────────────────────
  const renderControl = () => {
    switch (stage) {
      case 'recording':
        return (
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            Recording&nbsp;
            <span className="tabular-nums">{elapsed}s&nbsp;/&nbsp;{TOTAL_SECONDS}s</span>
          </div>
        );

      case 'loading':
        return (
          <div className="flex items-center gap-2 bg-brand-gold/90 text-brand-dark px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-dark/60 animate-ping" />
            Preparing converter…&nbsp;<span className="opacity-60 text-xs">(first time only)</span>
          </div>
        );

      case 'converting':
        return (
          <div className="flex flex-col gap-1.5 bg-brand-dark/90 backdrop-blur-sm border border-brand-gold/30 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl select-none min-w-[200px]">
            <div className="flex items-center justify-between">
              <span>Converting to MP4…</span>
              <span className="tabular-nums text-brand-gold">{convertPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-gold rounded-full transition-all duration-300"
                style={{ width: `${convertPct}%` }}
              />
            </div>
          </div>
        );

      default:
        return (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-brand-gold hover:bg-yellow-400 active:scale-95 text-brand-dark px-4 py-2.5 rounded-xl text-sm font-bold shadow-xl transition-all duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download MP4
          </button>
        );
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden relative bg-brand-dark text-white font-sans flex items-center justify-center">
      <div className="absolute inset-0 bg-brand-navy opacity-30 mix-blend-multiply" />

      <VideoPlayer key={playerKey} />

      {/* Controls — bottom-right corner */}
      <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {errorMsg && (
          <p className="text-xs text-red-400 bg-black/60 px-3 py-1 rounded-md max-w-[260px] text-right">
            {errorMsg}
          </p>
        )}
        {renderControl()}
      </div>
    </div>
  );
}
