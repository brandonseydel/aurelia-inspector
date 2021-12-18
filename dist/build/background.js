var background;background =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/background/background.ts":
/*!**************************************!*\
  !*** ./src/background/background.ts ***!
  \**************************************/
/***/ (() => {

chrome.runtime.onMessage.addListener((req, sender) => {
    if (sender.tab && req.aureliaDetected) {
        chrome.browserAction.setIcon({
            tabId: sender.tab.id,
            path: {
                16: `images/16.png`,
                48: `images/48.png`,
                128: `images/128.png`
            }
        });
        chrome.browserAction.setTitle({
            title: `Aurelia ${req.version} Devtools`,
            tabId: sender.tab.id
        });
        chrome.browserAction.setPopup({
            tabId: sender.tab.id,
            popup: `popups/enabled${req.version === 1 && '-v1'}.html`
        });
    }
});


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__("./src/background/background.ts");
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9bbmFtZV0vLi9zcmMvYmFja2dyb3VuZC9iYWNrZ3JvdW5kLnRzIiwid2VicGFjazovL1tuYW1lXS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9bbmFtZV0vd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSw4QkFBOEIsWUFBWTtBQUMxQztBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0Esb0NBQW9DLDJCQUEyQjtBQUMvRCxTQUFTO0FBQ1Q7QUFDQSxDQUFDOzs7Ozs7O1VDbkJEO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7VUNyQkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVpbGQvYmFja2dyb3VuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigocmVxLCBzZW5kZXIpID0+IHtcclxuICAgIGlmIChzZW5kZXIudGFiICYmIHJlcS5hdXJlbGlhRGV0ZWN0ZWQpIHtcclxuICAgICAgICBjaHJvbWUuYnJvd3NlckFjdGlvbi5zZXRJY29uKHtcclxuICAgICAgICAgICAgdGFiSWQ6IHNlbmRlci50YWIuaWQsXHJcbiAgICAgICAgICAgIHBhdGg6IHtcclxuICAgICAgICAgICAgICAgIDE2OiBgaW1hZ2VzLzE2LnBuZ2AsXHJcbiAgICAgICAgICAgICAgICA0ODogYGltYWdlcy80OC5wbmdgLFxyXG4gICAgICAgICAgICAgICAgMTI4OiBgaW1hZ2VzLzEyOC5wbmdgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBjaHJvbWUuYnJvd3NlckFjdGlvbi5zZXRUaXRsZSh7XHJcbiAgICAgICAgICAgIHRpdGxlOiBgQXVyZWxpYSAke3JlcS52ZXJzaW9ufSBEZXZ0b29sc2AsXHJcbiAgICAgICAgICAgIHRhYklkOiBzZW5kZXIudGFiLmlkXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY2hyb21lLmJyb3dzZXJBY3Rpb24uc2V0UG9wdXAoe1xyXG4gICAgICAgICAgICB0YWJJZDogc2VuZGVyLnRhYi5pZCxcclxuICAgICAgICAgICAgcG9wdXA6IGBwb3B1cHMvZW5hYmxlZCR7cmVxLnZlcnNpb24gPT09IDEgJiYgJy12MSd9Lmh0bWxgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0pO1xyXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHRpZihfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdKSB7XG5cdFx0cmV0dXJuIF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0uZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIG1vZHVsZSBleHBvcnRzIG11c3QgYmUgcmV0dXJuZWQgZnJvbSBydW50aW1lIHNvIGVudHJ5IGlubGluaW5nIGlzIGRpc2FibGVkXG4vLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbnJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvYmFja2dyb3VuZC9iYWNrZ3JvdW5kLnRzXCIpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==