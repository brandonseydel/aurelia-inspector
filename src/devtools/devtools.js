chrome.runtime.onMessage.addListener((req, sender) => {
  if (sender.tab && req.aureliaDetected) {
    chrome.devtools.panels.elements.createSidebarPane(
      "Aurelia",
      function (sidebar) {
        sidebar.setPage(`index${req.version === 1 && '-v1'}.html`);
      }
    );
  }
});
