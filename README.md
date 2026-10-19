# Seal Safari

Keep the frontend state roughly like this:
type AppMode = "menu" | "lesson" | "complete";

type RecognitionMessage = {

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

type PreviewMessage = {

  type: "frame";

  jpg: string;

};

The important design decision is that the UI should respond to a small perception interface, not know how YOLOX or MediaPipe work internally.



Frontend

  |

  +-- connect()

  +-- setTarget("Tiger")

  +-- receiveRecognition(message)

  +-- receivePreview(frame)

  +-- receiveConfirmation()

Later, you can replace the WebSocket implementation with:
Browser camera

  -> ONNX Runtime Web

  -> score vector

  -> browser StabilityGate

  -> same frontend events

The lesson UI should not need to change.

Bottom line

Use React + Vite + TypeScript and build a single-page, six-seal vertical slice. Give Lovable a strict scope, explicitly prohibit backend/auth/component expansion, and require it to use the existing WebSocket protocol. This should minimize generated code and credits while producing a useful frontend foundation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1df239d6-7b70-48c6-8b17-4dc593ae5dd8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
