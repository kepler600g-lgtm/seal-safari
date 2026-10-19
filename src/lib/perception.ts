// Small perception interface. The UI only talks to this; swap the WebSocket
// implementation for an in-browser ONNX pipeline later without UI changes.

export type RecognitionMessage = {
  t: number;
  stable_seal: string | null;
  hold: number;
  new_confirm: boolean;
  raw: string | null;
  raw_score: number;
  expect: string | null;
  expect_score: number;
  expect_thr: number;
  armed: boolean;
  hands: number;
  fps: number;
};

export type PreviewMessage = { type: "frame"; jpg: string };

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export type PerceptionEvents = {
  onStatus: (s: ConnectionStatus) => void;
  onRecognition: (m: RecognitionMessage) => void;
  onPreview: (m: PreviewMessage) => void;
  onConfirmation: (seal: string) => void;
};

export type Perception = {
  connect: () => void;
  setTarget: (seal: string | null) => void;
  close: () => void;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const strOrNull = (v: unknown) => v === null || typeof v === "string";

function parseRecognition(v: Record<string, unknown>): RecognitionMessage | null {
  const nums = ["t", "hold", "raw_score", "expect_score", "expect_thr", "hands", "fps"] as const;
  if (!nums.every((k) => typeof v[k] === "number")) return null;
  if (!strOrNull(v.stable_seal) || !strOrNull(v.raw) || !strOrNull(v.expect)) return null;
  if (typeof v.new_confirm !== "boolean" || typeof v.armed !== "boolean") return null;
  return {
    t: v.t as number,
    stable_seal: v.stable_seal as string | null,
    hold: v.hold as number,
    new_confirm: v.new_confirm,
    raw: v.raw as string | null,
    raw_score: v.raw_score as number,
    expect: v.expect as string | null,
    expect_score: v.expect_score as number,
    expect_thr: v.expect_thr as number,
    armed: v.armed,
    hands: v.hands as number,
    fps: v.fps as number,
  };
}

export function createWebSocketPerception(url: string, ev: PerceptionEvents): Perception {
  let ws: WebSocket | null = null;
  let target: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const sendTarget = () => {
    if (ws?.readyState === WebSocket.OPEN && target) ws.send(JSON.stringify({ expect: target }));
  };

  const connect = () => {
    if (closed) return;
    ev.onStatus("connecting");
    try {
      ws = new WebSocket(url);
    } catch {
      ev.onStatus("disconnected");
      timer = setTimeout(connect, 2000);
      return;
    }
    ws.onopen = () => {
      ev.onStatus("connected");
      sendTarget();
    };
    ws.onclose = () => {
      ev.onStatus("disconnected");
      if (!closed) timer = setTimeout(connect, 2000);
    };
    ws.onmessage = (e) => {
      let data: unknown;
      try {
        data = JSON.parse(typeof e.data === "string" ? e.data : "");
      } catch {
        return;
      }
      if (!isObj(data)) return;
      if (data.type === "frame" && typeof data.jpg === "string") {
        ev.onPreview({ type: "frame", jpg: data.jpg });
        return;
      }
      const m = parseRecognition(data);
      if (!m) return;
      ev.onRecognition(m);
      if (m.new_confirm && m.stable_seal) ev.onConfirmation(m.stable_seal);
    };
  };

  return {
    connect,
    setTarget: (seal) => {
      target = seal;
      sendTarget();
    },
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    },
  };
}
