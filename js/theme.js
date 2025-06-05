(function() {
  try {
    const isDark = window.parent?.document?.body?.classList.contains('dark');
    if (isDark) {
      document.body.classList.add('dark');
    }
  } catch (e) {
    // ignore if not in iframe or cross-origin
  }
})();
