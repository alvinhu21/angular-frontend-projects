// sockjs-client (a CommonJS library written for Node/webpack) references the Node global `global`
// object internally. Vite's dev server doesn't polyfill that automatically, so without this the
// app throws `ReferenceError: global is not defined` the moment websocket.service.ts is loaded.
(globalThis as unknown as { global: typeof globalThis }).global = globalThis;
