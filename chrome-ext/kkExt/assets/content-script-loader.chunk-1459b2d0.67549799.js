(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/chunk-1459b2d0.js")
    );
  })().catch(console.error);

})();
