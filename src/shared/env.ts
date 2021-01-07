
export const isBrowser = typeof navigator !== 'undefined'
export const target = isBrowser ? window : typeof global !== 'undefined' ? global : {}
export const isChrome = typeof chrome !== 'undefined' && !!chrome.devtools
export const isFirefox = isBrowser && navigator.userAgent.includes('Firefox');
export const isWindows = isBrowser && navigator.platform.startsWith('Win');
export const isMac = isBrowser && navigator.platform === 'MacIntel';
export const isLinux = isBrowser && navigator.platform.startsWith('Linux');
