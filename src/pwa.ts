import { registerSW } from 'virtual:pwa-register';

const ONE_HOUR = 60 * 60 * 1000;

registerSW({
  immediate: true,
  onRegisteredSW(serviceWorkerUrl, registration) {
    if (!registration) return;

    window.setInterval(async () => {
      if (registration.installing || !window.navigator.onLine) return;

      try {
        const response = await window.fetch(serviceWorkerUrl, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache'
          }
        });

        if (response.status === 200) {
          await registration.update();
        }
      } catch {
        // Une perte de réseau ponctuelle sera retentée au prochain intervalle.
      }
    }, ONE_HOUR);
  },
  onRegisterError(error) {
    console.error(
      "Le service worker de l’Atlas biblique n’a pas pu être enregistré.",
      error
    );
  }
});
