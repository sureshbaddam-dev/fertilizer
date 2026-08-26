/**
 * Helper to dynamically load non-critical third-party scripts on demand
 * prevents render-blocking on initial page load
 */
export function loadExternalScript(src, id) {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) {
      return resolve(true);
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      return resolve(true);
    }

    const script = document.createElement('script');
    script.src = src;
    if (id) script.id = id;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

export function loadRazorpaySDK() {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true);
  }
  return loadExternalScript('https://checkout.razorpay.com/v1/checkout.js', 'razorpay-sdk-script');
}

export function loadGoogleSDK() {
  if (typeof window !== 'undefined' && window.google?.accounts) {
    return Promise.resolve(true);
  }
  return loadExternalScript('https://accounts.google.com/gsi/client', 'google-gsi-script');
}
