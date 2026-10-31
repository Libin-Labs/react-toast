# @lp-labs/react-toast

Bounded notifications with action buttons, queues and pauseable timers. React 18+ peer only; ESM, CommonJS and TypeScript included.

## Installation

```sh
npm install @lp-labs/react-toast
```

## Quick Start

```jsx
import { ToastProvider, useToast } from '@lp-labs/react-toast';
function NotifyButton() {
  const toast = useToast();
  return (
    <button
      onClick={() => toast.notify({ title: 'Saved', description: 'Your changes were saved.' })}
    >
      Notify
    </button>
  );
}
export default function Example() {
  return (
    <ToastProvider>
      <NotifyButton />
    </ToastProvider>
  );
}
```

## API

ToastProvider props: maxVisible=3, maxQueued=50 (includes visible items), defaultDuration=5000, position='bottom-right' (four corners supported), renderToast(toast,dismiss), style and children. useToast must be inside the provider and returns notify(input):id, update(id,patch), dismiss(id), clear(). Input: optional id, title, description, variant ('info/success/error'), duration, action:{label,onClick}. Repeated IDs replace an existing notification. Duration0 is persistent; action success dismisses, rejection shows an alert. Custom renderers must provide accessible announcements and dismiss controls.

Queued timers start only when visible. Pointer hover, keyboard focus and document hiding pause time; leaving/resuming continues remaining time. Normal messages use status announcements; error variants use alerts. Each provider owns an isolated queue.

## Benefits

| Area            | Details                                                            |
| --------------- | ------------------------------------------------------------------ |
| Bounded queue   | Control visible notifications and total queued entries.            |
| Timer awareness | Pause dismissal while hovered, focused, or the document is hidden. |
| Action feedback | Render async actions and their errors accessibly.                  |

## Customization

| Area       | Details                                                        |
| ---------- | -------------------------------------------------------------- |
| Queue      | Set visible and total limits, placement, and default duration. |
| Toast data | Choose variant, individual duration, ID, and action.           |
| Rendering  | Replace the renderer while retaining provider queue controls.  |

## Security And Limits

Visible count: 1–10; queue: up to 1,000; duration: 0–600,000 ms; IDs: 1–128 characters. Queue overflow throws instead of dropping messages silently. Timers/listeners clean up on unmount. ReactNode content is application-owned; never render untrusted HTML or sensitive data in public notifications. Async actions cannot be remotely canceled by dismissal. No global singleton, persistence, animation or network delivery is bundled. Screen-reader announcement timing is browser-dependent and needs application testing.

## Support

[Donate via PayPal](https://www.paypal.me/LibinPrasanth). Author: [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/).

## License

MIT License. See the packaged [LICENSE](LICENSE) file.
