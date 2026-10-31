import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement } from 'react';
import { setup } from './helpers.mjs';
import { ToastProvider, useToast } from '../dist/index.js';
let ui;
beforeEach(async () => {
  ui = await setup();
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});
afterEach(async () => ui.cleanup());
test('queues are bounded and dismissal promotes the next notification', async () => {
  let api;
  function App() {
    api = useToast();
    return null;
  }
  await ui.render(
    createElement(
      ToastProvider,
      { maxVisible: 1, maxQueued: 2, defaultDuration: 0 },
      createElement(App),
    ),
  );
  let first;
  await act(() => {
    first = api.notify({ title: 'One' });
    api.notify({ title: 'Two' });
  });
  assert.ok(ui.container.textContent.includes('One'));
  assert.equal(ui.container.textContent.includes('Two'), false);
  assert.throws(() => api.notify({ title: 'Three' }), /full/);
  await act(() => api.dismiss(first));
  assert.ok(ui.container.textContent.includes('Two'));
});
test('visible notifications auto-dismiss on their bounded timer', async (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  let api;
  function App() {
    api = useToast();
    return null;
  }
  await ui.render(createElement(ToastProvider, { defaultDuration: 100 }, createElement(App)));
  await act(() => api.notify({ title: 'Temporary' }));
  await act(() => context.mock.timers.tick(100));
  assert.equal(ui.container.querySelectorAll('li').length, 0);
  await ui.render(null);
  context.mock.timers.reset();
});
