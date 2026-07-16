# Loading Screen Logic

Copy this into a client component.

```tsx
"use client";

import { useEffect, useState } from "react";

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <section
      aria-label="Loading"
      aria-busy="true"
      className={`loadscreen fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-hidden px-6 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out ${
        progress >= 100 ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative z-10 w-full max-w-xl text-center">
        <p className="loadscreen-title text-sm font-bold uppercase text-white sm:text-base">
          Loading Atlas
        </p>

        <div
          className="loadscreen-bar mt-4 h-6 overflow-hidden rounded-md border border-slate-500/80 bg-slate-950/70 p-1"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="loadscreen-bar-fill h-full rounded-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="loadscreen-percent mt-4 font-mono text-lg font-bold text-cyan-100">
          {progress}%
        </p>
      </div>
    </section>
  );
}

export default function Page() {
  const [showLoadscreen, setShowLoadscreen] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const progressTimer = window.setInterval(() => {
      setLoadProgress((value) => {
        if (value >= 100) return 100;
        return Math.min(value + 5, 100);
      });
    }, 90);

    return () => {
      window.clearInterval(progressTimer);
    };
  }, []);

  useEffect(() => {
    if (loadProgress < 100) return;

    const timer = window.setTimeout(() => {
      setShowLoadscreen(false);
    }, 260);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProgress]);

  return (
    <main>
      {showLoadscreen ? <LoadingScreen progress={loadProgress} /> : null}

      {!showLoadscreen ? (
        <div>Your page content goes here.</div>
      ) : null}
    </main>
  );
}
```

The logic is:

```tsx
const [showLoadscreen, setShowLoadscreen] = useState(true);
const [loadProgress, setLoadProgress] = useState(0);
```

`loadProgress` increases by `5` every `90ms` until it reaches `100`.

```tsx
setLoadProgress((value) => {
  if (value >= 100) return 100;
  return Math.min(value + 5, 100);
});
```

When progress reaches `100`, the loader stays briefly for `260ms`, then hides.

```tsx
if (loadProgress < 100) return;

const timer = window.setTimeout(() => {
  setShowLoadscreen(false);
}, 260);
```
