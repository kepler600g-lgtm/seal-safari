// Hand Seal Dojo frontend. Connects to the existing Python perception service
// (ws://127.0.0.1:8765) through the small interface in src/lib/perception.ts.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  createWebSocketPerception,
  type ConnectionStatus,
  type Perception,
  type RecognitionMessage,
} from "@/lib/perception";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hand Seal Dojo" },
      { name: "description", content: "Practice hand seals with live perception feedback." },
      { property: "og:title", content: "Hand Seal Dojo" },
      { property: "og:description", content: "Practice hand seals with live perception feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type AppMode = "menu" | "lesson" | "complete";

const WS_URL = "ws://127.0.0.1:8765";
const ALL_SEALS = ["Rat", "Ox", "Tiger", "Hare", "Dragon", "Snake", "Horse", "Ram", "Monkey", "Bird", "Dog", "Boar"];
const LESSON = ["Rat", "Ox", "Tiger", "Hare", "Dragon", "Snake"];

function App() {
  const [mode, setMode] = useState<AppMode>("menu");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [step, setStep] = useState(0);
  const [rec, setRec] = useState<RecognitionMessage | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const perception = useRef<Perception | null>(null);
  const targetRef = useRef<string | null>(null);
  const confirmedRef = useRef(false);

  const target: string | null = mode === "lesson" ? (LESSON[step] ?? null) : null;

  useEffect(() => {
    const p = createWebSocketPerception(WS_URL, {
      onStatus: (s) => {
        setStatus(s);
        if (s !== "connected") setRec(null);
      },
      onRecognition: setRec,
      onPreview: (f) => setPreview(f.jpg),
      onConfirmation: (seal) => {
        if (!targetRef.current || seal !== targetRef.current || confirmedRef.current) return;
        confirmedRef.current = true;
        setConfirmed(true);
        setTimeout(() => {
          confirmedRef.current = false;
          setConfirmed(false);
          setStep((s) => {
            if (s + 1 >= LESSON.length) {
              setMode("complete");
              return s;
            }
            return s + 1;
          });
        }, 900);
      },
    });
    perception.current = p;
    p.connect();
    const onUnload = () => p.close();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      p.close();
    };
  }, []);

  useEffect(() => {
    targetRef.current = target;
    perception.current?.setTarget(target);
  }, [target]);

  const start = () => {
    setStep(0);
    setConfirmed(false);
    setMode("lesson");
  };

  const connected = status === "connected";
  const message = !connected
    ? "Waiting for perception service"
    : confirmed
      ? "Confirmed"
      : rec && rec.hold > 0
        ? "Hold steady"
        : "Make the pose";

  return (
    <main className="dojo">
      <section className="dojo-card">
        <header className="dojo-head">
          <h1>Hand Seal Dojo</h1>
          <span className={`dojo-status is-${status}`} role="status">{status}</span>
        </header>

        {!connected && (
          <p className="dojo-error" role="alert">
            Cannot reach the perception service at {WS_URL}. Retrying…
          </p>
        )}

        {mode === "menu" && (
          <>
            <p>Make the displayed hand seal and hold it steady.</p>
            <button className="dojo-btn" onClick={start}>Start Lesson</button>
            <h2>Seals</h2>
            <ul className="dojo-grid">
              {ALL_SEALS.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </>
        )}

        {mode === "lesson" && target && (
          <>
            <p className="dojo-step">Seal {step + 1} of {LESSON.length}</p>
            <h2 className="dojo-target">{target}</h2>
            <div className="dojo-ref" aria-label={`Reference for ${target}`}>{target}</div>
            <p className={`dojo-msg ${confirmed ? "is-ok" : ""}`} aria-live="polite">{message}</p>
            <div className="dojo-bar" role="progressbar" aria-label="Hold progress"
              aria-valuemin={0} aria-valuemax={100}
              aria-valuenow={Math.round((connected && rec ? rec.hold : 0) * 100)}>
              <div style={{ width: `${Math.min(1, Math.max(0, connected && rec ? rec.hold : 0)) * 100}%` }} />
            </div>
            <dl className="dojo-stats">
              <div><dt>Confidence</dt><dd>{connected && rec ? `${Math.round(rec.expect_score * 100)}%` : "—"}</dd></div>
              <div><dt>Hands</dt><dd>{connected && rec ? rec.hands : "—"}</dd></div>
              <div><dt>FPS</dt><dd>{connected && rec ? rec.fps.toFixed(1) : "—"}</dd></div>
            </dl>
            <button className="dojo-btn is-ghost" onClick={() => setMode("menu")}>Back to menu</button>
          </>
        )}

        {mode === "complete" && (
          <>
            <h2 className="dojo-target">Lesson complete!</h2>
            <div className="dojo-row">
              <button className="dojo-btn" onClick={start}>Repeat lesson</button>
              <button className="dojo-btn is-ghost" onClick={() => setMode("menu")}>Back to menu</button>
            </div>
          </>
        )}

        {preview && connected && (
          <img className="dojo-preview" src={`data:image/jpeg;base64,${preview}`} alt="Camera preview" />
        )}
      </section>
    </main>
  );
}
