(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/chunk-2e935b18.js")
    );
  })().catch(console.error);

})();
