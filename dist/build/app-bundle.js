/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2018 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 3.7.2
 * Features enabled: core
 * Features disabled: race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule");
var Queue = _dereq_("./queue");

function Async() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule = schedule;
}

Async.prototype.setScheduler = function(fn) {
    var prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
};

Async.prototype.hasCustomScheduler = function() {
    return this._customScheduler;
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) +
            "\n");
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

Async.prototype.invokeLater = AsyncInvokeLater;
Async.prototype.invoke = AsyncInvoke;
Async.prototype.settlePromises = AsyncSettlePromises;


function _drainQueue(queue) {
    while (queue.length() > 0) {
        _drainQueueStep(queue);
    }
}

function _drainQueueStep(queue) {
    var fn = queue.shift();
    if (typeof fn !== "function") {
        fn._settlePromises();
    } else {
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
}

Async.prototype._drainQueues = function () {
    _drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    _drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

},{"./queue":17,"./schedule":18}],2:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],3:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise":15}],4:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise._isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent._isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            promise._setWillBeCancelled();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype._isCancellable = function() {
    return this.isPending() && !this._isCancelled();
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this._isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":21}],5:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util");
var getKeys = _dereq_("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":10,"./util":21}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, Context,
    enableAsyncHooks, disableAsyncHooks) {
var async = Promise._async;
var Warning = _dereq_("./errors").Warning;
var util = _dereq_("./util");
var es5 = _dereq_("./es5");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (true ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));

var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

var wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

var deferUnhandledRejectionCheck;
(function() {
    var promises = [];

    function unhandledRejectionCheck() {
        for (var i = 0; i < promises.length; ++i) {
            promises[i]._notifyUnhandledRejection();
        }
        unhandledRejectionClear();
    }

    function unhandledRejectionClear() {
        promises.length = 0;
    }

    deferUnhandledRejectionCheck = function(promise) {
        promises.push(promise);
        setTimeout(unhandledRejectionCheck, 1);
    };

    es5.defineProperty(Promise, "_unhandledRejectionCheck", {
        value: unhandledRejectionCheck
    });
    es5.defineProperty(Promise, "_unhandledRejectionClear", {
        value: unhandledRejectionClear
    });
})();

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      524288);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    deferUnhandledRejectionCheck(this);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._setReturnedNonUndefined = function() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._returnedNonUndefined = function() {
    return (this._bitField & 268435456) !== 0;
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var context = Promise._getContext();
    possiblyUnhandledRejection = util.contextBind(context, fn);
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var context = Promise._getContext();
    unhandledRejectionHandled = util.contextBind(context, fn);
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        var Promise_dereferenceTrace = Promise.prototype._dereferenceTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Promise.prototype._dereferenceTrace = Promise_dereferenceTrace;
            Context.deactivateLongStackTraces();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Promise.prototype._dereferenceTrace = longStackTracesDereferenceTrace;
        Context.activateLongStackTraces();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};


var legacyHandlers = {
    unhandledrejection: {
        before: function() {
            var ret = util.global.onunhandledrejection;
            util.global.onunhandledrejection = null;
            return ret;
        },
        after: function(fn) {
            util.global.onunhandledrejection = fn;
        }
    },
    rejectionhandled: {
        before: function() {
            var ret = util.global.onrejectionhandled;
            util.global.onrejectionhandled = null;
            return ret;
        },
        after: function(fn) {
            util.global.onrejectionhandled = fn;
        }
    }
};

var fireDomEvent = (function() {
    var dispatch = function(legacy, e) {
        if (legacy) {
            var fn;
            try {
                fn = legacy.before();
                return !util.global.dispatchEvent(e);
            } finally {
                legacy.after(fn);
            }
        } else {
            return !util.global.dispatchEvent(e);
        }
    };
    try {
        if (typeof CustomEvent === "function") {
            var event = new CustomEvent("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                name = name.toLowerCase();
                var eventData = {
                    detail: event,
                    cancelable: true
                };
                var domEvent = new CustomEvent(name, eventData);
                es5.defineProperty(
                    domEvent, "promise", {value: event.promise});
                es5.defineProperty(
                    domEvent, "reason", {value: event.reason});

                return dispatch(legacyHandlers[name], domEvent);
            };
        } else if (typeof Event === "function") {
            var event = new Event("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                name = name.toLowerCase();
                var domEvent = new Event(name, {
                    cancelable: true
                });
                domEvent.detail = event;
                es5.defineProperty(domEvent, "promise", {value: event.promise});
                es5.defineProperty(domEvent, "reason", {value: event.reason});
                return dispatch(legacyHandlers[name], domEvent);
            };
        } else {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("testingtheevent", false, true, {});
            util.global.dispatchEvent(event);
            return function(name, event) {
                name = name.toLowerCase();
                var domEvent = document.createEvent("CustomEvent");
                domEvent.initCustomEvent(name, false, true,
                    event);
                return dispatch(legacyHandlers[name], domEvent);
            };
        }
    } catch (e) {}
    return function() {
        return false;
    };
})();

var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function() {
            return process.emit.apply(process, arguments);
        };
    } else {
        if (!util.global) {
            return function() {
                return false;
            };
        }
        return function(name) {
            var methodName = "on" + name.toLowerCase();
            var method = util.global[methodName];
            if (!method) return false;
            method.apply(util.global, [].slice.call(arguments, 1));
            return true;
        };
    }
})();

function generatePromiseLifecycleEventObject(name, promise) {
    return {promise: promise};
}

var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function(name, promise, child) {
        return {promise: promise, child: child};
    },
    warning: function(name, warning) {
        return {warning: warning};
    },
    unhandledRejection: function (name, reason, promise) {
        return {reason: reason, promise: promise};
    },
    rejectionHandled: generatePromiseLifecycleEventObject
};

var activeFireEvent = function (name) {
    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
        async.throwLater(e);
        globalEventFired = true;
    }

    var domEventFired = false;
    try {
        domEventFired = fireDomEvent(name,
                    eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
        async.throwLater(e);
        domEventFired = true;
    }

    return domEventFired || globalEventFired;
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        var warningsOption = opts.warnings;
        config.warnings = !!warningsOption;
        wForgottenReturn = config.warnings;

        if (util.isObject(warningsOption)) {
            if ("wForgottenReturn" in warningsOption) {
                wForgottenReturn = !!warningsOption.wForgottenReturn;
            }
        }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
    if ("monitoring" in opts) {
        if (opts.monitoring && !config.monitoring) {
            config.monitoring = true;
            Promise.prototype._fireEvent = activeFireEvent;
        } else if (!opts.monitoring && config.monitoring) {
            config.monitoring = false;
            Promise.prototype._fireEvent = defaultFireEvent;
        }
    }
    if ("asyncHooks" in opts && util.nodeSupportsAsyncResource) {
        var prev = config.asyncHooks;
        var cur = !!opts.asyncHooks;
        if (prev !== cur) {
            config.asyncHooks = cur;
            if (cur) {
                enableAsyncHooks();
            } else {
                disableAsyncHooks();
            }
        }
    }
    return Promise;
};

function defaultFireEvent() { return false; }

Promise.prototype._fireEvent = defaultFireEvent;
Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._dereferenceTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function longStackTracesDereferenceTrace() {
    this._trace = undefined;
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise,
                               parent) {
    if (returnValue === undefined && promiseCreated !== null &&
        wForgottenReturn) {
        if (parent !== undefined && parent._returnedNonUndefined()) return;
        if ((promise._bitField & 65535) === 0) return;

        if (name) name = name + " ";
        var handlerLine = "";
        var creatorLine = "";
        if (promiseCreated._trace) {
            var traceLines = promiseCreated._trace.stack.split("\n");
            var stack = cleanStack(traceLines);
            for (var i = stack.length - 1; i >= 0; --i) {
                var line = stack[i];
                if (!nodeFramePattern.test(line)) {
                    var lineMatches = line.match(parseLinePattern);
                    if (lineMatches) {
                        handlerLine  = "at " + lineMatches[1] +
                            ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
                    }
                    break;
                }
            }

            if (stack.length > 0) {
                var firstUserLine = stack[0];
                for (var i = 0; i < traceLines.length; ++i) {

                    if (traceLines[i] === firstUserLine) {
                        if (i > 0) {
                            creatorLine = "\n" + traceLines[i - 1];
                        }
                        break;
                    }
                }

            }
        }
        var msg = "a promise was created in a " + name +
            "handler " + handlerLine + "but was not returned from it, " +
            "see http://goo.gl/rRqMUw" +
            creatorLine;
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
        formatAndLogError(warning, "", true);
    }
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0 && error.name != "SyntaxError") {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    if (name === "unhandledRejection") {
        if (!activeFireEvent(name, reason, promise) && !localEventFired) {
            formatAndLogError(reason, "Unhandled rejection ");
        }
    } else {
        activeFireEvent(name, promise);
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = (firstLineError.stack || "").split("\n");
    var lastStackLines = (lastLineError.stack || "").split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false,
    asyncHooks: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    asyncHooks: function() {
        return config.asyncHooks;
    },
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    monitoring: function() {
        return config.monitoring;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
};
};

},{"./errors":9,"./es5":10,"./util":21}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],9:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    es5.defineProperty(Error, "__BluebirdErrorTypes__", {
        value: errorTypes,
        writable: false,
        enumerable: false,
        configurable: false
    });
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":10,"./util":21}],10:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],11:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise, NEXT_FILTER) {
var util = _dereq_("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);

function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
}

PassThroughHandlerContext.prototype.isFinallyHandler = function() {
    return this.type === 0;
};

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.isFinallyHandler()
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret === NEXT_FILTER) {
            return ret;
        } else if (ret !== undefined) {
            promise._setReturnedNonUndefined();
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise._isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
                      fail,
                      undefined,
                      new PassThroughHandlerContext(this, type, handler),
                      undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};


Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

Promise.prototype.tapCatch = function (handlerOrPredicate) {
    var len = arguments.length;
    if(len === 1) {
        return this._passThrough(handlerOrPredicate,
                                 1,
                                 undefined,
                                 finallyHandler);
    } else {
         var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(new TypeError(
                    "tapCatch statement predicate: "
                    + "expecting an object but got " + util.classString(item)
                ));
            }
        }
        catchInstances.length = j;
        var handler = arguments[i];
        return this._passThrough(catchFilter(catchInstances, handler, this),
                                 1,
                                 undefined,
                                 finallyHandler);
    }

};

return PassThroughHandlerContext;
};

},{"./catch_filter":5,"./util":21}],12:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", "async", code)
                           (tryCatch, errorObj, Promise, async);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                            holder.asyncNeeded = false;
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }

                if (!ret._isFateSealed()) {
                    if (holder.asyncNeeded) {
                        var context = Promise._getContext();
                        holder.fn = util.contextBind(context, holder.fn);
                    }
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var args = [].slice.call(arguments);;
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":21}],13:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":21}],14:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors");
var OperationalError = errors.OperationalError;
var es5 = _dereq_("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var args = [].slice.call(arguments, 1);;
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":9,"./es5":10,"./util":21}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = _dereq_("./util");
util.setReflectHandler(reflectHandler);

var getDomain = function() {
    var domain = process.domain;
    if (domain === undefined) {
        return null;
    }
    return domain;
};
var getContextDefault = function() {
    return null;
};
var getContextDomain = function() {
    return {
        domain: getDomain(),
        async: null
    };
};
var AsyncResource = util.isNode && util.nodeSupportsAsyncResource ?
    _dereq_("async_hooks").AsyncResource : null;
var getContextAsyncHooks = function() {
    return {
        domain: getDomain(),
        async: new AsyncResource("Bluebird::Promise")
    };
};
var getContext = util.isNode ? getContextDomain : getContextDefault;
util.notEnumerableProp(Promise, "_getContext", getContext);
var enableAsyncHooks = function() {
    getContext = getContextAsyncHooks;
    util.notEnumerableProp(Promise, "_getContext", getContextAsyncHooks);
};
var disableAsyncHooks = function() {
    getContext = getContextDomain;
    util.notEnumerableProp(Promise, "_getContext", getContextDomain);
};

var es5 = _dereq_("./es5");
var Async = _dereq_("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = _dereq_("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = _dereq_("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;

var debug = _dereq_("./debuggability")(Promise, Context,
    enableAsyncHooks, disableAsyncHooks);
var CapturedTrace = debug.CapturedTrace;
var PassThroughHandlerContext =
    _dereq_("./finally")(Promise, tryConvertToPromise, NEXT_FILTER);
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = _dereq_("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (self == null || self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }

}

function Promise(executor) {
    if (executor !== INTERNAL) {
        check(this, executor);
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._resolveFromExecutor(executor);
    this._promiseCreated();
    this._fireEvent("promiseCreated", this);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("Catch statement predicate: " +
                    "expecting an object but got " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];

        if (typeof fn !== "function") {
            throw new TypeError("The last argument to .catch() " +
                "must be a function, got " + util.toString(fn));
        }
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.getNewLibraryCopy = module.exports;

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
        this._fireEvent("promiseChained", this, promise);
    }

    var context = getContext();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: util.contextBind(context, handler),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise,
                receiver, context);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
};

Promise.prototype._setWillBeCancelled = function() {
    this._bitField = this._bitField | 8388608;
};

Promise.prototype._setAsyncGuaranteed = function() {
    if (async.hasCustomScheduler()) return;
    var bitField = this._bitField;
    this._bitField = bitField |
        (((bitField & 536870912) >> 2) ^
        134217728);
};

Promise.prototype._setNoAsyncGuarantee = function() {
    this._bitField = (this._bitField | 536870912) &
        (~134217728);
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    context
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 = util.contextBind(context, fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 = util.contextBind(context, reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                util.contextBind(context, fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                util.contextBind(context, reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);


    var promise = maybePromise._target();

    if (promise === this) {
        this._reject(makeSelfResolutionError());
        return;
    }

    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(maybePromise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    if (executor === INTERNAL) return;
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj) {
        promise._rejectCallback(x.e, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise, this);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (receiver instanceof PassThroughHandlerContext &&
            receiver.isFinallyHandler()) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
        this._dereferenceTrace();
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        async.settlePromises(this);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
    es5.defineProperty(Promise.prototype, Symbol.toStringTag, {
        get: function () {
            return "Object";
        }
    });
}

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
_dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
_dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
_dereq_("./direct_resolve")(Promise);
_dereq_("./synchronous_inspection")(Promise);
_dereq_("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, async);
Promise.Promise = Promise;
Promise.version = "3.7.2";
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

},{"./async":1,"./bind":2,"./cancel":4,"./catch_filter":5,"./context":6,"./debuggability":7,"./direct_resolve":8,"./errors":9,"./es5":10,"./finally":11,"./join":12,"./method":13,"./nodeback":14,"./promise_array":16,"./synchronous_inspection":19,"./thenables":20,"./util":21,"async_hooks":undefined}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = _dereq_("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    case -6: return new Map();
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
        values.suppressUnhandledRejections();
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":21}],17:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],18:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var NativePromise = util.getNativePromise();
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if (typeof NativePromise === "function" &&
           typeof NativePromise.resolve === "function") {
    var nativePromise = NativePromise.resolve();
    schedule = function(fn) {
        nativePromise.then(fn);
    };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            (window.navigator.standalone || window.cordova)) &&
          ("classList" in document.documentElement)) {
    schedule = (function() {
        var div = document.createElement("div");
        var opts = {attributes: true};
        var toggleScheduled = false;
        var div2 = document.createElement("div");
        var o2 = new MutationObserver(function() {
            div.classList.toggle("foo");
            toggleScheduled = false;
        });
        o2.observe(div2, opts);

        var scheduleToggle = function() {
            if (toggleScheduled) return;
            toggleScheduled = true;
            div2.classList.toggle("foo");
        };

        return function schedule(fn) {
            var o = new MutationObserver(function() {
                o.disconnect();
                fn();
            });
            o.observe(div, opts);
            scheduleToggle();
        };
    })();
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":21}],19:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled = function() {
    return (this._bitField & 8454144) !== 0;
};

Promise.prototype.__isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype._isCancelled = function() {
    return this._target().__isCancelled();
};

Promise.prototype.isCancelled = function() {
    return (this._target()._bitField & 8454144) !== 0;
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],20:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    try {
        return hasProp.call(obj, "_promise0");
    } catch (e) {
        return false;
    }
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":21}],21:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    typeof global !== "undefined" ? global :
    this !== undefined ? this : null;

function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var receiver = new FakeConstructor();
    function ic() {
        return typeof receiver.foo;
    }
    ic();
    ic();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function isError(obj) {
    return obj instanceof Error ||
        (obj !== null &&
           typeof obj === "object" &&
           typeof obj.message === "string" &&
           typeof obj.name === "string");
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

var hasEnvVariables = typeof process !== "undefined" &&
    typeof process.env !== "undefined";

function env(key) {
    return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
    if (typeof Promise === "function") {
        try {
            var promise = new Promise(function(){});
            if (classString(promise) === "[object Promise]") {
                return Promise;
            }
        } catch (e) {}
    }
}

var reflectHandler;
function contextBind(ctx, cb) {
    if (ctx === null ||
        typeof cb !== "function" ||
        cb === reflectHandler) {
        return cb;
    }

    if (ctx.domain !== null) {
        cb = ctx.domain.bind(cb);
    }

    var async = ctx.async;
    if (async !== null) {
        var old = cb;
        cb = function() {
            var args = (new Array(2)).concat([].slice.call(arguments));;
            args[0] = old;
            args[1] = this;
            return async.runInAsyncScope.apply(async, args);
        };
    }
    return cb;
}

var ret = {
    setReflectHandler: function(fn) {
        reflectHandler = fn;
    },
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    isError: isError,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    isNode: isNode,
    hasEnvVariables: hasEnvVariables,
    env: env,
    global: globalObject,
    getNativePromise: getNativePromise,
    contextBind: contextBind
};
ret.isRecentNode = ret.isNode && (function() {
    var version;
    if (process.versions && process.versions.node) {
        version = process.versions.node.split(".").map(Number);
    } else if (process.version) {
        version = process.version.split(".").map(Number);
    }
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();
ret.nodeSupportsAsyncResource = ret.isNode && (function() {
    var supportsAsync = false;
    try {
        var res = _dereq_("async_hooks").AsyncResource;
        supportsAsync = typeof res.prototype.runInAsyncScope === "function";
    } catch (e) {
        supportsAsync = false;
    }
    return supportsAsync;
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5":10,"async_hooks":undefined}]},{},[3])(3)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.3.6 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, https://github.com/requirejs/requirejs/blob/master/LICENSE
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global, setTimeout) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.3.6',
        commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    //Could match something like ')//comment', do not lose the prefix to comment.
    function commentReplace(match, singlePrefix) {
        return singlePrefix || '';
    }

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttps://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (isNormalized) {
                        normalizedName = name;
                    } else if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                each(globalDefQueue, function(queueItem) {
                    var id = queueItem[0];
                    if (typeof id === 'string') {
                        context.defQueueMap[id] = true;
                    }
                    defQueue.push(queueItem);
                });
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    // Only fetch if not already in the defQueue.
                    if (!hasProp(context.defQueueMap, id)) {
                        this.fetch();
                    }
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                var resLoadMaps = [];
                                each(this.depMaps, function (depMap) {
                                    resLoadMaps.push(depMap.normalizedMap || depMap);
                                });
                                req.onResourceLoad(context, this.map, resLoadMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap,
                                                      true);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.map.normalizedMap = normalizedMap;
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            if (this.undefed) {
                                return;
                            }
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        } else if (this.events.error) {
                            // No direct errback on this module, but something
                            // else is listening for errors, so be sure to
                            // propagate the error correctly.
                            on(depMap, 'error', bind(this, function(err) {
                                this.emit('error', err);
                            }));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' +
                        args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
            context.defQueueMap = {};
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            defQueueMap: {},
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                // Convert old style urlArgs string to a function.
                if (typeof cfg.urlArgs === 'string') {
                    var urlArgs = cfg.urlArgs;
                    cfg.urlArgs = function(id, url) {
                        return (url.indexOf('?') === -1 ? '?' : '&') + urlArgs;
                    };
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? {name: pkgObj} : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id, null, true);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        mod.undefed = true;
                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if (args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });
                        delete context.defQueueMap[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }
                context.defQueueMap = {};

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|^blob\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs && !/^blob\:/.test(url) ?
                       url + config.urlArgs(moduleName, url) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    var parents = [];
                    eachProp(registry, function(value, key) {
                        if (key.indexOf('_@r') !== 0) {
                            each(value.depMaps, function(depMap) {
                                if (depMap.id === data.id) {
                                    parents.push(key);
                                    return true;
                                }
                            });
                        }
                    });
                    return onError(makeError('scripterror', 'Script error for "' + data.id +
                                             (parents.length ?
                                             '", needed by: ' + parents.join(', ') :
                                             '"'), evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/requirejs/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/requirejs/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //Calling onNodeCreated after all properties on the node have been
            //set, but before it is placed in the DOM.
            if (config.onNodeCreated) {
                config.onNodeCreated(node, config, moduleName, url);
            }

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation is that a build has been done so
                //that only one script needs to be loaded anyway. This may need
                //to be reevaluated if other use cases become common.

                // Post a task to the event loop to work around a bug in WebKit
                // where the worker gets garbage-collected after calling
                // importScripts(): https://webkit.org/b/153317
                setTimeout(function() {}, 0);
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one,
                //but only do so if the data-main value is not a loader plugin
                //module ID.
                if (!cfg.baseUrl && mainScript.indexOf('!') === -1) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, commentReplace)
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        if (context) {
            context.defQueue.push([name, deps, callback]);
            context.defQueueMap[name] = true;
        } else {
            globalDefQueue.push([name, deps, callback]);
        }
    };

    define.amd = {
        jQuery: true
    };

    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this, (typeof setTimeout === 'undefined' ? undefined : setTimeout)));

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define('backend/debug-host',["require", "exports", "aurelia-dependency-injection"], function (require, exports, aurelia_dependency_injection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DebugHost = exports.SelectionChanged = void 0;
    var createAureliaDebugger = function () {
        if (window['aureliaDebugger']) {
            return;
        }
        (function () {
            let nextDebugId = 0;
            function getNextDebugId() {
                return ++nextDebugId;
            }
            function createErrorObject(e) {
                return {
                    bindingContext: {
                        properties: [
                            {
                                name: 'Debugger Error',
                                value: e.message,
                                type: 'string',
                                canEdit: false
                            }
                        ]
                    }
                };
            }
            function attachedOwner(node) {
                let ownerView = node.auOwnerView;
                if (ownerView && ownerView.viewFactory) {
                    return ownerView;
                }
                return null;
            }
            function nodeIsImmediateChildOfView(view, node) {
                let currentChild = view.firstChild;
                let lastChild = view.lastChild;
                let nextChild;
                while (currentChild) {
                    nextChild = currentChild.nextSibling;
                    if (currentChild === node) {
                        return true;
                    }
                    if (currentChild === lastChild) {
                        break;
                    }
                    currentChild = nextChild;
                }
                return false;
            }
            function findSiblingRepeaterView(node) {
                if (!node) {
                    return null;
                }
                let current = node.nextSibling;
                while (current) {
                    if (current.nodeType === 8 && current.viewSlot && current.data === 'anchor') {
                        let children = current.viewSlot.children;
                        for (let i = 0, ii = children.length; i < ii; ++i) {
                            let view = children[i];
                            if (nodeIsImmediateChildOfView(view, node)) {
                                return view;
                            }
                        }
                    }
                    current = current.nextSibling;
                }
                return null;
            }
            function findImmediateControllerOwningView(node) {
                let parent = node.parentNode;
                if (parent && parent.au && parent.au.controller
                    && parent.au.controller.view && nodeIsImmediateChildOfView(parent.au.controller.view, node)) {
                    return parent.au.controller.view;
                }
                return null;
            }
            function findComposingView(node) {
                if (!node) {
                    return null;
                }
                if (node.aurelia) {
                    return node.aurelia.root.view;
                }
                else if (attachedOwner(node)) {
                    return attachedOwner(node);
                }
                else if (node.au) {
                    var au = node.au;
                    if (au.controller) {
                        var controller = au.controller;
                        var tagName = node.tagName ? node.tagName.toLowerCase() : null;
                        if (tagName === 'router-view') {
                            return controller.viewModel.view;
                        }
                        else if (tagName === 'compose') {
                            return controller.viewModel.currentController.view;
                        }
                        else if (controller['with']) {
                            return controller['with'].viewModel.view;
                        }
                    }
                }
                return null;
            }
            function getDebugPropertyKeys(obj) {
                let props = [];
                const keys = [...Object.keys(obj), ...Object.getOwnPropertyNames(obj)];
                const uniqueKeys = keys.filter((value, i, arr) => arr.indexOf(value) === i);
                for (const key of uniqueKeys) {
                    if (key && !key.startsWith('_') && typeof obj[key] !== 'function') {
                        props.push(key);
                    }
                }
                return props;
            }
            window['aureliaDebugger'] = {
                setValueOnDebugInfo(debugInfo, value, instance) {
                    try {
                        let expandableValue;
                        if (value instanceof Node) {
                            debugInfo.canExpand = true;
                            debugInfo.type = 'node';
                            debugInfo.value = value.constructor.name;
                            expandableValue = value;
                        }
                        else if (Array.isArray(value)) {
                            debugInfo.canExpand = true;
                            debugInfo.type = 'array';
                            debugInfo.value = `Array[${value.length}]`;
                            expandableValue = value;
                        }
                        else {
                            debugInfo.type = typeof value;
                            debugInfo.value = value;
                        }
                        if (value === null) {
                            debugInfo.type = 'null';
                            debugInfo.value = 'null';
                        }
                        else if (value === undefined) {
                            debugInfo.type = 'undefined';
                            debugInfo.value = 'undefined';
                        }
                        else if (debugInfo.type === 'object') {
                            debugInfo.canExpand = true;
                            expandableValue = value;
                            if (value.constructor) {
                                debugInfo.value = value.constructor.name;
                            }
                            else {
                                debugInfo.value = 'Object';
                            }
                        }
                        if (debugInfo.type === 'string' || debugInfo.type === 'number' || debugInfo.type === 'boolean') {
                            debugInfo.canEdit = true;
                        }
                        debugInfo.debugId = debugInfo.debugId || getNextDebugId();
                        this.debugValueLookup[debugInfo.debugId] = Object.assign({
                            instance: instance,
                            expandableValue: expandableValue
                        }, debugInfo);
                        return debugInfo;
                    }
                    catch (e) {
                        return createErrorObject(e);
                    }
                },
                createControllerDebugInfo(controller) {
                    try {
                        let controllerDebugInfo = {
                            name: controller.behavior.elementName || controller.behavior.attributeName
                        };
                        let viewModel = controller.viewModel;
                        let bindableKeys = {};
                        controllerDebugInfo.bindables = controller.behavior.properties.map(x => {
                            bindableKeys[x.name] = true;
                            return this.setValueOnDebugInfo({
                                name: x.name,
                                attribute: x.attribute,
                            }, viewModel[x.name], viewModel);
                        });
                        controllerDebugInfo.properties = getDebugPropertyKeys(viewModel)
                            .filter(x => !(x in bindableKeys))
                            .map(x => {
                            return this.setValueOnDebugInfo({
                                name: x
                            }, viewModel[x], viewModel);
                        });
                        return controllerDebugInfo;
                    }
                    catch (e) {
                        return createErrorObject(e);
                    }
                },
                convertObjectToDebugInfo(obj, blackList) {
                    blackList = blackList || {};
                    return {
                        properties: getDebugPropertyKeys(obj)
                            .filter(x => !(x in blackList))
                            .map(x => {
                            return this.setValueOnDebugInfo({
                                name: x
                            }, obj[x], obj);
                        })
                    };
                },
                getDebugInfoForNode(selectedNode) {
                    try {
                        var debugInfo = {};
                        this.debugValueLookup = {};
                        this.nextDebugId = 0;
                        if (selectedNode.au) {
                            var au = selectedNode.au;
                            if (au.controller) {
                                debugInfo.customElement = this.createControllerDebugInfo(au.controller);
                            }
                            var tagName = selectedNode.tagName ? selectedNode.tagName.toLowerCase() : null;
                            var customAttributeNames = getDebugPropertyKeys(au)
                                .filter(function (key) {
                                return key !== 'controller' && key !== tagName;
                            });
                            if (customAttributeNames.length) {
                                debugInfo.customAttributes = customAttributeNames.map(x => this.createControllerDebugInfo(au[x]));
                            }
                        }
                        let owningView = this.findOwningViewOfNode(selectedNode);
                        if (owningView) {
                            if (owningView.bindingContext) {
                                debugInfo.bindingContext = this.convertObjectToDebugInfo(owningView.bindingContext);
                            }
                            if (owningView.overrideContext) {
                                debugInfo.overrideContext = this.convertObjectToDebugInfo(owningView.overrideContext, { bindingContext: true, parentOverrideContext: true });
                            }
                        }
                        return debugInfo;
                    }
                    catch (e) {
                        return createErrorObject(e);
                    }
                },
                getExpandedDebugValueForId(id) {
                    let value = this.debugValueLookup[id].expandableValue;
                    if (Array.isArray(value)) {
                        let newValue = {};
                        value.forEach((value, index) => {
                            newValue[index] = value;
                        });
                        value = newValue;
                    }
                    return this.convertObjectToDebugInfo(value);
                },
                findOwningViewOfNode(node) {
                    function moveUp(n) {
                        let current = n.parentNode;
                        if (current) {
                            return findComposingView(current) || findSiblingRepeaterView(current) || findImmediateControllerOwningView(current) || moveUp(current);
                        }
                        return null;
                    }
                    return attachedOwner(node) || findSiblingRepeaterView(node) || findImmediateControllerOwningView(node) || moveUp(node);
                },
                updateValueForId(id, value) {
                    let debugInfo = this.debugValueLookup[id];
                    debugInfo.instance[debugInfo.name] = value;
                    this.setValueOnDebugInfo(debugInfo, value, debugInfo.instance);
                }
            };
        })();
    };
    class SelectionChanged {
        constructor(debugInfo) {
            this.debugInfo = debugInfo;
        }
    }
    exports.SelectionChanged = SelectionChanged;
    let DebugHost = class DebugHost {
        attach(consumer) {
            if (chrome && chrome.devtools) {
                var code = "(" + createAureliaDebugger.toString() + ")(); aureliaDebugger.getDebugInfoForNode($0)";
                chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
                    chrome.devtools.inspectedWindow.eval(code, debugObject => {
                        consumer.onSelectionChanged(new SelectionChanged(debugObject));
                    });
                });
                chrome.devtools.inspectedWindow.eval(code, debugObject => {
                    consumer.onSelectionChanged(new SelectionChanged(debugObject));
                });
            }
        }
        updateDebugValue(debugInfo) {
            let value = debugInfo.value;
            if (debugInfo.type === 'string') {
                value = "'" + value + "'";
            }
            let code = `aureliaDebugger.updateValueForId(${debugInfo.debugId}, ${value})`;
            chrome.devtools.inspectedWindow.eval(code);
        }
        toggleDebugValueExpansion(debugInfo) {
            if (debugInfo.canExpand) {
                debugInfo.isExpanded = !debugInfo.isExpanded;
                if (debugInfo.isExpanded && !debugInfo.expandedValue) {
                    let code = `aureliaDebugger.getExpandedDebugValueForId(${debugInfo.debugId});`;
                    chrome.devtools.inspectedWindow.eval(code, expandedValue => {
                        debugInfo.expandedValue = expandedValue;
                        debugInfo.isExpanded = true;
                    });
                }
            }
        }
    };
    DebugHost = __decorate([
        aurelia_dependency_injection_1.autoinject
    ], DebugHost);
    exports.DebugHost = DebugHost;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('app',["require", "exports", "./backend/debug-host", "aurelia-dependency-injection"], function (require, exports, debug_host_1, aurelia_dependency_injection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StringifyValueConverter = exports.App = void 0;
    let App = class App {
        constructor(debugHost) {
            this.debugHost = debugHost;
            this.isDarkTheme = false;
        }
        attached() {
            this.debugHost.attach(this);
            this.isDarkTheme = chrome && chrome.devtools && chrome.devtools.panels && chrome.devtools.panels.themeName === 'dark';
            if (this.isDarkTheme) {
                document.querySelector('html').style.background = '#202124';
            }
        }
        onSelectionChanged(event) {
            this.debugInfo = event.debugInfo;
        }
    };
    App = __decorate([
        aurelia_dependency_injection_1.autoinject,
        __metadata("design:paramtypes", [debug_host_1.DebugHost])
    ], App);
    exports.App = App;
    class StringifyValueConverter {
        toView(value) {
            return JSON.stringify(value);
        }
    }
    exports.StringifyValueConverter = StringifyValueConverter;
});

define('environment',["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {
        debug: true,
        testing: true
    };
});

define('main',["require", "exports", "./environment"], function (require, exports, environment_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.configure = void 0;
    Promise.config({
        longStackTraces: environment_1.default.debug,
        warnings: {
            wForgottenReturn: false
        }
    });
    function configure(aurelia) {
        aurelia.use
            .defaultBindingLanguage()
            .defaultResources()
            .feature('resources');
        if (environment_1.default.debug) {
            aurelia.use.developmentLogging();
        }
        if (environment_1.default.testing) {
            aurelia.use.plugin('aurelia-testing');
        }
        aurelia.start().then(() => aurelia.setRoot());
    }
    exports.configure = configure;
});

define('resources/index',["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.configure = void 0;
    function configure(config) {
        config.globalResources([
            './elements/aurelia-logo.html',
            './elements/debug-group',
            './elements/controller-view.html',
            './elements/property-view'
        ]);
    }
    exports.configure = configure;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/elements/debug-group',["require", "exports", "aurelia-templating"], function (require, exports, aurelia_templating_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DebugGroup = void 0;
    class DebugGroup {
    }
    __decorate([
        aurelia_templating_1.bindable,
        __metadata("design:type", String)
    ], DebugGroup.prototype, "heading", void 0);
    exports.DebugGroup = DebugGroup;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define('resources/elements/property-view',["require", "exports", "aurelia-dependency-injection", "aurelia-templating", "aurelia-task-queue", "../../backend/debug-host"], function (require, exports, aurelia_dependency_injection_1, aurelia_templating_1, aurelia_task_queue_1, debug_host_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PropertyView = void 0;
    let PropertyView = class PropertyView {
        constructor(debugHost, taskQueue) {
            this.debugHost = debugHost;
            this.taskQueue = taskQueue;
        }
        beginEditing() {
            if (this.property.canEdit) {
                this.property.isEditing = true;
                this.taskQueue.queueMicroTask(() => {
                    this.editor.focus();
                    this.editor.select();
                });
            }
        }
        onKeyDown(e) {
            if (e.keyCode === 13) {
                this.endEditing();
            }
            return true;
        }
        endEditing() {
            this.property.value = this.editor.value;
            this.property.isEditing = false;
            this.debugHost.updateDebugValue(this.property);
        }
    };
    __decorate([
        aurelia_templating_1.bindable,
        __metadata("design:type", Object)
    ], PropertyView.prototype, "property", void 0);
    PropertyView = __decorate([
        aurelia_dependency_injection_1.autoinject,
        __metadata("design:paramtypes", [debug_host_1.DebugHost, aurelia_task_queue_1.TaskQueue])
    ], PropertyView);
    exports.PropertyView = PropertyView;
});

define('text!app.html', ['module'], function(module) { module.exports = "<template><require from=\"./reset.css\"></require><require from=\"./app.css\"></require><div class=\"${isDarkTheme ? 'dark' : ''}\"><h1 class=\"app-header\"><aurelia-logo></aurelia-logo><span class=\"logo-badge\">INSPECTOR</span></h1><main><debug-group heading=\"Binding Context\" show.bind=\"true\"><template if.bind=\"debugInfo.bindingContext\"><ul><li repeat.for=\"property of debugInfo.bindingContext.properties\"><property-view property.bind=\"property\"></property-view></li></ul></template><template if.bind=\"!debugInfo.bindingContext\"><span class=\"not-found\">No binding context found for the selected node.</span></template></debug-group><debug-group heading=\"Override Context\"><template if.bind=\"debugInfo.overrideContext && debugInfo.overrideContext.properties.length\"><ul><li repeat.for=\"property of debugInfo.overrideContext.properties\"><property-view property.bind=\"property\"></property-view></li></ul></template><template if.bind=\"!debugInfo.overrideContext || !debugInfo.overrideContext.properties.length\"><span class=\"not-found\">No override context found for the selected node.</span></template></debug-group><debug-group heading=\"Custom Element\"><template if.bind=\"debugInfo.customElement\"><controller-view controller.bind=\"debugInfo.customElement\"></controller-view></template><template if.bind=\"!debugInfo.customElement\"><span class=\"not-found\">The selected node is not a custom element.</span></template></debug-group><debug-group heading=\"Custom Attributes\"><template if.bind=\"debugInfo.customAttributes\"><ul><li repeat.for=\"customAttribute of debugInfo.customAttributes\" class=\"custom-attribute\"><h3 class=\"attribute-name\">${customAttribute.name}</h3>&nbsp;<span class=\"block-token\">{</span><controller-view controller.bind=\"customAttribute\"></controller-view><span class=\"block-token\">}</span></li></ul></template><template if.bind=\"!debugInfo.customAttributes\"><span class=\"not-found\">No custom attributes found on the selected node.</span></template></debug-group></main></div></template>"; });
define('text!app.css', ['module'], function(module) { module.exports = ".app-header {\n  background: #f4f4f4;\n  padding: 0;\n  padding: 5px 0 0 0;\n  text-align: center;\n}\n\n.dark .app-header {\n  background: #202124;\n}\n\n.logo-badge {\n  position: relative;\n  top: -7px;\n  font-weight: 100;\n  font-size: 16px;\n  color: #BB79A8;\n}\n\n.not-found {\n  font-style: italic;\n  font-size: 10px;\n}\n\n.dark .not-found {\n  color: #989898;\n}\n\n.custom-attribute {\n  margin-bottom: 4px;\n}\n\n.custom-attribute .attribute-name {\n  color: saddlebrown;\n}\n.dark .custom-attribute .attribute-name {\n  color: #ef9565;\n}\n\n.custom-attribute .block-token {\n  color: gray;\n}\n\n.custom-attribute .attribute-name, .custom-attribute .block-token {\n  font-size: 12px;\n  display: inline;\n  font-family: monospace;\n}\n\n.custom-attribute controller-view {\n  margin-left: 8px;\n  display: block;\n}\n"; });
define('text!resources/elements/aurelia-logo.html', ['module'], function(module) { module.exports = "<template><svg height=\"28px\" viewBox=\"315 19 140 41\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><defs><linearGradient x1=\"-388.147851%\" y1=\"-144.177425%\" x2=\"237.683809%\" y2=\"430.405754%\" id=\"linearGradient-1\"><stop stop-color=\"#C06FBB\" offset=\"0%\"></stop><stop stop-color=\"#6E4D9B\" offset=\"100%\"></stop></linearGradient><linearGradient x1=\"72.9454854%\" y1=\"84.4240777%\" x2=\"-97.0517904%\" y2=\"-147.696591%\" id=\"linearGradient-2\"><stop stop-color=\"#6E4D9B\" offset=\"0%\"></stop><stop stop-color=\"#77327A\" offset=\"14%\"></stop><stop stop-color=\"#B31777\" offset=\"29%\"></stop><stop stop-color=\"#CD0F7E\" offset=\"84%\"></stop><stop stop-color=\"#ED2C89\" offset=\"100%\"></stop></linearGradient><linearGradient x1=\"-283.884079%\" y1=\"-693.599872%\" x2=\"287.537417%\" y2=\"101.70976%\" id=\"linearGradient-3\"><stop stop-color=\"#C06FBB\" offset=\"0%\"></stop><stop stop-color=\"#6E4D9B\" offset=\"100%\"></stop></linearGradient><linearGradient x1=\"-821.186214%\" y1=\"-469.047862%\" x2=\"101.985142%\" y2=\"288.23598%\" id=\"linearGradient-4\"><stop stop-color=\"#C06FBB\" offset=\"0%\"></stop><stop stop-color=\"#6E4D9B\" offset=\"100%\"></stop></linearGradient><linearGradient x1=\"-140.359373%\" y1=\"-230.925718%\" x2=\"419.012316%\" y2=\"261.976742%\" id=\"linearGradient-5\"><stop stop-color=\"#C06FBB\" offset=\"0%\"></stop><stop stop-color=\"#6E4D9B\" offset=\"100%\"></stop></linearGradient><linearGradient x1=\"191.083716%\" y1=\"253.952517%\" x2=\"20.3577022%\" y2=\"20.4029283%\" id=\"linearGradient-6\"><stop stop-color=\"#6E4D9B\" offset=\"0%\"></stop><stop stop-color=\"#77327A\" offset=\"14%\"></stop><stop stop-color=\"#B31777\" offset=\"29%\"></stop><stop stop-color=\"#CD0F7E\" offset=\"84%\"></stop><stop stop-color=\"#ED2C89\" offset=\"100%\"></stop></linearGradient><linearGradient x1=\"-388.094004%\" y1=\"-173.850055%\" x2=\"237.674802%\" y2=\"518.990225%\" id=\"linearGradient-7\"><stop stop-color=\"#C06FBB\" offset=\"0%\"></stop><stop stop-color=\"#6E4D9B\" offset=\"100%\"></stop></linearGradient><linearGradient x1=\"11.1884561%\" y1=\"89.6525993%\" x2=\"90.145125%\" y2=\"11.5773982%\" id=\"linearGradient-8\"><stop stop-color=\"#6E4D9B\" offset=\"0%\"></stop><stop stop-color=\"#77327A\" offset=\"14%\"></stop><stop stop-color=\"#B31777\" offset=\"53%\"></stop><stop stop-color=\"#CD0F7E\" offset=\"79%\"></stop><stop stop-color=\"#ED2C89\" offset=\"100%\"></stop></linearGradient><rect id=\"path-9\" x=\"0.627498256\" y=\"0\" width=\"34\" height=\"16\" rx=\"2\"></rect><filter x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\" filterUnits=\"objectBoundingBox\" id=\"filter-10\"><feOffset dx=\"0\" dy=\"1\" in=\"SourceAlpha\" result=\"shadowOffsetOuter1\"></feOffset><feColorMatrix values=\"0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.15 0\" type=\"matrix\" in=\"shadowOffsetOuter1\"></feColorMatrix></filter></defs><g id=\"Group-3\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\" transform=\"translate(317.000000, 21.000000)\"><g id=\"Icon\" transform=\"translate(18.821436, 18.821436) rotate(11.283864) translate(-18.821436, -18.821436) translate(2.821436, 2.821436)\"><g id=\"Group\" transform=\"translate(16.062217, 4.314649) rotate(-11.283864) translate(-16.062217, -4.314649) translate(12.909354, 0.852682)\" fill=\"url(#linearGradient-1)\"><polygon id=\"Shape\" points=\"6.24514134 4.78196568 3.21344731 6.8053618 0.0902584276 2.12490594 3.12195246 0.101509821\"></polygon></g><g id=\"Group\" transform=\"translate(24.576671, 23.606062) rotate(-11.283864) translate(-24.576671, -23.606062) translate(18.394587, 16.929411)\" fill=\"url(#linearGradient-2)\"><polygon id=\"Shape\" points=\"7.16404632 1.47319064 12.3440146 9.23541541 6.17342916 13.3533016 0.993460912 5.5909532 0.0897638609 4.23695315 6.26047291 0.119066939\"></polygon></g><g id=\"Group\" transform=\"translate(16.064001, 27.069671) rotate(-11.283864) translate(-16.064001, -27.069671) translate(12.602034, 23.854988)\" fill=\"url(#linearGradient-3)\"><polygon id=\"Shape\" points=\"5.69777962 1.46663763 6.83825049 3.17561295 2.14147393 6.30992958 0.0973060035 3.24683056 1.12340832 2.56210293 4.79420621 0.11251393\"></polygon></g><g id=\"Group\" transform=\"translate(27.417287, 15.726712) rotate(-11.283864) translate(-27.417287, -15.726712) translate(24.820812, 13.130236)\" fill=\"url(#linearGradient-4)\"><path d=\"M1.81703815,0.894671208 L3.13444027,0.0155788519 L5.17848455,3.07867787 L2.14641959,5.10207399 L1.00594872,3.39309867 L2.72061156,2.24879491 L1.81703815,0.894671208 L1.81703815,0.894671208 Z M1.00594872,3.39309867 L0.102375312,2.03897497 L1.81703815,0.894671208 L2.72061156,2.24879491 L1.00594872,3.39309867 L1.00594872,3.39309867 Z\" id=\"Shape\"></path></g><g id=\"Group\" transform=\"translate(4.721041, 15.716385) rotate(-11.283864) translate(-4.721041, -15.716385) translate(0.764507, 11.759851)\" fill=\"url(#linearGradient-5)\"><polygon id=\"Shape\" points=\"4.17241219 7.1450055 3.14643351 7.82973313 0.0229973528 3.14927727 4.71977391 0.0149606435 6.90909717 3.29579267 3.23842293 5.74538166 6.90909717 3.29579267 7.84321007 4.69554014\"></polygon></g><g id=\"Group\" transform=\"translate(8.822560, 7.837609) rotate(-11.283864) translate(-8.822560, -7.837609) translate(2.640476, 1.160958)\" fill=\"url(#linearGradient-6)\"><polygon id=\"Shape\" points=\"11.3428879 7.75332257 12.2768771 9.15307005 6.10616809 13.2709563 5.17217883 11.8712088 0.0406781133 4.18168531 6.21138716 0.0637991077\"></polygon></g><g id=\"Group\" transform=\"translate(16.122857, 4.300703) rotate(-11.283864) translate(-16.122857, -4.300703) translate(12.969994, 0.900557)\" fill=\"url(#linearGradient-7)\"><polygon id=\"Shape\" points=\"4.86604202 5.6013391 3.15137918 6.74551923 2.21726628 5.34589539 0.0279430201 2.06506337 3.06000798 0.0416672467 6.18344414 4.72212311\"></polygon></g><g id=\"Group\" transform=\"translate(15.822071, 25.857155) rotate(-11.283864) translate(-15.822071, -25.857155) translate(13.472879, 23.878888)\" fill=\"#714896\"><polygon id=\"Shape\" points=\"0.914330236 3.91622662 0.0106331846 2.56210293 3.68143107 0.11251393 4.58500448 1.46663763\"></polygon></g><g id=\"Group\" transform=\"translate(26.180721, 15.532164) rotate(-11.283864) translate(-26.180721, -15.532164) translate(24.758842, 14.233926)\" fill=\"#6F4795\"><polygon id=\"Shape\" points=\"1.00594872 2.5276069 0.102375312 1.1734832 1.81703815 0.0291794369 2.72061156 1.38330313\"></polygon></g><g id=\"Group\" transform=\"translate(6.539242, 16.614393) rotate(-11.283864) translate(-6.539242, -16.614393) translate(4.190050, 14.636126)\" fill=\"#88519F\"><polygon id=\"Shape\" points=\"0.957728466 3.93032178 0.0237392029 2.53069794 3.69441345 0.0811089432 4.62852635 1.48085642\"></polygon></g><g id=\"Group\" transform=\"translate(16.885795, 6.228777) rotate(-11.283864) translate(-16.885795, -6.228777) translate(15.463916, 4.868718)\" fill=\"#85509E\"><polygon id=\"Shape\" points=\"1.04947059 2.66534373 0.115357689 1.26571989 1.83014417 0.121416131 2.76413343 1.52116361\"></polygon></g><g id=\"Group\" transform=\"translate(21.280404, 20.355313) rotate(-11.283864) translate(-21.280404, -20.355313) translate(17.694795, 17.511554)\" fill=\"#8D166A\"><polygon id=\"Shape\" points=\"7.16404632 1.47319064 0.993460912 5.5909532 0.0897638609 4.23695315 6.26047291 0.119066939\"></polygon></g><g id=\"Group\" transform=\"translate(12.058201, 11.100454) rotate(-11.283864) translate(-12.058201, -11.100454) translate(8.410771, 8.256696)\" fill=\"#A70D6F\"><polygon id=\"Shape\" points=\"6.27357893 0.0875383106 7.20756819 1.48728579 1.03685914 5.605172 0.102869879 4.20542452\"></polygon></g><g id=\"Group\" transform=\"translate(1.853411, 10.678267) rotate(45.000000) translate(-1.853411, -10.678267) translate(0.797906, 9.622762)\" fill=\"#9E61AD\"><rect id=\"Rectangle-path\" x=\"1.66662571e-15\" y=\"0\" width=\"2.0982715\" height=\"2.0982715\"></rect></g><g id=\"Group\" transform=\"translate(12.115669, 29.966366) rotate(45.000000) translate(-12.115669, -29.966366) translate(11.060163, 28.910860)\" fill=\"#8053A3\"><rect id=\"Rectangle-path\" x=\"1.66662571e-15\" y=\"0\" width=\"2.0982715\" height=\"2.0982715\"></rect></g><g id=\"Group\" transform=\"translate(16.641954, 16.427437) rotate(0.000000) translate(-16.641954, -16.427437) translate(1.422442, 1.207924)\" fill=\"url(#linearGradient-8)\"><polygon id=\"Shape\" points=\"6.53446157 29.8878978 0.012982374 23.3175801 23.2186668 0.0630572451 29.9596099 6.46398583\"></polygon></g></g><g id=\"Aurelia-+-Type-something\" transform=\"translate(38.131960, 3.021427)\"><g id=\"Aurelia\" transform=\"translate(0.929505, 0.290297)\"><g id=\"A\" transform=\"translate(0.076673, 8.413465)\" fill=\"#ED2C88\"><path d=\"M8.79524752,16.5403564 C8.91089109,16.5398812 9.02811881,16.5376634 9.14376238,16.5325941 C9.38930693,16.5216634 9.63326733,16.4993267 9.87722772,16.4652673 C10.5853465,16.3659406 11.2792079,16.167604 11.9334653,15.8765941 C12.7429703,15.5166733 13.4891089,15.0162376 14.1306931,14.4050693 C14.7358416,13.8271683 15.2475248,13.1512079 15.6388119,12.4104554 C15.969901,11.7821782 16.2138614,11.1084356 16.3611881,10.4133069 C16.540198,9.56356436 16.5750495,8.68324752 16.4657426,7.82178218 C16.3643564,7.03271287 16.1425743,6.26043564 15.8051485,5.53964356 C15.4186139,4.70954455 14.8815842,3.95025743 14.230495,3.30645545 C13.5445545,2.62922772 12.7334653,2.08110891 11.8479208,1.70011881 C11.3679208,1.49354455 10.8657426,1.33607921 10.3540594,1.23136634 C9.87405941,1.13314851 9.38455446,1.0810297 8.8950495,1.07485149 C8.41821782,1.06883168 7.94138614,1.10590099 7.47247525,1.18669307 C6.94019802,1.27841584 6.41742574,1.42653465 5.91524752,1.62788119 C5.03445545,1.98130693 4.22178218,2.49916832 3.52633663,3.14582178 C2.84514851,3.78011881 2.27960396,4.53687129 1.86455446,5.37061386 C1.51287129,6.08079208 1.27049505,6.8449901 1.15009901,7.6289901 C1.0170297,8.50407921 1.03287129,9.40229703 1.20079208,10.2718416 C1.3370297,10.9859802 1.57623762,11.6801584 1.90732673,12.3274455 C2.28910891,13.0731089 2.79287129,13.7552475 3.39326733,14.3405941 C4.01425743,14.9482772 4.73821782,15.450297 5.52712871,15.8181386 C6.15920792,16.1134257 6.83247525,16.321901 7.52,16.4359604 C7.76079208,16.4758812 8.00475248,16.504396 8.24871287,16.5213465 C8.38019802,16.5305347 8.51168317,16.5359208 8.64475248,16.5389307 C8.69544554,16.5397228 8.74455446,16.540198 8.79524752,16.5403564 L8.79524752,16.5403564 Z M16.8538614,12.199604 C16.769901,12.3988911 16.6780198,12.5950099 16.579802,12.7874851 C16.1330693,13.6613069 15.5374257,14.4579802 14.8261386,15.1353663 C14.1275248,15.8018218 13.3180198,16.3518416 12.440396,16.7550099 C11.7053465,17.0924356 10.9243564,17.3265743 10.1259406,17.4487129 C9.85188119,17.4905347 9.57623762,17.5193663 9.2990099,17.5350495 C9.16910891,17.542495 9.03762376,17.5466139 8.90772277,17.5486733 C8.86970297,17.5491485 8.83168317,17.5493069 8.79524752,17.5494653 C8.66376238,17.5489901 8.53227723,17.5466139 8.40079208,17.5407525 C8.12356436,17.528396 7.84792079,17.5030495 7.57227723,17.4647129 C6.77069307,17.352396 5.9849505,17.1277624 5.24514851,16.7987327 C4.34693069,16.3988911 3.51683168,15.8460198 2.80079208,15.1714851 C2.07366337,14.4861782 1.46534653,13.6768317 1.00910891,12.7874851 C0.641584158,12.0712871 0.375445545,11.3045545 0.218613861,10.5151683 C0.0316831683,9.57037624 0.00316831683,8.59453465 0.12990099,7.63992079 C0.247128713,6.76625743 0.495841584,5.91128713 0.86970297,5.11271287 C1.31485149,4.15857426 1.93425743,3.28760396 2.68831683,2.55192079 C3.46613861,1.79073267 4.38811881,1.17671287 5.39089109,0.752316832 C5.92,0.528633663 6.47128713,0.35770297 7.03366337,0.242693069 C7.59445545,0.128 8.16633663,0.0687524752 8.73821782,0.0652673267 C9.31168317,0.0616237624 9.88514851,0.113584158 10.4491089,0.221465347 C11.0130693,0.329663366 11.5675248,0.493940594 12.099802,0.711287129 C13.1089109,1.12364356 14.0372277,1.72689109 14.8261386,2.4790495 C15.5754455,3.1930297 16.1964356,4.03960396 16.6510891,4.96918812 C16.7223762,5.11588119 16.790495,5.26447525 16.8538614,5.4149703 L16.8538614,0.0944158416 L17.8439604,0.0944158416 L17.8439604,17.5201584 L16.8538614,17.5201584 L16.8538614,12.199604 L16.8538614,12.199604 Z\" id=\"Shape\"></path></g><g id=\"U\" transform=\"translate(20.353901, 8.413465)\" fill=\"#CD0F7E\"><path d=\"M16.5370297,12.8188515 C16.1710891,13.5234851 15.7116832,14.1790099 15.1714851,14.761505 C14.710495,15.2605149 14.1893069,15.7056634 13.6253465,16.0845941 C13.0106931,16.4967921 12.3421782,16.8299406 11.6435644,17.0724752 C11.0637624,17.2736634 10.4617822,17.4122772 9.85188119,17.4859406 C9.64910891,17.510495 9.44792079,17.5277624 9.24356436,17.5380594 C9.13108911,17.5437624 9.02019802,17.5469307 8.90772277,17.5486733 C8.86970297,17.5491485 8.83168317,17.5493069 8.79524752,17.5494653 C8.68118812,17.5491485 8.57029703,17.5472475 8.45623762,17.5429703 C8.21544554,17.5339406 7.97465347,17.5149307 7.73544554,17.486099 C7.03366337,17.401505 6.3429703,17.2318416 5.68079208,16.981703 C4.68910891,16.6065743 3.76712871,16.0505347 2.97188119,15.3492277 C2.40792079,14.8505347 1.90574257,14.2788119 1.48752475,13.6519604 C1.03445545,12.9745743 0.678019802,12.2330297 0.435643564,11.4553663 C0.256633663,10.8830099 0.139405941,10.291802 0.0855445545,9.69473267 C0.0586138614,9.39865347 0.0491089109,9.10162376 0.0522772277,8.80443564 L0.0522772277,0.0944158416 L1.06138614,0.0944158416 L1.06138614,8.81013861 L1.06138614,8.91453465 L1.06138614,9.0140198 C1.0629703,9.1130297 1.06455446,9.21188119 1.07089109,9.31073267 C1.0819802,9.53805941 1.10415842,9.76491089 1.13584158,9.99033663 C1.22772277,10.6333465 1.40356436,11.264 1.66019802,11.8613861 C2.01980198,12.7047921 2.53623762,13.4792871 3.16990099,14.1414653 C3.79564356,14.7939802 4.53544554,15.3357624 5.3449505,15.7362376 C6.05940594,16.0890297 6.82772277,16.3310891 7.6150495,16.4511683 C8.42613861,16.5747327 9.25782178,16.5704554 10.0673267,16.4359604 C10.7057426,16.3296634 11.3314851,16.1416238 11.9239604,15.8769109 C12.7714851,15.4979802 13.5477228,14.9631683 14.2067327,14.3089109 C14.8340594,13.6853861 15.3536634,12.9552475 15.740198,12.1587327 C16.0586139,11.5003564 16.2835644,10.7976238 16.4087129,10.0771485 C16.4578218,9.80308911 16.4910891,9.52665347 16.510099,9.24926733 C16.5180198,9.11651485 16.5243564,8.98376238 16.5275248,8.85069307 L16.5275248,8.80316832 L16.5370297,0.0944158416 L17.5271287,0.0944158416 L17.5271287,17.5201584 L16.5370297,17.5201584 L16.5370297,12.8188515 L16.5370297,12.8188515 Z\" id=\"Shape\"></path></g><g id=\"R\" transform=\"translate(40.314297, 8.413465)\" fill=\"#B31776\"><path d=\"M1.06455446,8.41552475 L1.04237624,17.5201584 L0.0522772277,17.5201584 L0.0522772277,0.0944158416 L1.04237624,0.0944158416 L1.04237624,4.55524752 C1.16594059,4.32966337 1.30059406,4.10978218 1.44316832,3.89639604 C1.83287129,3.31691089 2.29544554,2.78637624 2.81346535,2.31889109 C3.57069307,1.63611881 4.44831683,1.08910891 5.39405941,0.706693069 C6.08950495,0.425188119 6.82138614,0.232871287 7.56594059,0.133386139 C7.82257426,0.0993267327 8.07920792,0.076039604 8.33742574,0.0635247525 C8.48633663,0.0563960396 8.63524752,0.0532277228 8.78415842,0.0527524752 L8.78732673,1.08641584 C8.75247525,1.08657426 8.71920792,1.08673267 8.68594059,1.0870495 C8.65267327,1.08752475 8.61940594,1.08815842 8.58613861,1.0889505 C8.47049505,1.0919604 8.35485149,1.09687129 8.23920792,1.10463366 C7.99524752,1.12079208 7.75287129,1.14788119 7.51207921,1.18590099 C6.87366337,1.28681188 6.24792079,1.46550495 5.65227723,1.71849505 C4.82693069,2.0700198 4.06178218,2.56506931 3.40594059,3.17813861 C2.94653465,3.60712871 2.5409901,4.09346535 2.20356436,4.62320792 C1.85663366,5.16673267 1.5809901,5.75619802 1.38930693,6.37180198 C1.25306931,6.80966337 1.15960396,7.26035644 1.10891089,7.71611881 C1.0819802,7.94851485 1.06930693,8.18186139 1.06455446,8.41552475 L1.06455446,8.41552475 Z\" id=\"Shape\"></path></g><g id=\"E\" transform=\"translate(48.393505, 8.413465)\" fill=\"#9B2073\"><path d=\"M9.3750495,17.5510495 L8.81584158,17.5493069 C8.77940594,17.5488317 8.74138614,17.5483564 8.70336634,17.5478812 C8.59089109,17.5453465 8.48,17.5413861 8.36752475,17.5350495 C8.12831683,17.5214257 7.88910891,17.4979802 7.65148515,17.4647129 C6.98930693,17.3720396 6.33980198,17.2033267 5.71722772,16.9623762 C4.68277228,16.5620594 3.72910891,15.9626139 2.9180198,15.2072871 C2.12118812,14.4663762 1.46534653,13.5773465 0.993267327,12.5975446 C0.643168317,11.8707327 0.394455446,11.0954455 0.258217822,10.3003564 C0.0934653465,9.35081188 0.0887128713,8.37386139 0.239207921,7.42241584 C0.400792079,6.41489109 0.73980198,5.43778218 1.23722772,4.54732673 C1.78376238,3.56879208 2.52039604,2.69845545 3.39326733,1.99524752 C3.85742574,1.62075248 4.36118812,1.29394059 4.89188119,1.02178218 C5.3829703,0.770217822 5.89782178,0.565544554 6.42851485,0.411564356 C7.18574257,0.191524752 7.97148515,0.0757227723 8.76039604,0.0657425743 C9.64118812,0.0546534653 10.5235644,0.175366337 11.369505,0.426772277 C12.3184158,0.709386139 13.2182178,1.15564356 14.019802,1.73972277 C14.8673267,2.35849505 15.6023762,3.12966337 16.1805941,4.00665347 C16.5592079,4.58233663 16.869703,5.2030099 17.1025743,5.85172277 C17.3417822,6.51675248 17.4986139,7.21093069 17.569901,7.91413861 C17.5920792,8.13607921 17.6063366,8.35881188 17.6126733,8.58186139 C17.6126733,8.63825743 17.6142574,8.69449505 17.6142574,8.75073267 C17.6158416,8.78732673 17.6158416,8.82582178 17.6126733,8.86209901 C17.609505,8.8809505 17.6063366,8.89964356 17.6031683,8.91817822 C17.590495,8.97346535 17.5683168,9.02669307 17.5382178,9.07469307 C17.4780198,9.17132673 17.3845545,9.24562376 17.2768317,9.28332673 C17.2419802,9.29584158 17.2039604,9.30439604 17.1675248,9.30867327 C17.1485149,9.31073267 17.129505,9.31073267 17.110495,9.31184158 L9.0819802,9.31184158 L9.0819802,8.30273267 L16.5893069,8.30273267 C16.5718812,8.02867327 16.540198,7.75588119 16.4926733,7.48530693 C16.4023762,6.95271287 16.2534653,6.42962376 16.0522772,5.92807921 C15.7623762,5.20538614 15.3615842,4.528 14.8689109,3.92443564 C14.3112871,3.24007921 13.6364356,2.65188119 12.8823762,2.19342574 C12.2645545,1.81845545 11.5960396,1.53077228 10.8974257,1.34194059 C10.0625743,1.11588119 9.18970297,1.03287129 8.32633663,1.09322772 C7.90653465,1.12253465 7.48831683,1.18590099 7.07960396,1.28316832 C6.63287129,1.38914851 6.19722772,1.53520792 5.77584158,1.7189703 C4.89346535,2.10487129 4.08554455,2.65790099 3.40435644,3.33908911 C3.08752475,3.65655446 2.79762376,4.00158416 2.53940594,4.3689505 C2.21623762,4.82835644 1.94376238,5.32261386 1.72831683,5.84079208 C1.50336634,6.38384158 1.34019802,6.95287129 1.24356436,7.53314851 C1.16594059,8.00332673 1.13267327,8.48063366 1.14059406,8.95730693 C1.15168317,9.49449505 1.21663366,10.0305743 1.3370297,10.5541386 C1.47643564,11.1535842 1.68712871,11.7362376 1.96435644,12.2856238 C2.26534653,12.8817426 2.6439604,13.4382574 3.08594059,13.9375842 C3.49782178,14.4007921 3.96356436,14.8145743 4.47207921,15.1673663 C4.88237624,15.4514059 5.31960396,15.6958416 5.77584158,15.895604 C6.25584158,16.1050297 6.75485149,16.2653465 7.26653465,16.3733861 C7.59920792,16.4437228 7.93821782,16.4918812 8.27722772,16.517703 C8.45940594,16.5314851 8.64,16.5384554 8.82217822,16.540198 L9.37821782,16.5419406 C9.37821782,16.8782574 9.37663366,17.2145743 9.3750495,17.5510495 L9.3750495,17.5510495 Z\" id=\"Shape\"></path></g><g id=\"L\" transform=\"translate(68.512317, 0.017426)\" fill=\"#8F2475\"><path d=\"M5.15009901,25.945505 C4.98851485,25.9450297 4.82693069,25.9401188 4.66534653,25.9291881 C4.32475248,25.9062178 3.98415842,25.8577426 3.65148515,25.7802772 C3.31881188,25.7026535 2.99089109,25.5957228 2.67881188,25.4566337 C2.29227723,25.2849109 1.92633663,25.0642376 1.60158416,24.7947723 C1.43049505,24.6548911 1.27207921,24.5020198 1.12633663,24.3375842 C0.942574257,24.1314851 0.780990099,23.9074851 0.641584158,23.6692277 C0.467326733,23.3699802 0.331089109,23.0491881 0.234455446,22.7168317 C0.163168317,22.4693861 0.112475248,22.2157624 0.083960396,21.9597624 C0.0601980198,21.7470099 0.0491089109,21.5329901 0.0522772277,21.3189703 L0.0522772277,0.140673267 L1.06138614,0.140673267 L1.06138614,21.3253069 L1.06138614,21.430495 C1.0629703,21.5691089 1.07089109,21.7077228 1.08673267,21.8455446 C1.11207921,22.0673267 1.15643564,22.2870495 1.2229703,22.5001188 C1.30217822,22.7510495 1.40990099,22.9927921 1.54772277,23.2172673 C1.65227723,23.3893069 1.77425743,23.5510495 1.91049505,23.699802 C2.01821782,23.8186139 2.13544554,23.9291881 2.26059406,24.0305743 C2.36514851,24.1161188 2.4760396,24.1953267 2.59009901,24.2680396 C2.68831683,24.3306139 2.78970297,24.3884356 2.89267327,24.441505 C3.38534653,24.6930693 3.92712871,24.8370693 4.47524752,24.8991683 C4.70019802,24.9246733 4.92673267,24.9357624 5.15168317,24.936396 C5.15168317,25.2727129 5.15009901,25.6090297 5.15009901,25.945505 L5.15009901,25.945505 Z\" id=\"Shape\"></path></g><g id=\"I\" transform=\"translate(75.957861, 0.017426)\" fill=\"#78327A\"><path d=\"M0.148910891,25.916198 L0.148910891,8.49045545 L1.1390099,8.49045545 L1.1390099,25.916198 L0.148910891,25.916198 L0.148910891,25.916198 Z M0.153663366,2.47065347 L0.153663366,0.140673267 L1.13584158,0.140673267 L1.13584158,2.47065347 L0.153663366,2.47065347 L0.153663366,2.47065347 Z\" id=\"Shape\"></path></g><g id=\"A1\" transform=\"translate(79.601426, 8.413465)\" fill=\"#6E4D9B\"><path d=\"M8.79524752,16.5403564 C8.91089109,16.5398812 9.02811881,16.5376634 9.14376238,16.5325941 C9.38930693,16.5216634 9.63326733,16.4993267 9.87722772,16.4652673 C10.5853465,16.3659406 11.2792079,16.167604 11.9334653,15.8765941 C12.6716832,15.5480396 13.3576238,15.1027327 13.959604,14.5626931 C14.6281188,13.9616634 15.1920792,13.2446733 15.6166337,12.451802 C15.9588119,11.811802 16.2106931,11.1236436 16.3611881,10.4133069 C16.5433663,9.54756436 16.5766337,8.65029703 16.4594059,7.77330693 C16.3548515,6.98550495 16.1267327,6.21528713 15.7861386,5.49718812 C15.3932673,4.66946535 14.8514851,3.91382178 14.1972277,3.27382178 C13.5065347,2.60055446 12.6922772,2.0570297 11.8051485,1.68174257 C11.3378218,1.48419802 10.849901,1.33291089 10.3540594,1.23136634 C9.85663366,1.12982178 9.35128713,1.07754455 8.84435644,1.07437624 C8.33742574,1.07120792 7.82891089,1.1169901 7.32990099,1.21251485 C6.83089109,1.30819802 6.34138614,1.45346535 5.87247525,1.64546535 C4.9790099,2.01029703 4.15683168,2.54415842 3.45980198,3.20950495 C2.7960396,3.84126733 2.24633663,4.59041584 1.8439604,5.41275248 C1.49544554,6.12546535 1.25782178,6.89188119 1.14376238,7.6769901 C1.01861386,8.53671287 1.0360396,9.41813861 1.20079208,10.2716832 C1.34336634,11.0167129 1.59683168,11.7395644 1.95009901,12.4104554 C2.34138614,13.1512079 2.85306931,13.8271683 3.45980198,14.4050693 C4.07762376,14.9945347 4.79366337,15.4813465 5.56990099,15.8379406 C6.21940594,16.1362376 6.91009901,16.3432871 7.61663366,16.4511683 C7.8590099,16.4882376 8.1029703,16.5135842 8.34693069,16.5275248 C8.46257426,16.5341782 8.57821782,16.5378218 8.69386139,16.5397228 C8.72871287,16.5400396 8.76039604,16.540198 8.79524752,16.5403564 L8.79524752,16.5403564 Z M16.8538614,12.199604 C16.769901,12.3988911 16.6780198,12.5950099 16.579802,12.7874851 C16.1251485,13.6768317 15.5152475,14.4861782 14.7881188,15.1714851 C14.0720792,15.8460198 13.2435644,16.3988911 12.3437624,16.7987327 C11.6039604,17.1277624 10.8182178,17.352396 10.0166337,17.4647129 C9.74257426,17.5030495 9.46534653,17.528396 9.18811881,17.5407525 C9.05663366,17.5466139 8.92514851,17.5489901 8.79524752,17.5494653 C8.66376238,17.5489901 8.53227723,17.5466139 8.40079208,17.5407525 C8.12356436,17.528396 7.84792079,17.5030495 7.57227723,17.4647129 C6.77069307,17.352396 5.9849505,17.1277624 5.24514851,16.7987327 C4.33108911,16.3917624 3.48673267,15.8262178 2.76277228,15.1353663 C2.05306931,14.4579802 1.45742574,13.6613069 1.00910891,12.7874851 C0.633663366,12.0551287 0.364356436,11.269703 0.209108911,10.4616238 C0.0316831683,9.53362376 0.00475247525,8.57631683 0.12990099,7.63976238 C0.248712871,6.74867327 0.506930693,5.87706931 0.891881188,5.06471287 C1.34336634,4.11342574 1.96752475,3.24641584 2.72475248,2.51548515 C3.50891089,1.75873267 4.43405941,1.15009901 5.44,0.731722772 C5.98811881,0.504237624 6.55841584,0.332990099 7.13980198,0.221465347 C7.68475248,0.117069307 8.23920792,0.0651089109 8.79524752,0.0651089109 C9.34970297,0.0651089109 9.90415842,0.117069307 10.4491089,0.221465347 C11.030495,0.332990099 11.6007921,0.504237624 12.1489109,0.731722772 C13.1548515,1.15009901 14.08,1.75873267 14.8641584,2.51532673 C15.6087129,3.23390099 16.2249505,4.08443564 16.6748515,5.01687129 C16.7382178,5.1480396 16.7968317,5.28079208 16.8538614,5.4149703 L16.8538614,0.0944158416 L17.8439604,0.0944158416 L17.8439604,17.5201584 C17.8423762,17.5393267 16.8538614,17.5201584 16.8538614,17.5201584 L16.8538614,12.199604 L16.8538614,12.199604 Z\" id=\"Shape\"></path></g></g></g></g></svg></template>"; });
define('text!reset.css', ['module'], function(module) { module.exports = "/* http://meyerweb.com/eric/tools/css/reset/\n   v2.0 | 20110126\n   License: none (public domain)\n*/\n\nhtml, body, div, span, applet, object, iframe,\nh1, h2, h3, h4, h5, h6, p, blockquote, pre,\na, abbr, acronym, address, big, cite, code,\ndel, dfn, em, img, ins, kbd, q, s, samp,\nsmall, strike, strong, sub, sup, tt, var,\nb, u, i, center,\ndl, dt, dd, ol, ul, li,\nfieldset, form, label, legend,\ntable, caption, tbody, tfoot, thead, tr, th, td,\narticle, aside, canvas, details, embed,\nfigure, figcaption, footer, header, hgroup,\nmenu, nav, output, ruby, section, summary,\ntime, mark, audio, video {\n\tmargin: 0;\n\tpadding: 0;\n\tborder: 0;\n\tfont-size: 100%;\n\tfont: inherit;\n\tvertical-align: baseline;\n}\n/* HTML5 display-role reset for older browsers */\narticle, aside, details, figcaption, figure,\nfooter, header, hgroup, menu, nav, section {\n\tdisplay: block;\n}\nbody {\n\tline-height: 1;\n}\nol, ul {\n\tlist-style: none;\n}\nblockquote, q {\n\tquotes: none;\n}\nblockquote:before, blockquote:after,\nq:before, q:after {\n\tcontent: '';\n\tcontent: none;\n}\ntable {\n\tborder-collapse: collapse;\n\tborder-spacing: 0;\n}\n\n/*! normalize.css v5.0.0 | MIT License | github.com/necolas/normalize.css */\n\n/* Document\n   ========================================================================== */\n\n/**\n * 1. Change the default font family in all browsers (opinionated).\n * 2. Correct the line height in all browsers.\n * 3. Prevent adjustments of font size after orientation changes in\n *    IE on Windows Phone and in iOS.\n */\n\nhtml {\n  font-family: sans-serif; /* 1 */\n  line-height: 1.15; /* 2 */\n  -ms-text-size-adjust: 100%; /* 3 */\n  -webkit-text-size-adjust: 100%; /* 3 */\n}\n\n/* Forms\n   ========================================================================== */\n\n/**\n * 1. Change the font styles in all browsers (opinionated).\n * 2. Remove the margin in Firefox and Safari.\n */\n\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  font-family: sans-serif; /* 1 */\n  font-size: 100%; /* 1 */\n  line-height: 1.15; /* 1 */\n  margin: 0; /* 2 */\n}\n\n/**\n * Show the overflow in IE.\n * 1. Show the overflow in Edge.\n */\n\nbutton,\ninput { /* 1 */\n  overflow: visible;\n}\n\n/**\n * Remove the inheritance of text transform in Edge, Firefox, and IE.\n * 1. Remove the inheritance of text transform in Firefox.\n */\n\nbutton,\nselect { /* 1 */\n  text-transform: none;\n}\n\n/**\n * 1. Prevent a WebKit bug where (2) destroys native `audio` and `video`\n *    controls in Android 4.\n * 2. Correct the inability to style clickable types in iOS and Safari.\n */\n\nbutton,\nhtml [type=\"button\"], /* 1 */\n[type=\"reset\"],\n[type=\"submit\"] {\n  -webkit-appearance: button; /* 2 */\n}\n\n/**\n * Remove the inner border and padding in Firefox.\n */\n\nbutton::-moz-focus-inner,\n[type=\"button\"]::-moz-focus-inner,\n[type=\"reset\"]::-moz-focus-inner,\n[type=\"submit\"]::-moz-focus-inner {\n  border-style: none;\n  padding: 0;\n}\n\n/**\n * Restore the focus styles unset by the previous rule.\n */\n\nbutton:-moz-focusring,\n[type=\"button\"]:-moz-focusring,\n[type=\"reset\"]:-moz-focusring,\n[type=\"submit\"]:-moz-focusring {\n  outline: 1px dotted ButtonText;\n}\n\n/**\n * Change the border, margin, and padding in all browsers (opinionated).\n */\n\nfieldset {\n  border: 1px solid #c0c0c0;\n  margin: 0 2px;\n  padding: 0.35em 0.625em 0.75em;\n}\n\n/**\n * 1. Correct the text wrapping in Edge and IE.\n * 2. Correct the color inheritance from `fieldset` elements in IE.\n * 3. Remove the padding so developers are not caught out when they zero out\n *    `fieldset` elements in all browsers.\n */\n\nlegend {\n  box-sizing: border-box; /* 1 */\n  color: inherit; /* 2 */\n  display: table; /* 1 */\n  max-width: 100%; /* 1 */\n  padding: 0; /* 3 */\n  white-space: normal; /* 1 */\n}\n\n/**\n * 1. Add the correct display in IE 9-.\n * 2. Add the correct vertical alignment in Chrome, Firefox, and Opera.\n */\n\nprogress {\n  display: inline-block; /* 1 */\n  vertical-align: baseline; /* 2 */\n}\n\n/**\n * Remove the default vertical scrollbar in IE.\n */\n\ntextarea {\n  overflow: auto;\n}\n\n/**\n * 1. Add the correct box sizing in IE 10-.\n * 2. Remove the padding in IE 10-.\n */\n\n[type=\"checkbox\"],\n[type=\"radio\"] {\n  box-sizing: border-box; /* 1 */\n  padding: 0; /* 2 */\n}\n\n/**\n * Correct the cursor style of increment and decrement buttons in Chrome.\n */\n\n[type=\"number\"]::-webkit-inner-spin-button,\n[type=\"number\"]::-webkit-outer-spin-button {\n  height: auto;\n}\n\n/**\n * 1. Correct the odd appearance in Chrome and Safari.\n * 2. Correct the outline style in Safari.\n */\n\n[type=\"search\"] {\n  -webkit-appearance: textfield; /* 1 */\n  outline-offset: -2px; /* 2 */\n}\n\n/**\n * Remove the inner padding and cancel buttons in Chrome and Safari on macOS.\n */\n\n[type=\"search\"]::-webkit-search-cancel-button,\n[type=\"search\"]::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\n\n/**\n * 1. Correct the inability to style clickable types in iOS and Safari.\n * 2. Change font properties to `inherit` in Safari.\n */\n\n::-webkit-file-upload-button {\n  -webkit-appearance: button; /* 1 */\n  font: inherit; /* 2 */\n}\n"; });
define('text!resources/elements/controller-view.html', ['module'], function(module) { module.exports = "<template bindable=\"controller\"><require from=\"./controller-view.css\"></require><div class=\"category\" if.bind=\"controller.bindables.length\"><h4 class=\"category-name\">Bindables</h4><ul class=\"properties\"><li repeat.for=\"bindable of controller.bindables\"><property-view property.bind=\"bindable\"></property-view></li></ul></div><div class=\"category\" if.bind=\"controller.properties.length\"><h4 class=\"category-name\">Properties</h4><ul class=\"properties\"><li repeat.for=\"property of controller.properties\"><property-view property.bind=\"property\"></property-view></li></ul></div></template>"; });
define('text!resources/elements/controller-view.css', ['module'], function(module) { module.exports = "controller-view .category-name {\n  font-size: 10px;\n  margin-bottom: 2px;\n  margin-top: 2px;\n}\n"; });
define('text!resources/elements/debug-group.html', ['module'], function(module) { module.exports = "<template><require from=\"./debug-group.css\"></require><section><h2 class=\"header\">${heading}</h2><div class=\"content\"><slot></slot></div></section></template>"; });
define('text!resources/elements/debug-group.css', ['module'], function(module) { module.exports = "debug-group .header {\n  font-weight: normal;\n  font-size: 12px;\n  margin: 0;\n  padding: 4px;\n  background: #f4f4f4;\n  border-bottom: 1px solid rgba(0, 0, 0, .25);\n  border-top: 1px solid rgba(0, 0, 0, .25);\n}\n\n.dark debug-group .header {\n  color: #989898;\n  background: #2a2a2a;\n  border-bottom: 1px solid #5c5c5c;\n  border-top: 1px solid #3d3d3d;\n}\n\ndebug-group .content { \n  margin: 4px;\n}\n"; });
define('text!resources/elements/property-view.html', ['module'], function(module) { module.exports = "<template><require from=\"./property-view.css\"></require><span class=\"property-line\"><span css=\"opacity: ${property.canExpand? 1 : 0}\" class=\"arrow\" click.trigger=\"debugHost.toggleDebugValueExpansion(property)\"><span if.bind=\"property.isExpanded\" class=\"down\">▼</span> <span if.bind=\"!property.isExpanded\" class=\"right\">▶</span> </span><span class=\"property-name\">${property.name}</span><span class=\"token-colon\">:</span>&nbsp; <span class=\"value-container\"><span if.bind=\"property.type === 'string' && !property.isEditing\" class=\"property-value string\">\"</span><span if.bind=\"!property.isEditing\" class=\"property-value ${property.type}\" click.trigger=\"beginEditing()\">${property.value}</span><span if.bind=\"property.type === 'string' && !property.isEditing\" class=\"property-value string\">\"</span> <input if.bind=\"property.isEditing\" class=\"property-editor\" ref=\"editor\" type=\"text\" value.one-way=\"property.value\" keydown.trigger=\"onKeyDown($event)\" blur.trigger=\"endEditing()\"></span></span><ul if.bind=\"property.isExpanded && property.expandedValue\" class=\"properties\"><div if.bind=\"!property.expandedValue.properties.length\" class=\"no-properties\">Object has no properties.</div><li repeat.for=\"p of property.expandedValue.properties\"><property-view property.bind=\"p\"></property-view></li></ul></template>"; });
define('text!resources/elements/property-view.css', ['module'], function(module) { module.exports = "property-view {\n  margin-top: 2px;\n  display: block;\n}\n\nproperty-view .arrow {\n  font-size: 10px;\n  color: dimgray;\n  cursor: default;\n}\n\nproperty-view .arrow .right {\n  margin-right: 1px;\n}\n\nproperty-view .property-line {\n  white-space: nowrap;\n}\n\nproperty-view .property-name {\n  font-size: 12px;\n  color: purple;\n  font-family: monospace;\n  margin-left: 1px;\n}\n\n.dark property-view .property-name {\n  color: #34c7bb;\n}\nproperty-view .value-container {\n  position: relative;\n}\n\nproperty-view .property-editor {\n  font-family: monospace;\n  font-size: 12px;\n  margin: 0;\n  height: 12px;\n  outline: none;\n  border: 1px solid darkgray;\n  box-shadow: 0 0 5px rgba(0,0,0,.5);\n  position: absolute;\n  top: 4px;\n  left: 2px;\n  padding: 0 0 0 2px;\n}\n\nproperty-view .property-value, property-view .token-colon {\n  font-size: 12px;\n  color: dimgray;\n  font-family: monospace;\n}\n\nproperty-view .property-value.null, property-view .property-value.undefined {\n  color: dimgray;\n}\n\nproperty-view .property-value.boolean {\n  color: deeppink;\n}\n\nproperty-view .property-value.string {\n  color: red;\n  white-space: nowrap;\n}\n.dark property-view .property-value.string {\n  color:#cbcbcb;\n}\n\nproperty-view .property-value.number {\n  color: blue;\n}\n\n.dark property-view .property-value.number {\n  color: #59a6ca;\n}\n\nproperty-view .property-value.array {\n  color: black;\n}\n\n.dark property-view .property-value.array {\n  color: #cbcbcb;\n}\n\nproperty-view .property-value.object, property-view .property-value.node {\n  color: black;\n}\n\n.dark property-view .property-value.object, property-view .property-value.node {\n  color: #cbcbcb;\n}\n\nproperty-view ul.properties {\n  margin-left: 16px;\n}\n\nproperty-view .no-properties {\n  margin-top: 4px;\n  font-size: 10px;\n}\n\n.dark property-view .no-properties {\n  color: #989898;\n}\n"; });
define('aurelia-binding',['exports', 'aurelia-logging', 'aurelia-pal', 'aurelia-task-queue', 'aurelia-metadata'], function (exports, _aureliaLogging, _aureliaPal, _aureliaTaskQueue, _aureliaMetadata) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.getSetObserver = exports.BindingEngine = exports.NameExpression = exports.Listener = exports.ListenerExpression = exports.BindingBehaviorResource = exports.ValueConverterResource = exports.Call = exports.CallExpression = exports.Binding = exports.BindingExpression = exports.ObjectObservationAdapter = exports.ObserverLocator = exports.SVGAnalyzer = exports.presentationAttributes = exports.presentationElements = exports.elements = exports.ComputedExpression = exports.ClassObserver = exports.SelectValueObserver = exports.CheckedObserver = exports.ValueAttributeObserver = exports.StyleObserver = exports.DataAttributeObserver = exports.dataAttributeAccessor = exports.XLinkAttributeObserver = exports.SetterObserver = exports.PrimitiveObserver = exports.propertyAccessor = exports.DirtyCheckProperty = exports.DirtyChecker = exports.EventSubscriber = exports.EventManager = exports.delegationStrategy = exports.getMapObserver = exports.ParserImplementation = exports.Parser = exports.bindingMode = exports.ExpressionCloner = exports.Unparser = exports.LiteralObject = exports.LiteralArray = exports.LiteralTemplate = exports.LiteralString = exports.LiteralPrimitive = exports.Unary = exports.Binary = exports.CallFunction = exports.CallMember = exports.CallScope = exports.AccessKeyed = exports.AccessMember = exports.AccessScope = exports.AccessThis = exports.Conditional = exports.Assign = exports.ValueConverter = exports.BindingBehavior = exports.Expression = exports.getArrayObserver = exports.CollectionLengthObserver = exports.ModifyCollectionObserver = exports.ExpressionObserver = exports.sourceContext = exports.targetContext = undefined;
  exports.camelCase = camelCase;
  exports.createOverrideContext = createOverrideContext;
  exports.getContextFor = getContextFor;
  exports.createScopeForTest = createScopeForTest;
  exports.connectable = connectable;
  exports.enqueueBindingConnect = enqueueBindingConnect;
  exports.setConnectQueueThreshold = setConnectQueueThreshold;
  exports.enableConnectQueue = enableConnectQueue;
  exports.disableConnectQueue = disableConnectQueue;
  exports.getConnectQueueSize = getConnectQueueSize;
  exports.subscriberCollection = subscriberCollection;
  exports.calcSplices = calcSplices;
  exports.mergeSplice = mergeSplice;
  exports.projectArraySplices = projectArraySplices;
  exports.getChangeRecords = getChangeRecords;
  exports.cloneExpression = cloneExpression;
  exports.hasDeclaredDependencies = hasDeclaredDependencies;
  exports.declarePropertyDependencies = declarePropertyDependencies;
  exports.computedFrom = computedFrom;
  exports.createComputedObserver = createComputedObserver;
  exports.valueConverter = valueConverter;
  exports.bindingBehavior = bindingBehavior;
  exports.observable = observable;
  exports.connectBindingToSignal = connectBindingToSignal;
  exports.signalBindings = signalBindings;

  var LogManager = _interopRequireWildcard(_aureliaLogging);

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    } else {
      var newObj = {};

      if (obj != null) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
        }
      }

      newObj.default = obj;
      return newObj;
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  

  var _dec, _dec2, _class, _dec3, _class2, _dec4, _class3, _dec5, _class5, _dec6, _class7, _dec7, _class8, _dec8, _class9, _dec9, _class10, _class12, _temp, _dec10, _class13, _class14, _temp2;

  var targetContext = exports.targetContext = 'Binding:target';
  var sourceContext = exports.sourceContext = 'Binding:source';

  var map = Object.create(null);

  function camelCase(name) {
    if (name in map) {
      return map[name];
    }
    var result = name.charAt(0).toLowerCase() + name.slice(1).replace(/[_.-](\w|$)/g, function (_, x) {
      return x.toUpperCase();
    });
    map[name] = result;
    return result;
  }

  function createOverrideContext(bindingContext, parentOverrideContext) {
    return {
      bindingContext: bindingContext,
      parentOverrideContext: parentOverrideContext || null
    };
  }

  function getContextFor(name, scope, ancestor) {
    var oc = scope.overrideContext;

    if (ancestor) {
      while (ancestor && oc) {
        ancestor--;
        oc = oc.parentOverrideContext;
      }
      if (ancestor || !oc) {
        return undefined;
      }
      return name in oc ? oc : oc.bindingContext;
    }

    while (oc && !(name in oc) && !(oc.bindingContext && name in oc.bindingContext)) {
      oc = oc.parentOverrideContext;
    }
    if (oc) {
      return name in oc ? oc : oc.bindingContext;
    }

    return scope.bindingContext || scope.overrideContext;
  }

  function createScopeForTest(bindingContext, parentBindingContext) {
    if (parentBindingContext) {
      return {
        bindingContext: bindingContext,
        overrideContext: createOverrideContext(bindingContext, createOverrideContext(parentBindingContext))
      };
    }
    return {
      bindingContext: bindingContext,
      overrideContext: createOverrideContext(bindingContext)
    };
  }

  var slotNames = [];
  var versionSlotNames = [];
  var lastSlot = -1;
  function ensureEnoughSlotNames(currentSlot) {
    if (currentSlot === lastSlot) {
      lastSlot += 5;
      var ii = slotNames.length = versionSlotNames.length = lastSlot + 1;
      for (var i = currentSlot + 1; i < ii; ++i) {
        slotNames[i] = '_observer' + i;
        versionSlotNames[i] = '_observerVersion' + i;
      }
    }
  }
  ensureEnoughSlotNames(-1);

  function addObserver(observer) {
    var observerSlots = this._observerSlots === undefined ? 0 : this._observerSlots;
    var i = observerSlots;
    while (i-- && this[slotNames[i]] !== observer) {}

    if (i === -1) {
      i = 0;
      while (this[slotNames[i]]) {
        i++;
      }
      this[slotNames[i]] = observer;
      observer.subscribe(sourceContext, this);

      if (i === observerSlots) {
        this._observerSlots = i + 1;
      }
    }

    if (this._version === undefined) {
      this._version = 0;
    }
    this[versionSlotNames[i]] = this._version;
    ensureEnoughSlotNames(i);
  }

  function observeProperty(obj, propertyName) {
    var observer = this.observerLocator.getObserver(obj, propertyName);
    addObserver.call(this, observer);
  }

  function observeArray(array) {
    var observer = this.observerLocator.getArrayObserver(array);
    addObserver.call(this, observer);
  }

  function unobserve(all) {
    var i = this._observerSlots;
    while (i--) {
      if (all || this[versionSlotNames[i]] !== this._version) {
        var observer = this[slotNames[i]];
        this[slotNames[i]] = null;
        if (observer) {
          observer.unsubscribe(sourceContext, this);
        }
      }
    }
  }

  function connectable() {
    return function (target) {
      target.prototype.observeProperty = observeProperty;
      target.prototype.observeArray = observeArray;
      target.prototype.unobserve = unobserve;
      target.prototype.addObserver = addObserver;
    };
  }

  var queue = [];
  var queued = {};
  var nextId = 0;
  var minimumImmediate = 100;
  var frameBudget = 15;

  var isFlushRequested = false;
  var immediate = 0;

  function flush(animationFrameStart) {
    var length = queue.length;
    var i = 0;
    while (i < length) {
      var binding = queue[i];
      queued[binding.__connectQueueId] = false;
      binding.connect(true);
      i++;

      if (i % 100 === 0 && _aureliaPal.PLATFORM.performance.now() - animationFrameStart > frameBudget) {
        break;
      }
    }
    queue.splice(0, i);

    if (queue.length) {
      _aureliaPal.PLATFORM.requestAnimationFrame(flush);
    } else {
      isFlushRequested = false;
      immediate = 0;
    }
  }

  function enqueueBindingConnect(binding) {
    if (immediate < minimumImmediate) {
      immediate++;
      binding.connect(false);
    } else {
      var id = binding.__connectQueueId;
      if (id === undefined) {
        id = nextId;
        nextId++;
        binding.__connectQueueId = id;
      }

      if (!queued[id]) {
        queue.push(binding);
        queued[id] = true;
      }
    }
    if (!isFlushRequested) {
      isFlushRequested = true;
      _aureliaPal.PLATFORM.requestAnimationFrame(flush);
    }
  }

  function setConnectQueueThreshold(value) {
    minimumImmediate = value;
  }

  function enableConnectQueue() {
    setConnectQueueThreshold(100);
  }

  function disableConnectQueue() {
    setConnectQueueThreshold(Number.MAX_SAFE_INTEGER);
  }

  function getConnectQueueSize() {
    return queue.length;
  }

  function addSubscriber(context, callable) {
    if (this.hasSubscriber(context, callable)) {
      return false;
    }
    if (!this._context0) {
      this._context0 = context;
      this._callable0 = callable;
      return true;
    }
    if (!this._context1) {
      this._context1 = context;
      this._callable1 = callable;
      return true;
    }
    if (!this._context2) {
      this._context2 = context;
      this._callable2 = callable;
      return true;
    }
    if (!this._contextsRest) {
      this._contextsRest = [context];
      this._callablesRest = [callable];
      return true;
    }
    this._contextsRest.push(context);
    this._callablesRest.push(callable);
    return true;
  }

  function removeSubscriber(context, callable) {
    if (this._context0 === context && this._callable0 === callable) {
      this._context0 = null;
      this._callable0 = null;
      return true;
    }
    if (this._context1 === context && this._callable1 === callable) {
      this._context1 = null;
      this._callable1 = null;
      return true;
    }
    if (this._context2 === context && this._callable2 === callable) {
      this._context2 = null;
      this._callable2 = null;
      return true;
    }
    var callables = this._callablesRest;
    if (callables === undefined || callables.length === 0) {
      return false;
    }
    var contexts = this._contextsRest;
    var i = 0;
    while (!(callables[i] === callable && contexts[i] === context) && callables.length > i) {
      i++;
    }
    if (i >= callables.length) {
      return false;
    }
    contexts.splice(i, 1);
    callables.splice(i, 1);
    return true;
  }

  var arrayPool1 = [];
  var arrayPool2 = [];
  var poolUtilization = [];

  function callSubscribers(newValue, oldValue) {
    var context0 = this._context0;
    var callable0 = this._callable0;
    var context1 = this._context1;
    var callable1 = this._callable1;
    var context2 = this._context2;
    var callable2 = this._callable2;
    var length = this._contextsRest ? this._contextsRest.length : 0;
    var contextsRest = void 0;
    var callablesRest = void 0;
    var poolIndex = void 0;
    var i = void 0;
    if (length) {
      poolIndex = poolUtilization.length;
      while (poolIndex-- && poolUtilization[poolIndex]) {}
      if (poolIndex < 0) {
        poolIndex = poolUtilization.length;
        contextsRest = [];
        callablesRest = [];
        poolUtilization.push(true);
        arrayPool1.push(contextsRest);
        arrayPool2.push(callablesRest);
      } else {
        poolUtilization[poolIndex] = true;
        contextsRest = arrayPool1[poolIndex];
        callablesRest = arrayPool2[poolIndex];
      }

      i = length;
      while (i--) {
        contextsRest[i] = this._contextsRest[i];
        callablesRest[i] = this._callablesRest[i];
      }
    }

    if (context0) {
      if (callable0) {
        callable0.call(context0, newValue, oldValue);
      } else {
        context0(newValue, oldValue);
      }
    }
    if (context1) {
      if (callable1) {
        callable1.call(context1, newValue, oldValue);
      } else {
        context1(newValue, oldValue);
      }
    }
    if (context2) {
      if (callable2) {
        callable2.call(context2, newValue, oldValue);
      } else {
        context2(newValue, oldValue);
      }
    }
    if (length) {
      for (i = 0; i < length; i++) {
        var callable = callablesRest[i];
        var context = contextsRest[i];
        if (callable) {
          callable.call(context, newValue, oldValue);
        } else {
          context(newValue, oldValue);
        }
        contextsRest[i] = null;
        callablesRest[i] = null;
      }
      poolUtilization[poolIndex] = false;
    }
  }

  function hasSubscribers() {
    return !!(this._context0 || this._context1 || this._context2 || this._contextsRest && this._contextsRest.length);
  }

  function hasSubscriber(context, callable) {
    var has = this._context0 === context && this._callable0 === callable || this._context1 === context && this._callable1 === callable || this._context2 === context && this._callable2 === callable;
    if (has) {
      return true;
    }
    var index = void 0;
    var contexts = this._contextsRest;
    if (!contexts || (index = contexts.length) === 0) {
      return false;
    }
    var callables = this._callablesRest;
    while (index--) {
      if (contexts[index] === context && callables[index] === callable) {
        return true;
      }
    }
    return false;
  }

  function subscriberCollection() {
    return function (target) {
      target.prototype.addSubscriber = addSubscriber;
      target.prototype.removeSubscriber = removeSubscriber;
      target.prototype.callSubscribers = callSubscribers;
      target.prototype.hasSubscribers = hasSubscribers;
      target.prototype.hasSubscriber = hasSubscriber;
    };
  }

  var ExpressionObserver = exports.ExpressionObserver = (_dec = connectable(), _dec2 = subscriberCollection(), _dec(_class = _dec2(_class = function () {
    function ExpressionObserver(scope, expression, observerLocator, lookupFunctions) {
      

      this.scope = scope;
      this.expression = expression;
      this.observerLocator = observerLocator;
      this.lookupFunctions = lookupFunctions;
    }

    ExpressionObserver.prototype.getValue = function getValue() {
      return this.expression.evaluate(this.scope, this.lookupFunctions);
    };

    ExpressionObserver.prototype.setValue = function setValue(newValue) {
      this.expression.assign(this.scope, newValue);
    };

    ExpressionObserver.prototype.subscribe = function subscribe(context, callable) {
      var _this = this;

      if (!this.hasSubscribers()) {
        this.oldValue = this.expression.evaluate(this.scope, this.lookupFunctions);
        this.expression.connect(this, this.scope);
      }
      this.addSubscriber(context, callable);
      if (arguments.length === 1 && context instanceof Function) {
        return {
          dispose: function dispose() {
            _this.unsubscribe(context, callable);
          }
        };
      }
    };

    ExpressionObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.unobserve(true);
        this.oldValue = undefined;
      }
    };

    ExpressionObserver.prototype.call = function call() {
      var newValue = this.expression.evaluate(this.scope, this.lookupFunctions);
      var oldValue = this.oldValue;
      if (newValue !== oldValue) {
        this.oldValue = newValue;
        this.callSubscribers(newValue, oldValue);
      }
      this._version++;
      this.expression.connect(this, this.scope);
      this.unobserve(false);
    };

    return ExpressionObserver;
  }()) || _class) || _class);


  function isIndex(s) {
    return +s === s >>> 0;
  }

  function toNumber(s) {
    return +s;
  }

  function newSplice(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  }

  var EDIT_LEAVE = 0;
  var EDIT_UPDATE = 1;
  var EDIT_ADD = 2;
  var EDIT_DELETE = 3;

  function ArraySplice() {}

  ArraySplice.prototype = {
    calcEditDistances: function calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd) {
      var rowCount = oldEnd - oldStart + 1;
      var columnCount = currentEnd - currentStart + 1;
      var distances = new Array(rowCount);
      var north = void 0;
      var west = void 0;

      for (var i = 0; i < rowCount; ++i) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }

      for (var j = 0; j < columnCount; ++j) {
        distances[0][j] = j;
      }

      for (var _i = 1; _i < rowCount; ++_i) {
        for (var _j = 1; _j < columnCount; ++_j) {
          if (this.equals(current[currentStart + _j - 1], old[oldStart + _i - 1])) {
            distances[_i][_j] = distances[_i - 1][_j - 1];
          } else {
            north = distances[_i - 1][_j] + 1;
            west = distances[_i][_j - 1] + 1;
            distances[_i][_j] = north < west ? north : west;
          }
        }
      }

      return distances;
    },

    spliceOperationsFromEditDistances: function spliceOperationsFromEditDistances(distances) {
      var i = distances.length - 1;
      var j = distances[0].length - 1;
      var current = distances[i][j];
      var edits = [];
      while (i > 0 || j > 0) {
        if (i === 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }
        if (j === 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }
        var northWest = distances[i - 1][j - 1];
        var west = distances[i - 1][j];
        var north = distances[i][j - 1];

        var min = void 0;
        if (west < north) {
          min = west < northWest ? west : northWest;
        } else {
          min = north < northWest ? north : northWest;
        }

        if (min === northWest) {
          if (northWest === current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }
          i--;
          j--;
        } else if (min === west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }

      edits.reverse();
      return edits;
    },

    calcSplices: function calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd) {
      var prefixCount = 0;
      var suffixCount = 0;

      var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
      if (currentStart === 0 && oldStart === 0) {
        prefixCount = this.sharedPrefix(current, old, minLength);
      }

      if (currentEnd === current.length && oldEnd === old.length) {
        suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
      }

      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;

      if (currentEnd - currentStart === 0 && oldEnd - oldStart === 0) {
        return [];
      }

      if (currentStart === currentEnd) {
        var _splice = newSplice(currentStart, [], 0);
        while (oldStart < oldEnd) {
          _splice.removed.push(old[oldStart++]);
        }

        return [_splice];
      } else if (oldStart === oldEnd) {
        return [newSplice(currentStart, [], currentEnd - currentStart)];
      }

      var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));

      var splice = undefined;
      var splices = [];
      var index = currentStart;
      var oldIndex = oldStart;
      for (var i = 0; i < ops.length; ++i) {
        switch (ops[i]) {
          case EDIT_LEAVE:
            if (splice) {
              splices.push(splice);
              splice = undefined;
            }

            index++;
            oldIndex++;
            break;
          case EDIT_UPDATE:
            if (!splice) {
              splice = newSplice(index, [], 0);
            }

            splice.addedCount++;
            index++;

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
          case EDIT_ADD:
            if (!splice) {
              splice = newSplice(index, [], 0);
            }

            splice.addedCount++;
            index++;
            break;
          case EDIT_DELETE:
            if (!splice) {
              splice = newSplice(index, [], 0);
            }

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
        }
      }

      if (splice) {
        splices.push(splice);
      }
      return splices;
    },

    sharedPrefix: function sharedPrefix(current, old, searchLength) {
      for (var i = 0; i < searchLength; ++i) {
        if (!this.equals(current[i], old[i])) {
          return i;
        }
      }

      return searchLength;
    },

    sharedSuffix: function sharedSuffix(current, old, searchLength) {
      var index1 = current.length;
      var index2 = old.length;
      var count = 0;
      while (count < searchLength && this.equals(current[--index1], old[--index2])) {
        count++;
      }

      return count;
    },

    calculateSplices: function calculateSplices(current, previous) {
      return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
    },

    equals: function equals(currentValue, previousValue) {
      return currentValue === previousValue;
    }
  };

  var arraySplice = new ArraySplice();

  function calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd) {
    return arraySplice.calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd);
  }

  function intersect(start1, end1, start2, end2) {
    if (end1 < start2 || end2 < start1) {
      return -1;
    }

    if (end1 === start2 || end2 === start1) {
      return 0;
    }

    if (start1 < start2) {
      if (end1 < end2) {
        return end1 - start2;
      }

      return end2 - start2;
    }

    if (end2 < end1) {
      return end2 - start1;
    }

    return end1 - start1;
  }

  function mergeSplice(splices, index, removed, addedCount) {
    var splice = newSplice(index, removed, addedCount);

    var inserted = false;
    var insertionOffset = 0;

    for (var i = 0; i < splices.length; i++) {
      var current = splices[i];
      current.index += insertionOffset;

      if (inserted) {
        continue;
      }

      var intersectCount = intersect(splice.index, splice.index + splice.removed.length, current.index, current.index + current.addedCount);

      if (intersectCount >= 0) {

        splices.splice(i, 1);
        i--;

        insertionOffset -= current.addedCount - current.removed.length;

        splice.addedCount += current.addedCount - intersectCount;
        var deleteCount = splice.removed.length + current.removed.length - intersectCount;

        if (!splice.addedCount && !deleteCount) {
          inserted = true;
        } else {
          var currentRemoved = current.removed;

          if (splice.index < current.index) {
            var prepend = splice.removed.slice(0, current.index - splice.index);
            Array.prototype.push.apply(prepend, currentRemoved);
            currentRemoved = prepend;
          }

          if (splice.index + splice.removed.length > current.index + current.addedCount) {
            var append = splice.removed.slice(current.index + current.addedCount - splice.index);
            Array.prototype.push.apply(currentRemoved, append);
          }

          splice.removed = currentRemoved;
          if (current.index < splice.index) {
            splice.index = current.index;
          }
        }
      } else if (splice.index < current.index) {

        inserted = true;

        splices.splice(i, 0, splice);
        i++;

        var offset = splice.addedCount - splice.removed.length;
        current.index += offset;
        insertionOffset += offset;
      }
    }

    if (!inserted) {
      splices.push(splice);
    }
  }

  function createInitialSplices(array, changeRecords) {
    var splices = [];

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      switch (record.type) {
        case 'splice':
          mergeSplice(splices, record.index, record.removed.slice(), record.addedCount);
          break;
        case 'add':
        case 'update':
        case 'delete':
          if (!isIndex(record.name)) {
            continue;
          }

          var index = toNumber(record.name);
          if (index < 0) {
            continue;
          }

          mergeSplice(splices, index, [record.oldValue], record.type === 'delete' ? 0 : 1);
          break;
        default:
          console.error('Unexpected record type: ' + JSON.stringify(record));
          break;
      }
    }

    return splices;
  }

  function projectArraySplices(array, changeRecords) {
    var splices = [];

    createInitialSplices(array, changeRecords).forEach(function (splice) {
      if (splice.addedCount === 1 && splice.removed.length === 1) {
        if (splice.removed[0] !== array[splice.index]) {
          splices.push(splice);
        }

        return;
      }

      splices = splices.concat(calcSplices(array, splice.index, splice.index + splice.addedCount, splice.removed, 0, splice.removed.length));
    });

    return splices;
  }

  function newRecord(type, object, key, oldValue) {
    return {
      type: type,
      object: object,
      key: key,
      oldValue: oldValue
    };
  }

  function getChangeRecords(map) {
    var entries = new Array(map.size);
    var keys = map.keys();
    var i = 0;
    var item = void 0;

    while (item = keys.next()) {
      if (item.done) {
        break;
      }

      entries[i] = newRecord('added', map, item.value);
      i++;
    }

    return entries;
  }

  var ModifyCollectionObserver = exports.ModifyCollectionObserver = (_dec3 = subscriberCollection(), _dec3(_class2 = function () {
    function ModifyCollectionObserver(taskQueue, collection) {
      

      this.taskQueue = taskQueue;
      this.queued = false;
      this.changeRecords = null;
      this.oldCollection = null;
      this.collection = collection;
      this.lengthPropertyName = collection instanceof Map || collection instanceof Set ? 'size' : 'length';
    }

    ModifyCollectionObserver.prototype.subscribe = function subscribe(context, callable) {
      this.addSubscriber(context, callable);
    };

    ModifyCollectionObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
      this.removeSubscriber(context, callable);
    };

    ModifyCollectionObserver.prototype.addChangeRecord = function addChangeRecord(changeRecord) {
      if (!this.hasSubscribers() && !this.lengthObserver) {
        return;
      }

      if (changeRecord.type === 'splice') {
        var index = changeRecord.index;
        var arrayLength = changeRecord.object.length;
        if (index > arrayLength) {
          index = arrayLength - changeRecord.addedCount;
        } else if (index < 0) {
          index = arrayLength + changeRecord.removed.length + index - changeRecord.addedCount;
        }
        if (index < 0) {
          index = 0;
        }
        changeRecord.index = index;
      }

      if (this.changeRecords === null) {
        this.changeRecords = [changeRecord];
      } else {
        this.changeRecords.push(changeRecord);
      }

      if (!this.queued) {
        this.queued = true;
        this.taskQueue.queueMicroTask(this);
      }
    };

    ModifyCollectionObserver.prototype.flushChangeRecords = function flushChangeRecords() {
      if (this.changeRecords && this.changeRecords.length || this.oldCollection) {
        this.call();
      }
    };

    ModifyCollectionObserver.prototype.reset = function reset(oldCollection) {
      this.oldCollection = oldCollection;

      if (this.hasSubscribers() && !this.queued) {
        this.queued = true;
        this.taskQueue.queueMicroTask(this);
      }
    };

    ModifyCollectionObserver.prototype.getLengthObserver = function getLengthObserver() {
      return this.lengthObserver || (this.lengthObserver = new CollectionLengthObserver(this.collection));
    };

    ModifyCollectionObserver.prototype.call = function call() {
      var changeRecords = this.changeRecords;
      var oldCollection = this.oldCollection;
      var records = void 0;

      this.queued = false;
      this.changeRecords = [];
      this.oldCollection = null;

      if (this.hasSubscribers()) {
        if (oldCollection) {
          if (this.collection instanceof Map || this.collection instanceof Set) {
            records = getChangeRecords(oldCollection);
          } else {
            records = calcSplices(this.collection, 0, this.collection.length, oldCollection, 0, oldCollection.length);
          }
        } else {
          if (this.collection instanceof Map || this.collection instanceof Set) {
            records = changeRecords;
          } else {
            records = projectArraySplices(this.collection, changeRecords);
          }
        }

        this.callSubscribers(records);
      }

      if (this.lengthObserver) {
        this.lengthObserver.call(this.collection[this.lengthPropertyName]);
      }
    };

    return ModifyCollectionObserver;
  }()) || _class2);
  var CollectionLengthObserver = exports.CollectionLengthObserver = (_dec4 = subscriberCollection(), _dec4(_class3 = function () {
    function CollectionLengthObserver(collection) {
      

      this.collection = collection;
      this.lengthPropertyName = collection instanceof Map || collection instanceof Set ? 'size' : 'length';
      this.currentValue = collection[this.lengthPropertyName];
    }

    CollectionLengthObserver.prototype.getValue = function getValue() {
      return this.collection[this.lengthPropertyName];
    };

    CollectionLengthObserver.prototype.setValue = function setValue(newValue) {
      this.collection[this.lengthPropertyName] = newValue;
    };

    CollectionLengthObserver.prototype.subscribe = function subscribe(context, callable) {
      this.addSubscriber(context, callable);
    };

    CollectionLengthObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
      this.removeSubscriber(context, callable);
    };

    CollectionLengthObserver.prototype.call = function call(newValue) {
      var oldValue = this.currentValue;
      this.callSubscribers(newValue, oldValue);
      this.currentValue = newValue;
    };

    return CollectionLengthObserver;
  }()) || _class3);

  var arrayProto = Array.prototype;
  var pop = arrayProto.pop;
  var push = arrayProto.push;
  var reverse = arrayProto.reverse;
  var shift = arrayProto.shift;
  var sort = arrayProto.sort;
  var splice = arrayProto.splice;
  var unshift = arrayProto.unshift;

  if (arrayProto.__au_patched__) {
    LogManager.getLogger('array-observation').warn('Detected 2nd attempt of patching array from Aurelia binding.' + ' This is probably caused by dependency mismatch between core modules and a 3rd party plugin.' + ' Please see https://github.com/aurelia/cli/pull/906 if you are using webpack.');
  } else {
    Reflect.defineProperty(arrayProto, '__au_patched__', { value: 1 });
    arrayProto.pop = function () {
      var notEmpty = this.length > 0;
      var methodCallResult = pop.apply(this, arguments);
      if (notEmpty && this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'delete',
          object: this,
          name: this.length,
          oldValue: methodCallResult
        });
      }
      return methodCallResult;
    };

    arrayProto.push = function () {
      var methodCallResult = push.apply(this, arguments);
      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'splice',
          object: this,
          index: this.length - arguments.length,
          removed: [],
          addedCount: arguments.length
        });
      }
      return methodCallResult;
    };

    arrayProto.reverse = function () {
      var oldArray = void 0;
      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.flushChangeRecords();
        oldArray = this.slice();
      }
      var methodCallResult = reverse.apply(this, arguments);
      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.reset(oldArray);
      }
      return methodCallResult;
    };

    arrayProto.shift = function () {
      var notEmpty = this.length > 0;
      var methodCallResult = shift.apply(this, arguments);
      if (notEmpty && this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'delete',
          object: this,
          name: 0,
          oldValue: methodCallResult
        });
      }
      return methodCallResult;
    };

    arrayProto.sort = function () {
      var oldArray = void 0;
      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.flushChangeRecords();
        oldArray = this.slice();
      }
      var methodCallResult = sort.apply(this, arguments);
      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.reset(oldArray);
      }
      return methodCallResult;
    };

    arrayProto.splice = function () {
      var methodCallResult = splice.apply(this, arguments);
      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'splice',
          object: this,
          index: +arguments[0],
          removed: methodCallResult,
          addedCount: arguments.length > 2 ? arguments.length - 2 : 0
        });
      }
      return methodCallResult;
    };

    arrayProto.unshift = function () {
      var methodCallResult = unshift.apply(this, arguments);
      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'splice',
          object: this,
          index: 0,
          removed: [],
          addedCount: arguments.length
        });
      }
      return methodCallResult;
    };
  }

  function _getArrayObserver(taskQueue, array) {
    return ModifyArrayObserver.for(taskQueue, array);
  }

  exports.getArrayObserver = _getArrayObserver;

  var ModifyArrayObserver = function (_ModifyCollectionObse) {
    _inherits(ModifyArrayObserver, _ModifyCollectionObse);

    function ModifyArrayObserver(taskQueue, array) {
      

      return _possibleConstructorReturn(this, _ModifyCollectionObse.call(this, taskQueue, array));
    }

    ModifyArrayObserver.for = function _for(taskQueue, array) {
      if (!('__array_observer__' in array)) {
        Reflect.defineProperty(array, '__array_observer__', {
          value: ModifyArrayObserver.create(taskQueue, array),
          enumerable: false, configurable: false
        });
      }
      return array.__array_observer__;
    };

    ModifyArrayObserver.create = function create(taskQueue, array) {
      return new ModifyArrayObserver(taskQueue, array);
    };

    return ModifyArrayObserver;
  }(ModifyCollectionObserver);

  var Expression = exports.Expression = function () {
    function Expression() {
      

      this.isAssignable = false;
    }

    Expression.prototype.evaluate = function evaluate(scope, lookupFunctions, args) {
      throw new Error('Binding expression "' + this + '" cannot be evaluated.');
    };

    Expression.prototype.assign = function assign(scope, value, lookupFunctions) {
      throw new Error('Binding expression "' + this + '" cannot be assigned to.');
    };

    Expression.prototype.toString = function toString() {
      return typeof FEATURE_NO_UNPARSER === 'undefined' ? _Unparser.unparse(this) : Function.prototype.toString.call(this);
    };

    return Expression;
  }();

  var BindingBehavior = exports.BindingBehavior = function (_Expression) {
    _inherits(BindingBehavior, _Expression);

    function BindingBehavior(expression, name, args) {
      

      var _this3 = _possibleConstructorReturn(this, _Expression.call(this));

      _this3.expression = expression;
      _this3.name = name;
      _this3.args = args;
      return _this3;
    }

    BindingBehavior.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      return this.expression.evaluate(scope, lookupFunctions);
    };

    BindingBehavior.prototype.assign = function assign(scope, value, lookupFunctions) {
      return this.expression.assign(scope, value, lookupFunctions);
    };

    BindingBehavior.prototype.accept = function accept(visitor) {
      return visitor.visitBindingBehavior(this);
    };

    BindingBehavior.prototype.connect = function connect(binding, scope) {
      this.expression.connect(binding, scope);
    };

    BindingBehavior.prototype.bind = function bind(binding, scope, lookupFunctions) {
      if (this.expression.expression && this.expression.bind) {
        this.expression.bind(binding, scope, lookupFunctions);
      }
      var behavior = lookupFunctions.bindingBehaviors(this.name);
      if (!behavior) {
        throw new Error('No BindingBehavior named "' + this.name + '" was found!');
      }
      var behaviorKey = 'behavior-' + this.name;
      if (binding[behaviorKey]) {
        throw new Error('A binding behavior named "' + this.name + '" has already been applied to "' + this.expression + '"');
      }
      binding[behaviorKey] = behavior;
      behavior.bind.apply(behavior, [binding, scope].concat(evalList(scope, this.args, binding.lookupFunctions)));
    };

    BindingBehavior.prototype.unbind = function unbind(binding, scope) {
      var behaviorKey = 'behavior-' + this.name;
      binding[behaviorKey].unbind(binding, scope);
      binding[behaviorKey] = null;
      if (this.expression.expression && this.expression.unbind) {
        this.expression.unbind(binding, scope);
      }
    };

    return BindingBehavior;
  }(Expression);

  var ValueConverter = exports.ValueConverter = function (_Expression2) {
    _inherits(ValueConverter, _Expression2);

    function ValueConverter(expression, name, args) {
      

      var _this4 = _possibleConstructorReturn(this, _Expression2.call(this));

      _this4.expression = expression;
      _this4.name = name;
      _this4.args = args;
      _this4.allArgs = [expression].concat(args);
      return _this4;
    }

    ValueConverter.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      var converter = lookupFunctions.valueConverters(this.name);
      if (!converter) {
        throw new Error('No ValueConverter named "' + this.name + '" was found!');
      }

      if ('toView' in converter) {
        return converter.toView.apply(converter, evalList(scope, this.allArgs, lookupFunctions));
      }

      return this.allArgs[0].evaluate(scope, lookupFunctions);
    };

    ValueConverter.prototype.assign = function assign(scope, value, lookupFunctions) {
      var converter = lookupFunctions.valueConverters(this.name);
      if (!converter) {
        throw new Error('No ValueConverter named "' + this.name + '" was found!');
      }

      if ('fromView' in converter) {
        value = converter.fromView.apply(converter, [value].concat(evalList(scope, this.args, lookupFunctions)));
      }

      return this.allArgs[0].assign(scope, value, lookupFunctions);
    };

    ValueConverter.prototype.accept = function accept(visitor) {
      return visitor.visitValueConverter(this);
    };

    ValueConverter.prototype.connect = function connect(binding, scope) {
      var expressions = this.allArgs;
      var i = expressions.length;
      while (i--) {
        expressions[i].connect(binding, scope);
      }
      var converter = binding.lookupFunctions.valueConverters(this.name);
      if (!converter) {
        throw new Error('No ValueConverter named "' + this.name + '" was found!');
      }
      var signals = converter.signals;
      if (signals === undefined) {
        return;
      }
      i = signals.length;
      while (i--) {
        connectBindingToSignal(binding, signals[i]);
      }
    };

    return ValueConverter;
  }(Expression);

  var Assign = exports.Assign = function (_Expression3) {
    _inherits(Assign, _Expression3);

    function Assign(target, value) {
      

      var _this5 = _possibleConstructorReturn(this, _Expression3.call(this));

      _this5.target = target;
      _this5.value = value;
      _this5.isAssignable = true;
      return _this5;
    }

    Assign.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      return this.target.assign(scope, this.value.evaluate(scope, lookupFunctions));
    };

    Assign.prototype.accept = function accept(vistor) {
      vistor.visitAssign(this);
    };

    Assign.prototype.connect = function connect(binding, scope) {};

    Assign.prototype.assign = function assign(scope, value) {
      this.value.assign(scope, value);
      this.target.assign(scope, value);
    };

    return Assign;
  }(Expression);

  var Conditional = exports.Conditional = function (_Expression4) {
    _inherits(Conditional, _Expression4);

    function Conditional(condition, yes, no) {
      

      var _this6 = _possibleConstructorReturn(this, _Expression4.call(this));

      _this6.condition = condition;
      _this6.yes = yes;
      _this6.no = no;
      return _this6;
    }

    Conditional.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      return !!this.condition.evaluate(scope, lookupFunctions) ? this.yes.evaluate(scope, lookupFunctions) : this.no.evaluate(scope, lookupFunctions);
    };

    Conditional.prototype.accept = function accept(visitor) {
      return visitor.visitConditional(this);
    };

    Conditional.prototype.connect = function connect(binding, scope) {
      this.condition.connect(binding, scope);
      if (this.condition.evaluate(scope)) {
        this.yes.connect(binding, scope);
      } else {
        this.no.connect(binding, scope);
      }
    };

    return Conditional;
  }(Expression);

  var AccessThis = exports.AccessThis = function (_Expression5) {
    _inherits(AccessThis, _Expression5);

    function AccessThis(ancestor) {
      

      var _this7 = _possibleConstructorReturn(this, _Expression5.call(this));

      _this7.ancestor = ancestor;
      return _this7;
    }

    AccessThis.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      var oc = scope.overrideContext;
      var i = this.ancestor;
      while (i-- && oc) {
        oc = oc.parentOverrideContext;
      }
      return i < 1 && oc ? oc.bindingContext : undefined;
    };

    AccessThis.prototype.accept = function accept(visitor) {
      return visitor.visitAccessThis(this);
    };

    AccessThis.prototype.connect = function connect(binding, scope) {};

    return AccessThis;
  }(Expression);

  var AccessScope = exports.AccessScope = function (_Expression6) {
    _inherits(AccessScope, _Expression6);

    function AccessScope(name, ancestor) {
      

      var _this8 = _possibleConstructorReturn(this, _Expression6.call(this));

      _this8.name = name;
      _this8.ancestor = ancestor;
      _this8.isAssignable = true;
      return _this8;
    }

    AccessScope.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      var context = getContextFor(this.name, scope, this.ancestor);
      return context[this.name];
    };

    AccessScope.prototype.assign = function assign(scope, value) {
      var context = getContextFor(this.name, scope, this.ancestor);
      return context ? context[this.name] = value : undefined;
    };

    AccessScope.prototype.accept = function accept(visitor) {
      return visitor.visitAccessScope(this);
    };

    AccessScope.prototype.connect = function connect(binding, scope) {
      var context = getContextFor(this.name, scope, this.ancestor);
      binding.observeProperty(context, this.name);
    };

    return AccessScope;
  }(Expression);

  var AccessMember = exports.AccessMember = function (_Expression7) {
    _inherits(AccessMember, _Expression7);

    function AccessMember(object, name) {
      

      var _this9 = _possibleConstructorReturn(this, _Expression7.call(this));

      _this9.object = object;
      _this9.name = name;
      _this9.isAssignable = true;
      return _this9;
    }

    AccessMember.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      var instance = this.object.evaluate(scope, lookupFunctions);
      return instance === null || instance === undefined ? instance : instance[this.name];
    };

    AccessMember.prototype.assign = function assign(scope, value) {
      var instance = this.object.evaluate(scope);

      if (instance === null || instance === undefined) {
        instance = {};
        this.object.assign(scope, instance);
      }

      instance[this.name] = value;
      return value;
    };

    AccessMember.prototype.accept = function accept(visitor) {
      return visitor.visitAccessMember(this);
    };

    AccessMember.prototype.connect = function connect(binding, scope) {
      this.object.connect(binding, scope);
      var obj = this.object.evaluate(scope);
      if (obj) {
        binding.observeProperty(obj, this.name);
      }
    };

    return AccessMember;
  }(Expression);

  var AccessKeyed = exports.AccessKeyed = function (_Expression8) {
    _inherits(AccessKeyed, _Expression8);

    function AccessKeyed(object, key) {
      

      var _this10 = _possibleConstructorReturn(this, _Expression8.call(this));

      _this10.object = object;
      _this10.key = key;
      _this10.isAssignable = true;
      return _this10;
    }

    AccessKeyed.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      var instance = this.object.evaluate(scope, lookupFunctions);
      var lookup = this.key.evaluate(scope, lookupFunctions);
      return getKeyed(instance, lookup);
    };

    AccessKeyed.prototype.assign = function assign(scope, value) {
      var instance = this.object.evaluate(scope);
      var lookup = this.key.evaluate(scope);
      return setKeyed(instance, lookup, value);
    };

    AccessKeyed.prototype.accept = function accept(visitor) {
      return visitor.visitAccessKeyed(this);
    };

    AccessKeyed.prototype.connect = function connect(binding, scope) {
      this.object.connect(binding, scope);
      var obj = this.object.evaluate(scope);
      if (obj instanceof Object) {
        this.key.connect(binding, scope);
        var key = this.key.evaluate(scope);

        if (key !== null && key !== undefined && !(Array.isArray(obj) && typeof key === 'number')) {
          binding.observeProperty(obj, key);
        }
      }
    };

    return AccessKeyed;
  }(Expression);

  var CallScope = exports.CallScope = function (_Expression9) {
    _inherits(CallScope, _Expression9);

    function CallScope(name, args, ancestor) {
      

      var _this11 = _possibleConstructorReturn(this, _Expression9.call(this));

      _this11.name = name;
      _this11.args = args;
      _this11.ancestor = ancestor;
      return _this11;
    }

    CallScope.prototype.evaluate = function evaluate(scope, lookupFunctions, mustEvaluate) {
      var args = evalList(scope, this.args, lookupFunctions);
      var context = getContextFor(this.name, scope, this.ancestor);
      var func = getFunction(context, this.name, mustEvaluate);
      if (func) {
        return func.apply(context, args);
      }
      return undefined;
    };

    CallScope.prototype.accept = function accept(visitor) {
      return visitor.visitCallScope(this);
    };

    CallScope.prototype.connect = function connect(binding, scope) {
      var args = this.args;
      var i = args.length;
      while (i--) {
        args[i].connect(binding, scope);
      }
    };

    return CallScope;
  }(Expression);

  var CallMember = exports.CallMember = function (_Expression10) {
    _inherits(CallMember, _Expression10);

    function CallMember(object, name, args) {
      

      var _this12 = _possibleConstructorReturn(this, _Expression10.call(this));

      _this12.object = object;
      _this12.name = name;
      _this12.args = args;
      return _this12;
    }

    CallMember.prototype.evaluate = function evaluate(scope, lookupFunctions, mustEvaluate) {
      var instance = this.object.evaluate(scope, lookupFunctions);
      var args = evalList(scope, this.args, lookupFunctions);
      var func = getFunction(instance, this.name, mustEvaluate);
      if (func) {
        return func.apply(instance, args);
      }
      return undefined;
    };

    CallMember.prototype.accept = function accept(visitor) {
      return visitor.visitCallMember(this);
    };

    CallMember.prototype.connect = function connect(binding, scope) {
      this.object.connect(binding, scope);
      var obj = this.object.evaluate(scope);
      if (getFunction(obj, this.name, false)) {
        var args = this.args;
        var i = args.length;
        while (i--) {
          args[i].connect(binding, scope);
        }
      }
    };

    return CallMember;
  }(Expression);

  var CallFunction = exports.CallFunction = function (_Expression11) {
    _inherits(CallFunction, _Expression11);

    function CallFunction(func, args) {
      

      var _this13 = _possibleConstructorReturn(this, _Expression11.call(this));

      _this13.func = func;
      _this13.args = args;
      return _this13;
    }

    CallFunction.prototype.evaluate = function evaluate(scope, lookupFunctions, mustEvaluate) {
      var func = this.func.evaluate(scope, lookupFunctions);
      if (typeof func === 'function') {
        return func.apply(null, evalList(scope, this.args, lookupFunctions));
      }
      if (!mustEvaluate && (func === null || func === undefined)) {
        return undefined;
      }
      throw new Error(this.func + ' is not a function');
    };

    CallFunction.prototype.accept = function accept(visitor) {
      return visitor.visitCallFunction(this);
    };

    CallFunction.prototype.connect = function connect(binding, scope) {
      this.func.connect(binding, scope);
      var func = this.func.evaluate(scope);
      if (typeof func === 'function') {
        var args = this.args;
        var i = args.length;
        while (i--) {
          args[i].connect(binding, scope);
        }
      }
    };

    return CallFunction;
  }(Expression);

  var Binary = exports.Binary = function (_Expression12) {
    _inherits(Binary, _Expression12);

    function Binary(operation, left, right) {
      

      var _this14 = _possibleConstructorReturn(this, _Expression12.call(this));

      _this14.operation = operation;
      _this14.left = left;
      _this14.right = right;
      return _this14;
    }

    Binary.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      var left = this.left.evaluate(scope, lookupFunctions);

      switch (this.operation) {
        case '&&':
          return left && this.right.evaluate(scope, lookupFunctions);
        case '||':
          return left || this.right.evaluate(scope, lookupFunctions);
      }

      var right = this.right.evaluate(scope, lookupFunctions);

      switch (this.operation) {
        case '==':
          return left == right;
        case '===':
          return left === right;
        case '!=':
          return left != right;
        case '!==':
          return left !== right;
        case 'instanceof':
          return typeof right === 'function' && left instanceof right;
        case 'in':
          return (typeof right === 'undefined' ? 'undefined' : _typeof(right)) === 'object' && right !== null && left in right;
      }

      if (left === null || right === null || left === undefined || right === undefined) {
        switch (this.operation) {
          case '+':
            if (left !== null && left !== undefined) return left;
            if (right !== null && right !== undefined) return right;
            return 0;
          case '-':
            if (left !== null && left !== undefined) return left;
            if (right !== null && right !== undefined) return 0 - right;
            return 0;
        }

        return null;
      }

      switch (this.operation) {
        case '+':
          return autoConvertAdd(left, right);
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '%':
          return left % right;
        case '<':
          return left < right;
        case '>':
          return left > right;
        case '<=':
          return left <= right;
        case '>=':
          return left >= right;
        case '^':
          return left ^ right;
      }

      throw new Error('Internal error [' + this.operation + '] not handled');
    };

    Binary.prototype.accept = function accept(visitor) {
      return visitor.visitBinary(this);
    };

    Binary.prototype.connect = function connect(binding, scope) {
      this.left.connect(binding, scope);
      var left = this.left.evaluate(scope);
      if (this.operation === '&&' && !left || this.operation === '||' && left) {
        return;
      }
      this.right.connect(binding, scope);
    };

    return Binary;
  }(Expression);

  var Unary = exports.Unary = function (_Expression13) {
    _inherits(Unary, _Expression13);

    function Unary(operation, expression) {
      

      var _this15 = _possibleConstructorReturn(this, _Expression13.call(this));

      _this15.operation = operation;
      _this15.expression = expression;
      return _this15;
    }

    Unary.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      switch (this.operation) {
        case '!':
          return !this.expression.evaluate(scope, lookupFunctions);
        case 'typeof':
          return _typeof(this.expression.evaluate(scope, lookupFunctions));
        case 'void':
          return void this.expression.evaluate(scope, lookupFunctions);
      }

      throw new Error('Internal error [' + this.operation + '] not handled');
    };

    Unary.prototype.accept = function accept(visitor) {
      return visitor.visitPrefix(this);
    };

    Unary.prototype.connect = function connect(binding, scope) {
      this.expression.connect(binding, scope);
    };

    return Unary;
  }(Expression);

  var LiteralPrimitive = exports.LiteralPrimitive = function (_Expression14) {
    _inherits(LiteralPrimitive, _Expression14);

    function LiteralPrimitive(value) {
      

      var _this16 = _possibleConstructorReturn(this, _Expression14.call(this));

      _this16.value = value;
      return _this16;
    }

    LiteralPrimitive.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      return this.value;
    };

    LiteralPrimitive.prototype.accept = function accept(visitor) {
      return visitor.visitLiteralPrimitive(this);
    };

    LiteralPrimitive.prototype.connect = function connect(binding, scope) {};

    return LiteralPrimitive;
  }(Expression);

  var LiteralString = exports.LiteralString = function (_Expression15) {
    _inherits(LiteralString, _Expression15);

    function LiteralString(value) {
      

      var _this17 = _possibleConstructorReturn(this, _Expression15.call(this));

      _this17.value = value;
      return _this17;
    }

    LiteralString.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      return this.value;
    };

    LiteralString.prototype.accept = function accept(visitor) {
      return visitor.visitLiteralString(this);
    };

    LiteralString.prototype.connect = function connect(binding, scope) {};

    return LiteralString;
  }(Expression);

  var LiteralTemplate = exports.LiteralTemplate = function (_Expression16) {
    _inherits(LiteralTemplate, _Expression16);

    function LiteralTemplate(cooked, expressions, raw, tag) {
      

      var _this18 = _possibleConstructorReturn(this, _Expression16.call(this));

      _this18.cooked = cooked;
      _this18.expressions = expressions || [];
      _this18.length = _this18.expressions.length;
      _this18.tagged = tag !== undefined;
      if (_this18.tagged) {
        _this18.cooked.raw = raw;
        _this18.tag = tag;
        if (tag instanceof AccessScope) {
          _this18.contextType = 'Scope';
        } else if (tag instanceof AccessMember || tag instanceof AccessKeyed) {
          _this18.contextType = 'Object';
        } else {
          throw new Error(_this18.tag + ' is not a valid template tag');
        }
      }
      return _this18;
    }

    LiteralTemplate.prototype.getScopeContext = function getScopeContext(scope, lookupFunctions) {
      return getContextFor(this.tag.name, scope, this.tag.ancestor);
    };

    LiteralTemplate.prototype.getObjectContext = function getObjectContext(scope, lookupFunctions) {
      return this.tag.object.evaluate(scope, lookupFunctions);
    };

    LiteralTemplate.prototype.evaluate = function evaluate(scope, lookupFunctions, mustEvaluate) {
      var results = new Array(this.length);
      for (var i = 0; i < this.length; i++) {
        results[i] = this.expressions[i].evaluate(scope, lookupFunctions);
      }
      if (this.tagged) {
        var func = this.tag.evaluate(scope, lookupFunctions);
        if (typeof func === 'function') {
          var context = this['get' + this.contextType + 'Context'](scope, lookupFunctions);
          return func.call.apply(func, [context, this.cooked].concat(results));
        }
        if (!mustEvaluate) {
          return null;
        }
        throw new Error(this.tag + ' is not a function');
      }
      var result = this.cooked[0];
      for (var _i2 = 0; _i2 < this.length; _i2++) {
        result = String.prototype.concat(result, results[_i2], this.cooked[_i2 + 1]);
      }
      return result;
    };

    LiteralTemplate.prototype.accept = function accept(visitor) {
      return visitor.visitLiteralTemplate(this);
    };

    LiteralTemplate.prototype.connect = function connect(binding, scope) {
      for (var i = 0; i < this.length; i++) {
        this.expressions[i].connect(binding, scope);
      }
      if (this.tagged) {
        this.tag.connect(binding, scope);
      }
    };

    return LiteralTemplate;
  }(Expression);

  var LiteralArray = exports.LiteralArray = function (_Expression17) {
    _inherits(LiteralArray, _Expression17);

    function LiteralArray(elements) {
      

      var _this19 = _possibleConstructorReturn(this, _Expression17.call(this));

      _this19.elements = elements;
      return _this19;
    }

    LiteralArray.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      var elements = this.elements;
      var result = [];

      for (var i = 0, length = elements.length; i < length; ++i) {
        result[i] = elements[i].evaluate(scope, lookupFunctions);
      }

      return result;
    };

    LiteralArray.prototype.accept = function accept(visitor) {
      return visitor.visitLiteralArray(this);
    };

    LiteralArray.prototype.connect = function connect(binding, scope) {
      var length = this.elements.length;
      for (var i = 0; i < length; i++) {
        this.elements[i].connect(binding, scope);
      }
    };

    return LiteralArray;
  }(Expression);

  var LiteralObject = exports.LiteralObject = function (_Expression18) {
    _inherits(LiteralObject, _Expression18);

    function LiteralObject(keys, values) {
      

      var _this20 = _possibleConstructorReturn(this, _Expression18.call(this));

      _this20.keys = keys;
      _this20.values = values;
      return _this20;
    }

    LiteralObject.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      var instance = {};
      var keys = this.keys;
      var values = this.values;

      for (var i = 0, length = keys.length; i < length; ++i) {
        instance[keys[i]] = values[i].evaluate(scope, lookupFunctions);
      }

      return instance;
    };

    LiteralObject.prototype.accept = function accept(visitor) {
      return visitor.visitLiteralObject(this);
    };

    LiteralObject.prototype.connect = function connect(binding, scope) {
      var length = this.keys.length;
      for (var i = 0; i < length; i++) {
        this.values[i].connect(binding, scope);
      }
    };

    return LiteralObject;
  }(Expression);

  function evalList(scope, list, lookupFunctions) {
    var length = list.length;
    var result = [];
    for (var i = 0; i < length; i++) {
      result[i] = list[i].evaluate(scope, lookupFunctions);
    }
    return result;
  }

  function autoConvertAdd(a, b) {
    if (a !== null && b !== null) {
      if (typeof a === 'string' && typeof b !== 'string') {
        return a + b.toString();
      }

      if (typeof a !== 'string' && typeof b === 'string') {
        return a.toString() + b;
      }

      return a + b;
    }

    if (a !== null) {
      return a;
    }

    if (b !== null) {
      return b;
    }

    return 0;
  }

  function getFunction(obj, name, mustExist) {
    var func = obj === null || obj === undefined ? null : obj[name];
    if (typeof func === 'function') {
      return func;
    }
    if (!mustExist && (func === null || func === undefined)) {
      return null;
    }
    throw new Error(name + ' is not a function');
  }

  function getKeyed(obj, key) {
    if (Array.isArray(obj)) {
      return obj[parseInt(key, 10)];
    } else if (obj) {
      return obj[key];
    } else if (obj === null || obj === undefined) {
      return undefined;
    }

    return obj[key];
  }

  function setKeyed(obj, key, value) {
    if (Array.isArray(obj)) {
      var index = parseInt(key, 10);

      if (obj.length <= index) {
        obj.length = index + 1;
      }

      obj[index] = value;
    } else {
      obj[key] = value;
    }

    return value;
  }

  var _Unparser = null;

  exports.Unparser = _Unparser;
  if (typeof FEATURE_NO_UNPARSER === 'undefined') {
    exports.Unparser = _Unparser = function () {
      function Unparser(buffer) {
        

        this.buffer = buffer;
      }

      Unparser.unparse = function unparse(expression) {
        var buffer = [];
        var visitor = new _Unparser(buffer);

        expression.accept(visitor);

        return buffer.join('');
      };

      Unparser.prototype.write = function write(text) {
        this.buffer.push(text);
      };

      Unparser.prototype.writeArgs = function writeArgs(args) {
        this.write('(');

        for (var i = 0, length = args.length; i < length; ++i) {
          if (i !== 0) {
            this.write(',');
          }

          args[i].accept(this);
        }

        this.write(')');
      };

      Unparser.prototype.visitBindingBehavior = function visitBindingBehavior(behavior) {
        var args = behavior.args;

        behavior.expression.accept(this);
        this.write('&' + behavior.name);

        for (var i = 0, length = args.length; i < length; ++i) {
          this.write(':');
          args[i].accept(this);
        }
      };

      Unparser.prototype.visitValueConverter = function visitValueConverter(converter) {
        var args = converter.args;

        converter.expression.accept(this);
        this.write('|' + converter.name);

        for (var i = 0, length = args.length; i < length; ++i) {
          this.write(':');
          args[i].accept(this);
        }
      };

      Unparser.prototype.visitAssign = function visitAssign(assign) {
        assign.target.accept(this);
        this.write('=');
        assign.value.accept(this);
      };

      Unparser.prototype.visitConditional = function visitConditional(conditional) {
        conditional.condition.accept(this);
        this.write('?');
        conditional.yes.accept(this);
        this.write(':');
        conditional.no.accept(this);
      };

      Unparser.prototype.visitAccessThis = function visitAccessThis(access) {
        if (access.ancestor === 0) {
          this.write('$this');
          return;
        }
        this.write('$parent');
        var i = access.ancestor - 1;
        while (i--) {
          this.write('.$parent');
        }
      };

      Unparser.prototype.visitAccessScope = function visitAccessScope(access) {
        var i = access.ancestor;
        while (i--) {
          this.write('$parent.');
        }
        this.write(access.name);
      };

      Unparser.prototype.visitAccessMember = function visitAccessMember(access) {
        access.object.accept(this);
        this.write('.' + access.name);
      };

      Unparser.prototype.visitAccessKeyed = function visitAccessKeyed(access) {
        access.object.accept(this);
        this.write('[');
        access.key.accept(this);
        this.write(']');
      };

      Unparser.prototype.visitCallScope = function visitCallScope(call) {
        var i = call.ancestor;
        while (i--) {
          this.write('$parent.');
        }
        this.write(call.name);
        this.writeArgs(call.args);
      };

      Unparser.prototype.visitCallFunction = function visitCallFunction(call) {
        call.func.accept(this);
        this.writeArgs(call.args);
      };

      Unparser.prototype.visitCallMember = function visitCallMember(call) {
        call.object.accept(this);
        this.write('.' + call.name);
        this.writeArgs(call.args);
      };

      Unparser.prototype.visitPrefix = function visitPrefix(prefix) {
        this.write('(' + prefix.operation);
        if (prefix.operation.charCodeAt(0) >= 97) {
          this.write(' ');
        }
        prefix.expression.accept(this);
        this.write(')');
      };

      Unparser.prototype.visitBinary = function visitBinary(binary) {
        binary.left.accept(this);
        if (binary.operation.charCodeAt(0) === 105) {
          this.write(' ' + binary.operation + ' ');
        } else {
          this.write(binary.operation);
        }
        binary.right.accept(this);
      };

      Unparser.prototype.visitLiteralPrimitive = function visitLiteralPrimitive(literal) {
        this.write('' + literal.value);
      };

      Unparser.prototype.visitLiteralArray = function visitLiteralArray(literal) {
        var elements = literal.elements;

        this.write('[');

        for (var i = 0, length = elements.length; i < length; ++i) {
          if (i !== 0) {
            this.write(',');
          }

          elements[i].accept(this);
        }

        this.write(']');
      };

      Unparser.prototype.visitLiteralObject = function visitLiteralObject(literal) {
        var keys = literal.keys;
        var values = literal.values;

        this.write('{');

        for (var i = 0, length = keys.length; i < length; ++i) {
          if (i !== 0) {
            this.write(',');
          }

          this.write('\'' + keys[i] + '\':');
          values[i].accept(this);
        }

        this.write('}');
      };

      Unparser.prototype.visitLiteralString = function visitLiteralString(literal) {
        var escaped = literal.value.replace(/'/g, "\'");
        this.write('\'' + escaped + '\'');
      };

      Unparser.prototype.visitLiteralTemplate = function visitLiteralTemplate(literal) {
        var cooked = literal.cooked,
            expressions = literal.expressions;

        var length = expressions.length;
        this.write('`');
        this.write(cooked[0]);
        for (var i = 0; i < length; i++) {
          expressions[i].accept(this);
          this.write(cooked[i + 1]);
        }
        this.write('`');
      };

      return Unparser;
    }();
  }

  var ExpressionCloner = exports.ExpressionCloner = function () {
    function ExpressionCloner() {
      
    }

    ExpressionCloner.prototype.cloneExpressionArray = function cloneExpressionArray(array) {
      var clonedArray = [];
      var i = array.length;
      while (i--) {
        clonedArray[i] = array[i].accept(this);
      }
      return clonedArray;
    };

    ExpressionCloner.prototype.visitBindingBehavior = function visitBindingBehavior(behavior) {
      return new BindingBehavior(behavior.expression.accept(this), behavior.name, this.cloneExpressionArray(behavior.args));
    };

    ExpressionCloner.prototype.visitValueConverter = function visitValueConverter(converter) {
      return new ValueConverter(converter.expression.accept(this), converter.name, this.cloneExpressionArray(converter.args));
    };

    ExpressionCloner.prototype.visitAssign = function visitAssign(assign) {
      return new Assign(assign.target.accept(this), assign.value.accept(this));
    };

    ExpressionCloner.prototype.visitConditional = function visitConditional(conditional) {
      return new Conditional(conditional.condition.accept(this), conditional.yes.accept(this), conditional.no.accept(this));
    };

    ExpressionCloner.prototype.visitAccessThis = function visitAccessThis(access) {
      return new AccessThis(access.ancestor);
    };

    ExpressionCloner.prototype.visitAccessScope = function visitAccessScope(access) {
      return new AccessScope(access.name, access.ancestor);
    };

    ExpressionCloner.prototype.visitAccessMember = function visitAccessMember(access) {
      return new AccessMember(access.object.accept(this), access.name);
    };

    ExpressionCloner.prototype.visitAccessKeyed = function visitAccessKeyed(access) {
      return new AccessKeyed(access.object.accept(this), access.key.accept(this));
    };

    ExpressionCloner.prototype.visitCallScope = function visitCallScope(call) {
      return new CallScope(call.name, this.cloneExpressionArray(call.args), call.ancestor);
    };

    ExpressionCloner.prototype.visitCallFunction = function visitCallFunction(call) {
      return new CallFunction(call.func.accept(this), this.cloneExpressionArray(call.args));
    };

    ExpressionCloner.prototype.visitCallMember = function visitCallMember(call) {
      return new CallMember(call.object.accept(this), call.name, this.cloneExpressionArray(call.args));
    };

    ExpressionCloner.prototype.visitUnary = function visitUnary(unary) {
      return new Unary(prefix.operation, prefix.expression.accept(this));
    };

    ExpressionCloner.prototype.visitBinary = function visitBinary(binary) {
      return new Binary(binary.operation, binary.left.accept(this), binary.right.accept(this));
    };

    ExpressionCloner.prototype.visitLiteralPrimitive = function visitLiteralPrimitive(literal) {
      return new LiteralPrimitive(literal);
    };

    ExpressionCloner.prototype.visitLiteralArray = function visitLiteralArray(literal) {
      return new LiteralArray(this.cloneExpressionArray(literal.elements));
    };

    ExpressionCloner.prototype.visitLiteralObject = function visitLiteralObject(literal) {
      return new LiteralObject(literal.keys, this.cloneExpressionArray(literal.values));
    };

    ExpressionCloner.prototype.visitLiteralString = function visitLiteralString(literal) {
      return new LiteralString(literal.value);
    };

    ExpressionCloner.prototype.visitLiteralTemplate = function visitLiteralTemplate(literal) {
      return new LiteralTemplate(literal.cooked, this.cloneExpressionArray(literal.expressions), literal.raw, literal.tag && literal.tag.accept(this));
    };

    return ExpressionCloner;
  }();

  function cloneExpression(expression) {
    var visitor = new ExpressionCloner();
    return expression.accept(visitor);
  }

  var bindingMode = exports.bindingMode = {
    oneTime: 0,
    toView: 1,
    oneWay: 1,
    twoWay: 2,
    fromView: 3
  };

  var Parser = exports.Parser = function () {
    function Parser() {
      

      this.cache = Object.create(null);
    }

    Parser.prototype.parse = function parse(src) {
      src = src || '';

      return this.cache[src] || (this.cache[src] = new ParserImplementation(src).parseBindingBehavior());
    };

    return Parser;
  }();

  var fromCharCode = String.fromCharCode;

  var ParserImplementation = exports.ParserImplementation = function () {
    _createClass(ParserImplementation, [{
      key: 'raw',
      get: function get() {
        return this.src.slice(this.start, this.idx);
      }
    }]);

    function ParserImplementation(src) {
      

      this.idx = 0;

      this.start = 0;

      this.src = src;
      this.len = src.length;

      this.tkn = T$EOF;

      this.val = undefined;

      this.ch = src.charCodeAt(0);
    }

    ParserImplementation.prototype.parseBindingBehavior = function parseBindingBehavior() {
      this.nextToken();
      if (this.tkn & T$ExpressionTerminal) {
        this.err('Invalid start of expression');
      }
      var result = this.parseValueConverter();
      while (this.opt(T$Ampersand)) {
        result = new BindingBehavior(result, this.val, this.parseVariadicArgs());
      }
      if (this.tkn !== T$EOF) {
        this.err('Unconsumed token ' + this.raw);
      }
      return result;
    };

    ParserImplementation.prototype.parseValueConverter = function parseValueConverter() {
      var result = this.parseExpression();
      while (this.opt(T$Bar)) {
        result = new ValueConverter(result, this.val, this.parseVariadicArgs());
      }
      return result;
    };

    ParserImplementation.prototype.parseVariadicArgs = function parseVariadicArgs() {
      this.nextToken();
      var result = [];
      while (this.opt(T$Colon)) {
        result.push(this.parseExpression());
      }
      return result;
    };

    ParserImplementation.prototype.parseExpression = function parseExpression() {
      var exprStart = this.idx;
      var result = this.parseConditional();

      while (this.tkn === T$Eq) {
        if (!result.isAssignable) {
          this.err('Expression ' + this.src.slice(exprStart, this.start) + ' is not assignable');
        }
        this.nextToken();
        exprStart = this.idx;
        result = new Assign(result, this.parseConditional());
      }
      return result;
    };

    ParserImplementation.prototype.parseConditional = function parseConditional() {
      var result = this.parseBinary(0);

      if (this.opt(T$Question)) {
        var yes = this.parseExpression();
        this.expect(T$Colon);
        result = new Conditional(result, yes, this.parseExpression());
      }
      return result;
    };

    ParserImplementation.prototype.parseBinary = function parseBinary(minPrecedence) {
      var left = this.parseLeftHandSide(0);

      while (this.tkn & T$BinaryOp) {
        var opToken = this.tkn;
        if ((opToken & T$Precedence) <= minPrecedence) {
          break;
        }
        this.nextToken();
        left = new Binary(TokenValues[opToken & T$TokenMask], left, this.parseBinary(opToken & T$Precedence));
      }
      return left;
    };

    ParserImplementation.prototype.parseLeftHandSide = function parseLeftHandSide(context) {
      var result = void 0;

      primary: switch (this.tkn) {
        case T$Plus:
          this.nextToken();
          return this.parseLeftHandSide(0);
        case T$Minus:
          this.nextToken();
          return new Binary('-', new LiteralPrimitive(0), this.parseLeftHandSide(0));
        case T$Bang:
        case T$TypeofKeyword:
        case T$VoidKeyword:
          var op = TokenValues[this.tkn & T$TokenMask];
          this.nextToken();
          return new Unary(op, this.parseLeftHandSide(0));
        case T$ParentScope:
          {
            do {
              this.nextToken();
              context++;
              if (this.opt(T$Period)) {
                if (this.tkn === T$Period) {
                  this.err();
                }
                continue;
              } else if (this.tkn & T$AccessScopeTerminal) {
                result = new AccessThis(context & C$Ancestor);

                context = context & C$ShorthandProp | C$This;
                break primary;
              } else {
                this.err();
              }
            } while (this.tkn === T$ParentScope);
          }

        case T$Identifier:
          {
            result = new AccessScope(this.val, context & C$Ancestor);
            this.nextToken();
            context = context & C$ShorthandProp | C$Scope;
            break;
          }
        case T$ThisScope:
          this.nextToken();
          result = new AccessThis(0);
          context = context & C$ShorthandProp | C$This;
          break;
        case T$LParen:
          this.nextToken();
          result = this.parseExpression();
          this.expect(T$RParen);
          context = C$Primary;
          break;
        case T$LBracket:
          {
            this.nextToken();
            var _elements = [];
            if (this.tkn !== T$RBracket) {
              do {
                _elements.push(this.parseExpression());
              } while (this.opt(T$Comma));
            }
            this.expect(T$RBracket);
            result = new LiteralArray(_elements);
            context = C$Primary;
            break;
          }
        case T$LBrace:
          {
            var keys = [];
            var values = [];
            this.nextToken();
            while (this.tkn !== T$RBrace) {
              if (this.tkn & T$IdentifierOrKeyword) {
                var ch = this.ch,
                    tkn = this.tkn,
                    idx = this.idx;

                keys.push(this.val);
                this.nextToken();
                if (this.opt(T$Colon)) {
                  values.push(this.parseExpression());
                } else {
                  this.ch = ch;
                  this.tkn = tkn;
                  this.idx = idx;
                  values.push(this.parseLeftHandSide(C$ShorthandProp));
                }
              } else if (this.tkn & T$Literal) {
                keys.push(this.val);
                this.nextToken();
                this.expect(T$Colon);
                values.push(this.parseExpression());
              } else {
                this.err();
              }
              if (this.tkn !== T$RBrace) {
                this.expect(T$Comma);
              }
            }
            this.expect(T$RBrace);
            result = new LiteralObject(keys, values);
            context = C$Primary;
            break;
          }
        case T$StringLiteral:
          result = new LiteralString(this.val);
          this.nextToken();
          context = C$Primary;
          break;
        case T$TemplateTail:
          result = new LiteralTemplate([this.val]);
          this.nextToken();
          context = C$Primary;
          break;
        case T$TemplateContinuation:
          result = this.parseTemplate(0);
          context = C$Primary;
          break;
        case T$NumericLiteral:
          {
            result = new LiteralPrimitive(this.val);
            this.nextToken();

            break;
          }
        case T$NullKeyword:
        case T$UndefinedKeyword:
        case T$TrueKeyword:
        case T$FalseKeyword:
          result = new LiteralPrimitive(TokenValues[this.tkn & T$TokenMask]);
          this.nextToken();
          context = C$Primary;
          break;
        default:
          if (this.idx >= this.len) {
            this.err('Unexpected end of expression');
          } else {
            this.err();
          }
      }

      if (context & C$ShorthandProp) {
        return result;
      }

      var name = this.val;
      while (this.tkn & T$MemberOrCallExpression) {
        switch (this.tkn) {
          case T$Period:
            this.nextToken();
            if (!(this.tkn & T$IdentifierOrKeyword)) {
              this.err();
            }
            name = this.val;
            this.nextToken();

            context = context & C$Primary | (context & (C$This | C$Scope)) << 1 | context & C$Member | (context & C$Keyed) >> 1 | (context & C$Call) >> 2;
            if (this.tkn === T$LParen) {
              continue;
            }
            if (context & C$Scope) {
              result = new AccessScope(name, result.ancestor);
            } else {
              result = new AccessMember(result, name);
            }
            continue;
          case T$LBracket:
            this.nextToken();
            context = C$Keyed;
            result = new AccessKeyed(result, this.parseExpression());
            this.expect(T$RBracket);
            break;
          case T$LParen:
            this.nextToken();
            var args = [];
            while (this.tkn !== T$RParen) {
              args.push(this.parseExpression());
              if (!this.opt(T$Comma)) {
                break;
              }
            }
            this.expect(T$RParen);
            if (context & C$Scope) {
              result = new CallScope(name, args, result.ancestor);
            } else if (context & (C$Member | C$Primary)) {
              result = new CallMember(result, name, args);
            } else {
              result = new CallFunction(result, args);
            }
            context = C$Call;
            break;
          case T$TemplateTail:
            result = new LiteralTemplate([this.val], [], [this.raw], result);
            this.nextToken();
            break;
          case T$TemplateContinuation:
            result = this.parseTemplate(context | C$Tagged, result);
        }
      }

      return result;
    };

    ParserImplementation.prototype.parseTemplate = function parseTemplate(context, func) {
      var cooked = [this.val];
      var raw = context & C$Tagged ? [this.raw] : undefined;
      this.expect(T$TemplateContinuation);
      var expressions = [this.parseExpression()];

      while ((this.tkn = this.scanTemplateTail()) !== T$TemplateTail) {
        cooked.push(this.val);
        if (context & C$Tagged) {
          raw.push(this.raw);
        }
        this.expect(T$TemplateContinuation);
        expressions.push(this.parseExpression());
      }

      cooked.push(this.val);
      if (context & C$Tagged) {
        raw.push(this.raw);
      }
      this.nextToken();
      return new LiteralTemplate(cooked, expressions, raw, func);
    };

    ParserImplementation.prototype.nextToken = function nextToken() {
      while (this.idx < this.len) {
        if (this.ch <= 0x20) {
          this.next();
          continue;
        }
        this.start = this.idx;
        if (this.ch === 0x24 || this.ch >= 0x61 && this.ch <= 0x7A) {
          this.tkn = this.scanIdentifier();
          return;
        }

        if ((this.tkn = CharScanners[this.ch](this)) !== null) {
          return;
        }
      }
      this.tkn = T$EOF;
    };

    ParserImplementation.prototype.next = function next() {
      return this.ch = this.src.charCodeAt(++this.idx);
    };

    ParserImplementation.prototype.scanIdentifier = function scanIdentifier() {
      while (AsciiIdParts.has(this.next()) || this.ch > 0x7F && IdParts[this.ch]) {}

      return KeywordLookup[this.val = this.raw] || T$Identifier;
    };

    ParserImplementation.prototype.scanNumber = function scanNumber(isFloat) {
      if (isFloat) {
        this.val = 0;
      } else {
        this.val = this.ch - 0x30;
        while (this.next() <= 0x39 && this.ch >= 0x30) {
          this.val = this.val * 10 + this.ch - 0x30;
        }
      }

      if (isFloat || this.ch === 0x2E) {
        if (!isFloat) {
          this.next();
        }
        var start = this.idx;
        var value = this.ch - 0x30;
        while (this.next() <= 0x39 && this.ch >= 0x30) {
          value = value * 10 + this.ch - 0x30;
        }
        this.val = this.val + value / Math.pow(10, this.idx - start);
      }

      if (this.ch === 0x65 || this.ch === 0x45) {
        var _start = this.idx;

        this.next();
        if (this.ch === 0x2D || this.ch === 0x2B) {
          this.next();
        }

        if (!(this.ch >= 0x30 && this.ch <= 0x39)) {
          this.idx = _start;
          this.err('Invalid exponent');
        }
        while (this.next() <= 0x39 && this.ch >= 0x30) {}
        this.val = parseFloat(this.src.slice(this.start, this.idx));
      }

      return T$NumericLiteral;
    };

    ParserImplementation.prototype.scanString = function scanString() {
      var quote = this.ch;
      this.next();

      var buffer = void 0;
      var marker = this.idx;

      while (this.ch !== quote) {
        if (this.ch === 0x5C) {
          if (!buffer) {
            buffer = [];
          }

          buffer.push(this.src.slice(marker, this.idx));

          this.next();

          var _unescaped = void 0;

          if (this.ch === 0x75) {
            this.next();

            if (this.idx + 4 < this.len) {
              var hex = this.src.slice(this.idx, this.idx + 4);

              if (!/[A-Z0-9]{4}/i.test(hex)) {
                this.err('Invalid unicode escape [\\u' + hex + ']');
              }

              _unescaped = parseInt(hex, 16);
              this.idx += 4;
              this.ch = this.src.charCodeAt(this.idx);
            } else {
              this.err();
            }
          } else {
            _unescaped = unescape(this.ch);
            this.next();
          }

          buffer.push(fromCharCode(_unescaped));
          marker = this.idx;
        } else if (this.ch === 0 || this.idx >= this.len) {
          this.err('Unterminated quote');
        } else {
          this.next();
        }
      }

      var last = this.src.slice(marker, this.idx);
      this.next();
      var unescaped = last;

      if (buffer !== null && buffer !== undefined) {
        buffer.push(last);
        unescaped = buffer.join('');
      }

      this.val = unescaped;
      return T$StringLiteral;
    };

    ParserImplementation.prototype.scanTemplate = function scanTemplate() {
      var tail = true;
      var result = '';

      while (this.next() !== 0x60) {
        if (this.ch === 0x24) {
          if (this.idx + 1 < this.len && this.src.charCodeAt(this.idx + 1) === 0x7B) {
            this.idx++;
            tail = false;
            break;
          } else {
            result += '$';
          }
        } else if (this.ch === 0x5C) {
          result += fromCharCode(unescape(this.next()));
        } else if (this.ch === 0 || this.idx >= this.len) {
          this.err('Unterminated template literal');
        } else {
          result += fromCharCode(this.ch);
        }
      }

      this.next();
      this.val = result;
      if (tail) {
        return T$TemplateTail;
      }
      return T$TemplateContinuation;
    };

    ParserImplementation.prototype.scanTemplateTail = function scanTemplateTail() {
      if (this.idx >= this.len) {
        this.err('Unterminated template');
      }
      this.idx--;
      return this.scanTemplate();
    };

    ParserImplementation.prototype.err = function err() {
      var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Unexpected token ' + this.raw;
      var column = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.start;

      throw new Error('Parser Error: ' + message + ' at column ' + column + ' in expression [' + this.src + ']');
    };

    ParserImplementation.prototype.opt = function opt(token) {
      if (this.tkn === token) {
        this.nextToken();
        return true;
      }

      return false;
    };

    ParserImplementation.prototype.expect = function expect(token) {
      if (this.tkn === token) {
        this.nextToken();
      } else {
        this.err('Missing expected token ' + TokenValues[token & T$TokenMask], this.idx);
      }
    };

    return ParserImplementation;
  }();

  function unescape(code) {
    switch (code) {
      case 0x66:
        return 0xC;
      case 0x6E:
        return 0xA;
      case 0x72:
        return 0xD;
      case 0x74:
        return 0x9;
      case 0x76:
        return 0xB;
      default:
        return code;
    }
  }

  var C$This = 1 << 10;
  var C$Scope = 1 << 11;
  var C$Member = 1 << 12;
  var C$Keyed = 1 << 13;
  var C$Call = 1 << 14;
  var C$Primary = 1 << 15;
  var C$ShorthandProp = 1 << 16;
  var C$Tagged = 1 << 17;

  var C$Ancestor = (1 << 9) - 1;

  var T$TokenMask = (1 << 6) - 1;

  var T$PrecShift = 6;

  var T$Precedence = 7 << T$PrecShift;

  var T$ExpressionTerminal = 1 << 11;

  var T$ClosingToken = 1 << 12;

  var T$OpeningToken = 1 << 13;

  var T$AccessScopeTerminal = 1 << 14;
  var T$Keyword = 1 << 15;
  var T$EOF = 1 << 16 | T$AccessScopeTerminal | T$ExpressionTerminal;
  var T$Identifier = 1 << 17;
  var T$IdentifierOrKeyword = T$Identifier | T$Keyword;
  var T$Literal = 1 << 18;
  var T$NumericLiteral = 1 << 19 | T$Literal;
  var T$StringLiteral = 1 << 20 | T$Literal;
  var T$BinaryOp = 1 << 21;

  var T$UnaryOp = 1 << 22;

  var T$MemberExpression = 1 << 23;

  var T$MemberOrCallExpression = 1 << 24;
  var T$TemplateTail = 1 << 25 | T$MemberOrCallExpression;
  var T$TemplateContinuation = 1 << 26 | T$MemberOrCallExpression;

  var T$FalseKeyword = 0 | T$Keyword | T$Literal;
  var T$TrueKeyword = 1 | T$Keyword | T$Literal;
  var T$NullKeyword = 2 | T$Keyword | T$Literal;
  var T$UndefinedKeyword = 3 | T$Keyword | T$Literal;
  var T$ThisScope = 4 | T$IdentifierOrKeyword;
  var T$ParentScope = 5 | T$IdentifierOrKeyword;

  var T$LParen = 6 | T$OpeningToken | T$AccessScopeTerminal | T$MemberOrCallExpression;
  var T$LBrace = 7 | T$OpeningToken;
  var T$Period = 8 | T$MemberExpression | T$MemberOrCallExpression;
  var T$RBrace = 9 | T$AccessScopeTerminal | T$ClosingToken | T$ExpressionTerminal;
  var T$RParen = 10 | T$AccessScopeTerminal | T$ClosingToken | T$ExpressionTerminal;
  var T$Comma = 11 | T$AccessScopeTerminal;
  var T$LBracket = 12 | T$OpeningToken | T$AccessScopeTerminal | T$MemberExpression | T$MemberOrCallExpression;
  var T$RBracket = 13 | T$ClosingToken | T$ExpressionTerminal;
  var T$Colon = 14 | T$AccessScopeTerminal;
  var T$Question = 15;

  var T$Ampersand = 18 | T$AccessScopeTerminal;
  var T$Bar = 19 | T$AccessScopeTerminal;
  var T$BarBar = 20 | 1 << T$PrecShift | T$BinaryOp;
  var T$AmpersandAmpersand = 21 | 2 << T$PrecShift | T$BinaryOp;
  var T$Caret = 22 | 3 << T$PrecShift | T$BinaryOp;
  var T$EqEq = 23 | 4 << T$PrecShift | T$BinaryOp;
  var T$BangEq = 24 | 4 << T$PrecShift | T$BinaryOp;
  var T$EqEqEq = 25 | 4 << T$PrecShift | T$BinaryOp;
  var T$BangEqEq = 26 | 4 << T$PrecShift | T$BinaryOp;
  var T$Lt = 27 | 5 << T$PrecShift | T$BinaryOp;
  var T$Gt = 28 | 5 << T$PrecShift | T$BinaryOp;
  var T$LtEq = 29 | 5 << T$PrecShift | T$BinaryOp;
  var T$GtEq = 30 | 5 << T$PrecShift | T$BinaryOp;
  var T$InKeyword = 31 | 5 << T$PrecShift | T$BinaryOp | T$Keyword;
  var T$InstanceOfKeyword = 32 | 5 << T$PrecShift | T$BinaryOp | T$Keyword;
  var T$Plus = 33 | 6 << T$PrecShift | T$BinaryOp | T$UnaryOp;
  var T$Minus = 34 | 6 << T$PrecShift | T$BinaryOp | T$UnaryOp;
  var T$TypeofKeyword = 35 | T$UnaryOp | T$Keyword;
  var T$VoidKeyword = 36 | T$UnaryOp | T$Keyword;
  var T$Star = 37 | 7 << T$PrecShift | T$BinaryOp;
  var T$Percent = 38 | 7 << T$PrecShift | T$BinaryOp;
  var T$Slash = 39 | 7 << T$PrecShift | T$BinaryOp;
  var T$Eq = 40;
  var T$Bang = 41 | T$UnaryOp;

  var KeywordLookup = Object.create(null);
  KeywordLookup.true = T$TrueKeyword;
  KeywordLookup.null = T$NullKeyword;
  KeywordLookup.false = T$FalseKeyword;
  KeywordLookup.undefined = T$UndefinedKeyword;
  KeywordLookup.$this = T$ThisScope;
  KeywordLookup.$parent = T$ParentScope;
  KeywordLookup.in = T$InKeyword;
  KeywordLookup.instanceof = T$InstanceOfKeyword;
  KeywordLookup.typeof = T$TypeofKeyword;
  KeywordLookup.void = T$VoidKeyword;

  var TokenValues = [false, true, null, undefined, '$this', '$parent', '(', '{', '.', '}', ')', ',', '[', ']', ':', '?', '\'', '"', '&', '|', '||', '&&', '^', '==', '!=', '===', '!==', '<', '>', '<=', '>=', 'in', 'instanceof', '+', '-', 'typeof', 'void', '*', '%', '/', '=', '!'];

  var codes = {
    AsciiIdPart: [0x24, 0, 0x30, 0x3A, 0x41, 0x5B, 0x5F, 0, 0x61, 0x7B],
    IdStart: [0x24, 0, 0x41, 0x5B, 0x5F, 0, 0x61, 0x7B, 0xAA, 0, 0xBA, 0, 0xC0, 0xD7, 0xD8, 0xF7, 0xF8, 0x2B9, 0x2E0, 0x2E5, 0x1D00, 0x1D26, 0x1D2C, 0x1D5D, 0x1D62, 0x1D66, 0x1D6B, 0x1D78, 0x1D79, 0x1DBF, 0x1E00, 0x1F00, 0x2071, 0, 0x207F, 0, 0x2090, 0x209D, 0x212A, 0x212C, 0x2132, 0, 0x214E, 0, 0x2160, 0x2189, 0x2C60, 0x2C80, 0xA722, 0xA788, 0xA78B, 0xA7AF, 0xA7B0, 0xA7B8, 0xA7F7, 0xA800, 0xAB30, 0xAB5B, 0xAB5C, 0xAB65, 0xFB00, 0xFB07, 0xFF21, 0xFF3B, 0xFF41, 0xFF5B],
    Digit: [0x30, 0x3A],
    Skip: [0, 0x21, 0x7F, 0xA1]
  };

  function decompress(lookup, set, compressed, value) {
    var rangeCount = compressed.length;
    for (var i = 0; i < rangeCount; i += 2) {
      var start = compressed[i];
      var end = compressed[i + 1];
      end = end > 0 ? end : start + 1;
      if (lookup) {
        var j = start;
        while (j < end) {
          lookup[j] = value;
          j++;
        }
      }
      if (set) {
        for (var ch = start; ch < end; ch++) {
          set.add(ch);
        }
      }
    }
  }

  function returnToken(token) {
    return function (p) {
      p.next();
      return token;
    };
  }
  function unexpectedCharacter(p) {
    p.err('Unexpected character [' + fromCharCode(p.ch) + ']');
    return null;
  }

  var AsciiIdParts = new Set();
  decompress(null, AsciiIdParts, codes.AsciiIdPart, true);

  var IdParts = new Uint8Array(0xFFFF);
  decompress(IdParts, null, codes.IdStart, 1);
  decompress(IdParts, null, codes.Digit, 1);

  var CharScanners = new Array(0xFFFF);
  var ci = 0;
  while (ci < 0xFFFF) {
    CharScanners[ci] = unexpectedCharacter;
    ci++;
  }

  decompress(CharScanners, null, codes.Skip, function (p) {
    p.next();
    return null;
  });
  decompress(CharScanners, null, codes.IdStart, function (p) {
    return p.scanIdentifier();
  });
  decompress(CharScanners, null, codes.Digit, function (p) {
    return p.scanNumber(false);
  });

  CharScanners[0x22] = CharScanners[0x27] = function (p) {
    return p.scanString();
  };
  CharScanners[0x60] = function (p) {
    return p.scanTemplate();
  };

  CharScanners[0x21] = function (p) {
    if (p.next() !== 0x3D) {
      return T$Bang;
    }
    if (p.next() !== 0x3D) {
      return T$BangEq;
    }
    p.next();
    return T$BangEqEq;
  };

  CharScanners[0x3D] = function (p) {
    if (p.next() !== 0x3D) {
      return T$Eq;
    }
    if (p.next() !== 0x3D) {
      return T$EqEq;
    }
    p.next();
    return T$EqEqEq;
  };

  CharScanners[0x26] = function (p) {
    if (p.next() !== 0x26) {
      return T$Ampersand;
    }
    p.next();
    return T$AmpersandAmpersand;
  };

  CharScanners[0x7C] = function (p) {
    if (p.next() !== 0x7C) {
      return T$Bar;
    }
    p.next();
    return T$BarBar;
  };

  CharScanners[0x2E] = function (p) {
    if (p.next() <= 0x39 && p.ch >= 0x30) {
      return p.scanNumber(true);
    }
    return T$Period;
  };

  CharScanners[0x3C] = function (p) {
    if (p.next() !== 0x3D) {
      return T$Lt;
    }
    p.next();
    return T$LtEq;
  };

  CharScanners[0x3E] = function (p) {
    if (p.next() !== 0x3D) {
      return T$Gt;
    }
    p.next();
    return T$GtEq;
  };

  CharScanners[0x25] = returnToken(T$Percent);
  CharScanners[0x28] = returnToken(T$LParen);
  CharScanners[0x29] = returnToken(T$RParen);
  CharScanners[0x2A] = returnToken(T$Star);
  CharScanners[0x2B] = returnToken(T$Plus);
  CharScanners[0x2C] = returnToken(T$Comma);
  CharScanners[0x2D] = returnToken(T$Minus);
  CharScanners[0x2F] = returnToken(T$Slash);
  CharScanners[0x3A] = returnToken(T$Colon);
  CharScanners[0x3F] = returnToken(T$Question);
  CharScanners[0x5B] = returnToken(T$LBracket);
  CharScanners[0x5D] = returnToken(T$RBracket);
  CharScanners[0x5E] = returnToken(T$Caret);
  CharScanners[0x7B] = returnToken(T$LBrace);
  CharScanners[0x7D] = returnToken(T$RBrace);

  var mapProto = Map.prototype;

  function _getMapObserver(taskQueue, map) {
    return ModifyMapObserver.for(taskQueue, map);
  }

  exports.getMapObserver = _getMapObserver;

  var ModifyMapObserver = function (_ModifyCollectionObse2) {
    _inherits(ModifyMapObserver, _ModifyCollectionObse2);

    function ModifyMapObserver(taskQueue, map) {
      

      return _possibleConstructorReturn(this, _ModifyCollectionObse2.call(this, taskQueue, map));
    }

    ModifyMapObserver.for = function _for(taskQueue, map) {
      if (!('__map_observer__' in map)) {
        Reflect.defineProperty(map, '__map_observer__', {
          value: ModifyMapObserver.create(taskQueue, map),
          enumerable: false, configurable: false
        });
      }
      return map.__map_observer__;
    };

    ModifyMapObserver.create = function create(taskQueue, map) {
      var observer = new ModifyMapObserver(taskQueue, map);

      var proto = mapProto;
      if (proto.set !== map.set || proto.delete !== map.delete || proto.clear !== map.clear) {
        proto = {
          set: map.set,
          delete: map.delete,
          clear: map.clear
        };
      }

      map.set = function () {
        var hasValue = map.has(arguments[0]);
        var type = hasValue ? 'update' : 'add';
        var oldValue = map.get(arguments[0]);
        var methodCallResult = proto.set.apply(map, arguments);
        if (!hasValue || oldValue !== map.get(arguments[0])) {
          observer.addChangeRecord({
            type: type,
            object: map,
            key: arguments[0],
            oldValue: oldValue
          });
        }
        return methodCallResult;
      };

      map.delete = function () {
        var hasValue = map.has(arguments[0]);
        var oldValue = map.get(arguments[0]);
        var methodCallResult = proto.delete.apply(map, arguments);
        if (hasValue) {
          observer.addChangeRecord({
            type: 'delete',
            object: map,
            key: arguments[0],
            oldValue: oldValue
          });
        }
        return methodCallResult;
      };

      map.clear = function () {
        var methodCallResult = proto.clear.apply(map, arguments);
        observer.addChangeRecord({
          type: 'clear',
          object: map
        });
        return methodCallResult;
      };

      return observer;
    };

    return ModifyMapObserver;
  }(ModifyCollectionObserver);

  var emLogger = LogManager.getLogger('event-manager');

  function findOriginalEventTarget(event) {
    return event.composedPath && event.composedPath()[0] || event.deepPath && event.deepPath()[0] || event.path && event.path[0] || event.target;
  }

  function stopPropagation() {
    this.standardStopPropagation();
    this.propagationStopped = true;
  }

  function handleCapturedEvent(event) {
    event.propagationStopped = false;
    var target = findOriginalEventTarget(event);

    var orderedCallbacks = [];

    while (target) {
      if (target.capturedCallbacks) {
        var callback = target.capturedCallbacks[event.type];
        if (callback) {
          if (event.stopPropagation !== stopPropagation) {
            event.standardStopPropagation = event.stopPropagation;
            event.stopPropagation = stopPropagation;
          }
          orderedCallbacks.push(callback);
        }
      }
      target = target.parentNode;
    }
    for (var i = orderedCallbacks.length - 1; i >= 0 && !event.propagationStopped; i--) {
      var orderedCallback = orderedCallbacks[i];
      if ('handleEvent' in orderedCallback) {
        orderedCallback.handleEvent(event);
      } else {
        orderedCallback(event);
      }
    }
  }

  var CapturedHandlerEntry = function () {
    function CapturedHandlerEntry(eventName) {
      

      this.eventName = eventName;
      this.count = 0;
    }

    CapturedHandlerEntry.prototype.increment = function increment() {
      this.count++;

      if (this.count === 1) {
        _aureliaPal.DOM.addEventListener(this.eventName, handleCapturedEvent, true);
      }
    };

    CapturedHandlerEntry.prototype.decrement = function decrement() {
      if (this.count === 0) {
        emLogger.warn('The same EventListener was disposed multiple times.');
      } else if (--this.count === 0) {
        _aureliaPal.DOM.removeEventListener(this.eventName, handleCapturedEvent, true);
      }
    };

    return CapturedHandlerEntry;
  }();

  var DelegateHandlerEntry = function () {
    function DelegateHandlerEntry(eventName, eventManager) {
      

      this.eventName = eventName;
      this.count = 0;
      this.eventManager = eventManager;
    }

    DelegateHandlerEntry.prototype.handleEvent = function handleEvent(event) {
      event.propagationStopped = false;
      var target = findOriginalEventTarget(event);

      while (target && !event.propagationStopped) {
        if (target.delegatedCallbacks) {
          var callback = target.delegatedCallbacks[event.type];
          if (callback) {
            if (event.stopPropagation !== stopPropagation) {
              event.standardStopPropagation = event.stopPropagation;
              event.stopPropagation = stopPropagation;
            }
            if ('handleEvent' in callback) {
              callback.handleEvent(event);
            } else {
              callback(event);
            }
          }
        }

        var parent = target.parentNode;
        var shouldEscapeShadowRoot = this.eventManager.escapeShadowRoot && parent instanceof ShadowRoot;

        target = shouldEscapeShadowRoot ? parent.host : parent;
      }
    };

    DelegateHandlerEntry.prototype.increment = function increment() {
      this.count++;

      if (this.count === 1) {
        _aureliaPal.DOM.addEventListener(this.eventName, this, false);
      }
    };

    DelegateHandlerEntry.prototype.decrement = function decrement() {
      if (this.count === 0) {
        emLogger.warn('The same EventListener was disposed multiple times.');
      } else if (--this.count === 0) {
        _aureliaPal.DOM.removeEventListener(this.eventName, this, false);
      }
    };

    return DelegateHandlerEntry;
  }();

  var DelegationEntryHandler = function () {
    function DelegationEntryHandler(entry, lookup, targetEvent) {
      

      this.entry = entry;
      this.lookup = lookup;
      this.targetEvent = targetEvent;
    }

    DelegationEntryHandler.prototype.dispose = function dispose() {
      if (this.lookup[this.targetEvent]) {
        this.entry.decrement();
        this.lookup[this.targetEvent] = null;
      } else {
        emLogger.warn('Calling .dispose() on already disposed eventListener');
      }
    };

    return DelegationEntryHandler;
  }();

  var EventHandler = function () {
    function EventHandler(target, targetEvent, callback) {
      

      this.target = target;
      this.targetEvent = targetEvent;
      this.callback = callback;
    }

    EventHandler.prototype.dispose = function dispose() {
      this.target.removeEventListener(this.targetEvent, this.callback);
    };

    return EventHandler;
  }();

  var DefaultEventStrategy = function () {
    function DefaultEventStrategy(eventManager) {
      

      this.delegatedHandlers = {};
      this.capturedHandlers = {};

      this.eventManager = eventManager;
    }

    DefaultEventStrategy.prototype.subscribe = function subscribe(target, targetEvent, callback, strategy, disposable) {
      var delegatedHandlers = void 0;
      var capturedHandlers = void 0;
      var handlerEntry = void 0;

      if (strategy === delegationStrategy.bubbling) {
        delegatedHandlers = this.delegatedHandlers;
        handlerEntry = delegatedHandlers[targetEvent] || (delegatedHandlers[targetEvent] = new DelegateHandlerEntry(targetEvent, this.eventManager));
        var delegatedCallbacks = target.delegatedCallbacks || (target.delegatedCallbacks = {});
        if (!delegatedCallbacks[targetEvent]) {
          handlerEntry.increment();
        } else {
          emLogger.warn('Overriding previous callback for event listener', { event: targetEvent, callback: callback, previousCallback: delegatedCallbacks[targetEvent] });
        }
        delegatedCallbacks[targetEvent] = callback;

        if (disposable === true) {
          return new DelegationEntryHandler(handlerEntry, delegatedCallbacks, targetEvent);
        }

        return function () {
          handlerEntry.decrement();
          delegatedCallbacks[targetEvent] = null;
        };
      }
      if (strategy === delegationStrategy.capturing) {
        capturedHandlers = this.capturedHandlers;
        handlerEntry = capturedHandlers[targetEvent] || (capturedHandlers[targetEvent] = new CapturedHandlerEntry(targetEvent));
        var capturedCallbacks = target.capturedCallbacks || (target.capturedCallbacks = {});
        if (!capturedCallbacks[targetEvent]) {
          handlerEntry.increment();
        } else {
          emLogger.error('already have a callback for event', { event: targetEvent, callback: callback });
        }
        capturedCallbacks[targetEvent] = callback;

        if (disposable === true) {
          return new DelegationEntryHandler(handlerEntry, capturedCallbacks, targetEvent);
        }

        return function () {
          handlerEntry.decrement();
          capturedCallbacks[targetEvent] = null;
        };
      }

      target.addEventListener(targetEvent, callback);

      if (disposable === true) {
        return new EventHandler(target, targetEvent, callback);
      }

      return function () {
        target.removeEventListener(targetEvent, callback);
      };
    };

    return DefaultEventStrategy;
  }();

  var delegationStrategy = exports.delegationStrategy = {
    none: 0,
    capturing: 1,
    bubbling: 2
  };

  var EventManager = exports.EventManager = function () {
    function EventManager() {
      var escapeShadowRoot = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      

      this.elementHandlerLookup = {};
      this.eventStrategyLookup = {};
      this.escapeShadowRoot = escapeShadowRoot;

      this.registerElementConfig({
        tagName: 'input',
        properties: {
          value: ['change', 'input'],
          checked: ['change', 'input'],
          files: ['change', 'input']
        }
      });

      this.registerElementConfig({
        tagName: 'textarea',
        properties: {
          value: ['change', 'input']
        }
      });

      this.registerElementConfig({
        tagName: 'select',
        properties: {
          value: ['change']
        }
      });

      this.registerElementConfig({
        tagName: 'content editable',
        properties: {
          value: ['change', 'input', 'blur', 'keyup', 'paste']
        }
      });

      this.registerElementConfig({
        tagName: 'scrollable element',
        properties: {
          scrollTop: ['scroll'],
          scrollLeft: ['scroll']
        }
      });

      this.defaultEventStrategy = new DefaultEventStrategy(this);
    }

    EventManager.prototype.registerElementConfig = function registerElementConfig(config) {
      var tagName = config.tagName.toLowerCase();
      var properties = config.properties;
      var propertyName = void 0;

      var lookup = this.elementHandlerLookup[tagName] = {};

      for (propertyName in properties) {
        if (properties.hasOwnProperty(propertyName)) {
          lookup[propertyName] = properties[propertyName];
        }
      }
    };

    EventManager.prototype.registerEventStrategy = function registerEventStrategy(eventName, strategy) {
      this.eventStrategyLookup[eventName] = strategy;
    };

    EventManager.prototype.getElementHandler = function getElementHandler(target, propertyName) {
      var tagName = void 0;
      var lookup = this.elementHandlerLookup;

      if (target.tagName) {
        tagName = target.tagName.toLowerCase();

        if (lookup[tagName] && lookup[tagName][propertyName]) {
          return new EventSubscriber(lookup[tagName][propertyName]);
        }

        if (propertyName === 'textContent' || propertyName === 'innerHTML') {
          return new EventSubscriber(lookup['content editable'].value);
        }

        if (propertyName === 'scrollTop' || propertyName === 'scrollLeft') {
          return new EventSubscriber(lookup['scrollable element'][propertyName]);
        }
      }

      return null;
    };

    EventManager.prototype.addEventListener = function addEventListener(target, targetEvent, callbackOrListener, delegate, disposable) {
      return (this.eventStrategyLookup[targetEvent] || this.defaultEventStrategy).subscribe(target, targetEvent, callbackOrListener, delegate, disposable);
    };

    return EventManager;
  }();

  var EventSubscriber = exports.EventSubscriber = function () {
    function EventSubscriber(events) {
      

      this.events = events;
      this.element = null;
      this.handler = null;
    }

    EventSubscriber.prototype.subscribe = function subscribe(element, callbackOrListener) {
      this.element = element;
      this.handler = callbackOrListener;

      var events = this.events;
      for (var i = 0, ii = events.length; ii > i; ++i) {
        element.addEventListener(events[i], callbackOrListener);
      }
    };

    EventSubscriber.prototype.dispose = function dispose() {
      if (this.element === null) {
        return;
      }
      var element = this.element;
      var callbackOrListener = this.handler;
      var events = this.events;
      for (var i = 0, ii = events.length; ii > i; ++i) {
        element.removeEventListener(events[i], callbackOrListener);
      }
      this.element = this.handler = null;
    };

    return EventSubscriber;
  }();

  var DirtyChecker = exports.DirtyChecker = function () {
    function DirtyChecker() {
      

      this.tracked = [];
      this.checkDelay = 120;
    }

    DirtyChecker.prototype.addProperty = function addProperty(property) {
      var tracked = this.tracked;

      tracked.push(property);

      if (tracked.length === 1) {
        this.scheduleDirtyCheck();
      }
    };

    DirtyChecker.prototype.removeProperty = function removeProperty(property) {
      var tracked = this.tracked;
      tracked.splice(tracked.indexOf(property), 1);
    };

    DirtyChecker.prototype.scheduleDirtyCheck = function scheduleDirtyCheck() {
      var _this22 = this;

      setTimeout(function () {
        return _this22.check();
      }, this.checkDelay);
    };

    DirtyChecker.prototype.check = function check() {
      var tracked = this.tracked;
      var i = tracked.length;

      while (i--) {
        var current = tracked[i];

        if (current.isDirty()) {
          current.call();
        }
      }

      if (tracked.length) {
        this.scheduleDirtyCheck();
      }
    };

    return DirtyChecker;
  }();

  var DirtyCheckProperty = exports.DirtyCheckProperty = (_dec5 = subscriberCollection(), _dec5(_class5 = function () {
    function DirtyCheckProperty(dirtyChecker, obj, propertyName) {
      

      this.dirtyChecker = dirtyChecker;
      this.obj = obj;
      this.propertyName = propertyName;
    }

    DirtyCheckProperty.prototype.getValue = function getValue() {
      return this.obj[this.propertyName];
    };

    DirtyCheckProperty.prototype.setValue = function setValue(newValue) {
      this.obj[this.propertyName] = newValue;
    };

    DirtyCheckProperty.prototype.call = function call() {
      var oldValue = this.oldValue;
      var newValue = this.getValue();

      this.callSubscribers(newValue, oldValue);

      this.oldValue = newValue;
    };

    DirtyCheckProperty.prototype.isDirty = function isDirty() {
      return this.oldValue !== this.obj[this.propertyName];
    };

    DirtyCheckProperty.prototype.subscribe = function subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.oldValue = this.getValue();
        this.dirtyChecker.addProperty(this);
      }
      this.addSubscriber(context, callable);
    };

    DirtyCheckProperty.prototype.unsubscribe = function unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.dirtyChecker.removeProperty(this);
      }
    };

    return DirtyCheckProperty;
  }()) || _class5);


  var logger = LogManager.getLogger('property-observation');

  var propertyAccessor = exports.propertyAccessor = {
    getValue: function getValue(obj, propertyName) {
      return obj[propertyName];
    },
    setValue: function setValue(value, obj, propertyName) {
      obj[propertyName] = value;
    }
  };

  var PrimitiveObserver = exports.PrimitiveObserver = function () {
    function PrimitiveObserver(primitive, propertyName) {
      

      this.doNotCache = true;

      this.primitive = primitive;
      this.propertyName = propertyName;
    }

    PrimitiveObserver.prototype.getValue = function getValue() {
      return this.primitive[this.propertyName];
    };

    PrimitiveObserver.prototype.setValue = function setValue() {
      var type = _typeof(this.primitive);
      throw new Error('The ' + this.propertyName + ' property of a ' + type + ' (' + this.primitive + ') cannot be assigned.');
    };

    PrimitiveObserver.prototype.subscribe = function subscribe() {};

    PrimitiveObserver.prototype.unsubscribe = function unsubscribe() {};

    return PrimitiveObserver;
  }();

  var SetterObserver = exports.SetterObserver = (_dec6 = subscriberCollection(), _dec6(_class7 = function () {
    function SetterObserver(taskQueue, obj, propertyName) {
      

      this.taskQueue = taskQueue;
      this.obj = obj;
      this.propertyName = propertyName;
      this.queued = false;
      this.observing = false;
    }

    SetterObserver.prototype.getValue = function getValue() {
      return this.obj[this.propertyName];
    };

    SetterObserver.prototype.setValue = function setValue(newValue) {
      this.obj[this.propertyName] = newValue;
    };

    SetterObserver.prototype.getterValue = function getterValue() {
      return this.currentValue;
    };

    SetterObserver.prototype.setterValue = function setterValue(newValue) {
      var oldValue = this.currentValue;

      if (oldValue !== newValue) {
        if (!this.queued) {
          this.oldValue = oldValue;
          this.queued = true;
          this.taskQueue.queueMicroTask(this);
        }

        this.currentValue = newValue;
      }
    };

    SetterObserver.prototype.call = function call() {
      var oldValue = this.oldValue;
      var newValue = this.oldValue = this.currentValue;

      this.queued = false;

      this.callSubscribers(newValue, oldValue);
    };

    SetterObserver.prototype.subscribe = function subscribe(context, callable) {
      if (!this.observing) {
        this.convertProperty();
      }
      this.addSubscriber(context, callable);
    };

    SetterObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
      this.removeSubscriber(context, callable);
    };

    SetterObserver.prototype.convertProperty = function convertProperty() {
      this.observing = true;
      this.currentValue = this.obj[this.propertyName];
      this.setValue = this.setterValue;
      this.getValue = this.getterValue;

      if (!Reflect.defineProperty(this.obj, this.propertyName, {
        configurable: true,
        enumerable: this.propertyName in this.obj ? this.obj.propertyIsEnumerable(this.propertyName) : true,
        get: this.getValue.bind(this),
        set: this.setValue.bind(this)
      })) {
        logger.warn('Cannot observe property \'' + this.propertyName + '\' of object', this.obj);
      }
    };

    return SetterObserver;
  }()) || _class7);

  var XLinkAttributeObserver = exports.XLinkAttributeObserver = function () {
    function XLinkAttributeObserver(element, propertyName, attributeName) {
      

      this.element = element;
      this.propertyName = propertyName;
      this.attributeName = attributeName;
    }

    XLinkAttributeObserver.prototype.getValue = function getValue() {
      return this.element.getAttributeNS('http://www.w3.org/1999/xlink', this.attributeName);
    };

    XLinkAttributeObserver.prototype.setValue = function setValue(newValue) {
      return this.element.setAttributeNS('http://www.w3.org/1999/xlink', this.attributeName, newValue);
    };

    XLinkAttributeObserver.prototype.subscribe = function subscribe() {
      throw new Error('Observation of a "' + this.element.nodeName + '" element\'s "' + this.propertyName + '" property is not supported.');
    };

    return XLinkAttributeObserver;
  }();

  var dataAttributeAccessor = exports.dataAttributeAccessor = {
    getValue: function getValue(obj, propertyName) {
      return obj.getAttribute(propertyName);
    },
    setValue: function setValue(value, obj, propertyName) {
      if (value === null || value === undefined) {
        obj.removeAttribute(propertyName);
      } else {
        obj.setAttribute(propertyName, value);
      }
    }
  };

  var DataAttributeObserver = exports.DataAttributeObserver = function () {
    function DataAttributeObserver(element, propertyName) {
      

      this.element = element;
      this.propertyName = propertyName;
    }

    DataAttributeObserver.prototype.getValue = function getValue() {
      return this.element.getAttribute(this.propertyName);
    };

    DataAttributeObserver.prototype.setValue = function setValue(newValue) {
      if (newValue === null || newValue === undefined) {
        return this.element.removeAttribute(this.propertyName);
      }
      return this.element.setAttribute(this.propertyName, newValue);
    };

    DataAttributeObserver.prototype.subscribe = function subscribe() {
      throw new Error('Observation of a "' + this.element.nodeName + '" element\'s "' + this.propertyName + '" property is not supported.');
    };

    return DataAttributeObserver;
  }();

  var StyleObserver = exports.StyleObserver = function () {
    function StyleObserver(element, propertyName) {
      

      this.element = element;
      this.propertyName = propertyName;

      this.styles = null;
      this.version = 0;
    }

    StyleObserver.prototype.getValue = function getValue() {
      return this.element.style.cssText;
    };

    StyleObserver.prototype._setProperty = function _setProperty(style, value) {
      var priority = '';

      if (value !== null && value !== undefined && typeof value.indexOf === 'function' && value.indexOf('!important') !== -1) {
        priority = 'important';
        value = value.replace('!important', '');
      }
      this.element.style.setProperty(style, value, priority);
    };

    StyleObserver.prototype.setValue = function setValue(newValue) {
      var styles = this.styles || {};
      var style = void 0;
      var version = this.version;

      if (newValue !== null && newValue !== undefined) {
        if (newValue instanceof Object) {
          var value = void 0;
          for (style in newValue) {
            if (newValue.hasOwnProperty(style)) {
              value = newValue[style];
              style = style.replace(/([A-Z])/g, function (m) {
                return '-' + m.toLowerCase();
              });
              styles[style] = version;
              this._setProperty(style, value);
            }
          }
        } else if (newValue.length) {
          var rx = /\s*([\w\-]+)\s*:\s*((?:(?:[\w\-]+\(\s*(?:"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[\w\-]+\(\s*(?:^"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[^\)]*)\),?|[^\)]*)\),?|"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[^;]*),?\s*)+);?/g;
          var pair = void 0;
          while ((pair = rx.exec(newValue)) !== null) {
            style = pair[1];
            if (!style) {
              continue;
            }

            styles[style] = version;
            this._setProperty(style, pair[2]);
          }
        }
      }

      this.styles = styles;
      this.version += 1;

      if (version === 0) {
        return;
      }

      version -= 1;
      for (style in styles) {
        if (!styles.hasOwnProperty(style) || styles[style] !== version) {
          continue;
        }

        this.element.style.removeProperty(style);
      }
    };

    StyleObserver.prototype.subscribe = function subscribe() {
      throw new Error('Observation of a "' + this.element.nodeName + '" element\'s "' + this.propertyName + '" property is not supported.');
    };

    return StyleObserver;
  }();

  var ValueAttributeObserver = exports.ValueAttributeObserver = (_dec7 = subscriberCollection(), _dec7(_class8 = function () {
    function ValueAttributeObserver(element, propertyName, handler) {
      

      this.element = element;
      this.propertyName = propertyName;
      this.handler = handler;
      if (propertyName === 'files') {
        this.setValue = function () {};
      }
    }

    ValueAttributeObserver.prototype.getValue = function getValue() {
      return this.element[this.propertyName];
    };

    ValueAttributeObserver.prototype.setValue = function setValue(newValue) {
      newValue = newValue === undefined || newValue === null ? '' : newValue;
      if (this.element[this.propertyName] !== newValue) {
        this.element[this.propertyName] = newValue;
        this.notify();
      }
    };

    ValueAttributeObserver.prototype.notify = function notify() {
      var oldValue = this.oldValue;
      var newValue = this.getValue();

      this.callSubscribers(newValue, oldValue);

      this.oldValue = newValue;
    };

    ValueAttributeObserver.prototype.handleEvent = function handleEvent() {
      this.notify();
    };

    ValueAttributeObserver.prototype.subscribe = function subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.oldValue = this.getValue();
        this.handler.subscribe(this.element, this);
      }

      this.addSubscriber(context, callable);
    };

    ValueAttributeObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.handler.dispose();
      }
    };

    return ValueAttributeObserver;
  }()) || _class8);


  var checkedArrayContext = 'CheckedObserver:array';
  var checkedValueContext = 'CheckedObserver:value';

  var CheckedObserver = exports.CheckedObserver = (_dec8 = subscriberCollection(), _dec8(_class9 = function () {
    function CheckedObserver(element, handler, observerLocator) {
      

      this.element = element;
      this.handler = handler;
      this.observerLocator = observerLocator;
    }

    CheckedObserver.prototype.getValue = function getValue() {
      return this.value;
    };

    CheckedObserver.prototype.setValue = function setValue(newValue) {
      if (this.initialSync && this.value === newValue) {
        return;
      }

      if (this.arrayObserver) {
        this.arrayObserver.unsubscribe(checkedArrayContext, this);
        this.arrayObserver = null;
      }

      if (this.element.type === 'checkbox' && Array.isArray(newValue)) {
        this.arrayObserver = this.observerLocator.getArrayObserver(newValue);
        this.arrayObserver.subscribe(checkedArrayContext, this);
      }

      this.oldValue = this.value;
      this.value = newValue;
      this.synchronizeElement();
      this.notify();

      if (!this.initialSync) {
        this.initialSync = true;
        this.observerLocator.taskQueue.queueMicroTask(this);
      }
    };

    CheckedObserver.prototype.call = function call(context, splices) {
      this.synchronizeElement();

      if (!this.valueObserver) {
        this.valueObserver = this.element.__observers__.model || this.element.__observers__.value;
        if (this.valueObserver) {
          this.valueObserver.subscribe(checkedValueContext, this);
        }
      }
    };

    CheckedObserver.prototype.synchronizeElement = function synchronizeElement() {
      var value = this.value;
      var element = this.element;
      var elementValue = element.hasOwnProperty('model') ? element.model : element.value;
      var isRadio = element.type === 'radio';
      var matcher = element.matcher || function (a, b) {
        return a === b;
      };

      element.checked = isRadio && !!matcher(value, elementValue) || !isRadio && value === true || !isRadio && Array.isArray(value) && value.findIndex(function (item) {
        return !!matcher(item, elementValue);
      }) !== -1;
    };

    CheckedObserver.prototype.synchronizeValue = function synchronizeValue() {
      var value = this.value;
      var element = this.element;
      var elementValue = element.hasOwnProperty('model') ? element.model : element.value;
      var index = void 0;
      var matcher = element.matcher || function (a, b) {
        return a === b;
      };

      if (element.type === 'checkbox') {
        if (Array.isArray(value)) {
          index = value.findIndex(function (item) {
            return !!matcher(item, elementValue);
          });
          if (element.checked && index === -1) {
            value.push(elementValue);
          } else if (!element.checked && index !== -1) {
            value.splice(index, 1);
          }

          return;
        }

        value = element.checked;
      } else if (element.checked) {
        value = elementValue;
      } else {
        return;
      }

      this.oldValue = this.value;
      this.value = value;
      this.notify();
    };

    CheckedObserver.prototype.notify = function notify() {
      var oldValue = this.oldValue;
      var newValue = this.value;

      if (newValue === oldValue) {
        return;
      }

      this.callSubscribers(newValue, oldValue);
    };

    CheckedObserver.prototype.handleEvent = function handleEvent() {
      this.synchronizeValue();
    };

    CheckedObserver.prototype.subscribe = function subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.handler.subscribe(this.element, this);
      }
      this.addSubscriber(context, callable);
    };

    CheckedObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.handler.dispose();
      }
    };

    CheckedObserver.prototype.unbind = function unbind() {
      if (this.arrayObserver) {
        this.arrayObserver.unsubscribe(checkedArrayContext, this);
        this.arrayObserver = null;
      }
      if (this.valueObserver) {
        this.valueObserver.unsubscribe(checkedValueContext, this);
      }
    };

    return CheckedObserver;
  }()) || _class9);


  var selectArrayContext = 'SelectValueObserver:array';

  var SelectValueObserver = exports.SelectValueObserver = (_dec9 = subscriberCollection(), _dec9(_class10 = function () {
    function SelectValueObserver(element, handler, observerLocator) {
      

      this.element = element;
      this.handler = handler;
      this.observerLocator = observerLocator;
    }

    SelectValueObserver.prototype.getValue = function getValue() {
      return this.value;
    };

    SelectValueObserver.prototype.setValue = function setValue(newValue) {
      if (newValue !== null && newValue !== undefined && this.element.multiple && !Array.isArray(newValue)) {
        throw new Error('Only null or Array instances can be bound to a multi-select.');
      }
      if (this.value === newValue) {
        return;
      }

      if (this.arrayObserver) {
        this.arrayObserver.unsubscribe(selectArrayContext, this);
        this.arrayObserver = null;
      }

      if (Array.isArray(newValue)) {
        this.arrayObserver = this.observerLocator.getArrayObserver(newValue);
        this.arrayObserver.subscribe(selectArrayContext, this);
      }

      this.oldValue = this.value;
      this.value = newValue;
      this.synchronizeOptions();
      this.notify();

      if (!this.initialSync) {
        this.initialSync = true;
        this.observerLocator.taskQueue.queueMicroTask(this);
      }
    };

    SelectValueObserver.prototype.call = function call(context, splices) {
      this.synchronizeOptions();
    };

    SelectValueObserver.prototype.synchronizeOptions = function synchronizeOptions() {
      var value = this.value;
      var isArray = void 0;

      if (Array.isArray(value)) {
        isArray = true;
      }

      var options = this.element.options;
      var i = options.length;
      var matcher = this.element.matcher || function (a, b) {
        return a === b;
      };

      var _loop = function _loop() {
        var option = options.item(i);
        var optionValue = option.hasOwnProperty('model') ? option.model : option.value;
        if (isArray) {
          option.selected = value.findIndex(function (item) {
            return !!matcher(optionValue, item);
          }) !== -1;
          return 'continue';
        }
        option.selected = !!matcher(optionValue, value);
      };

      while (i--) {
        var _ret = _loop();

        if (_ret === 'continue') continue;
      }
    };

    SelectValueObserver.prototype.synchronizeValue = function synchronizeValue() {
      var _this23 = this;

      var options = this.element.options;
      var count = 0;
      var value = [];

      for (var i = 0, ii = options.length; i < ii; i++) {
        var _option = options.item(i);
        if (!_option.selected) {
          continue;
        }
        value.push(_option.hasOwnProperty('model') ? _option.model : _option.value);
        count++;
      }

      if (this.element.multiple) {
        if (Array.isArray(this.value)) {
          var _ret2 = function () {
            var matcher = _this23.element.matcher || function (a, b) {
              return a === b;
            };

            var i = 0;

            var _loop2 = function _loop2() {
              var a = _this23.value[i];
              if (value.findIndex(function (b) {
                return matcher(a, b);
              }) === -1) {
                _this23.value.splice(i, 1);
              } else {
                i++;
              }
            };

            while (i < _this23.value.length) {
              _loop2();
            }

            i = 0;

            var _loop3 = function _loop3() {
              var a = value[i];
              if (_this23.value.findIndex(function (b) {
                return matcher(a, b);
              }) === -1) {
                _this23.value.push(a);
              }
              i++;
            };

            while (i < value.length) {
              _loop3();
            }
            return {
              v: void 0
            };
          }();

          if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
        }
      } else {
        if (count === 0) {
          value = null;
        } else {
          value = value[0];
        }
      }

      if (value !== this.value) {
        this.oldValue = this.value;
        this.value = value;
        this.notify();
      }
    };

    SelectValueObserver.prototype.notify = function notify() {
      var oldValue = this.oldValue;
      var newValue = this.value;

      this.callSubscribers(newValue, oldValue);
    };

    SelectValueObserver.prototype.handleEvent = function handleEvent() {
      this.synchronizeValue();
    };

    SelectValueObserver.prototype.subscribe = function subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.handler.subscribe(this.element, this);
      }
      this.addSubscriber(context, callable);
    };

    SelectValueObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.handler.dispose();
      }
    };

    SelectValueObserver.prototype.bind = function bind() {
      var _this24 = this;

      this.domObserver = _aureliaPal.DOM.createMutationObserver(function () {
        _this24.synchronizeOptions();
        _this24.synchronizeValue();
      });
      this.domObserver.observe(this.element, { childList: true, subtree: true, characterData: true });
    };

    SelectValueObserver.prototype.unbind = function unbind() {
      this.domObserver.disconnect();
      this.domObserver = null;

      if (this.arrayObserver) {
        this.arrayObserver.unsubscribe(selectArrayContext, this);
        this.arrayObserver = null;
      }
    };

    return SelectValueObserver;
  }()) || _class10);

  var ClassObserver = exports.ClassObserver = function () {
    function ClassObserver(element) {
      

      this.element = element;
      this.doNotCache = true;
      this.value = '';
      this.version = 0;
    }

    ClassObserver.prototype.getValue = function getValue() {
      return this.value;
    };

    ClassObserver.prototype.setValue = function setValue(newValue) {
      var nameIndex = this.nameIndex || {};
      var version = this.version;
      var names = void 0;
      var name = void 0;

      if (newValue !== null && newValue !== undefined && newValue.length) {
        names = newValue.split(/\s+/);
        for (var i = 0, length = names.length; i < length; i++) {
          name = names[i];
          if (name === '') {
            continue;
          }
          nameIndex[name] = version;
          this.element.classList.add(name);
        }
      }

      this.value = newValue;
      this.nameIndex = nameIndex;
      this.version += 1;

      if (version === 0) {
        return;
      }

      version -= 1;
      for (name in nameIndex) {
        if (!nameIndex.hasOwnProperty(name) || nameIndex[name] !== version) {
          continue;
        }
        this.element.classList.remove(name);
      }
    };

    ClassObserver.prototype.subscribe = function subscribe() {
      throw new Error('Observation of a "' + this.element.nodeName + '" element\'s "class" property is not supported.');
    };

    return ClassObserver;
  }();

  function hasDeclaredDependencies(descriptor) {
    return !!(descriptor && descriptor.get && descriptor.get.dependencies);
  }

  function declarePropertyDependencies(ctor, propertyName, dependencies) {
    var descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, propertyName);
    descriptor.get.dependencies = dependencies;
  }

  function computedFrom() {
    for (var _len = arguments.length, rest = Array(_len), _key = 0; _key < _len; _key++) {
      rest[_key] = arguments[_key];
    }

    return function (target, key, descriptor) {
      descriptor.get.dependencies = rest;
      return descriptor;
    };
  }

  var ComputedExpression = exports.ComputedExpression = function (_Expression19) {
    _inherits(ComputedExpression, _Expression19);

    function ComputedExpression(name, dependencies) {
      

      var _this25 = _possibleConstructorReturn(this, _Expression19.call(this));

      _this25.name = name;
      _this25.dependencies = dependencies;
      _this25.isAssignable = true;
      return _this25;
    }

    ComputedExpression.prototype.evaluate = function evaluate(scope, lookupFunctions) {
      return scope.bindingContext[this.name];
    };

    ComputedExpression.prototype.assign = function assign(scope, value) {
      scope.bindingContext[this.name] = value;
    };

    ComputedExpression.prototype.accept = function accept(visitor) {
      throw new Error('not implemented');
    };

    ComputedExpression.prototype.connect = function connect(binding, scope) {
      var dependencies = this.dependencies;
      var i = dependencies.length;
      while (i--) {
        dependencies[i].connect(binding, scope);
      }
    };

    return ComputedExpression;
  }(Expression);

  function createComputedObserver(obj, propertyName, descriptor, observerLocator) {
    var dependencies = descriptor.get.dependencies;
    if (!(dependencies instanceof ComputedExpression)) {
      var i = dependencies.length;
      while (i--) {
        dependencies[i] = observerLocator.parser.parse(dependencies[i]);
      }
      dependencies = descriptor.get.dependencies = new ComputedExpression(propertyName, dependencies);
    }

    var scope = { bindingContext: obj, overrideContext: createOverrideContext(obj) };
    return new ExpressionObserver(scope, dependencies, observerLocator);
  }

  var svgElements = void 0;
  var svgPresentationElements = void 0;
  var svgPresentationAttributes = void 0;
  var svgAnalyzer = void 0;

  if (typeof FEATURE_NO_SVG === 'undefined') {
    svgElements = {
      a: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'target', 'transform', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      altGlyph: ['class', 'dx', 'dy', 'externalResourcesRequired', 'format', 'glyphRef', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rotate', 'style', 'systemLanguage', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      altGlyphDef: ['id', 'xml:base', 'xml:lang', 'xml:space'],
      altGlyphItem: ['id', 'xml:base', 'xml:lang', 'xml:space'],
      animate: ['accumulate', 'additive', 'attributeName', 'attributeType', 'begin', 'by', 'calcMode', 'dur', 'end', 'externalResourcesRequired', 'fill', 'from', 'id', 'keySplines', 'keyTimes', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'systemLanguage', 'to', 'values', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      animateColor: ['accumulate', 'additive', 'attributeName', 'attributeType', 'begin', 'by', 'calcMode', 'dur', 'end', 'externalResourcesRequired', 'fill', 'from', 'id', 'keySplines', 'keyTimes', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'systemLanguage', 'to', 'values', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      animateMotion: ['accumulate', 'additive', 'begin', 'by', 'calcMode', 'dur', 'end', 'externalResourcesRequired', 'fill', 'from', 'id', 'keyPoints', 'keySplines', 'keyTimes', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'origin', 'path', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'rotate', 'systemLanguage', 'to', 'values', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      animateTransform: ['accumulate', 'additive', 'attributeName', 'attributeType', 'begin', 'by', 'calcMode', 'dur', 'end', 'externalResourcesRequired', 'fill', 'from', 'id', 'keySplines', 'keyTimes', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'systemLanguage', 'to', 'type', 'values', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      circle: ['class', 'cx', 'cy', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'r', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      clipPath: ['class', 'clipPathUnits', 'externalResourcesRequired', 'id', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      'color-profile': ['id', 'local', 'name', 'rendering-intent', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      cursor: ['externalResourcesRequired', 'id', 'requiredExtensions', 'requiredFeatures', 'systemLanguage', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      defs: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      desc: ['class', 'id', 'style', 'xml:base', 'xml:lang', 'xml:space'],
      ellipse: ['class', 'cx', 'cy', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rx', 'ry', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      feBlend: ['class', 'height', 'id', 'in', 'in2', 'mode', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feColorMatrix: ['class', 'height', 'id', 'in', 'result', 'style', 'type', 'values', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feComponentTransfer: ['class', 'height', 'id', 'in', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feComposite: ['class', 'height', 'id', 'in', 'in2', 'k1', 'k2', 'k3', 'k4', 'operator', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feConvolveMatrix: ['bias', 'class', 'divisor', 'edgeMode', 'height', 'id', 'in', 'kernelMatrix', 'kernelUnitLength', 'order', 'preserveAlpha', 'result', 'style', 'targetX', 'targetY', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feDiffuseLighting: ['class', 'diffuseConstant', 'height', 'id', 'in', 'kernelUnitLength', 'result', 'style', 'surfaceScale', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feDisplacementMap: ['class', 'height', 'id', 'in', 'in2', 'result', 'scale', 'style', 'width', 'x', 'xChannelSelector', 'xml:base', 'xml:lang', 'xml:space', 'y', 'yChannelSelector'],
      feDistantLight: ['azimuth', 'elevation', 'id', 'xml:base', 'xml:lang', 'xml:space'],
      feFlood: ['class', 'height', 'id', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feFuncA: ['amplitude', 'exponent', 'id', 'intercept', 'offset', 'slope', 'tableValues', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      feFuncB: ['amplitude', 'exponent', 'id', 'intercept', 'offset', 'slope', 'tableValues', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      feFuncG: ['amplitude', 'exponent', 'id', 'intercept', 'offset', 'slope', 'tableValues', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      feFuncR: ['amplitude', 'exponent', 'id', 'intercept', 'offset', 'slope', 'tableValues', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      feGaussianBlur: ['class', 'height', 'id', 'in', 'result', 'stdDeviation', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feImage: ['class', 'externalResourcesRequired', 'height', 'id', 'preserveAspectRatio', 'result', 'style', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feMerge: ['class', 'height', 'id', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feMergeNode: ['id', 'xml:base', 'xml:lang', 'xml:space'],
      feMorphology: ['class', 'height', 'id', 'in', 'operator', 'radius', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feOffset: ['class', 'dx', 'dy', 'height', 'id', 'in', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      fePointLight: ['id', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y', 'z'],
      feSpecularLighting: ['class', 'height', 'id', 'in', 'kernelUnitLength', 'result', 'specularConstant', 'specularExponent', 'style', 'surfaceScale', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feSpotLight: ['id', 'limitingConeAngle', 'pointsAtX', 'pointsAtY', 'pointsAtZ', 'specularExponent', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y', 'z'],
      feTile: ['class', 'height', 'id', 'in', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feTurbulence: ['baseFrequency', 'class', 'height', 'id', 'numOctaves', 'result', 'seed', 'stitchTiles', 'style', 'type', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      filter: ['class', 'externalResourcesRequired', 'filterRes', 'filterUnits', 'height', 'id', 'primitiveUnits', 'style', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      font: ['class', 'externalResourcesRequired', 'horiz-adv-x', 'horiz-origin-x', 'horiz-origin-y', 'id', 'style', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face': ['accent-height', 'alphabetic', 'ascent', 'bbox', 'cap-height', 'descent', 'font-family', 'font-size', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'hanging', 'id', 'ideographic', 'mathematical', 'overline-position', 'overline-thickness', 'panose-1', 'slope', 'stemh', 'stemv', 'strikethrough-position', 'strikethrough-thickness', 'underline-position', 'underline-thickness', 'unicode-range', 'units-per-em', 'v-alphabetic', 'v-hanging', 'v-ideographic', 'v-mathematical', 'widths', 'x-height', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face-format': ['id', 'string', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face-name': ['id', 'name', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face-src': ['id', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face-uri': ['id', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      foreignObject: ['class', 'externalResourcesRequired', 'height', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      g: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      glyph: ['arabic-form', 'class', 'd', 'glyph-name', 'horiz-adv-x', 'id', 'lang', 'orientation', 'style', 'unicode', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'xml:base', 'xml:lang', 'xml:space'],
      glyphRef: ['class', 'dx', 'dy', 'format', 'glyphRef', 'id', 'style', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      hkern: ['g1', 'g2', 'id', 'k', 'u1', 'u2', 'xml:base', 'xml:lang', 'xml:space'],
      image: ['class', 'externalResourcesRequired', 'height', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'preserveAspectRatio', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      line: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'x1', 'x2', 'xml:base', 'xml:lang', 'xml:space', 'y1', 'y2'],
      linearGradient: ['class', 'externalResourcesRequired', 'gradientTransform', 'gradientUnits', 'id', 'spreadMethod', 'style', 'x1', 'x2', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y1', 'y2'],
      marker: ['class', 'externalResourcesRequired', 'id', 'markerHeight', 'markerUnits', 'markerWidth', 'orient', 'preserveAspectRatio', 'refX', 'refY', 'style', 'viewBox', 'xml:base', 'xml:lang', 'xml:space'],
      mask: ['class', 'externalResourcesRequired', 'height', 'id', 'maskContentUnits', 'maskUnits', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      metadata: ['id', 'xml:base', 'xml:lang', 'xml:space'],
      'missing-glyph': ['class', 'd', 'horiz-adv-x', 'id', 'style', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'xml:base', 'xml:lang', 'xml:space'],
      mpath: ['externalResourcesRequired', 'id', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      path: ['class', 'd', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'pathLength', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      pattern: ['class', 'externalResourcesRequired', 'height', 'id', 'patternContentUnits', 'patternTransform', 'patternUnits', 'preserveAspectRatio', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'viewBox', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      polygon: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'points', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      polyline: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'points', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      radialGradient: ['class', 'cx', 'cy', 'externalResourcesRequired', 'fx', 'fy', 'gradientTransform', 'gradientUnits', 'id', 'r', 'spreadMethod', 'style', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      rect: ['class', 'externalResourcesRequired', 'height', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rx', 'ry', 'style', 'systemLanguage', 'transform', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      script: ['externalResourcesRequired', 'id', 'type', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      set: ['attributeName', 'attributeType', 'begin', 'dur', 'end', 'externalResourcesRequired', 'fill', 'id', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'systemLanguage', 'to', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      stop: ['class', 'id', 'offset', 'style', 'xml:base', 'xml:lang', 'xml:space'],
      style: ['id', 'media', 'title', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      svg: ['baseProfile', 'class', 'contentScriptType', 'contentStyleType', 'externalResourcesRequired', 'height', 'id', 'onabort', 'onactivate', 'onclick', 'onerror', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onresize', 'onscroll', 'onunload', 'onzoom', 'preserveAspectRatio', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'version', 'viewBox', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y', 'zoomAndPan'],
      switch: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      symbol: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'preserveAspectRatio', 'style', 'viewBox', 'xml:base', 'xml:lang', 'xml:space'],
      text: ['class', 'dx', 'dy', 'externalResourcesRequired', 'id', 'lengthAdjust', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rotate', 'style', 'systemLanguage', 'textLength', 'transform', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      textPath: ['class', 'externalResourcesRequired', 'id', 'lengthAdjust', 'method', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'spacing', 'startOffset', 'style', 'systemLanguage', 'textLength', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      title: ['class', 'id', 'style', 'xml:base', 'xml:lang', 'xml:space'],
      tref: ['class', 'dx', 'dy', 'externalResourcesRequired', 'id', 'lengthAdjust', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rotate', 'style', 'systemLanguage', 'textLength', 'x', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      tspan: ['class', 'dx', 'dy', 'externalResourcesRequired', 'id', 'lengthAdjust', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rotate', 'style', 'systemLanguage', 'textLength', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      use: ['class', 'externalResourcesRequired', 'height', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      view: ['externalResourcesRequired', 'id', 'preserveAspectRatio', 'viewBox', 'viewTarget', 'xml:base', 'xml:lang', 'xml:space', 'zoomAndPan'],
      vkern: ['g1', 'g2', 'id', 'k', 'u1', 'u2', 'xml:base', 'xml:lang', 'xml:space']
    };


    svgPresentationElements = {
      'a': true,
      'altGlyph': true,
      'animate': true,
      'animateColor': true,
      'circle': true,
      'clipPath': true,
      'defs': true,
      'ellipse': true,
      'feBlend': true,
      'feColorMatrix': true,
      'feComponentTransfer': true,
      'feComposite': true,
      'feConvolveMatrix': true,
      'feDiffuseLighting': true,
      'feDisplacementMap': true,
      'feFlood': true,
      'feGaussianBlur': true,
      'feImage': true,
      'feMerge': true,
      'feMorphology': true,
      'feOffset': true,
      'feSpecularLighting': true,
      'feTile': true,
      'feTurbulence': true,
      'filter': true,
      'font': true,
      'foreignObject': true,
      'g': true,
      'glyph': true,
      'glyphRef': true,
      'image': true,
      'line': true,
      'linearGradient': true,
      'marker': true,
      'mask': true,
      'missing-glyph': true,
      'path': true,
      'pattern': true,
      'polygon': true,
      'polyline': true,
      'radialGradient': true,
      'rect': true,
      'stop': true,
      'svg': true,
      'switch': true,
      'symbol': true,
      'text': true,
      'textPath': true,
      'tref': true,
      'tspan': true,
      'use': true
    };

    svgPresentationAttributes = {
      'alignment-baseline': true,
      'baseline-shift': true,
      'clip-path': true,
      'clip-rule': true,
      'clip': true,
      'color-interpolation-filters': true,
      'color-interpolation': true,
      'color-profile': true,
      'color-rendering': true,
      'color': true,
      'cursor': true,
      'direction': true,
      'display': true,
      'dominant-baseline': true,
      'enable-background': true,
      'fill-opacity': true,
      'fill-rule': true,
      'fill': true,
      'filter': true,
      'flood-color': true,
      'flood-opacity': true,
      'font-family': true,
      'font-size-adjust': true,
      'font-size': true,
      'font-stretch': true,
      'font-style': true,
      'font-variant': true,
      'font-weight': true,
      'glyph-orientation-horizontal': true,
      'glyph-orientation-vertical': true,
      'image-rendering': true,
      'kerning': true,
      'letter-spacing': true,
      'lighting-color': true,
      'marker-end': true,
      'marker-mid': true,
      'marker-start': true,
      'mask': true,
      'opacity': true,
      'overflow': true,
      'pointer-events': true,
      'shape-rendering': true,
      'stop-color': true,
      'stop-opacity': true,
      'stroke-dasharray': true,
      'stroke-dashoffset': true,
      'stroke-linecap': true,
      'stroke-linejoin': true,
      'stroke-miterlimit': true,
      'stroke-opacity': true,
      'stroke-width': true,
      'stroke': true,
      'text-anchor': true,
      'text-decoration': true,
      'text-rendering': true,
      'unicode-bidi': true,
      'visibility': true,
      'word-spacing': true,
      'writing-mode': true
    };

    var createElement = function createElement(html) {
      var div = _aureliaPal.DOM.createElement('div');
      div.innerHTML = html;
      return div.firstChild;
    };

    svgAnalyzer = function () {
      function SVGAnalyzer() {
        

        if (createElement('<svg><altGlyph /></svg>').firstElementChild.nodeName === 'altglyph' && elements.altGlyph) {
          elements.altglyph = elements.altGlyph;
          delete elements.altGlyph;
          elements.altglyphdef = elements.altGlyphDef;
          delete elements.altGlyphDef;
          elements.altglyphitem = elements.altGlyphItem;
          delete elements.altGlyphItem;
          elements.glyphref = elements.glyphRef;
          delete elements.glyphRef;
        }
      }

      SVGAnalyzer.prototype.isStandardSvgAttribute = function isStandardSvgAttribute(nodeName, attributeName) {
        return presentationElements[nodeName] && presentationAttributes[attributeName] || elements[nodeName] && elements[nodeName].indexOf(attributeName) !== -1;
      };

      return SVGAnalyzer;
    }();
  }

  var elements = exports.elements = svgElements;
  var presentationElements = exports.presentationElements = svgPresentationElements;
  var presentationAttributes = exports.presentationAttributes = svgPresentationAttributes;
  var SVGAnalyzer = exports.SVGAnalyzer = svgAnalyzer || function () {
    function _class11() {
      
    }

    _class11.prototype.isStandardSvgAttribute = function isStandardSvgAttribute() {
      return false;
    };

    return _class11;
  }();

  var ObserverLocator = exports.ObserverLocator = (_temp = _class12 = function () {
    function ObserverLocator(taskQueue, eventManager, dirtyChecker, svgAnalyzer, parser) {
      

      this.taskQueue = taskQueue;
      this.eventManager = eventManager;
      this.dirtyChecker = dirtyChecker;
      this.svgAnalyzer = svgAnalyzer;
      this.parser = parser;

      this.adapters = [];
      this.logger = LogManager.getLogger('observer-locator');
    }

    ObserverLocator.prototype.getObserver = function getObserver(obj, propertyName) {
      var observersLookup = obj.__observers__;
      var observer = void 0;

      if (observersLookup && propertyName in observersLookup) {
        return observersLookup[propertyName];
      }

      observer = this.createPropertyObserver(obj, propertyName);

      if (!observer.doNotCache) {
        if (observersLookup === undefined) {
          observersLookup = this.getOrCreateObserversLookup(obj);
        }

        observersLookup[propertyName] = observer;
      }

      return observer;
    };

    ObserverLocator.prototype.getOrCreateObserversLookup = function getOrCreateObserversLookup(obj) {
      return obj.__observers__ || this.createObserversLookup(obj);
    };

    ObserverLocator.prototype.createObserversLookup = function createObserversLookup(obj) {
      var value = {};

      if (!Reflect.defineProperty(obj, '__observers__', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: value
      })) {
        this.logger.warn('Cannot add observers to object', obj);
      }

      return value;
    };

    ObserverLocator.prototype.addAdapter = function addAdapter(adapter) {
      this.adapters.push(adapter);
    };

    ObserverLocator.prototype.getAdapterObserver = function getAdapterObserver(obj, propertyName, descriptor) {
      for (var i = 0, ii = this.adapters.length; i < ii; i++) {
        var adapter = this.adapters[i];
        var observer = adapter.getObserver(obj, propertyName, descriptor);
        if (observer) {
          return observer;
        }
      }
      return null;
    };

    ObserverLocator.prototype.createPropertyObserver = function createPropertyObserver(obj, propertyName) {
      var descriptor = void 0;
      var handler = void 0;
      var xlinkResult = void 0;

      if (!(obj instanceof Object)) {
        return new PrimitiveObserver(obj, propertyName);
      }

      if (obj instanceof _aureliaPal.DOM.Element) {
        if (propertyName === 'class') {
          return new ClassObserver(obj);
        }
        if (propertyName === 'style' || propertyName === 'css') {
          return new StyleObserver(obj, propertyName);
        }
        handler = this.eventManager.getElementHandler(obj, propertyName);
        if (propertyName === 'value' && obj.tagName.toLowerCase() === 'select') {
          return new SelectValueObserver(obj, handler, this);
        }
        if (propertyName === 'checked' && obj.tagName.toLowerCase() === 'input') {
          return new CheckedObserver(obj, handler, this);
        }
        if (handler) {
          return new ValueAttributeObserver(obj, propertyName, handler);
        }
        xlinkResult = /^xlink:(.+)$/.exec(propertyName);
        if (xlinkResult) {
          return new XLinkAttributeObserver(obj, propertyName, xlinkResult[1]);
        }
        if (propertyName === 'role' && (obj instanceof _aureliaPal.DOM.Element || obj instanceof _aureliaPal.DOM.SVGElement) || /^\w+:|^data-|^aria-/.test(propertyName) || obj instanceof _aureliaPal.DOM.SVGElement && this.svgAnalyzer.isStandardSvgAttribute(obj.nodeName, propertyName)) {
          return new DataAttributeObserver(obj, propertyName);
        }
      }

      descriptor = Object.getPropertyDescriptor(obj, propertyName);

      if (hasDeclaredDependencies(descriptor)) {
        return createComputedObserver(obj, propertyName, descriptor, this);
      }

      if (descriptor) {
        var existingGetterOrSetter = descriptor.get || descriptor.set;
        if (existingGetterOrSetter) {
          if (existingGetterOrSetter.getObserver) {
            return existingGetterOrSetter.getObserver(obj);
          }

          var adapterObserver = this.getAdapterObserver(obj, propertyName, descriptor);
          if (adapterObserver) {
            return adapterObserver;
          }
          return new DirtyCheckProperty(this.dirtyChecker, obj, propertyName);
        }
      }

      if (obj instanceof Array) {
        if (propertyName === 'length') {
          return this.getArrayObserver(obj).getLengthObserver();
        }

        return new DirtyCheckProperty(this.dirtyChecker, obj, propertyName);
      } else if (obj instanceof Map) {
        if (propertyName === 'size') {
          return this.getMapObserver(obj).getLengthObserver();
        }

        return new DirtyCheckProperty(this.dirtyChecker, obj, propertyName);
      } else if (obj instanceof Set) {
        if (propertyName === 'size') {
          return this.getSetObserver(obj).getLengthObserver();
        }

        return new DirtyCheckProperty(this.dirtyChecker, obj, propertyName);
      }

      return new SetterObserver(this.taskQueue, obj, propertyName);
    };

    ObserverLocator.prototype.getAccessor = function getAccessor(obj, propertyName) {
      if (obj instanceof _aureliaPal.DOM.Element) {
        if (propertyName === 'class' || propertyName === 'style' || propertyName === 'css' || propertyName === 'value' && (obj.tagName.toLowerCase() === 'input' || obj.tagName.toLowerCase() === 'select') || propertyName === 'checked' && obj.tagName.toLowerCase() === 'input' || propertyName === 'model' && obj.tagName.toLowerCase() === 'input' || /^xlink:.+$/.exec(propertyName)) {
          return this.getObserver(obj, propertyName);
        }
        if (/^\w+:|^data-|^aria-/.test(propertyName) || obj instanceof _aureliaPal.DOM.SVGElement && this.svgAnalyzer.isStandardSvgAttribute(obj.nodeName, propertyName) || obj.tagName.toLowerCase() === 'img' && propertyName === 'src' || obj.tagName.toLowerCase() === 'a' && propertyName === 'href') {
          return dataAttributeAccessor;
        }
      }
      return propertyAccessor;
    };

    ObserverLocator.prototype.getArrayObserver = function getArrayObserver(array) {
      return _getArrayObserver(this.taskQueue, array);
    };

    ObserverLocator.prototype.getMapObserver = function getMapObserver(map) {
      return _getMapObserver(this.taskQueue, map);
    };

    ObserverLocator.prototype.getSetObserver = function getSetObserver(set) {
      return _getSetObserver(this.taskQueue, set);
    };

    return ObserverLocator;
  }(), _class12.inject = [_aureliaTaskQueue.TaskQueue, EventManager, DirtyChecker, SVGAnalyzer, Parser], _temp);

  var ObjectObservationAdapter = exports.ObjectObservationAdapter = function () {
    function ObjectObservationAdapter() {
      
    }

    ObjectObservationAdapter.prototype.getObserver = function getObserver(object, propertyName, descriptor) {
      throw new Error('BindingAdapters must implement getObserver(object, propertyName).');
    };

    return ObjectObservationAdapter;
  }();

  var BindingExpression = exports.BindingExpression = function () {
    function BindingExpression(observerLocator, targetProperty, sourceExpression, mode, lookupFunctions, attribute) {
      

      this.observerLocator = observerLocator;
      this.targetProperty = targetProperty;
      this.sourceExpression = sourceExpression;
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
      this.attribute = attribute;
      this.discrete = false;
    }

    BindingExpression.prototype.createBinding = function createBinding(target) {
      return new Binding(this.observerLocator, this.sourceExpression, target, this.targetProperty, this.mode, this.lookupFunctions);
    };

    return BindingExpression;
  }();

  var Binding = exports.Binding = (_dec10 = connectable(), _dec10(_class13 = function () {
    function Binding(observerLocator, sourceExpression, target, targetProperty, mode, lookupFunctions) {
      

      this.observerLocator = observerLocator;
      this.sourceExpression = sourceExpression;
      this.target = target;
      this.targetProperty = targetProperty;
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
    }

    Binding.prototype.updateTarget = function updateTarget(value) {
      this.targetObserver.setValue(value, this.target, this.targetProperty);
    };

    Binding.prototype.updateSource = function updateSource(value) {
      this.sourceExpression.assign(this.source, value, this.lookupFunctions);
    };

    Binding.prototype.call = function call(context, newValue, oldValue) {
      if (!this.isBound) {
        return;
      }
      if (context === sourceContext) {
        oldValue = this.targetObserver.getValue(this.target, this.targetProperty);
        newValue = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
        if (newValue !== oldValue) {
          this.updateTarget(newValue);
        }
        if (this.mode !== bindingMode.oneTime) {
          this._version++;
          this.sourceExpression.connect(this, this.source);
          this.unobserve(false);
        }
        return;
      }
      if (context === targetContext) {
        if (newValue !== this.sourceExpression.evaluate(this.source, this.lookupFunctions)) {
          this.updateSource(newValue);
        }
        return;
      }
      throw new Error('Unexpected call context ' + context);
    };

    Binding.prototype.bind = function bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.unbind();
      }
      this.isBound = true;
      this.source = source;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }

      var mode = this.mode;
      if (!this.targetObserver) {
        var method = mode === bindingMode.twoWay || mode === bindingMode.fromView ? 'getObserver' : 'getAccessor';
        this.targetObserver = this.observerLocator[method](this.target, this.targetProperty);
      }

      if ('bind' in this.targetObserver) {
        this.targetObserver.bind();
      }
      if (this.mode !== bindingMode.fromView) {
        var value = this.sourceExpression.evaluate(source, this.lookupFunctions);
        this.updateTarget(value);
      }

      if (mode === bindingMode.oneTime) {
        return;
      } else if (mode === bindingMode.toView) {
        enqueueBindingConnect(this);
      } else if (mode === bindingMode.twoWay) {
        this.sourceExpression.connect(this, source);
        this.targetObserver.subscribe(targetContext, this);
      } else if (mode === bindingMode.fromView) {
        this.targetObserver.subscribe(targetContext, this);
      }
    };

    Binding.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }
      this.source = null;
      if ('unbind' in this.targetObserver) {
        this.targetObserver.unbind();
      }
      if (this.targetObserver.unsubscribe) {
        this.targetObserver.unsubscribe(targetContext, this);
      }
      this.unobserve(true);
    };

    Binding.prototype.connect = function connect(evaluate) {
      if (!this.isBound) {
        return;
      }
      if (evaluate) {
        var value = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
        this.updateTarget(value);
      }
      this.sourceExpression.connect(this, this.source);
    };

    return Binding;
  }()) || _class13);

  var CallExpression = exports.CallExpression = function () {
    function CallExpression(observerLocator, targetProperty, sourceExpression, lookupFunctions) {
      

      this.observerLocator = observerLocator;
      this.targetProperty = targetProperty;
      this.sourceExpression = sourceExpression;
      this.lookupFunctions = lookupFunctions;
    }

    CallExpression.prototype.createBinding = function createBinding(target) {
      return new Call(this.observerLocator, this.sourceExpression, target, this.targetProperty, this.lookupFunctions);
    };

    return CallExpression;
  }();

  var Call = exports.Call = function () {
    function Call(observerLocator, sourceExpression, target, targetProperty, lookupFunctions) {
      

      this.sourceExpression = sourceExpression;
      this.target = target;
      this.targetProperty = observerLocator.getObserver(target, targetProperty);
      this.lookupFunctions = lookupFunctions;
    }

    Call.prototype.callSource = function callSource($event) {
      var overrideContext = this.source.overrideContext;
      Object.assign(overrideContext, $event);
      overrideContext.$event = $event;
      var mustEvaluate = true;
      var result = this.sourceExpression.evaluate(this.source, this.lookupFunctions, mustEvaluate);
      delete overrideContext.$event;
      for (var prop in $event) {
        delete overrideContext[prop];
      }
      return result;
    };

    Call.prototype.bind = function bind(source) {
      var _this26 = this;

      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.unbind();
      }
      this.isBound = true;
      this.source = source;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }
      this.targetProperty.setValue(function ($event) {
        return _this26.callSource($event);
      });
    };

    Call.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }
      this.source = null;
      this.targetProperty.setValue(null);
    };

    return Call;
  }();

  var ValueConverterResource = exports.ValueConverterResource = function () {
    function ValueConverterResource(name) {
      

      this.name = name;
    }

    ValueConverterResource.convention = function convention(name) {
      if (name.endsWith('ValueConverter')) {
        return new ValueConverterResource(camelCase(name.substring(0, name.length - 14)));
      }
    };

    ValueConverterResource.prototype.initialize = function initialize(container, target) {
      this.instance = container.get(target);
    };

    ValueConverterResource.prototype.register = function register(registry, name) {
      registry.registerValueConverter(name || this.name, this.instance);
    };

    ValueConverterResource.prototype.load = function load(container, target) {};

    return ValueConverterResource;
  }();

  function valueConverter(nameOrTarget) {
    if (nameOrTarget === undefined || typeof nameOrTarget === 'string') {
      return function (target) {
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new ValueConverterResource(nameOrTarget), target);
      };
    }

    _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new ValueConverterResource(), nameOrTarget);
  }

  var BindingBehaviorResource = exports.BindingBehaviorResource = function () {
    function BindingBehaviorResource(name) {
      

      this.name = name;
    }

    BindingBehaviorResource.convention = function convention(name) {
      if (name.endsWith('BindingBehavior')) {
        return new BindingBehaviorResource(camelCase(name.substring(0, name.length - 15)));
      }
    };

    BindingBehaviorResource.prototype.initialize = function initialize(container, target) {
      this.instance = container.get(target);
    };

    BindingBehaviorResource.prototype.register = function register(registry, name) {
      registry.registerBindingBehavior(name || this.name, this.instance);
    };

    BindingBehaviorResource.prototype.load = function load(container, target) {};

    return BindingBehaviorResource;
  }();

  function bindingBehavior(nameOrTarget) {
    if (nameOrTarget === undefined || typeof nameOrTarget === 'string') {
      return function (target) {
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new BindingBehaviorResource(nameOrTarget), target);
      };
    }

    _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new BindingBehaviorResource(), nameOrTarget);
  }

  var ListenerExpression = exports.ListenerExpression = function () {
    function ListenerExpression(eventManager, targetEvent, sourceExpression, delegationStrategy, preventDefault, lookupFunctions) {
      

      this.eventManager = eventManager;
      this.targetEvent = targetEvent;
      this.sourceExpression = sourceExpression;
      this.delegationStrategy = delegationStrategy;
      this.discrete = true;
      this.preventDefault = preventDefault;
      this.lookupFunctions = lookupFunctions;
    }

    ListenerExpression.prototype.createBinding = function createBinding(target) {
      return new Listener(this.eventManager, this.targetEvent, this.delegationStrategy, this.sourceExpression, target, this.preventDefault, this.lookupFunctions);
    };

    return ListenerExpression;
  }();

  var Listener = exports.Listener = function () {
    function Listener(eventManager, targetEvent, delegationStrategy, sourceExpression, target, preventDefault, lookupFunctions) {
      

      this.eventManager = eventManager;
      this.targetEvent = targetEvent;
      this.delegationStrategy = delegationStrategy;
      this.sourceExpression = sourceExpression;
      this.target = target;
      this.preventDefault = preventDefault;
      this.lookupFunctions = lookupFunctions;
    }

    Listener.prototype.callSource = function callSource(event) {
      var overrideContext = this.source.overrideContext;
      overrideContext.$event = event;
      var mustEvaluate = true;
      var result = this.sourceExpression.evaluate(this.source, this.lookupFunctions, mustEvaluate);
      delete overrideContext.$event;
      if (result !== true && this.preventDefault) {
        event.preventDefault();
      }
      return result;
    };

    Listener.prototype.handleEvent = function handleEvent(event) {
      this.callSource(event);
    };

    Listener.prototype.bind = function bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.unbind();
      }
      this.isBound = true;
      this.source = source;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }
      this._handler = this.eventManager.addEventListener(this.target, this.targetEvent, this, this.delegationStrategy, true);
    };

    Listener.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }
      this.source = null;
      this._handler.dispose();
      this._handler = null;
    };

    return Listener;
  }();

  function getAU(element) {
    var au = element.au;

    if (au === undefined) {
      throw new Error('No Aurelia APIs are defined for the element: "' + element.tagName + '".');
    }

    return au;
  }

  var NameExpression = exports.NameExpression = function () {
    function NameExpression(sourceExpression, apiName, lookupFunctions) {
      

      this.sourceExpression = sourceExpression;
      this.apiName = apiName;
      this.lookupFunctions = lookupFunctions;
      this.discrete = true;
    }

    NameExpression.prototype.createBinding = function createBinding(target) {
      return new NameBinder(this.sourceExpression, NameExpression.locateAPI(target, this.apiName), this.lookupFunctions);
    };

    NameExpression.locateAPI = function locateAPI(element, apiName) {
      switch (apiName) {
        case 'element':
          return element;
        case 'controller':
          return getAU(element).controller;
        case 'view-model':
          return getAU(element).controller.viewModel;
        case 'view':
          return getAU(element).controller.view;
        default:
          var target = getAU(element)[apiName];

          if (target === undefined) {
            throw new Error('Attempted to reference "' + apiName + '", but it was not found amongst the target\'s API.');
          }

          return target.viewModel;
      }
    };

    return NameExpression;
  }();

  var NameBinder = function () {
    function NameBinder(sourceExpression, target, lookupFunctions) {
      

      this.sourceExpression = sourceExpression;
      this.target = target;
      this.lookupFunctions = lookupFunctions;
    }

    NameBinder.prototype.bind = function bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.unbind();
      }
      this.isBound = true;
      this.source = source;
      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }
      this.sourceExpression.assign(this.source, this.target, this.lookupFunctions);
    };

    NameBinder.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      if (this.sourceExpression.evaluate(this.source, this.lookupFunctions) === this.target) {
        this.sourceExpression.assign(this.source, null, this.lookupFunctions);
      }
      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }
      this.source = null;
    };

    return NameBinder;
  }();

  var LookupFunctions = {
    bindingBehaviors: function bindingBehaviors(name) {
      return null;
    },
    valueConverters: function valueConverters(name) {
      return null;
    }
  };

  var BindingEngine = exports.BindingEngine = (_temp2 = _class14 = function () {
    function BindingEngine(observerLocator, parser) {
      

      this.observerLocator = observerLocator;
      this.parser = parser;
    }

    BindingEngine.prototype.createBindingExpression = function createBindingExpression(targetProperty, sourceExpression) {
      var mode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : bindingMode.toView;
      var lookupFunctions = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : LookupFunctions;

      return new BindingExpression(this.observerLocator, targetProperty, this.parser.parse(sourceExpression), mode, lookupFunctions);
    };

    BindingEngine.prototype.propertyObserver = function propertyObserver(obj, propertyName) {
      var _this27 = this;

      return {
        subscribe: function subscribe(callback) {
          var observer = _this27.observerLocator.getObserver(obj, propertyName);
          observer.subscribe(callback);
          return {
            dispose: function dispose() {
              return observer.unsubscribe(callback);
            }
          };
        }
      };
    };

    BindingEngine.prototype.collectionObserver = function collectionObserver(collection) {
      var _this28 = this;

      return {
        subscribe: function subscribe(callback) {
          var observer = void 0;
          if (collection instanceof Array) {
            observer = _this28.observerLocator.getArrayObserver(collection);
          } else if (collection instanceof Map) {
            observer = _this28.observerLocator.getMapObserver(collection);
          } else if (collection instanceof Set) {
            observer = _this28.observerLocator.getSetObserver(collection);
          } else {
            throw new Error('collection must be an instance of Array, Map or Set.');
          }
          observer.subscribe(callback);
          return {
            dispose: function dispose() {
              return observer.unsubscribe(callback);
            }
          };
        }
      };
    };

    BindingEngine.prototype.expressionObserver = function expressionObserver(bindingContext, expression) {
      var scope = { bindingContext: bindingContext, overrideContext: createOverrideContext(bindingContext) };
      return new ExpressionObserver(scope, this.parser.parse(expression), this.observerLocator, LookupFunctions);
    };

    BindingEngine.prototype.parseExpression = function parseExpression(expression) {
      return this.parser.parse(expression);
    };

    BindingEngine.prototype.registerAdapter = function registerAdapter(adapter) {
      this.observerLocator.addAdapter(adapter);
    };

    return BindingEngine;
  }(), _class14.inject = [ObserverLocator, Parser], _temp2);


  var setProto = Set.prototype;

  function _getSetObserver(taskQueue, set) {
    return ModifySetObserver.for(taskQueue, set);
  }

  exports.getSetObserver = _getSetObserver;

  var ModifySetObserver = function (_ModifyCollectionObse3) {
    _inherits(ModifySetObserver, _ModifyCollectionObse3);

    function ModifySetObserver(taskQueue, set) {
      

      return _possibleConstructorReturn(this, _ModifyCollectionObse3.call(this, taskQueue, set));
    }

    ModifySetObserver.for = function _for(taskQueue, set) {
      if (!('__set_observer__' in set)) {
        Reflect.defineProperty(set, '__set_observer__', {
          value: ModifySetObserver.create(taskQueue, set),
          enumerable: false, configurable: false
        });
      }
      return set.__set_observer__;
    };

    ModifySetObserver.create = function create(taskQueue, set) {
      var observer = new ModifySetObserver(taskQueue, set);

      var proto = setProto;
      if (proto.add !== set.add || proto.delete !== set.delete || proto.clear !== set.clear) {
        proto = {
          add: set.add,
          delete: set.delete,
          clear: set.clear
        };
      }

      set.add = function () {
        var type = 'add';
        var oldSize = set.size;
        var methodCallResult = proto.add.apply(set, arguments);
        var hasValue = set.size === oldSize;
        if (!hasValue) {
          observer.addChangeRecord({
            type: type,
            object: set,
            value: Array.from(set).pop()
          });
        }
        return methodCallResult;
      };

      set.delete = function () {
        var hasValue = set.has(arguments[0]);
        var methodCallResult = proto.delete.apply(set, arguments);
        if (hasValue) {
          observer.addChangeRecord({
            type: 'delete',
            object: set,
            value: arguments[0]
          });
        }
        return methodCallResult;
      };

      set.clear = function () {
        var methodCallResult = proto.clear.apply(set, arguments);
        observer.addChangeRecord({
          type: 'clear',
          object: set
        });
        return methodCallResult;
      };

      return observer;
    };

    return ModifySetObserver;
  }(ModifyCollectionObserver);

  function observable(targetOrConfig, key, descriptor) {
    function deco(target, key, descriptor, config) {
      var isClassDecorator = key === undefined;
      if (isClassDecorator) {
        target = target.prototype;
        key = typeof config === 'string' ? config : config.name;
      }

      var innerPropertyName = '_' + key;
      var innerPropertyDescriptor = {
        configurable: true,
        enumerable: false,
        writable: true
      };

      var callbackName = config && config.changeHandler || key + 'Changed';

      if (descriptor) {
        if (typeof descriptor.initializer === 'function') {
          innerPropertyDescriptor.value = descriptor.initializer();
        }
      } else {
        descriptor = {};
      }

      if (!('enumerable' in descriptor)) {
        descriptor.enumerable = true;
      }

      delete descriptor.value;
      delete descriptor.writable;
      delete descriptor.initializer;

      Reflect.defineProperty(target, innerPropertyName, innerPropertyDescriptor);

      descriptor.get = function () {
        return this[innerPropertyName];
      };
      descriptor.set = function (newValue) {
        var oldValue = this[innerPropertyName];
        if (newValue === oldValue) {
          return;
        }

        this[innerPropertyName] = newValue;
        Reflect.defineProperty(this, innerPropertyName, { enumerable: false });

        if (this[callbackName]) {
          this[callbackName](newValue, oldValue, key);
        }
      };

      descriptor.get.dependencies = [innerPropertyName];

      if (isClassDecorator) {
        Reflect.defineProperty(target, key, descriptor);
      } else {
        return descriptor;
      }
    }

    if (key === undefined) {
      return function (t, k, d) {
        return deco(t, k, d, targetOrConfig);
      };
    }
    return deco(targetOrConfig, key, descriptor);
  }

  var signals = {};

  function connectBindingToSignal(binding, name) {
    if (!signals.hasOwnProperty(name)) {
      signals[name] = 0;
    }
    binding.observeProperty(signals, name);
  }

  function signalBindings(name) {
    if (signals.hasOwnProperty(name)) {
      signals[name]++;
    }
  }
});
define('aurelia-dependency-injection', ['exports', 'aurelia-metadata', 'aurelia-pal'], function (exports, aureliaMetadata, aureliaPal) { 'use strict';

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */

  function __decorate(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
  }

  function __metadata(metadataKey, metadataValue) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
  }

  function isInjectable(potentialTarget) {
      return !!potentialTarget;
  }
  function autoinject(potentialTarget) {
      var deco = function (target) {
          if (!target.hasOwnProperty('inject')) {
              target.inject = (aureliaMetadata.metadata.getOwn(aureliaMetadata.metadata.paramTypes, target) ||
                  _emptyParameters).slice();
              if (target.inject && target.inject.length > 0) {
                  if (target.inject[target.inject.length - 1] === Object) {
                      target.inject.splice(-1, 1);
                  }
              }
          }
      };
      if (isInjectable(potentialTarget)) {
          return deco(potentialTarget);
      }
      return deco;
  }
  function inject() {
      var rest = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          rest[_i] = arguments[_i];
      }
      return function (target, _key, descriptor) {
          if (typeof descriptor === 'number') {
              autoinject(target);
              if (rest.length === 1) {
                  target.inject[descriptor] = rest[0];
              }
              return;
          }
          if (descriptor) {
              var fn = descriptor.value;
              fn.inject = rest;
          }
          else {
              target.inject = rest;
          }
      };
  }

  var resolver = aureliaMetadata.protocol.create('aurelia:resolver', function (target) {
      if (!(typeof target.get === 'function')) {
          return 'Resolvers must implement: get(container: Container, key: any): any';
      }
      return true;
  });
  (function (Strategy) {
      Strategy[Strategy["instance"] = 0] = "instance";
      Strategy[Strategy["singleton"] = 1] = "singleton";
      Strategy[Strategy["transient"] = 2] = "transient";
      Strategy[Strategy["function"] = 3] = "function";
      Strategy[Strategy["array"] = 4] = "array";
      Strategy[Strategy["alias"] = 5] = "alias";
  })(exports.Strategy || (exports.Strategy = {}));
  function isStrategy(actual, expected, state) {
      return actual === expected;
  }
  var StrategyResolver = (function () {
      function StrategyResolver(strategy, state) {
          this.strategy = strategy;
          this.state = state;
      }
      StrategyResolver.prototype.get = function (container, key) {
          if (isStrategy(this.strategy, exports.Strategy.instance, this.state)) {
              return this.state;
          }
          if (isStrategy(this.strategy, exports.Strategy.singleton, this.state)) {
              var singleton = container.invoke(this.state);
              this.state = singleton;
              this.strategy = 0;
              return singleton;
          }
          if (isStrategy(this.strategy, exports.Strategy.transient, this.state)) {
              return container.invoke(this.state);
          }
          if (isStrategy(this.strategy, exports.Strategy.function, this.state)) {
              return this.state(container, key, this);
          }
          if (isStrategy(this.strategy, exports.Strategy.array, this.state)) {
              return this.state[0].get(container, key);
          }
          if (isStrategy(this.strategy, exports.Strategy.alias, this.state)) {
              return container.get(this.state);
          }
          throw new Error('Invalid strategy: ' + this.strategy);
      };
      StrategyResolver = __decorate([
          resolver(),
          __metadata("design:paramtypes", [Number, Object])
      ], StrategyResolver);
      return StrategyResolver;
  }());
  var Lazy = (function () {
      function Lazy(key) {
          this._key = key;
      }
      Lazy_1 = Lazy;
      Lazy.prototype.get = function (container) {
          var _this = this;
          return function () { return container.get(_this._key); };
      };
      Lazy.of = function (key) {
          return new Lazy_1(key);
      };
      var Lazy_1;
      Lazy = Lazy_1 = __decorate([
          resolver(),
          __metadata("design:paramtypes", [Object])
      ], Lazy);
      return Lazy;
  }());
  var All = (function () {
      function All(key) {
          this._key = key;
      }
      All_1 = All;
      All.prototype.get = function (container) {
          return container.getAll(this._key);
      };
      All.of = function (key) {
          return new All_1(key);
      };
      var All_1;
      All = All_1 = __decorate([
          resolver(),
          __metadata("design:paramtypes", [Object])
      ], All);
      return All;
  }());
  var Optional = (function () {
      function Optional(key, checkParent) {
          if (checkParent === void 0) { checkParent = true; }
          this._key = key;
          this._checkParent = checkParent;
      }
      Optional_1 = Optional;
      Optional.prototype.get = function (container) {
          if (container.hasResolver(this._key, this._checkParent)) {
              return container.get(this._key);
          }
          return null;
      };
      Optional.of = function (key, checkParent) {
          if (checkParent === void 0) { checkParent = true; }
          return new Optional_1(key, checkParent);
      };
      var Optional_1;
      Optional = Optional_1 = __decorate([
          resolver(),
          __metadata("design:paramtypes", [Object, Boolean])
      ], Optional);
      return Optional;
  }());
  var Parent = (function () {
      function Parent(key) {
          this._key = key;
      }
      Parent_1 = Parent;
      Parent.prototype.get = function (container) {
          return container.parent ? container.parent.get(this._key) : null;
      };
      Parent.of = function (key) {
          return new Parent_1(key);
      };
      var Parent_1;
      Parent = Parent_1 = __decorate([
          resolver(),
          __metadata("design:paramtypes", [Object])
      ], Parent);
      return Parent;
  }());
  var Factory = (function () {
      function Factory(key) {
          this._key = key;
      }
      Factory_1 = Factory;
      Factory.prototype.get = function (container) {
          var fn = this._key;
          var resolver = container.getResolver(fn);
          if (resolver && resolver.strategy === exports.Strategy.function) {
              fn = resolver.state;
          }
          return function () {
              var rest = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                  rest[_i] = arguments[_i];
              }
              return container.invoke(fn, rest);
          };
      };
      Factory.of = function (key) {
          return new Factory_1(key);
      };
      var Factory_1;
      Factory = Factory_1 = __decorate([
          resolver(),
          __metadata("design:paramtypes", [Object])
      ], Factory);
      return Factory;
  }());
  var NewInstance = (function () {
      function NewInstance(key) {
          var dynamicDependencies = [];
          for (var _i = 1; _i < arguments.length; _i++) {
              dynamicDependencies[_i - 1] = arguments[_i];
          }
          this.key = key;
          this.asKey = key;
          this.dynamicDependencies = dynamicDependencies;
      }
      NewInstance_1 = NewInstance;
      NewInstance.prototype.get = function (container) {
          var dynamicDependencies = this.dynamicDependencies.length > 0
              ? this.dynamicDependencies.map(function (dependency) {
                  return dependency['protocol:aurelia:resolver']
                      ? dependency.get(container)
                      : container.get(dependency);
              })
              : undefined;
          var fn = this.key;
          var resolver = container.getResolver(fn);
          if (resolver && resolver.strategy === 3) {
              fn = resolver.state;
          }
          var instance = container.invoke(fn, dynamicDependencies);
          container.registerInstance(this.asKey, instance);
          return instance;
      };
      NewInstance.prototype.as = function (key) {
          this.asKey = key;
          return this;
      };
      NewInstance.of = function (key) {
          var dynamicDependencies = [];
          for (var _i = 1; _i < arguments.length; _i++) {
              dynamicDependencies[_i - 1] = arguments[_i];
          }
          return new (NewInstance_1.bind.apply(NewInstance_1, [void 0, key].concat(dynamicDependencies)))();
      };
      var NewInstance_1;
      NewInstance = NewInstance_1 = __decorate([
          resolver(),
          __metadata("design:paramtypes", [Object, Object])
      ], NewInstance);
      return NewInstance;
  }());
  function getDecoratorDependencies(target) {
      autoinject(target);
      return target.inject;
  }
  function lazy(keyValue) {
      return function (target, _key, index) {
          var inject$$1 = getDecoratorDependencies(target);
          inject$$1[index] = Lazy.of(keyValue);
      };
  }
  function all(keyValue) {
      return function (target, _key, index) {
          var inject$$1 = getDecoratorDependencies(target);
          inject$$1[index] = All.of(keyValue);
      };
  }
  function optional(checkParentOrTarget) {
      if (checkParentOrTarget === void 0) { checkParentOrTarget = true; }
      var deco = function (checkParent) {
          return function (target, _key, index) {
              var inject$$1 = getDecoratorDependencies(target);
              inject$$1[index] = Optional.of(inject$$1[index], checkParent);
          };
      };
      if (typeof checkParentOrTarget === 'boolean') {
          return deco(checkParentOrTarget);
      }
      return deco(true);
  }
  function parent(target, _key, index) {
      var inject$$1 = getDecoratorDependencies(target);
      inject$$1[index] = Parent.of(inject$$1[index]);
  }
  function factory(keyValue) {
      return function (target, _key, index) {
          var inject$$1 = getDecoratorDependencies(target);
          inject$$1[index] = Factory.of(keyValue);
      };
  }
  function newInstance(asKeyOrTarget) {
      var dynamicDependencies = [];
      for (var _i = 1; _i < arguments.length; _i++) {
          dynamicDependencies[_i - 1] = arguments[_i];
      }
      var deco = function (asKey) {
          return function (target, _key, index) {
              var inject$$1 = getDecoratorDependencies(target);
              inject$$1[index] = NewInstance.of.apply(NewInstance, [inject$$1[index]].concat(dynamicDependencies));
              if (!!asKey) {
                  inject$$1[index].as(asKey);
              }
          };
      };
      if (arguments.length >= 1) {
          return deco(asKeyOrTarget);
      }
      return deco();
  }

  function validateKey(key) {
      if (key === null || key === undefined) {
          throw new Error('key/value cannot be null or undefined. Are you trying to inject/register something that doesn\'t exist with DI?');
      }
  }
  var _emptyParameters = Object.freeze([]);
  aureliaMetadata.metadata.registration = 'aurelia:registration';
  aureliaMetadata.metadata.invoker = 'aurelia:invoker';
  var resolverDecorates = resolver.decorates;
  var InvocationHandler = (function () {
      function InvocationHandler(fn, invoker, dependencies) {
          this.fn = fn;
          this.invoker = invoker;
          this.dependencies = dependencies;
      }
      InvocationHandler.prototype.invoke = function (container, dynamicDependencies) {
          return dynamicDependencies !== undefined
              ? this.invoker.invokeWithDynamicDependencies(container, this.fn, this.dependencies, dynamicDependencies)
              : this.invoker.invoke(container, this.fn, this.dependencies);
      };
      return InvocationHandler;
  }());
  function invokeWithDynamicDependencies(container, fn, staticDependencies, dynamicDependencies) {
      var i = staticDependencies.length;
      var args = new Array(i);
      var lookup;
      while (i--) {
          lookup = staticDependencies[i];
          if (lookup === null || lookup === undefined) {
              throw new Error('Constructor Parameter with index ' +
                  i +
                  ' cannot be null or undefined. Are you trying to inject/register something that doesn\'t exist with DI?');
          }
          else {
              args[i] = container.get(lookup);
          }
      }
      if (dynamicDependencies !== undefined) {
          args = args.concat(dynamicDependencies);
      }
      return Reflect.construct(fn, args);
  }
  var classInvoker = {
      invoke: function (container, Type, deps) {
          var instances = deps.map(function (dep) { return container.get(dep); });
          return Reflect.construct(Type, instances);
      },
      invokeWithDynamicDependencies: invokeWithDynamicDependencies
  };
  function getDependencies(f) {
      if (!f.hasOwnProperty('inject')) {
          return [];
      }
      if (typeof f.inject === 'function') {
          return f.inject();
      }
      return f.inject;
  }
  var Container = (function () {
      function Container(configuration) {
          if (configuration === undefined) {
              configuration = {};
          }
          this._configuration = configuration;
          this._onHandlerCreated = configuration.onHandlerCreated;
          this._handlers =
              configuration.handlers || (configuration.handlers = new Map());
          this._resolvers = new Map();
          this.root = this;
          this.parent = null;
      }
      Container.prototype.makeGlobal = function () {
          Container.instance = this;
          return this;
      };
      Container.prototype.setHandlerCreatedCallback = function (onHandlerCreated) {
          this._onHandlerCreated = onHandlerCreated;
          this._configuration.onHandlerCreated = onHandlerCreated;
      };
      Container.prototype.registerInstance = function (key, instance) {
          return this.registerResolver(key, new StrategyResolver(0, instance === undefined ? key : instance));
      };
      Container.prototype.registerSingleton = function (key, fn) {
          return this.registerResolver(key, new StrategyResolver(1, fn === undefined ? key : fn));
      };
      Container.prototype.registerTransient = function (key, fn) {
          return this.registerResolver(key, new StrategyResolver(2, fn === undefined ? key : fn));
      };
      Container.prototype.registerHandler = function (key, handler) {
          return this.registerResolver(key, new StrategyResolver(3, handler));
      };
      Container.prototype.registerAlias = function (originalKey, aliasKey) {
          return this.registerResolver(aliasKey, new StrategyResolver(5, originalKey));
      };
      Container.prototype.registerResolver = function (key, resolver$$1) {
          validateKey(key);
          var allResolvers = this._resolvers;
          var result = allResolvers.get(key);
          if (result === undefined) {
              allResolvers.set(key, resolver$$1);
          }
          else if (result.strategy === 4) {
              result.state.push(resolver$$1);
          }
          else {
              allResolvers.set(key, new StrategyResolver(4, [result, resolver$$1]));
          }
          return resolver$$1;
      };
      Container.prototype.autoRegister = function (key, fn) {
          fn = fn === undefined ? key : fn;
          if (typeof fn === 'function') {
              var registration = aureliaMetadata.metadata.get(aureliaMetadata.metadata.registration, fn);
              if (registration === undefined) {
                  return this.registerResolver(key, new StrategyResolver(1, fn));
              }
              return registration.registerResolver(this, key, fn);
          }
          return this.registerResolver(key, new StrategyResolver(0, fn));
      };
      Container.prototype.autoRegisterAll = function (fns) {
          var i = fns.length;
          while (i--) {
              this.autoRegister(fns[i]);
          }
      };
      Container.prototype.unregister = function (key) {
          this._resolvers.delete(key);
      };
      Container.prototype.hasResolver = function (key, checkParent) {
          if (checkParent === void 0) { checkParent = false; }
          validateKey(key);
          return (this._resolvers.has(key) ||
              (checkParent &&
                  this.parent !== null &&
                  this.parent.hasResolver(key, checkParent)));
      };
      Container.prototype.getResolver = function (key) {
          return this._resolvers.get(key);
      };
      Container.prototype.get = function (key) {
          validateKey(key);
          if (key === Container) {
              return this;
          }
          if (resolverDecorates(key)) {
              return key.get(this, key);
          }
          var resolver$$1 = this._resolvers.get(key);
          if (resolver$$1 === undefined) {
              if (this.parent === null) {
                  return this.autoRegister(key).get(this, key);
              }
              var registration = aureliaMetadata.metadata.get(aureliaMetadata.metadata.registration, key);
              if (registration === undefined) {
                  return this.parent._get(key);
              }
              return registration.registerResolver(this, key, key).get(this, key);
          }
          return resolver$$1.get(this, key);
      };
      Container.prototype._get = function (key) {
          var resolver$$1 = this._resolvers.get(key);
          if (resolver$$1 === undefined) {
              if (this.parent === null) {
                  return this.autoRegister(key).get(this, key);
              }
              return this.parent._get(key);
          }
          return resolver$$1.get(this, key);
      };
      Container.prototype.getAll = function (key) {
          validateKey(key);
          var resolver$$1 = this._resolvers.get(key);
          if (resolver$$1 === undefined) {
              if (this.parent === null) {
                  return _emptyParameters;
              }
              return this.parent.getAll(key);
          }
          if (resolver$$1.strategy === 4) {
              var state = resolver$$1.state;
              var i = state.length;
              var results = new Array(i);
              while (i--) {
                  results[i] = state[i].get(this, key);
              }
              return results;
          }
          return [resolver$$1.get(this, key)];
      };
      Container.prototype.createChild = function () {
          var child = new Container(this._configuration);
          child.root = this.root;
          child.parent = this;
          return child;
      };
      Container.prototype.invoke = function (fn, dynamicDependencies) {
          try {
              var handler = this._handlers.get(fn);
              if (handler === undefined) {
                  handler = this._createInvocationHandler(fn);
                  this._handlers.set(fn, handler);
              }
              return handler.invoke(this, dynamicDependencies);
          }
          catch (e) {
              throw new aureliaPal.AggregateError("Error invoking " + fn.name + ". Check the inner error for details.", e, true);
          }
      };
      Container.prototype._createInvocationHandler = function (fn) {
          var dependencies;
          if (fn.inject === undefined) {
              dependencies =
                  aureliaMetadata.metadata.getOwn(aureliaMetadata.metadata.paramTypes, fn) || _emptyParameters;
          }
          else {
              dependencies = [];
              var ctor = fn;
              while (typeof ctor === 'function') {
                  dependencies.push.apply(dependencies, getDependencies(ctor));
                  ctor = Object.getPrototypeOf(ctor);
              }
          }
          var invoker = aureliaMetadata.metadata.getOwn(aureliaMetadata.metadata.invoker, fn) || classInvoker;
          var handler = new InvocationHandler(fn, invoker, dependencies);
          return this._onHandlerCreated !== undefined
              ? this._onHandlerCreated(handler)
              : handler;
      };
      return Container;
  }());

  function invoker(value) {
      return function (target) {
          aureliaMetadata.metadata.define(aureliaMetadata.metadata.invoker, value, target);
      };
  }
  function invokeAsFactory(potentialTarget) {
      var deco = function (target) {
          aureliaMetadata.metadata.define(aureliaMetadata.metadata.invoker, FactoryInvoker.instance, target);
      };
      return potentialTarget ? deco(potentialTarget) : deco;
  }
  var FactoryInvoker = (function () {
      function FactoryInvoker() {
      }
      FactoryInvoker.prototype.invoke = function (container, fn, dependencies) {
          var i = dependencies.length;
          var args = new Array(i);
          while (i--) {
              args[i] = container.get(dependencies[i]);
          }
          return fn.apply(undefined, args);
      };
      FactoryInvoker.prototype.invokeWithDynamicDependencies = function (container, fn, staticDependencies, dynamicDependencies) {
          var i = staticDependencies.length;
          var args = new Array(i);
          while (i--) {
              args[i] = container.get(staticDependencies[i]);
          }
          if (dynamicDependencies !== undefined) {
              args = args.concat(dynamicDependencies);
          }
          return fn.apply(undefined, args);
      };
      return FactoryInvoker;
  }());
  FactoryInvoker.instance = new FactoryInvoker();

  function registration(value) {
      return function (target) {
          aureliaMetadata.metadata.define(aureliaMetadata.metadata.registration, value, target);
      };
  }
  function transient(key) {
      return registration(new TransientRegistration(key));
  }
  function singleton(keyOrRegisterInChild, registerInChild) {
      if (registerInChild === void 0) { registerInChild = false; }
      return registration(new SingletonRegistration(keyOrRegisterInChild, registerInChild));
  }
  var TransientRegistration = (function () {
      function TransientRegistration(key) {
          this._key = key;
      }
      TransientRegistration.prototype.registerResolver = function (container, key, fn) {
          var existingResolver = container.getResolver(this._key || key);
          return existingResolver === undefined
              ? container.registerTransient((this._key || key), fn)
              : existingResolver;
      };
      return TransientRegistration;
  }());
  var SingletonRegistration = (function () {
      function SingletonRegistration(keyOrRegisterInChild, registerInChild) {
          if (registerInChild === void 0) { registerInChild = false; }
          if (typeof keyOrRegisterInChild === 'boolean') {
              this._registerInChild = keyOrRegisterInChild;
          }
          else {
              this._key = keyOrRegisterInChild;
              this._registerInChild = registerInChild;
          }
      }
      SingletonRegistration.prototype.registerResolver = function (container, key, fn) {
          var targetContainer = this._registerInChild ? container : container.root;
          var existingResolver = targetContainer.getResolver(this._key || key);
          return existingResolver === undefined
              ? targetContainer.registerSingleton(this._key || key, fn)
              : existingResolver;
      };
      return SingletonRegistration;
  }());

  exports._emptyParameters = _emptyParameters;
  exports.InvocationHandler = InvocationHandler;
  exports.Container = Container;
  exports.autoinject = autoinject;
  exports.inject = inject;
  exports.invoker = invoker;
  exports.invokeAsFactory = invokeAsFactory;
  exports.FactoryInvoker = FactoryInvoker;
  exports.registration = registration;
  exports.transient = transient;
  exports.singleton = singleton;
  exports.TransientRegistration = TransientRegistration;
  exports.SingletonRegistration = SingletonRegistration;
  exports.resolver = resolver;
  exports.StrategyResolver = StrategyResolver;
  exports.Lazy = Lazy;
  exports.All = All;
  exports.Optional = Optional;
  exports.Parent = Parent;
  exports.Factory = Factory;
  exports.NewInstance = NewInstance;
  exports.getDecoratorDependencies = getDecoratorDependencies;
  exports.lazy = lazy;
  exports.all = all;
  exports.optional = optional;
  exports.parent = parent;
  exports.factory = factory;
  exports.newInstance = newInstance;

  Object.defineProperty(exports, '__esModule', { value: true });

});

define('aurelia-bootstrapper',['exports', 'aurelia-pal', 'aurelia-pal-browser', 'aurelia-polyfills'], function (exports, _aureliaPal, _aureliaPalBrowser) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.bootstrap = bootstrap;


  var bootstrapQueue = [];
  var sharedLoader = null;
  var Aurelia = null;

  function onBootstrap(callback) {
    return new Promise(function (resolve, reject) {
      if (sharedLoader) {
        resolve(callback(sharedLoader));
      } else {
        bootstrapQueue.push(function () {
          try {
            resolve(callback(sharedLoader));
          } catch (e) {
            reject(e);
          }
        });
      }
    });
  }

  function ready(global) {
    return new Promise(function (resolve, reject) {
      if (global.document.readyState === 'complete') {
        resolve(global.document);
      } else {
        global.document.addEventListener('DOMContentLoaded', completed);
        global.addEventListener('load', completed);
      }

      function completed() {
        global.document.removeEventListener('DOMContentLoaded', completed);
        global.removeEventListener('load', completed);
        resolve(global.document);
      }
    });
  }

  function createLoader() {
    if (_aureliaPal.PLATFORM.Loader) {
      return Promise.resolve(new _aureliaPal.PLATFORM.Loader());
    }

    if (window.System && typeof window.System.import === 'function') {
      return System.normalize('aurelia-bootstrapper').then(function (bootstrapperName) {
        return System.normalize('aurelia-loader-default', bootstrapperName);
      }).then(function (loaderName) {
        return System.import(loaderName).then(function (m) {
          return new m.DefaultLoader();
        });
      });
    }

    if (typeof window.require === 'function') {
      return new Promise(function (resolve, reject) {
        return require(['aurelia-loader-default'], function (m) {
          return resolve(new m.DefaultLoader());
        }, reject);
      });
    }

    return Promise.reject('No PLATFORM.Loader is defined and there is neither a System API (ES6) or a Require API (AMD) globally available to load your app.');
  }

  function preparePlatform(loader) {
    return loader.normalize('aurelia-bootstrapper').then(function (bootstrapperName) {
      return loader.normalize('aurelia-framework', bootstrapperName).then(function (frameworkName) {
        loader.map('aurelia-framework', frameworkName);

        return Promise.all([loader.normalize('aurelia-dependency-injection', frameworkName).then(function (diName) {
          return loader.map('aurelia-dependency-injection', diName);
        }), loader.normalize('aurelia-router', bootstrapperName).then(function (routerName) {
          return loader.map('aurelia-router', routerName);
        }), loader.normalize('aurelia-logging-console', bootstrapperName).then(function (loggingConsoleName) {
          return loader.map('aurelia-logging-console', loggingConsoleName);
        })]).then(function () {
          return loader.loadModule(frameworkName).then(function (m) {
            return Aurelia = m.Aurelia;
          });
        });
      });
    });
  }

  function handleApp(loader, appHost) {
    var moduleId = appHost.getAttribute('aurelia-app') || appHost.getAttribute('data-aurelia-app');
    return config(loader, appHost, moduleId);
  }

  function config(loader, appHost, configModuleId) {
    var aurelia = new Aurelia(loader);
    aurelia.host = appHost;
    aurelia.configModuleId = configModuleId || null;

    if (configModuleId) {
      return loader.loadModule(configModuleId).then(function (customConfig) {
        if (!customConfig.configure) {
          throw new Error("Cannot initialize module '" + configModuleId + "' without a configure function.");
        }

        customConfig.configure(aurelia);
      });
    }

    aurelia.use.standardConfiguration().developmentLogging();

    return aurelia.start().then(function () {
      return aurelia.setRoot();
    });
  }

  function run() {
    return ready(window).then(function (doc) {
      (0, _aureliaPalBrowser.initialize)();

      var appHost = doc.querySelectorAll('[aurelia-app],[data-aurelia-app]');
      return createLoader().then(function (loader) {
        return preparePlatform(loader).then(function () {
          for (var i = 0, ii = appHost.length; i < ii; ++i) {
            handleApp(loader, appHost[i]).catch(console.error.bind(console));
          }

          sharedLoader = loader;
          for (var _i = 0, _ii = bootstrapQueue.length; _i < _ii; ++_i) {
            bootstrapQueue[_i]();
          }
          bootstrapQueue = null;
        });
      });
    });
  }

  function bootstrap(configure) {
    return onBootstrap(function (loader) {
      var aurelia = new Aurelia(loader);
      return configure(aurelia);
    });
  }

  run();
});
define('aurelia-framework',['exports', 'aurelia-dependency-injection', 'aurelia-binding', 'aurelia-metadata', 'aurelia-templating', 'aurelia-loader', 'aurelia-task-queue', 'aurelia-path', 'aurelia-pal', 'aurelia-logging'], function (exports, _aureliaDependencyInjection, _aureliaBinding, _aureliaMetadata, _aureliaTemplating, _aureliaLoader, _aureliaTaskQueue, _aureliaPath, _aureliaPal, _aureliaLogging) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.LogManager = exports.FrameworkConfiguration = exports.Aurelia = undefined;
  Object.keys(_aureliaDependencyInjection).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return _aureliaDependencyInjection[key];
      }
    });
  });
  Object.keys(_aureliaBinding).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return _aureliaBinding[key];
      }
    });
  });
  Object.keys(_aureliaMetadata).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return _aureliaMetadata[key];
      }
    });
  });
  Object.keys(_aureliaTemplating).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return _aureliaTemplating[key];
      }
    });
  });
  Object.keys(_aureliaLoader).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return _aureliaLoader[key];
      }
    });
  });
  Object.keys(_aureliaTaskQueue).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return _aureliaTaskQueue[key];
      }
    });
  });
  Object.keys(_aureliaPath).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return _aureliaPath[key];
      }
    });
  });
  Object.keys(_aureliaPal).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return _aureliaPal[key];
      }
    });
  });

  var TheLogManager = _interopRequireWildcard(_aureliaLogging);

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    } else {
      var newObj = {};

      if (obj != null) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
        }
      }

      newObj.default = obj;
      return newObj;
    }
  }

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  

  function preventActionlessFormSubmit() {
    _aureliaPal.DOM.addEventListener('submit', function (evt) {
      var target = evt.target;
      var action = target.action;

      if (target.tagName.toLowerCase() === 'form' && !action) {
        evt.preventDefault();
      }
    });
  }

  var Aurelia = exports.Aurelia = function () {
    function Aurelia(loader, container, resources) {
      

      this.loader = loader || new _aureliaPal.PLATFORM.Loader();
      this.container = container || new _aureliaDependencyInjection.Container().makeGlobal();
      this.resources = resources || new _aureliaTemplating.ViewResources();
      this.use = new FrameworkConfiguration(this);
      this.logger = TheLogManager.getLogger('aurelia');
      this.hostConfigured = false;
      this.host = null;

      this.use.instance(Aurelia, this);
      this.use.instance(_aureliaLoader.Loader, this.loader);
      this.use.instance(_aureliaTemplating.ViewResources, this.resources);
    }

    Aurelia.prototype.start = function start() {
      var _this = this;

      if (this._started) {
        return this._started;
      }

      this.logger.info('Aurelia Starting');
      return this._started = this.use.apply().then(function () {
        preventActionlessFormSubmit();

        if (!_this.container.hasResolver(_aureliaTemplating.BindingLanguage)) {
          var message = 'You must configure Aurelia with a BindingLanguage implementation.';
          _this.logger.error(message);
          throw new Error(message);
        }

        _this.logger.info('Aurelia Started');
        var evt = _aureliaPal.DOM.createCustomEvent('aurelia-started', { bubbles: true, cancelable: true });
        _aureliaPal.DOM.dispatchEvent(evt);
        return _this;
      });
    };

    Aurelia.prototype.enhance = function enhance() {
      var _this2 = this;

      var bindingContext = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var applicationHost = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      this._configureHost(applicationHost || _aureliaPal.DOM.querySelectorAll('body')[0]);

      return new Promise(function (resolve) {
        var engine = _this2.container.get(_aureliaTemplating.TemplatingEngine);
        _this2.root = engine.enhance({ container: _this2.container, element: _this2.host, resources: _this2.resources, bindingContext: bindingContext });
        _this2.root.attached();
        _this2._onAureliaComposed();
        resolve(_this2);
      });
    };

    Aurelia.prototype.setRoot = function setRoot() {
      var _this3 = this;

      var root = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var applicationHost = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var instruction = {};

      if (this.root && this.root.viewModel && this.root.viewModel.router) {
        this.root.viewModel.router.deactivate();
        this.root.viewModel.router.reset();
      }

      this._configureHost(applicationHost);

      var engine = this.container.get(_aureliaTemplating.TemplatingEngine);
      var transaction = this.container.get(_aureliaTemplating.CompositionTransaction);
      delete transaction.initialComposition;

      if (!root) {
        if (this.configModuleId) {
          root = (0, _aureliaPath.relativeToFile)('./app', this.configModuleId);
        } else {
          root = 'app';
        }
      }

      instruction.viewModel = root;
      instruction.container = instruction.childContainer = this.container;
      instruction.viewSlot = this.hostSlot;
      instruction.host = this.host;

      return engine.compose(instruction).then(function (r) {
        _this3.root = r;
        instruction.viewSlot.attached();
        _this3._onAureliaComposed();
        return _this3;
      });
    };

    Aurelia.prototype._configureHost = function _configureHost(applicationHost) {
      if (this.hostConfigured) {
        return;
      }
      applicationHost = applicationHost || this.host;

      if (!applicationHost || typeof applicationHost === 'string') {
        this.host = _aureliaPal.DOM.getElementById(applicationHost || 'applicationHost');
      } else {
        this.host = applicationHost;
      }

      if (!this.host) {
        throw new Error('No applicationHost was specified.');
      }

      this.hostConfigured = true;
      this.host.aurelia = this;
      this.hostSlot = new _aureliaTemplating.ViewSlot(this.host, true);
      this.hostSlot.transformChildNodesIntoView();
      this.container.registerInstance(_aureliaPal.DOM.boundary, this.host);
    };

    Aurelia.prototype._onAureliaComposed = function _onAureliaComposed() {
      var evt = _aureliaPal.DOM.createCustomEvent('aurelia-composed', { bubbles: true, cancelable: true });
      setTimeout(function () {
        return _aureliaPal.DOM.dispatchEvent(evt);
      }, 1);
    };

    return Aurelia;
  }();

  var logger = TheLogManager.getLogger('aurelia');
  var extPattern = /\.[^/.]+$/;

  function runTasks(config, tasks) {
    var current = void 0;
    var next = function next() {
      current = tasks.shift();
      if (current) {
        return Promise.resolve(current(config)).then(next);
      }

      return Promise.resolve();
    };

    return next();
  }

  function loadPlugin(fwConfig, loader, info) {
    logger.debug('Loading plugin ' + info.moduleId + '.');
    if (typeof info.moduleId === 'string') {
      fwConfig.resourcesRelativeTo = info.resourcesRelativeTo;

      var id = info.moduleId;

      if (info.resourcesRelativeTo.length > 1) {
        return loader.normalize(info.moduleId, info.resourcesRelativeTo[1]).then(function (normalizedId) {
          return _loadPlugin(normalizedId);
        });
      }

      return _loadPlugin(id);
    } else if (typeof info.configure === 'function') {
      if (fwConfig.configuredPlugins.indexOf(info.configure) !== -1) {
        return Promise.resolve();
      }
      fwConfig.configuredPlugins.push(info.configure);

      return Promise.resolve(info.configure.call(null, fwConfig, info.config || {}));
    }
    throw new Error(invalidConfigMsg(info.moduleId || info.configure, 'plugin'));

    function _loadPlugin(moduleId) {
      return loader.loadModule(moduleId).then(function (m) {
        if ('configure' in m) {
          if (fwConfig.configuredPlugins.indexOf(m.configure) !== -1) {
            return Promise.resolve();
          }
          return Promise.resolve(m.configure(fwConfig, info.config || {})).then(function () {
            fwConfig.configuredPlugins.push(m.configure);
            fwConfig.resourcesRelativeTo = null;
            logger.debug('Configured plugin ' + info.moduleId + '.');
          });
        }

        fwConfig.resourcesRelativeTo = null;
        logger.debug('Loaded plugin ' + info.moduleId + '.');
      });
    }
  }

  function loadResources(aurelia, resourcesToLoad, appResources) {
    if (Object.keys(resourcesToLoad).length === 0) {
      return Promise.resolve();
    }
    var viewEngine = aurelia.container.get(_aureliaTemplating.ViewEngine);

    return Promise.all(Object.keys(resourcesToLoad).map(function (n) {
      return _normalize(resourcesToLoad[n]);
    })).then(function (loads) {
      var names = [];
      var importIds = [];

      loads.forEach(function (l) {
        names.push(undefined);
        importIds.push(l.importId);
      });

      return viewEngine.importViewResources(importIds, names, appResources);
    });

    function _normalize(load) {
      var moduleId = load.moduleId;
      var ext = getExt(moduleId);

      if (isOtherResource(moduleId)) {
        moduleId = removeExt(moduleId);
      }

      return aurelia.loader.normalize(moduleId, load.relativeTo).then(function (normalized) {
        return {
          name: load.moduleId,
          importId: isOtherResource(load.moduleId) ? addOriginalExt(normalized, ext) : normalized
        };
      });
    }

    function isOtherResource(name) {
      var ext = getExt(name);
      if (!ext) return false;
      if (ext === '') return false;
      if (ext === '.js' || ext === '.ts') return false;
      return true;
    }

    function removeExt(name) {
      return name.replace(extPattern, '');
    }

    function addOriginalExt(normalized, ext) {
      return removeExt(normalized) + '.' + ext;
    }
  }

  function getExt(name) {
    var match = name.match(extPattern);
    if (match && match.length > 0) {
      return match[0].split('.')[1];
    }
  }

  function loadBehaviors(config) {
    return Promise.all(config.behaviorsToLoad.map(function (m) {
      return m.load(config.container, m.target);
    })).then(function () {
      config.behaviorsToLoad = null;
    });
  }

  function assertProcessed(plugins) {
    if (plugins.processed) {
      throw new Error('This config instance has already been applied. To load more plugins or global resources, create a new FrameworkConfiguration instance.');
    }
  }

  function invalidConfigMsg(cfg, type) {
    return 'Invalid ' + type + ' [' + cfg + '], ' + type + ' must be specified as functions or relative module IDs.';
  }

  var FrameworkConfiguration = function () {
    function FrameworkConfiguration(aurelia) {
      var _this4 = this;

      

      this.aurelia = aurelia;
      this.container = aurelia.container;

      this.info = [];
      this.processed = false;
      this.preTasks = [];
      this.postTasks = [];

      this.behaviorsToLoad = [];

      this.configuredPlugins = [];
      this.resourcesToLoad = {};
      this.preTask(function () {
        return aurelia.loader.normalize('aurelia-bootstrapper').then(function (name) {
          return _this4.bootstrapperName = name;
        });
      });
      this.postTask(function () {
        return loadResources(aurelia, _this4.resourcesToLoad, aurelia.resources);
      });
    }

    FrameworkConfiguration.prototype.instance = function instance(type, _instance) {
      this.container.registerInstance(type, _instance);
      return this;
    };

    FrameworkConfiguration.prototype.singleton = function singleton(type, implementation) {
      this.container.registerSingleton(type, implementation);
      return this;
    };

    FrameworkConfiguration.prototype.transient = function transient(type, implementation) {
      this.container.registerTransient(type, implementation);
      return this;
    };

    FrameworkConfiguration.prototype.preTask = function preTask(task) {
      assertProcessed(this);
      this.preTasks.push(task);
      return this;
    };

    FrameworkConfiguration.prototype.postTask = function postTask(task) {
      assertProcessed(this);
      this.postTasks.push(task);
      return this;
    };

    FrameworkConfiguration.prototype.feature = function feature(plugin) {
      var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      switch (typeof plugin === 'undefined' ? 'undefined' : _typeof(plugin)) {
        case 'string':
          var hasIndex = /\/index$/i.test(plugin);
          var _moduleId = hasIndex || getExt(plugin) ? plugin : plugin + '/index';
          var root = hasIndex ? plugin.substr(0, plugin.length - 6) : plugin;
          this.info.push({ moduleId: _moduleId, resourcesRelativeTo: [root, ''], config: config });
          break;

        case 'function':
          this.info.push({ configure: plugin, config: config || {} });
          break;
        default:
          throw new Error(invalidConfigMsg(plugin, 'feature'));
      }
      return this;
    };

    FrameworkConfiguration.prototype.globalResources = function globalResources(resources) {
      var _this5 = this;

      assertProcessed(this);

      var toAdd = Array.isArray(resources) ? resources : arguments;
      var resource = void 0;
      var resourcesRelativeTo = this.resourcesRelativeTo || ['', ''];

      for (var i = 0, ii = toAdd.length; i < ii; ++i) {
        resource = toAdd[i];
        switch (typeof resource === 'undefined' ? 'undefined' : _typeof(resource)) {
          case 'string':
            var parent = resourcesRelativeTo[0];
            var grandParent = resourcesRelativeTo[1];
            var name = resource;

            if ((resource.startsWith('./') || resource.startsWith('../')) && parent !== '') {
              name = (0, _aureliaPath.join)(parent, resource);
            }

            this.resourcesToLoad[name] = { moduleId: name, relativeTo: grandParent };
            break;
          case 'function':
            var meta = this.aurelia.resources.autoRegister(this.container, resource);
            if (meta instanceof _aureliaTemplating.HtmlBehaviorResource && meta.elementName !== null) {
              if (this.behaviorsToLoad.push(meta) === 1) {
                this.postTask(function () {
                  return loadBehaviors(_this5);
                });
              }
            }
            break;
          default:
            throw new Error(invalidConfigMsg(resource, 'resource'));
        }
      }

      return this;
    };

    FrameworkConfiguration.prototype.globalName = function globalName(resourcePath, newName) {
      assertProcessed(this);
      this.resourcesToLoad[resourcePath] = { moduleId: newName, relativeTo: '' };
      return this;
    };

    FrameworkConfiguration.prototype.plugin = function plugin(_plugin, pluginConfig) {
      assertProcessed(this);

      var info = void 0;
      switch (typeof _plugin === 'undefined' ? 'undefined' : _typeof(_plugin)) {
        case 'string':
          info = { moduleId: _plugin, resourcesRelativeTo: [_plugin, ''], config: pluginConfig || {} };
          break;
        case 'function':
          info = { configure: _plugin, config: pluginConfig || {} };
          break;
        default:
          throw new Error(invalidConfigMsg(_plugin, 'plugin'));
      }
      this.info.push(info);
      return this;
    };

    FrameworkConfiguration.prototype._addNormalizedPlugin = function _addNormalizedPlugin(name, config) {
      var _this6 = this;

      var plugin = { moduleId: name, resourcesRelativeTo: [name, ''], config: config || {} };
      this.info.push(plugin);

      this.preTask(function () {
        var relativeTo = [name, _this6.bootstrapperName];
        plugin.moduleId = name;
        plugin.resourcesRelativeTo = relativeTo;
        return Promise.resolve();
      });

      return this;
    };

    FrameworkConfiguration.prototype.defaultBindingLanguage = function defaultBindingLanguage() {
      return this._addNormalizedPlugin('aurelia-templating-binding');
    };

    FrameworkConfiguration.prototype.router = function router() {
      return this._addNormalizedPlugin('aurelia-templating-router');
    };

    FrameworkConfiguration.prototype.history = function history() {
      return this._addNormalizedPlugin('aurelia-history-browser');
    };

    FrameworkConfiguration.prototype.defaultResources = function defaultResources() {
      return this._addNormalizedPlugin('aurelia-templating-resources');
    };

    FrameworkConfiguration.prototype.eventAggregator = function eventAggregator() {
      return this._addNormalizedPlugin('aurelia-event-aggregator');
    };

    FrameworkConfiguration.prototype.basicConfiguration = function basicConfiguration() {
      return this.defaultBindingLanguage().defaultResources().eventAggregator();
    };

    FrameworkConfiguration.prototype.standardConfiguration = function standardConfiguration() {
      return this.basicConfiguration().history().router();
    };

    FrameworkConfiguration.prototype.developmentLogging = function developmentLogging(level) {
      var _this7 = this;

      var logLevel = level ? TheLogManager.logLevel[level] : undefined;

      if (logLevel === undefined) {
        logLevel = TheLogManager.logLevel.debug;
      }

      this.preTask(function () {
        return _this7.aurelia.loader.normalize('aurelia-logging-console', _this7.bootstrapperName).then(function (name) {
          return _this7.aurelia.loader.loadModule(name).then(function (m) {
            TheLogManager.addAppender(new m.ConsoleAppender());
            TheLogManager.setLevel(logLevel);
          });
        });
      });

      return this;
    };

    FrameworkConfiguration.prototype.apply = function apply() {
      var _this8 = this;

      if (this.processed) {
        return Promise.resolve();
      }

      return runTasks(this, this.preTasks).then(function () {
        var loader = _this8.aurelia.loader;
        var info = _this8.info;
        var current = void 0;

        var next = function next() {
          current = info.shift();
          if (current) {
            return loadPlugin(_this8, loader, current).then(next);
          }

          _this8.processed = true;
          _this8.configuredPlugins = null;
          return Promise.resolve();
        };

        return next().then(function () {
          return runTasks(_this8, _this8.postTasks);
        });
      });
    };

    return FrameworkConfiguration;
  }();

  exports.FrameworkConfiguration = FrameworkConfiguration;
  var LogManager = exports.LogManager = TheLogManager;
});
define('aurelia-loader',['exports', 'aurelia-path', 'aurelia-metadata'], function (exports, _aureliaPath, _aureliaMetadata) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Loader = exports.TemplateRegistryEntry = exports.TemplateDependency = undefined;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  

  var TemplateDependency = exports.TemplateDependency = function TemplateDependency(src, name) {
    

    this.src = src;
    this.name = name;
  };

  var TemplateRegistryEntry = exports.TemplateRegistryEntry = function () {
    function TemplateRegistryEntry(address) {
      

      this.templateIsLoaded = false;
      this.factoryIsReady = false;
      this.resources = null;
      this.dependencies = null;

      this.address = address;
      this.onReady = null;
      this._template = null;
      this._factory = null;
    }

    TemplateRegistryEntry.prototype.addDependency = function addDependency(src, name) {
      var finalSrc = typeof src === 'string' ? (0, _aureliaPath.relativeToFile)(src, this.address) : _aureliaMetadata.Origin.get(src).moduleId;

      this.dependencies.push(new TemplateDependency(finalSrc, name));
    };

    _createClass(TemplateRegistryEntry, [{
      key: 'template',
      get: function get() {
        return this._template;
      },
      set: function set(value) {
        var address = this.address;
        var requires = void 0;
        var current = void 0;
        var src = void 0;
        var dependencies = void 0;

        this._template = value;
        this.templateIsLoaded = true;

        requires = value.content.querySelectorAll('require');
        dependencies = this.dependencies = new Array(requires.length);

        for (var i = 0, ii = requires.length; i < ii; ++i) {
          current = requires[i];
          src = current.getAttribute('from');

          if (!src) {
            throw new Error('<require> element in ' + address + ' has no "from" attribute.');
          }

          dependencies[i] = new TemplateDependency((0, _aureliaPath.relativeToFile)(src, address), current.getAttribute('as'));

          if (current.parentNode) {
            current.parentNode.removeChild(current);
          }
        }
      }
    }, {
      key: 'factory',
      get: function get() {
        return this._factory;
      },
      set: function set(value) {
        this._factory = value;
        this.factoryIsReady = true;
      }
    }]);

    return TemplateRegistryEntry;
  }();

  var Loader = exports.Loader = function () {
    function Loader() {
      

      this.templateRegistry = {};
    }

    Loader.prototype.map = function map(id, source) {
      throw new Error('Loaders must implement map(id, source).');
    };

    Loader.prototype.normalizeSync = function normalizeSync(moduleId, relativeTo) {
      throw new Error('Loaders must implement normalizeSync(moduleId, relativeTo).');
    };

    Loader.prototype.normalize = function normalize(moduleId, relativeTo) {
      throw new Error('Loaders must implement normalize(moduleId: string, relativeTo: string): Promise<string>.');
    };

    Loader.prototype.loadModule = function loadModule(id) {
      throw new Error('Loaders must implement loadModule(id).');
    };

    Loader.prototype.loadAllModules = function loadAllModules(ids) {
      throw new Error('Loader must implement loadAllModules(ids).');
    };

    Loader.prototype.loadTemplate = function loadTemplate(url) {
      throw new Error('Loader must implement loadTemplate(url).');
    };

    Loader.prototype.loadText = function loadText(url) {
      throw new Error('Loader must implement loadText(url).');
    };

    Loader.prototype.applyPluginToUrl = function applyPluginToUrl(url, pluginName) {
      throw new Error('Loader must implement applyPluginToUrl(url, pluginName).');
    };

    Loader.prototype.addPlugin = function addPlugin(pluginName, implementation) {
      throw new Error('Loader must implement addPlugin(pluginName, implementation).');
    };

    Loader.prototype.getOrCreateTemplateRegistryEntry = function getOrCreateTemplateRegistryEntry(address) {
      return this.templateRegistry[address] || (this.templateRegistry[address] = new TemplateRegistryEntry(address));
    };

    return Loader;
  }();
});
define('aurelia-loader-default',['exports', 'aurelia-loader', 'aurelia-pal', 'aurelia-metadata'], function (exports, _aureliaLoader, _aureliaPal, _aureliaMetadata) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.DefaultLoader = exports.TextTemplateLoader = undefined;

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  

  var TextTemplateLoader = exports.TextTemplateLoader = function () {
    function TextTemplateLoader() {
      
    }

    TextTemplateLoader.prototype.loadTemplate = function loadTemplate(loader, entry) {
      return loader.loadText(entry.address).then(function (text) {
        entry.template = _aureliaPal.DOM.createTemplateFromMarkup(text);
      });
    };

    return TextTemplateLoader;
  }();

  function ensureOriginOnExports(executed, name) {
    var target = executed;
    var key = void 0;
    var exportedValue = void 0;

    if (target.__useDefault) {
      target = target['default'];
    }

    _aureliaMetadata.Origin.set(target, new _aureliaMetadata.Origin(name, 'default'));

    for (key in target) {
      exportedValue = target[key];

      if (typeof exportedValue === 'function') {
        _aureliaMetadata.Origin.set(exportedValue, new _aureliaMetadata.Origin(name, key));
      }
    }

    return executed;
  }

  var DefaultLoader = exports.DefaultLoader = function (_Loader) {
    _inherits(DefaultLoader, _Loader);

    function DefaultLoader() {
      

      var _this = _possibleConstructorReturn(this, _Loader.call(this));

      _this.textPluginName = 'text';


      _this.moduleRegistry = Object.create(null);
      _this.useTemplateLoader(new TextTemplateLoader());

      var that = _this;

      _this.addPlugin('template-registry-entry', {
        'fetch': function fetch(address) {
          var entry = that.getOrCreateTemplateRegistryEntry(address);
          return entry.templateIsLoaded ? entry : that.templateLoader.loadTemplate(that, entry).then(function (x) {
            return entry;
          });
        }
      });
      return _this;
    }

    DefaultLoader.prototype.useTemplateLoader = function useTemplateLoader(templateLoader) {
      this.templateLoader = templateLoader;
    };

    DefaultLoader.prototype.loadAllModules = function loadAllModules(ids) {
      var loads = [];

      for (var i = 0, ii = ids.length; i < ii; ++i) {
        loads.push(this.loadModule(ids[i]));
      }

      return Promise.all(loads);
    };

    DefaultLoader.prototype.loadTemplate = function loadTemplate(url) {
      return this._import(this.applyPluginToUrl(url, 'template-registry-entry'));
    };

    DefaultLoader.prototype.loadText = function loadText(url) {
      return this._import(this.applyPluginToUrl(url, this.textPluginName)).then(function (textOrModule) {
        if (typeof textOrModule === 'string') {
          return textOrModule;
        }

        return textOrModule['default'];
      });
    };

    return DefaultLoader;
  }(_aureliaLoader.Loader);

  _aureliaPal.PLATFORM.Loader = DefaultLoader;

  if (!_aureliaPal.PLATFORM.global.System || !_aureliaPal.PLATFORM.global.System.import) {
    if (_aureliaPal.PLATFORM.global.requirejs) {
      var getDefined = void 0;
      if (_typeof(_aureliaPal.PLATFORM.global.requirejs.s) === 'object') {
        getDefined = function getDefined() {
          return _aureliaPal.PLATFORM.global.requirejs.s.contexts._.defined;
        };
      } else if (_typeof(_aureliaPal.PLATFORM.global.requirejs.contexts) === 'object') {
        getDefined = function getDefined() {
          return _aureliaPal.PLATFORM.global.requirejs.contexts._.defined;
        };
      } else if (typeof _aureliaPal.PLATFORM.global.requirejs.definedValues === 'function') {
        getDefined = function getDefined() {
          return _aureliaPal.PLATFORM.global.requirejs.definedValues();
        };
      } else {
        getDefined = function getDefined() {
          return {};
        };
      }
      _aureliaPal.PLATFORM.eachModule = function (callback) {
        var defined = getDefined();
        for (var key in defined) {
          try {
            if (callback(key, defined[key])) return;
          } catch (e) {}
        }
      };
    } else {
      _aureliaPal.PLATFORM.eachModule = function (callback) {};
    }

    DefaultLoader.prototype._import = function (moduleId) {
      return new Promise(function (resolve, reject) {
        _aureliaPal.PLATFORM.global.require([moduleId], resolve, reject);
      });
    };

    DefaultLoader.prototype.loadModule = function (id) {
      var _this2 = this;

      var existing = this.moduleRegistry[id];
      if (existing !== undefined) {
        return Promise.resolve(existing);
      }

      return new Promise(function (resolve, reject) {
        _aureliaPal.PLATFORM.global.require([id], function (m) {
          _this2.moduleRegistry[id] = m;
          resolve(ensureOriginOnExports(m, id));
        }, reject);
      });
    };

    DefaultLoader.prototype.map = function (id, source) {};

    DefaultLoader.prototype.normalize = function (moduleId, relativeTo) {
      return Promise.resolve(moduleId);
    };

    DefaultLoader.prototype.normalizeSync = function (moduleId, relativeTo) {
      return moduleId;
    };

    DefaultLoader.prototype.applyPluginToUrl = function (url, pluginName) {
      return pluginName + '!' + url;
    };

    DefaultLoader.prototype.addPlugin = function (pluginName, implementation) {
      var nonAnonDefine = define;
      nonAnonDefine(pluginName, [], {
        'load': function load(name, req, onload) {
          var result = implementation.fetch(name);
          Promise.resolve(result).then(onload);
        }
      });
    };
  } else {
    _aureliaPal.PLATFORM.eachModule = function (callback) {
      if (System.registry) {
        var keys = Array.from(System.registry.keys());
        for (var i = 0; i < keys.length; i++) {
          try {
            var key = keys[i];
            if (callback(key, System.registry.get(key))) {
              return;
            }
          } catch (e) {}
        }
        return;
      }

      var modules = System._loader.modules;

      for (var _key in modules) {
        try {
          if (callback(_key, modules[_key].module)) return;
        } catch (e) {}
      }
    };

    DefaultLoader.prototype._import = function (moduleId) {
      return System.import(moduleId);
    };

    DefaultLoader.prototype.loadModule = function (id) {
      var _this3 = this;

      return System.normalize(id).then(function (newId) {
        var existing = _this3.moduleRegistry[newId];
        if (existing !== undefined) {
          return Promise.resolve(existing);
        }

        return System.import(newId).then(function (m) {
          _this3.moduleRegistry[newId] = m;
          return ensureOriginOnExports(m, newId);
        });
      });
    };

    DefaultLoader.prototype.map = function (id, source) {
      var _map;

      System.config({ map: (_map = {}, _map[id] = source, _map) });
    };

    DefaultLoader.prototype.normalizeSync = function (moduleId, relativeTo) {
      return System.normalizeSync(moduleId, relativeTo);
    };

    DefaultLoader.prototype.normalize = function (moduleId, relativeTo) {
      return System.normalize(moduleId, relativeTo);
    };

    DefaultLoader.prototype.applyPluginToUrl = function (url, pluginName) {
      return url + '!' + pluginName;
    };

    DefaultLoader.prototype.addPlugin = function (pluginName, implementation) {
      System.set(pluginName, System.newModule({
        'fetch': function fetch(load, _fetch) {
          var result = implementation.fetch(load.address);
          return Promise.resolve(result).then(function (x) {
            load.metadata.result = x;
            return '';
          });
        },
        'instantiate': function instantiate(load) {
          return load.metadata.result;
        }
      }));
    };
  }
});
define('aurelia-logging',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.getLogger = getLogger;
  exports.addAppender = addAppender;
  exports.removeAppender = removeAppender;
  exports.getAppenders = getAppenders;
  exports.clearAppenders = clearAppenders;
  exports.addCustomLevel = addCustomLevel;
  exports.removeCustomLevel = removeCustomLevel;
  exports.setLevel = setLevel;
  exports.getLevel = getLevel;

  

  var logLevel = exports.logLevel = {
    none: 0,
    error: 10,
    warn: 20,
    info: 30,
    debug: 40
  };

  var loggers = {};
  var appenders = [];
  var globalDefaultLevel = logLevel.none;

  var standardLevels = ['none', 'error', 'warn', 'info', 'debug'];
  function isStandardLevel(level) {
    return standardLevels.filter(function (l) {
      return l === level;
    }).length > 0;
  }

  function appendArgs() {
    return [this].concat(Array.prototype.slice.call(arguments));
  }

  function logFactory(level) {
    var threshold = logLevel[level];
    return function () {
      if (this.level < threshold) {
        return;
      }

      var args = appendArgs.apply(this, arguments);
      var i = appenders.length;
      while (i--) {
        var _appenders$i;

        (_appenders$i = appenders[i])[level].apply(_appenders$i, args);
      }
    };
  }

  function logFactoryCustom(level) {
    var threshold = logLevel[level];
    return function () {
      if (this.level < threshold) {
        return;
      }

      var args = appendArgs.apply(this, arguments);
      var i = appenders.length;
      while (i--) {
        var appender = appenders[i];
        if (appender[level] !== undefined) {
          appender[level].apply(appender, args);
        }
      }
    };
  }

  function connectLoggers() {
    var proto = Logger.prototype;
    for (var _level in logLevel) {
      if (isStandardLevel(_level)) {
        if (_level !== 'none') {
          proto[_level] = logFactory(_level);
        }
      } else {
        proto[_level] = logFactoryCustom(_level);
      }
    }
  }

  function disconnectLoggers() {
    var proto = Logger.prototype;
    for (var _level2 in logLevel) {
      if (_level2 !== 'none') {
        proto[_level2] = function () {};
      }
    }
  }

  function getLogger(id) {
    return loggers[id] || new Logger(id);
  }

  function addAppender(appender) {
    if (appenders.push(appender) === 1) {
      connectLoggers();
    }
  }

  function removeAppender(appender) {
    appenders = appenders.filter(function (a) {
      return a !== appender;
    });
  }

  function getAppenders() {
    return [].concat(appenders);
  }

  function clearAppenders() {
    appenders = [];
    disconnectLoggers();
  }

  function addCustomLevel(name, value) {
    if (logLevel[name] !== undefined) {
      throw Error('Log level "' + name + '" already exists.');
    }

    if (isNaN(value)) {
      throw Error('Value must be a number.');
    }

    logLevel[name] = value;

    if (appenders.length > 0) {
      connectLoggers();
    } else {
      Logger.prototype[name] = function () {};
    }
  }

  function removeCustomLevel(name) {
    if (logLevel[name] === undefined) {
      return;
    }

    if (isStandardLevel(name)) {
      throw Error('Built-in log level "' + name + '" cannot be removed.');
    }

    delete logLevel[name];
    delete Logger.prototype[name];
  }

  function setLevel(level) {
    globalDefaultLevel = level;
    for (var key in loggers) {
      loggers[key].setLevel(level);
    }
  }

  function getLevel() {
    return globalDefaultLevel;
  }

  var Logger = exports.Logger = function () {
    function Logger(id) {
      

      var cached = loggers[id];
      if (cached) {
        return cached;
      }

      loggers[id] = this;
      this.id = id;
      this.level = globalDefaultLevel;
    }

    Logger.prototype.debug = function debug(message) {};

    Logger.prototype.info = function info(message) {};

    Logger.prototype.warn = function warn(message) {};

    Logger.prototype.error = function error(message) {};

    Logger.prototype.setLevel = function setLevel(level) {
      this.level = level;
    };

    Logger.prototype.isDebugEnabled = function isDebugEnabled() {
      return this.level === logLevel.debug;
    };

    return Logger;
  }();
});
define('aurelia-logging-console',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  

  var ConsoleAppender = exports.ConsoleAppender = function () {
    function ConsoleAppender() {
      
    }

    ConsoleAppender.prototype.debug = function debug(logger) {
      var _console;

      for (var _len = arguments.length, rest = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        rest[_key - 1] = arguments[_key];
      }

      (_console = console).debug.apply(_console, ["DEBUG [" + logger.id + "]"].concat(rest));
    };

    ConsoleAppender.prototype.info = function info(logger) {
      var _console2;

      for (var _len2 = arguments.length, rest = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        rest[_key2 - 1] = arguments[_key2];
      }

      (_console2 = console).info.apply(_console2, ["INFO [" + logger.id + "]"].concat(rest));
    };

    ConsoleAppender.prototype.warn = function warn(logger) {
      var _console3;

      for (var _len3 = arguments.length, rest = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        rest[_key3 - 1] = arguments[_key3];
      }

      (_console3 = console).warn.apply(_console3, ["WARN [" + logger.id + "]"].concat(rest));
    };

    ConsoleAppender.prototype.error = function error(logger) {
      var _console4;

      for (var _len4 = arguments.length, rest = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        rest[_key4 - 1] = arguments[_key4];
      }

      (_console4 = console).error.apply(_console4, ["ERROR [" + logger.id + "]"].concat(rest));
    };

    return ConsoleAppender;
  }();
});
define('aurelia-metadata',['exports', 'aurelia-pal'], function (exports, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Origin = exports.metadata = undefined;
  exports.decorators = decorators;
  exports.deprecated = deprecated;
  exports.mixin = mixin;
  exports.protocol = protocol;

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  function isObject(val) {
    return val && (typeof val === 'function' || (typeof val === 'undefined' ? 'undefined' : _typeof(val)) === 'object');
  }

  var metadata = exports.metadata = {
    resource: 'aurelia:resource',
    paramTypes: 'design:paramtypes',
    propertyType: 'design:type',
    properties: 'design:properties',
    get: function get(metadataKey, target, targetKey) {
      if (!isObject(target)) {
        return undefined;
      }
      var result = metadata.getOwn(metadataKey, target, targetKey);
      return result === undefined ? metadata.get(metadataKey, Object.getPrototypeOf(target), targetKey) : result;
    },
    getOwn: function getOwn(metadataKey, target, targetKey) {
      if (!isObject(target)) {
        return undefined;
      }
      return Reflect.getOwnMetadata(metadataKey, target, targetKey);
    },
    define: function define(metadataKey, metadataValue, target, targetKey) {
      Reflect.defineMetadata(metadataKey, metadataValue, target, targetKey);
    },
    getOrCreateOwn: function getOrCreateOwn(metadataKey, Type, target, targetKey) {
      var result = metadata.getOwn(metadataKey, target, targetKey);

      if (result === undefined) {
        result = new Type();
        Reflect.defineMetadata(metadataKey, result, target, targetKey);
      }

      return result;
    }
  };

  var originStorage = new Map();
  var unknownOrigin = Object.freeze({ moduleId: undefined, moduleMember: undefined });

  var Origin = exports.Origin = function () {
    function Origin(moduleId, moduleMember) {
      

      this.moduleId = moduleId;
      this.moduleMember = moduleMember;
    }

    Origin.get = function get(fn) {
      var origin = originStorage.get(fn);

      if (origin === undefined) {
        _aureliaPal.PLATFORM.eachModule(function (key, value) {
          if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
            for (var name in value) {
              try {
                var exp = value[name];
                if (exp === fn) {
                  originStorage.set(fn, origin = new Origin(key, name));
                  return true;
                }
              } catch (e) {}
            }
          }

          if (value === fn) {
            originStorage.set(fn, origin = new Origin(key, 'default'));
            return true;
          }

          return false;
        });
      }

      return origin || unknownOrigin;
    };

    Origin.set = function set(fn, origin) {
      originStorage.set(fn, origin);
    };

    return Origin;
  }();

  function decorators() {
    for (var _len = arguments.length, rest = Array(_len), _key = 0; _key < _len; _key++) {
      rest[_key] = arguments[_key];
    }

    var applicator = function applicator(target, key, descriptor) {
      var i = rest.length;

      if (key) {
        descriptor = descriptor || {
          value: target[key],
          writable: true,
          configurable: true,
          enumerable: true
        };

        while (i--) {
          descriptor = rest[i](target, key, descriptor) || descriptor;
        }

        Object.defineProperty(target, key, descriptor);
      } else {
        while (i--) {
          target = rest[i](target) || target;
        }
      }

      return target;
    };

    applicator.on = applicator;
    return applicator;
  }

  function deprecated(optionsOrTarget, maybeKey, maybeDescriptor) {
    function decorator(target, key, descriptor) {
      var methodSignature = target.constructor.name + '#' + key;
      var options = maybeKey ? {} : optionsOrTarget || {};
      var message = 'DEPRECATION - ' + methodSignature;

      if (typeof descriptor.value !== 'function') {
        throw new SyntaxError('Only methods can be marked as deprecated.');
      }

      if (options.message) {
        message += ' - ' + options.message;
      }

      return _extends({}, descriptor, {
        value: function deprecationWrapper() {
          if (options.error) {
            throw new Error(message);
          } else {
            console.warn(message);
          }

          return descriptor.value.apply(this, arguments);
        }
      });
    }

    return maybeKey ? decorator(optionsOrTarget, maybeKey, maybeDescriptor) : decorator;
  }

  function mixin(behavior) {
    var instanceKeys = Object.keys(behavior);

    function _mixin(possible) {
      var decorator = function decorator(target) {
        var resolvedTarget = typeof target === 'function' ? target.prototype : target;

        var i = instanceKeys.length;
        while (i--) {
          var property = instanceKeys[i];
          Object.defineProperty(resolvedTarget, property, {
            value: behavior[property],
            writable: true
          });
        }
      };

      return possible ? decorator(possible) : decorator;
    }

    return _mixin;
  }

  function alwaysValid() {
    return true;
  }
  function noCompose() {}

  function ensureProtocolOptions(options) {
    if (options === undefined) {
      options = {};
    } else if (typeof options === 'function') {
      options = {
        validate: options
      };
    }

    if (!options.validate) {
      options.validate = alwaysValid;
    }

    if (!options.compose) {
      options.compose = noCompose;
    }

    return options;
  }

  function createProtocolValidator(validate) {
    return function (target) {
      var result = validate(target);
      return result === true;
    };
  }

  function createProtocolAsserter(name, validate) {
    return function (target) {
      var result = validate(target);
      if (result !== true) {
        throw new Error(result || name + ' was not correctly implemented.');
      }
    };
  }

  function protocol(name, options) {
    options = ensureProtocolOptions(options);

    var result = function result(target) {
      var resolvedTarget = typeof target === 'function' ? target.prototype : target;

      options.compose(resolvedTarget);
      result.assert(resolvedTarget);

      Object.defineProperty(resolvedTarget, 'protocol:' + name, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: true
      });
    };

    result.validate = createProtocolValidator(options.validate);
    result.assert = createProtocolAsserter(name, options.validate);

    return result;
  }

  protocol.create = function (name, options) {
    options = ensureProtocolOptions(options);
    var hidden = 'protocol:' + name;
    var result = function result(target) {
      var decorator = protocol(name, options);
      return target ? decorator(target) : decorator;
    };

    result.decorates = function (obj) {
      return obj[hidden] === true;
    };
    result.validate = createProtocolValidator(options.validate);
    result.assert = createProtocolAsserter(name, options.validate);

    return result;
  };
});
define('aurelia-pal',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.AggregateError = AggregateError;
  exports.initializePAL = initializePAL;
  exports.reset = reset;
  function AggregateError(message, innerError, skipIfAlreadyAggregate) {
    if (innerError) {
      if (innerError.innerError && skipIfAlreadyAggregate) {
        return innerError;
      }

      var separator = '\n------------------------------------------------\n';

      message += separator + 'Inner Error:\n';

      if (typeof innerError === 'string') {
        message += 'Message: ' + innerError;
      } else {
        if (innerError.message) {
          message += 'Message: ' + innerError.message;
        } else {
          message += 'Unknown Inner Error Type. Displaying Inner Error as JSON:\n ' + JSON.stringify(innerError, null, '  ');
        }

        if (innerError.stack) {
          message += '\nInner Error Stack:\n' + innerError.stack;
          message += '\nEnd Inner Error Stack';
        }
      }

      message += separator;
    }

    var e = new Error(message);
    if (innerError) {
      e.innerError = innerError;
    }

    return e;
  }

  var FEATURE = exports.FEATURE = {};

  var PLATFORM = exports.PLATFORM = {
    noop: function noop() {},
    eachModule: function eachModule() {},
    moduleName: function (_moduleName) {
      function moduleName(_x) {
        return _moduleName.apply(this, arguments);
      }

      moduleName.toString = function () {
        return _moduleName.toString();
      };

      return moduleName;
    }(function (moduleName) {
      return moduleName;
    })
  };

  PLATFORM.global = function () {
    if (typeof self !== 'undefined') {
      return self;
    }

    if (typeof global !== 'undefined') {
      return global;
    }

    return new Function('return this')();
  }();

  var DOM = exports.DOM = {};
  var isInitialized = exports.isInitialized = false;
  function initializePAL(callback) {
    if (isInitialized) {
      return;
    }
    exports.isInitialized = isInitialized = true;
    if (typeof Object.getPropertyDescriptor !== 'function') {
      Object.getPropertyDescriptor = function (subject, name) {
        var pd = Object.getOwnPropertyDescriptor(subject, name);
        var proto = Object.getPrototypeOf(subject);
        while (typeof pd === 'undefined' && proto !== null) {
          pd = Object.getOwnPropertyDescriptor(proto, name);
          proto = Object.getPrototypeOf(proto);
        }
        return pd;
      };
    }

    callback(PLATFORM, FEATURE, DOM);
  }
  function reset() {
    exports.isInitialized = isInitialized = false;
  }
});
define('aurelia-pal-browser',['exports', 'aurelia-pal'], function (exports, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports._DOM = exports._FEATURE = exports._PLATFORM = undefined;
  exports.initialize = initialize;

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var _PLATFORM = exports._PLATFORM = {
    location: window.location,
    history: window.history,
    addEventListener: function addEventListener(eventName, callback, capture) {
      this.global.addEventListener(eventName, callback, capture);
    },
    removeEventListener: function removeEventListener(eventName, callback, capture) {
      this.global.removeEventListener(eventName, callback, capture);
    },

    performance: window.performance,
    requestAnimationFrame: function requestAnimationFrame(callback) {
      return this.global.requestAnimationFrame(callback);
    }
  };

  if (typeof FEATURE_NO_IE === 'undefined') {
    var test = function test() {};

    if (test.name === undefined) {
      Object.defineProperty(Function.prototype, 'name', {
        get: function get() {
          var name = this.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];

          Object.defineProperty(this, 'name', { value: name });
          return name;
        }
      });
    }
  }

  if (typeof FEATURE_NO_IE === 'undefined') {
    if (!('classList' in document.createElement('_')) || document.createElementNS && !('classList' in document.createElementNS('http://www.w3.org/2000/svg', 'g'))) {
      var protoProp = 'prototype';
      var strTrim = String.prototype.trim;
      var arrIndexOf = Array.prototype.indexOf;
      var emptyArray = [];

      var DOMEx = function DOMEx(type, message) {
        this.name = type;
        this.code = DOMException[type];
        this.message = message;
      };

      var checkTokenAndGetIndex = function checkTokenAndGetIndex(classList, token) {
        if (token === '') {
          throw new DOMEx('SYNTAX_ERR', 'An invalid or illegal string was specified');
        }

        if (/\s/.test(token)) {
          throw new DOMEx('INVALID_CHARACTER_ERR', 'String contains an invalid character');
        }

        return arrIndexOf.call(classList, token);
      };

      var ClassList = function ClassList(elem) {
        var trimmedClasses = strTrim.call(elem.getAttribute('class') || '');
        var classes = trimmedClasses ? trimmedClasses.split(/\s+/) : emptyArray;

        for (var i = 0, ii = classes.length; i < ii; ++i) {
          this.push(classes[i]);
        }

        this._updateClassName = function () {
          elem.setAttribute('class', this.toString());
        };
      };

      var classListProto = ClassList[protoProp] = [];

      DOMEx[protoProp] = Error[protoProp];

      classListProto.item = function (i) {
        return this[i] || null;
      };

      classListProto.contains = function (token) {
        token += '';
        return checkTokenAndGetIndex(this, token) !== -1;
      };

      classListProto.add = function () {
        var tokens = arguments;
        var i = 0;
        var ii = tokens.length;
        var token = void 0;
        var updated = false;

        do {
          token = tokens[i] + '';
          if (checkTokenAndGetIndex(this, token) === -1) {
            this.push(token);
            updated = true;
          }
        } while (++i < ii);

        if (updated) {
          this._updateClassName();
        }
      };

      classListProto.remove = function () {
        var tokens = arguments;
        var i = 0;
        var ii = tokens.length;
        var token = void 0;
        var updated = false;
        var index = void 0;

        do {
          token = tokens[i] + '';
          index = checkTokenAndGetIndex(this, token);
          while (index !== -1) {
            this.splice(index, 1);
            updated = true;
            index = checkTokenAndGetIndex(this, token);
          }
        } while (++i < ii);

        if (updated) {
          this._updateClassName();
        }
      };

      classListProto.toggle = function (token, force) {
        token += '';

        var result = this.contains(token);
        var method = result ? force !== true && 'remove' : force !== false && 'add';

        if (method) {
          this[method](token);
        }

        if (force === true || force === false) {
          return force;
        }

        return !result;
      };

      classListProto.toString = function () {
        return this.join(' ');
      };

      Object.defineProperty(Element.prototype, 'classList', {
        get: function get() {
          return new ClassList(this);
        },
        enumerable: true,
        configurable: true
      });
    } else {
      var testElement = document.createElement('_');
      testElement.classList.add('c1', 'c2');

      if (!testElement.classList.contains('c2')) {
        var createMethod = function createMethod(method) {
          var original = DOMTokenList.prototype[method];

          DOMTokenList.prototype[method] = function (token) {
            for (var i = 0, ii = arguments.length; i < ii; ++i) {
              token = arguments[i];
              original.call(this, token);
            }
          };
        };

        createMethod('add');
        createMethod('remove');
      }

      testElement.classList.toggle('c3', false);

      if (testElement.classList.contains('c3')) {
        var _toggle = DOMTokenList.prototype.toggle;

        DOMTokenList.prototype.toggle = function (token, force) {
          if (1 in arguments && !this.contains(token) === !force) {
            return force;
          }

          return _toggle.call(this, token);
        };
      }

      testElement = null;
    }
  }

  if (typeof FEATURE_NO_IE === 'undefined') {
    var _filterEntries = function _filterEntries(key, value) {
      var i = 0,
          n = _entries.length,
          result = [];
      for (; i < n; i++) {
        if (_entries[i][key] == value) {
          result.push(_entries[i]);
        }
      }
      return result;
    };

    var _clearEntries = function _clearEntries(type, name) {
      var i = _entries.length,
          entry;
      while (i--) {
        entry = _entries[i];
        if (entry.entryType == type && (name === void 0 || entry.name == name)) {
          _entries.splice(i, 1);
        }
      }
    };

    // @license http://opensource.org/licenses/MIT
    if ('performance' in window === false) {
      window.performance = {};
    }

    if ('now' in window.performance === false) {
      var nowOffset = Date.now();

      if (performance.timing && performance.timing.navigationStart) {
        nowOffset = performance.timing.navigationStart;
      }

      window.performance.now = function now() {
        return Date.now() - nowOffset;
      };
    }

    var startOffset = Date.now ? Date.now() : +new Date();
    var _entries = [];
    var _marksIndex = {};

    ;

    if (!window.performance.mark) {
      window.performance.mark = window.performance.webkitMark || function (name) {
        var mark = {
          name: name,
          entryType: "mark",
          startTime: window.performance.now(),
          duration: 0
        };

        _entries.push(mark);
        _marksIndex[name] = mark;
      };
    }

    if (!window.performance.measure) {
      window.performance.measure = window.performance.webkitMeasure || function (name, startMark, endMark) {
        startMark = _marksIndex[startMark].startTime;
        endMark = _marksIndex[endMark].startTime;

        _entries.push({
          name: name,
          entryType: "measure",
          startTime: startMark,
          duration: endMark - startMark
        });
      };
    }

    if (!window.performance.getEntriesByType) {
      window.performance.getEntriesByType = window.performance.webkitGetEntriesByType || function (type) {
        return _filterEntries("entryType", type);
      };
    }

    if (!window.performance.getEntriesByName) {
      window.performance.getEntriesByName = window.performance.webkitGetEntriesByName || function (name) {
        return _filterEntries("name", name);
      };
    }

    if (!window.performance.clearMarks) {
      window.performance.clearMarks = window.performance.webkitClearMarks || function (name) {
        _clearEntries("mark", name);
      };
    }

    if (!window.performance.clearMeasures) {
      window.performance.clearMeasures = window.performance.webkitClearMeasures || function (name) {
        _clearEntries("measure", name);
      };
    }

    _PLATFORM.performance = window.performance;
  }

  if (typeof FEATURE_NO_IE === 'undefined') {
    var con = window.console = window.console || {};
    var nop = function nop() {};

    if (!con.memory) con.memory = {};
    ('assert,clear,count,debug,dir,dirxml,error,exception,group,' + 'groupCollapsed,groupEnd,info,log,markTimeline,profile,profiles,profileEnd,' + 'show,table,time,timeEnd,timeline,timelineEnd,timeStamp,trace,warn').split(',').forEach(function (m) {
      if (!con[m]) con[m] = nop;
    });

    if (_typeof(con.log) === 'object') {
      'log,info,warn,error,assert,dir,clear,profile,profileEnd'.split(',').forEach(function (method) {
        console[method] = this.bind(console[method], console);
      }, Function.prototype.call);
    }
  }

  if (typeof FEATURE_NO_IE === 'undefined') {
    if (!window.CustomEvent || typeof window.CustomEvent !== 'function') {
      var _CustomEvent = function _CustomEvent(event, params) {
        params = params || {
          bubbles: false,
          cancelable: false,
          detail: undefined
        };

        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
      };

      _CustomEvent.prototype = window.Event.prototype;
      window.CustomEvent = _CustomEvent;
    }
  }

  if (Element && !Element.prototype.matches) {
    var proto = Element.prototype;
    proto.matches = proto.matchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || proto.oMatchesSelector || proto.webkitMatchesSelector;
  }

  var _FEATURE = exports._FEATURE = {
    shadowDOM: !!HTMLElement.prototype.attachShadow,
    scopedCSS: 'scoped' in document.createElement('style'),
    htmlTemplateElement: function () {
      var d = document.createElement('div');
      d.innerHTML = '<template></template>';
      return 'content' in d.children[0];
    }(),
    mutationObserver: !!(window.MutationObserver || window.WebKitMutationObserver),
    ensureHTMLTemplateElement: function ensureHTMLTemplateElement(t) {
      return t;
    }
  };

  if (typeof FEATURE_NO_IE === 'undefined') {
    var isSVGTemplate = function isSVGTemplate(el) {
      return el.tagName === 'template' && el.namespaceURI === 'http://www.w3.org/2000/svg';
    };

    var fixSVGTemplateElement = function fixSVGTemplateElement(el) {
      var template = el.ownerDocument.createElement('template');
      var attrs = el.attributes;
      var length = attrs.length;
      var attr = void 0;

      el.parentNode.insertBefore(template, el);

      while (length-- > 0) {
        attr = attrs[length];
        template.setAttribute(attr.name, attr.value);
        el.removeAttribute(attr.name);
      }

      el.parentNode.removeChild(el);

      return fixHTMLTemplateElement(template);
    };

    var fixHTMLTemplateElement = function fixHTMLTemplateElement(template) {
      var content = template.content = document.createDocumentFragment();
      var child = void 0;

      while (child = template.firstChild) {
        content.appendChild(child);
      }

      return template;
    };

    var fixHTMLTemplateElementRoot = function fixHTMLTemplateElementRoot(template) {
      var content = fixHTMLTemplateElement(template).content;
      var childTemplates = content.querySelectorAll('template');

      for (var i = 0, ii = childTemplates.length; i < ii; ++i) {
        var child = childTemplates[i];

        if (isSVGTemplate(child)) {
          fixSVGTemplateElement(child);
        } else {
          fixHTMLTemplateElement(child);
        }
      }

      return template;
    };

    if (!_FEATURE.htmlTemplateElement) {
      _FEATURE.ensureHTMLTemplateElement = fixHTMLTemplateElementRoot;
    }
  }

  var shadowPoly = window.ShadowDOMPolyfill || null;

  var _DOM = exports._DOM = {
    Element: Element,
    NodeList: NodeList,
    SVGElement: SVGElement,
    boundary: 'aurelia-dom-boundary',
    addEventListener: function addEventListener(eventName, callback, capture) {
      document.addEventListener(eventName, callback, capture);
    },
    removeEventListener: function removeEventListener(eventName, callback, capture) {
      document.removeEventListener(eventName, callback, capture);
    },
    adoptNode: function adoptNode(node) {
      return document.adoptNode(node);
    },
    createAttribute: function createAttribute(name) {
      return document.createAttribute(name);
    },
    createElement: function createElement(tagName) {
      return document.createElement(tagName);
    },
    createTextNode: function createTextNode(text) {
      return document.createTextNode(text);
    },
    createComment: function createComment(text) {
      return document.createComment(text);
    },
    createDocumentFragment: function createDocumentFragment() {
      return document.createDocumentFragment();
    },
    createTemplateElement: function createTemplateElement() {
      var template = document.createElement('template');
      return _FEATURE.ensureHTMLTemplateElement(template);
    },
    createMutationObserver: function createMutationObserver(callback) {
      return new (window.MutationObserver || window.WebKitMutationObserver)(callback);
    },
    createCustomEvent: function createCustomEvent(eventType, options) {
      return new window.CustomEvent(eventType, options);
    },
    dispatchEvent: function dispatchEvent(evt) {
      document.dispatchEvent(evt);
    },
    getComputedStyle: function getComputedStyle(element) {
      return window.getComputedStyle(element);
    },
    getElementById: function getElementById(id) {
      return document.getElementById(id);
    },
    querySelector: function querySelector(query) {
      return document.querySelector(query);
    },
    querySelectorAll: function querySelectorAll(query) {
      return document.querySelectorAll(query);
    },
    nextElementSibling: function nextElementSibling(element) {
      if (element.nextElementSibling) {
        return element.nextElementSibling;
      }
      do {
        element = element.nextSibling;
      } while (element && element.nodeType !== 1);
      return element;
    },
    createTemplateFromMarkup: function createTemplateFromMarkup(markup) {
      var parser = document.createElement('div');
      parser.innerHTML = markup;

      var temp = parser.firstElementChild;
      if (!temp || temp.nodeName !== 'TEMPLATE') {
        throw new Error('Template markup must be wrapped in a <template> element e.g. <template> <!-- markup here --> </template>');
      }

      return _FEATURE.ensureHTMLTemplateElement(temp);
    },
    appendNode: function appendNode(newNode, parentNode) {
      (parentNode || document.body).appendChild(newNode);
    },
    replaceNode: function replaceNode(newNode, node, parentNode) {
      if (node.parentNode) {
        node.parentNode.replaceChild(newNode, node);
      } else if (shadowPoly !== null) {
        shadowPoly.unwrap(parentNode).replaceChild(shadowPoly.unwrap(newNode), shadowPoly.unwrap(node));
      } else {
        parentNode.replaceChild(newNode, node);
      }
    },
    removeNode: function removeNode(node, parentNode) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      } else if (parentNode) {
        if (shadowPoly !== null) {
          shadowPoly.unwrap(parentNode).removeChild(shadowPoly.unwrap(node));
        } else {
          parentNode.removeChild(node);
        }
      }
    },
    injectStyles: function injectStyles(styles, destination, prepend, id) {
      if (id) {
        var oldStyle = document.getElementById(id);
        if (oldStyle) {
          var isStyleTag = oldStyle.tagName.toLowerCase() === 'style';

          if (isStyleTag) {
            oldStyle.innerHTML = styles;
            return;
          }

          throw new Error('The provided id does not indicate a style tag.');
        }
      }

      var node = document.createElement('style');
      node.innerHTML = styles;
      node.type = 'text/css';

      if (id) {
        node.id = id;
      }

      destination = destination || document.head;

      if (prepend && destination.childNodes.length > 0) {
        destination.insertBefore(node, destination.childNodes[0]);
      } else {
        destination.appendChild(node);
      }

      return node;
    }
  };

  function initialize() {
    if (_aureliaPal.isInitialized) {
      return;
    }

    (0, _aureliaPal.initializePAL)(function (platform, feature, dom) {
      Object.assign(platform, _PLATFORM);
      Object.assign(feature, _FEATURE);
      Object.assign(dom, _DOM);

      Object.defineProperty(dom, 'title', {
        get: function get() {
          return document.title;
        },
        set: function set(value) {
          document.title = value;
        }
      });

      Object.defineProperty(dom, 'activeElement', {
        get: function get() {
          return document.activeElement;
        }
      });

      Object.defineProperty(platform, 'XMLHttpRequest', {
        get: function get() {
          return platform.global.XMLHttpRequest;
        }
      });
    });
  }
});
define('aurelia-path',['exports'], function (exports) { 'use strict';

    function trimDots(ary) {
        for (var i = 0; i < ary.length; ++i) {
            var part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            }
            else if (part === '..') {
                if (i === 0 || (i === 1 && ary[2] === '..') || ary[i - 1] === '..') {
                    continue;
                }
                else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }
    function relativeToFile(name, file) {
        var fileParts = file && file.split('/');
        var nameParts = name.trim().split('/');
        if (nameParts[0].charAt(0) === '.' && fileParts) {
            var normalizedBaseParts = fileParts.slice(0, fileParts.length - 1);
            nameParts.unshift.apply(nameParts, normalizedBaseParts);
        }
        trimDots(nameParts);
        return nameParts.join('/');
    }
    function join(path1, path2) {
        if (!path1) {
            return path2;
        }
        if (!path2) {
            return path1;
        }
        var schemeMatch = path1.match(/^([^/]*?:)\//);
        var scheme = (schemeMatch && schemeMatch.length > 0) ? schemeMatch[1] : '';
        path1 = path1.substr(scheme.length);
        var urlPrefix;
        if (path1.indexOf('///') === 0 && scheme === 'file:') {
            urlPrefix = '///';
        }
        else if (path1.indexOf('//') === 0) {
            urlPrefix = '//';
        }
        else if (path1.indexOf('/') === 0) {
            urlPrefix = '/';
        }
        else {
            urlPrefix = '';
        }
        var trailingSlash = path2.slice(-1) === '/' ? '/' : '';
        var url1 = path1.split('/');
        var url2 = path2.split('/');
        var url3 = [];
        for (var i = 0, ii = url1.length; i < ii; ++i) {
            if (url1[i] === '..') {
                if (url3.length && url3[url3.length - 1] !== '..') {
                    url3.pop();
                }
                else {
                    url3.push(url1[i]);
                }
            }
            else if (url1[i] === '.' || url1[i] === '') {
                continue;
            }
            else {
                url3.push(url1[i]);
            }
        }
        for (var i = 0, ii = url2.length; i < ii; ++i) {
            if (url2[i] === '..') {
                if (url3.length && url3[url3.length - 1] !== '..') {
                    url3.pop();
                }
                else {
                    url3.push(url2[i]);
                }
            }
            else if (url2[i] === '.' || url2[i] === '') {
                continue;
            }
            else {
                url3.push(url2[i]);
            }
        }
        return scheme + urlPrefix + url3.join('/') + trailingSlash;
    }
    var encode = encodeURIComponent;
    var encodeKey = function (k) { return encode(k).replace('%24', '$'); };
    function buildParam(key, value, traditional) {
        var result = [];
        if (value === null || value === undefined) {
            return result;
        }
        if (Array.isArray(value)) {
            for (var i = 0, l = value.length; i < l; i++) {
                if (traditional) {
                    result.push(encodeKey(key) + "=" + encode(value[i]));
                }
                else {
                    var arrayKey = key + '[' + (typeof value[i] === 'object' && value[i] !== null ? i : '') + ']';
                    result = result.concat(buildParam(arrayKey, value[i]));
                }
            }
        }
        else if (typeof (value) === 'object' && !traditional) {
            for (var propertyName in value) {
                result = result.concat(buildParam(key + '[' + propertyName + ']', value[propertyName]));
            }
        }
        else {
            result.push(encodeKey(key) + "=" + encode(value));
        }
        return result;
    }
    function buildQueryString(params, traditional) {
        var pairs = [];
        var keys = Object.keys(params || {}).sort();
        for (var i = 0, len = keys.length; i < len; i++) {
            var key = keys[i];
            pairs = pairs.concat(buildParam(key, params[key], traditional));
        }
        if (pairs.length === 0) {
            return '';
        }
        return pairs.join('&');
    }
    function processScalarParam(existedParam, value) {
        if (Array.isArray(existedParam)) {
            existedParam.push(value);
            return existedParam;
        }
        if (existedParam !== undefined) {
            return [existedParam, value];
        }
        return value;
    }
    function parseComplexParam(queryParams, keys, value) {
        var currentParams = queryParams;
        var keysLastIndex = keys.length - 1;
        for (var j = 0; j <= keysLastIndex; j++) {
            var key = keys[j] === '' ? currentParams.length : keys[j];
            preventPollution(key);
            if (j < keysLastIndex) {
                var prevValue = !currentParams[key] || typeof currentParams[key] === 'object' ? currentParams[key] : [currentParams[key]];
                currentParams = currentParams[key] = prevValue || (isNaN(keys[j + 1]) ? {} : []);
            }
            else {
                currentParams = currentParams[key] = value;
            }
        }
    }
    function parseQueryString(queryString) {
        var queryParams = {};
        if (!queryString || typeof queryString !== 'string') {
            return queryParams;
        }
        var query = queryString;
        if (query.charAt(0) === '?') {
            query = query.substr(1);
        }
        var pairs = query.replace(/\+/g, ' ').split('&');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            var key = decodeURIComponent(pair[0]);
            if (!key) {
                continue;
            }
            var keys = key.split('][');
            var keysLastIndex = keys.length - 1;
            if (/\[/.test(keys[0]) && /\]$/.test(keys[keysLastIndex])) {
                keys[keysLastIndex] = keys[keysLastIndex].replace(/\]$/, '');
                keys = keys.shift().split('[').concat(keys);
                keysLastIndex = keys.length - 1;
            }
            else {
                keysLastIndex = 0;
            }
            if (pair.length >= 2) {
                var value = pair[1] ? decodeURIComponent(pair[1]) : '';
                if (keysLastIndex) {
                    parseComplexParam(queryParams, keys, value);
                }
                else {
                    preventPollution(key);
                    queryParams[key] = processScalarParam(queryParams[key], value);
                }
            }
            else {
                queryParams[key] = true;
            }
        }
        return queryParams;
    }
    function preventPollution(key) {
        if (key === '__proto__') {
            throw new Error('Prototype pollution detected.');
        }
    }

    exports.buildQueryString = buildQueryString;
    exports.join = join;
    exports.parseQueryString = parseQueryString;
    exports.relativeToFile = relativeToFile;

    Object.defineProperty(exports, '__esModule', { value: true });

});
//# sourceMappingURL=aurelia-path.js.map

define('aurelia-polyfills',['aurelia-pal'], function (_aureliaPal) {
  'use strict';

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  if (typeof FEATURE_NO_ES2015 === 'undefined') {

    (function (Object, GOPS) {
      'use strict';

      if (GOPS in Object) return;

      var setDescriptor,
          G = _aureliaPal.PLATFORM.global,
          id = 0,
          random = '' + Math.random(),
          prefix = '__\x01symbol:',
          prefixLength = prefix.length,
          internalSymbol = '__\x01symbol@@' + random,
          DP = 'defineProperty',
          DPies = 'defineProperties',
          GOPN = 'getOwnPropertyNames',
          GOPD = 'getOwnPropertyDescriptor',
          PIE = 'propertyIsEnumerable',
          gOPN = Object[GOPN],
          gOPD = Object[GOPD],
          create = Object.create,
          keys = Object.keys,
          defineProperty = Object[DP],
          $defineProperties = Object[DPies],
          descriptor = gOPD(Object, GOPN),
          ObjectProto = Object.prototype,
          hOP = ObjectProto.hasOwnProperty,
          pIE = ObjectProto[PIE],
          toString = ObjectProto.toString,
          indexOf = Array.prototype.indexOf || function (v) {
        for (var i = this.length; i-- && this[i] !== v;) {}
        return i;
      },
          addInternalIfNeeded = function addInternalIfNeeded(o, uid, enumerable) {
        if (!hOP.call(o, internalSymbol)) {
          defineProperty(o, internalSymbol, {
            enumerable: false,
            configurable: false,
            writable: false,
            value: {}
          });
        }
        o[internalSymbol]['@@' + uid] = enumerable;
      },
          createWithSymbols = function createWithSymbols(proto, descriptors) {
        var self = create(proto);
        if (descriptors !== null && (typeof descriptors === 'undefined' ? 'undefined' : _typeof(descriptors)) === 'object') {
          gOPN(descriptors).forEach(function (key) {
            if (propertyIsEnumerable.call(descriptors, key)) {
              $defineProperty(self, key, descriptors[key]);
            }
          });
        }
        return self;
      },
          copyAsNonEnumerable = function copyAsNonEnumerable(descriptor) {
        var newDescriptor = create(descriptor);
        newDescriptor.enumerable = false;
        return newDescriptor;
      },
          get = function get() {},
          onlyNonSymbols = function onlyNonSymbols(name) {
        return name != internalSymbol && !hOP.call(source, name);
      },
          onlySymbols = function onlySymbols(name) {
        return name != internalSymbol && hOP.call(source, name);
      },
          propertyIsEnumerable = function propertyIsEnumerable(key) {
        var uid = '' + key;
        return onlySymbols(uid) ? hOP.call(this, uid) && this[internalSymbol] && this[internalSymbol]['@@' + uid] : pIE.call(this, key);
      },
          setAndGetSymbol = function setAndGetSymbol(uid) {
        var descriptor = {
          enumerable: false,
          configurable: true,
          get: get,
          set: function set(value) {
            setDescriptor(this, uid, {
              enumerable: false,
              configurable: true,
              writable: true,
              value: value
            });
            addInternalIfNeeded(this, uid, true);
          }
        };
        defineProperty(ObjectProto, uid, descriptor);
        return source[uid] = defineProperty(Object(uid), 'constructor', sourceConstructor);
      },
          _Symbol = function _Symbol2(description) {
        if (this && this !== G) {
          throw new TypeError('Symbol is not a constructor');
        }
        return setAndGetSymbol(prefix.concat(description || '', random, ++id));
      },
          source = create(null),
          sourceConstructor = { value: _Symbol },
          sourceMap = function sourceMap(uid) {
        return source[uid];
      },
          $defineProperty = function defineProp(o, key, descriptor) {
        var uid = '' + key;
        if (onlySymbols(uid)) {
          setDescriptor(o, uid, descriptor.enumerable ? copyAsNonEnumerable(descriptor) : descriptor);
          addInternalIfNeeded(o, uid, !!descriptor.enumerable);
        } else {
          defineProperty(o, key, descriptor);
        }
        return o;
      },
          $getOwnPropertySymbols = function getOwnPropertySymbols(o) {
        var cof = toString.call(o);
        o = cof === '[object String]' ? o.split('') : Object(o);
        return gOPN(o).filter(onlySymbols).map(sourceMap);
      };

      descriptor.value = $defineProperty;
      defineProperty(Object, DP, descriptor);

      descriptor.value = $getOwnPropertySymbols;
      defineProperty(Object, GOPS, descriptor);

      var cachedWindowNames = (typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' ? Object.getOwnPropertyNames(window) : [];
      var originalObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
      descriptor.value = function getOwnPropertyNames(o) {
        if (toString.call(o) === '[object Window]') {
          try {
            return originalObjectGetOwnPropertyNames(o);
          } catch (e) {
            return [].concat([], cachedWindowNames);
          }
        }
        return gOPN(o).filter(onlyNonSymbols);
      };
      defineProperty(Object, GOPN, descriptor);

      descriptor.value = function defineProperties(o, descriptors) {
        var symbols = $getOwnPropertySymbols(descriptors);
        if (symbols.length) {
          keys(descriptors).concat(symbols).forEach(function (uid) {
            if (propertyIsEnumerable.call(descriptors, uid)) {
              $defineProperty(o, uid, descriptors[uid]);
            }
          });
        } else {
          $defineProperties(o, descriptors);
        }
        return o;
      };
      defineProperty(Object, DPies, descriptor);

      descriptor.value = propertyIsEnumerable;
      defineProperty(ObjectProto, PIE, descriptor);

      descriptor.value = _Symbol;
      defineProperty(G, 'Symbol', descriptor);

      descriptor.value = function (key) {
        var uid = prefix.concat(prefix, key, random);
        return uid in ObjectProto ? source[uid] : setAndGetSymbol(uid);
      };
      defineProperty(_Symbol, 'for', descriptor);

      descriptor.value = function (symbol) {
        return hOP.call(source, symbol) ? symbol.slice(prefixLength * 2, -random.length) : void 0;
      };
      defineProperty(_Symbol, 'keyFor', descriptor);

      descriptor.value = function getOwnPropertyDescriptor(o, key) {
        var descriptor = gOPD(o, key);
        if (descriptor && onlySymbols(key)) {
          descriptor.enumerable = propertyIsEnumerable.call(o, key);
        }
        return descriptor;
      };
      defineProperty(Object, GOPD, descriptor);

      descriptor.value = function (proto, descriptors) {
        return arguments.length === 1 ? create(proto) : createWithSymbols(proto, descriptors);
      };
      defineProperty(Object, 'create', descriptor);

      descriptor.value = function () {
        var str = toString.call(this);
        return str === '[object String]' && onlySymbols(this) ? '[object Symbol]' : str;
      };
      defineProperty(ObjectProto, 'toString', descriptor);

      try {
        setDescriptor = create(defineProperty({}, prefix, {
          get: function get() {
            return defineProperty(this, prefix, { value: false })[prefix];
          }
        }))[prefix] || defineProperty;
      } catch (o_O) {
        setDescriptor = function setDescriptor(o, key, descriptor) {
          var protoDescriptor = gOPD(ObjectProto, key);
          delete ObjectProto[key];
          defineProperty(o, key, descriptor);
          defineProperty(ObjectProto, key, protoDescriptor);
        };
      }
    })(Object, 'getOwnPropertySymbols');

    (function (O, S) {
      var dP = O.defineProperty,
          ObjectProto = O.prototype,
          toString = ObjectProto.toString,
          toStringTag = 'toStringTag',
          descriptor;
      ['iterator', 'match', 'replace', 'search', 'split', 'hasInstance', 'isConcatSpreadable', 'unscopables', 'species', 'toPrimitive', toStringTag].forEach(function (name) {
        if (!(name in Symbol)) {
          dP(Symbol, name, { value: Symbol(name) });
          switch (name) {
            case toStringTag:
              descriptor = O.getOwnPropertyDescriptor(ObjectProto, 'toString');
              descriptor.value = function () {
                var str = toString.call(this),
                    tst = typeof this === 'undefined' || this === null ? undefined : this[Symbol.toStringTag];
                return typeof tst === 'undefined' ? str : '[object ' + tst + ']';
              };
              dP(ObjectProto, 'toString', descriptor);
              break;
          }
        }
      });
    })(Object, Symbol);

    (function (Si, AP, SP) {

      function returnThis() {
        return this;
      }

      if (!AP[Si]) AP[Si] = function () {
        var i = 0,
            self = this,
            iterator = {
          next: function next() {
            var done = self.length <= i;
            return done ? { done: done } : { done: done, value: self[i++] };
          }
        };
        iterator[Si] = returnThis;
        return iterator;
      };

      if (!SP[Si]) SP[Si] = function () {
        var fromCodePoint = String.fromCodePoint,
            self = this,
            i = 0,
            length = self.length,
            iterator = {
          next: function next() {
            var done = length <= i,
                c = done ? '' : fromCodePoint(self.codePointAt(i));
            i += c.length;
            return done ? { done: done } : { done: done, value: c };
          }
        };
        iterator[Si] = returnThis;
        return iterator;
      };
    })(Symbol.iterator, Array.prototype, String.prototype);
  }

  if (typeof FEATURE_NO_ES2015 === 'undefined') {

    Number.isNaN = Number.isNaN || function (value) {
      return value !== value;
    };

    Number.isFinite = Number.isFinite || function (value) {
      return typeof value === "number" && isFinite(value);
    };
  }

  if (!String.prototype.endsWith || function () {
    try {
      return !"ab".endsWith("a", 1);
    } catch (e) {
      return true;
    }
  }()) {
    String.prototype.endsWith = function (searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    };
  }

  if (!String.prototype.startsWith || function () {
    try {
      return !"ab".startsWith("b", 1);
    } catch (e) {
      return true;
    }
  }()) {
    String.prototype.startsWith = function (searchString, position) {
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
    };
  }

  if (typeof FEATURE_NO_ES2015 === 'undefined') {

    if (!Array.from) {
      Array.from = function () {
        var toInteger = function toInteger(it) {
          return isNaN(it = +it) ? 0 : (it > 0 ? Math.floor : Math.ceil)(it);
        };
        var toLength = function toLength(it) {
          return it > 0 ? Math.min(toInteger(it), 0x1fffffffffffff) : 0;
        };
        var iterCall = function iterCall(iter, fn, val, index) {
          try {
            return fn(val, index);
          } catch (E) {
            if (typeof iter.return == 'function') iter.return();
            throw E;
          }
        };

        return function from(arrayLike) {
          var O = Object(arrayLike),
              C = typeof this == 'function' ? this : Array,
              aLen = arguments.length,
              mapfn = aLen > 1 ? arguments[1] : undefined,
              mapping = mapfn !== undefined,
              index = 0,
              iterFn = O[Symbol.iterator],
              length,
              result,
              step,
              iterator;
          if (mapping) mapfn = mapfn.bind(aLen > 2 ? arguments[2] : undefined);
          if (iterFn != undefined && !Array.isArray(arrayLike)) {
            for (iterator = iterFn.call(O), result = new C(); !(step = iterator.next()).done; index++) {
              result[index] = mapping ? iterCall(iterator, mapfn, step.value, index) : step.value;
            }
          } else {
            length = toLength(O.length);
            for (result = new C(length); length > index; index++) {
              result[index] = mapping ? mapfn(O[index], index) : O[index];
            }
          }
          result.length = index;
          return result;
        };
      }();
    }

    if (!Array.prototype.find) {
      Object.defineProperty(Array.prototype, 'find', {
        configurable: true,
        writable: true,
        enumerable: false,
        value: function value(predicate) {
          if (this === null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
          }
          if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
          }
          var list = Object(this);
          var length = list.length >>> 0;
          var thisArg = arguments[1];
          var value;

          for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
              return value;
            }
          }
          return undefined;
        }
      });
    }

    if (!Array.prototype.findIndex) {
      Object.defineProperty(Array.prototype, 'findIndex', {
        configurable: true,
        writable: true,
        enumerable: false,
        value: function value(predicate) {
          if (this === null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
          }
          if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
          }
          var list = Object(this);
          var length = list.length >>> 0;
          var thisArg = arguments[1];
          var value;

          for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
              return i;
            }
          }
          return -1;
        }
      });
    }
  }

  if (typeof FEATURE_NO_ES2016 === 'undefined' && !Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
      configurable: true,
      writable: true,
      enumerable: false,
      value: function value(searchElement) {
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
          return false;
        }
        var n = parseInt(arguments[1]) || 0;
        var k;
        if (n >= 0) {
          k = n;
        } else {
          k = len + n;
          if (k < 0) {
            k = 0;
          }
        }
        var currentElement;
        while (k < len) {
          currentElement = O[k];
          if (searchElement === currentElement || searchElement !== searchElement && currentElement !== currentElement) {
            return true;
          }
          k++;
        }
        return false;
      }
    });
  }

  if (typeof FEATURE_NO_ES2015 === 'undefined') {

    (function () {
      var needsFix = false;

      try {
        var s = Object.keys('a');
        needsFix = s.length !== 1 || s[0] !== '0';
      } catch (e) {
        needsFix = true;
      }

      if (needsFix) {
        Object.keys = function () {
          var hasOwnProperty = Object.prototype.hasOwnProperty,
              hasDontEnumBug = !{ toString: null }.propertyIsEnumerable('toString'),
              dontEnums = ['toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'constructor'],
              dontEnumsLength = dontEnums.length;

          return function (obj) {
            if (obj === undefined || obj === null) {
              throw TypeError('Cannot convert undefined or null to object');
            }

            obj = Object(obj);

            var result = [],
                prop,
                i;

            for (prop in obj) {
              if (hasOwnProperty.call(obj, prop)) {
                result.push(prop);
              }
            }

            if (hasDontEnumBug) {
              for (i = 0; i < dontEnumsLength; i++) {
                if (hasOwnProperty.call(obj, dontEnums[i])) {
                  result.push(dontEnums[i]);
                }
              }
            }

            return result;
          };
        }();
      }
    })();

    (function (O) {
      if ('assign' in O) {
        return;
      }

      O.defineProperty(O, 'assign', {
        configurable: true,
        writable: true,
        value: function () {
          var gOPS = O.getOwnPropertySymbols,
              pIE = O.propertyIsEnumerable,
              filterOS = gOPS ? function (self) {
            return gOPS(self).filter(pIE, self);
          } : function () {
            return Array.prototype;
          };

          return function assign(where) {
            if (gOPS && !(where instanceof O)) {
              console.warn('problematic Symbols', where);
            }

            function set(keyOrSymbol) {
              where[keyOrSymbol] = arg[keyOrSymbol];
            }

            for (var i = 1, ii = arguments.length; i < ii; ++i) {
              var arg = arguments[i];

              if (arg === null || arg === undefined) {
                continue;
              }

              O.keys(arg).concat(filterOS(arg)).forEach(set);
            }

            return where;
          };
        }()
      });
    })(Object);

    if (!Object.is) {
      Object.is = function (x, y) {
        if (x === y) {
          return x !== 0 || 1 / x === 1 / y;
        } else {
          return x !== x && y !== y;
        }
      };
    }
  }

  if (typeof FEATURE_NO_ES2015 === 'undefined') {

    (function (global) {
      var i;

      var defineProperty = Object.defineProperty,
          is = function is(a, b) {
        return a === b || a !== a && b !== b;
      };

      if (typeof WeakMap == 'undefined') {
        global.WeakMap = createCollection({
          'delete': sharedDelete,

          clear: sharedClear,

          get: sharedGet,

          has: mapHas,

          set: sharedSet
        }, true);
      }

      if (typeof Map == 'undefined' || typeof new Map().values !== 'function' || !new Map().values().next) {
        var _createCollection;

        global.Map = createCollection((_createCollection = {
          'delete': sharedDelete,

          has: mapHas,

          get: sharedGet,

          set: sharedSet,

          keys: sharedKeys,

          values: sharedValues,

          entries: mapEntries,

          forEach: sharedForEach,

          clear: sharedClear
        }, _createCollection[Symbol.iterator] = mapEntries, _createCollection));
      }

      if (typeof Set == 'undefined' || typeof new Set().values !== 'function' || !new Set().values().next) {
        var _createCollection2;

        global.Set = createCollection((_createCollection2 = {
          has: setHas,

          add: sharedAdd,

          'delete': sharedDelete,

          clear: sharedClear,

          keys: sharedValues,
          values: sharedValues,

          entries: setEntries,

          forEach: sharedForEach
        }, _createCollection2[Symbol.iterator] = sharedValues, _createCollection2));
      }

      if (typeof WeakSet == 'undefined') {
        global.WeakSet = createCollection({
          'delete': sharedDelete,

          add: sharedAdd,

          clear: sharedClear,

          has: setHas
        }, true);
      }

      function createCollection(proto, objectOnly) {
        function Collection(a) {
          if (!this || this.constructor !== Collection) return new Collection(a);
          this._keys = [];
          this._values = [];
          this._itp = [];
          this.objectOnly = objectOnly;

          if (a) init.call(this, a);
        }

        if (!objectOnly) {
          defineProperty(proto, 'size', {
            get: sharedSize
          });
        }

        proto.constructor = Collection;
        Collection.prototype = proto;

        return Collection;
      }

      function init(a) {
        var i;

        if (this.add) a.forEach(this.add, this);else a.forEach(function (a) {
            this.set(a[0], a[1]);
          }, this);
      }

      function sharedDelete(key) {
        if (this.has(key)) {
          this._keys.splice(i, 1);
          this._values.splice(i, 1);

          this._itp.forEach(function (p) {
            if (i < p[0]) p[0]--;
          });
        }

        return -1 < i;
      };

      function sharedGet(key) {
        return this.has(key) ? this._values[i] : undefined;
      }

      function has(list, key) {
        if (this.objectOnly && key !== Object(key)) throw new TypeError("Invalid value used as weak collection key");

        if (key != key || key === 0) for (i = list.length; i-- && !is(list[i], key);) {} else i = list.indexOf(key);
        return -1 < i;
      }

      function setHas(value) {
        return has.call(this, this._values, value);
      }

      function mapHas(value) {
        return has.call(this, this._keys, value);
      }

      function sharedSet(key, value) {
        this.has(key) ? this._values[i] = value : this._values[this._keys.push(key) - 1] = value;
        return this;
      }

      function sharedAdd(value) {
        if (!this.has(value)) this._values.push(value);
        return this;
      }

      function sharedClear() {
        (this._keys || 0).length = this._values.length = 0;
      }

      function sharedKeys() {
        return sharedIterator(this._itp, this._keys);
      }

      function sharedValues() {
        return sharedIterator(this._itp, this._values);
      }

      function mapEntries() {
        return sharedIterator(this._itp, this._keys, this._values);
      }

      function setEntries() {
        return sharedIterator(this._itp, this._values, this._values);
      }

      function sharedIterator(itp, array, array2) {
        var _ref;

        var p = [0],
            done = false;
        itp.push(p);
        return _ref = {}, _ref[Symbol.iterator] = function () {
          return this;
        }, _ref.next = function next() {
          var v,
              k = p[0];
          if (!done && k < array.length) {
            v = array2 ? [array[k], array2[k]] : array[k];
            p[0]++;
          } else {
            done = true;
            itp.splice(itp.indexOf(p), 1);
          }
          return { done: done, value: v };
        }, _ref;
      }

      function sharedSize() {
        return this._values.length;
      }

      function sharedForEach(callback, context) {
        var it = this.entries();
        for (;;) {
          var r = it.next();
          if (r.done) break;
          callback.call(context, r.value[1], r.value[0], this);
        }
      }
    })(_aureliaPal.PLATFORM.global);
  }

  if (typeof FEATURE_NO_ES2015 === 'undefined') {

    var bind = Function.prototype.bind;

    if (typeof _aureliaPal.PLATFORM.global.Reflect === 'undefined') {
      _aureliaPal.PLATFORM.global.Reflect = {};
    }

    if (typeof Reflect.defineProperty !== 'function') {
      Reflect.defineProperty = function (target, propertyKey, descriptor) {
        if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' ? target === null : typeof target !== 'function') {
          throw new TypeError('Reflect.defineProperty called on non-object');
        }
        try {
          Object.defineProperty(target, propertyKey, descriptor);
          return true;
        } catch (e) {
          return false;
        }
      };
    }

    if (typeof Reflect.construct !== 'function') {
      Reflect.construct = function (Target, args) {
        if (args) {
          switch (args.length) {
            case 0:
              return new Target();
            case 1:
              return new Target(args[0]);
            case 2:
              return new Target(args[0], args[1]);
            case 3:
              return new Target(args[0], args[1], args[2]);
            case 4:
              return new Target(args[0], args[1], args[2], args[3]);
          }
        }

        var a = [null];
        a.push.apply(a, args);
        return new (bind.apply(Target, a))();
      };
    }

    if (typeof Reflect.ownKeys !== 'function') {
      Reflect.ownKeys = function (o) {
        return Object.getOwnPropertyNames(o).concat(Object.getOwnPropertySymbols(o));
      };
    }
  }

  if (typeof FEATURE_NO_ESNEXT === 'undefined') {

    var emptyMetadata = Object.freeze({});
    var metadataContainerKey = '__metadata__';

    if (typeof Reflect.getOwnMetadata !== 'function') {
      Reflect.getOwnMetadata = function (metadataKey, target, targetKey) {
        if (target.hasOwnProperty(metadataContainerKey)) {
          return (target[metadataContainerKey][targetKey] || emptyMetadata)[metadataKey];
        }
      };
    }

    if (typeof Reflect.defineMetadata !== 'function') {
      Reflect.defineMetadata = function (metadataKey, metadataValue, target, targetKey) {
        var metadataContainer = target.hasOwnProperty(metadataContainerKey) ? target[metadataContainerKey] : target[metadataContainerKey] = {};
        var targetContainer = metadataContainer[targetKey] || (metadataContainer[targetKey] = {});
        targetContainer[metadataKey] = metadataValue;
      };
    }

    if (typeof Reflect.metadata !== 'function') {
      Reflect.metadata = function (metadataKey, metadataValue) {
        return function (target, targetKey) {
          Reflect.defineMetadata(metadataKey, metadataValue, target, targetKey);
        };
      };
    }
  }
});
define('aurelia-task-queue',['exports', 'aurelia-pal'], function (exports, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.TaskQueue = undefined;

  

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var stackSeparator = '\nEnqueued in TaskQueue by:\n';
  var microStackSeparator = '\nEnqueued in MicroTaskQueue by:\n';

  function makeRequestFlushFromMutationObserver(flush) {
    var observer = _aureliaPal.DOM.createMutationObserver(flush);
    var val = 'a';
    var node = _aureliaPal.DOM.createTextNode('a');
    var values = Object.create(null);
    values.a = 'b';
    values.b = 'a';
    observer.observe(node, { characterData: true });
    return function requestFlush() {
      node.data = val = values[val];
    };
  }

  function makeRequestFlushFromTimer(flush) {
    return function requestFlush() {
      var timeoutHandle = setTimeout(handleFlushTimer, 0);

      var intervalHandle = setInterval(handleFlushTimer, 50);
      function handleFlushTimer() {
        clearTimeout(timeoutHandle);
        clearInterval(intervalHandle);
        flush();
      }
    };
  }

  function onError(error, task, longStacks) {
    if (longStacks && task.stack && (typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' && error !== null) {
      error.stack = filterFlushStack(error.stack) + task.stack;
    }

    if ('onError' in task) {
      task.onError(error);
    } else {
      setTimeout(function () {
        throw error;
      }, 0);
    }
  }

  var TaskQueue = exports.TaskQueue = function () {
    function TaskQueue() {
      var _this = this;

      

      this.flushing = false;
      this.longStacks = false;

      this.microTaskQueue = [];
      this.microTaskQueueCapacity = 1024;
      this.taskQueue = [];

      if (_aureliaPal.FEATURE.mutationObserver) {
        this.requestFlushMicroTaskQueue = makeRequestFlushFromMutationObserver(function () {
          return _this.flushMicroTaskQueue();
        });
      } else {
        this.requestFlushMicroTaskQueue = makeRequestFlushFromTimer(function () {
          return _this.flushMicroTaskQueue();
        });
      }

      this.requestFlushTaskQueue = makeRequestFlushFromTimer(function () {
        return _this.flushTaskQueue();
      });
    }

    TaskQueue.prototype._flushQueue = function _flushQueue(queue, capacity) {
      var index = 0;
      var task = void 0;

      try {
        this.flushing = true;
        while (index < queue.length) {
          task = queue[index];
          if (this.longStacks) {
            this.stack = typeof task.stack === 'string' ? task.stack : undefined;
          }
          task.call();
          index++;

          if (index > capacity) {
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
              queue[scan] = queue[scan + index];
            }

            queue.length -= index;
            index = 0;
          }
        }
      } catch (error) {
        onError(error, task, this.longStacks);
      } finally {
        this.flushing = false;
      }
    };

    TaskQueue.prototype.queueMicroTask = function queueMicroTask(task) {
      if (this.microTaskQueue.length < 1) {
        this.requestFlushMicroTaskQueue();
      }

      if (this.longStacks) {
        task.stack = this.prepareQueueStack(microStackSeparator);
      }

      this.microTaskQueue.push(task);
    };

    TaskQueue.prototype.queueTask = function queueTask(task) {
      if (this.taskQueue.length < 1) {
        this.requestFlushTaskQueue();
      }

      if (this.longStacks) {
        task.stack = this.prepareQueueStack(stackSeparator);
      }

      this.taskQueue.push(task);
    };

    TaskQueue.prototype.flushTaskQueue = function flushTaskQueue() {
      var queue = this.taskQueue;
      this.taskQueue = [];
      this._flushQueue(queue, Number.MAX_VALUE);
    };

    TaskQueue.prototype.flushMicroTaskQueue = function flushMicroTaskQueue() {
      var queue = this.microTaskQueue;
      this._flushQueue(queue, this.microTaskQueueCapacity);
      queue.length = 0;
    };

    TaskQueue.prototype.prepareQueueStack = function prepareQueueStack(separator) {
      var stack = separator + filterQueueStack(captureStack());

      if (typeof this.stack === 'string') {
        stack = filterFlushStack(stack) + this.stack;
      }

      return stack;
    };

    return TaskQueue;
  }();

  function captureStack() {
    var error = new Error();

    if (error.stack) {
      return error.stack;
    }

    try {
      throw error;
    } catch (e) {
      return e.stack;
    }
  }

  function filterQueueStack(stack) {
    return stack.replace(/^[\s\S]*?\bqueue(Micro)?Task\b[^\n]*\n/, '');
  }

  function filterFlushStack(stack) {
    var index = stack.lastIndexOf('flushMicroTaskQueue');

    if (index < 0) {
      index = stack.lastIndexOf('flushTaskQueue');
      if (index < 0) {
        return stack;
      }
    }

    index = stack.lastIndexOf('\n', index);

    return index < 0 ? stack : stack.substr(0, index);
  }
});
define('aurelia-templating',['exports', 'aurelia-logging', 'aurelia-metadata', 'aurelia-pal', 'aurelia-loader', 'aurelia-path', 'aurelia-binding', 'aurelia-dependency-injection', 'aurelia-task-queue'], function (exports, _aureliaLogging, _aureliaMetadata, _aureliaPal, _aureliaLoader, _aureliaPath, _aureliaBinding, _aureliaDependencyInjection, _aureliaTaskQueue) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.TemplatingEngine = exports.ElementConfigResource = exports.CompositionEngine = exports.SwapStrategies = exports.HtmlBehaviorResource = exports.BindableProperty = exports.BehaviorPropertyObserver = exports.Controller = exports.ViewEngine = exports.ModuleAnalyzer = exports.ResourceDescription = exports.ResourceModule = exports.ViewCompiler = exports.ViewFactory = exports.BoundViewFactory = exports.ViewSlot = exports.View = exports.ViewResources = exports.ShadowDOM = exports.ShadowSlot = exports.PassThroughSlot = exports.SlotCustomAttribute = exports.BindingLanguage = exports.ViewLocator = exports.StaticViewStrategy = exports.InlineViewStrategy = exports.TemplateRegistryViewStrategy = exports.NoViewStrategy = exports.ConventionalViewStrategy = exports.RelativeViewStrategy = exports.viewStrategy = exports.TargetInstruction = exports.BehaviorInstruction = exports.ViewCompileInstruction = exports.ResourceLoadContext = exports.ElementEvents = exports.ViewEngineHooksResource = exports.CompositionTransaction = exports.CompositionTransactionOwnershipToken = exports.CompositionTransactionNotifier = exports.Animator = exports.animationEvent = undefined;
  exports._hyphenate = _hyphenate;
  exports._isAllWhitespace = _isAllWhitespace;
  exports.viewEngineHooks = viewEngineHooks;
  exports.validateBehaviorName = validateBehaviorName;
  exports.children = children;
  exports.child = child;
  exports.resource = resource;
  exports.behavior = behavior;
  exports.customElement = customElement;
  exports.customAttribute = customAttribute;
  exports.templateController = templateController;
  exports.bindable = bindable;
  exports.dynamicOptions = dynamicOptions;
  exports.useShadowDOM = useShadowDOM;
  exports.processAttributes = processAttributes;
  exports.processContent = processContent;
  exports.containerless = containerless;
  exports.useViewStrategy = useViewStrategy;
  exports.useView = useView;
  exports.inlineView = inlineView;
  exports.noView = noView;
  exports.view = view;
  exports.elementConfig = elementConfig;
  exports.viewResources = viewResources;

  var LogManager = _interopRequireWildcard(_aureliaLogging);

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    } else {
      var newObj = {};

      if (obj != null) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
        }
      }

      newObj.default = obj;
      return newObj;
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var _class, _temp, _class2, _temp2, _dec, _class3, _dec2, _class4, _dec3, _class5, _dec4, _class6, _dec5, _class7, _dec6, _class8, _class9, _temp3, _class10, _temp4, _class12, _class14, _temp5, _dec7, _class15, _dec8, _class16, _dec9, _class17;

  

  var animationEvent = exports.animationEvent = {
    enterBegin: 'animation:enter:begin',
    enterActive: 'animation:enter:active',
    enterDone: 'animation:enter:done',
    enterTimeout: 'animation:enter:timeout',

    leaveBegin: 'animation:leave:begin',
    leaveActive: 'animation:leave:active',
    leaveDone: 'animation:leave:done',
    leaveTimeout: 'animation:leave:timeout',

    staggerNext: 'animation:stagger:next',

    removeClassBegin: 'animation:remove-class:begin',
    removeClassActive: 'animation:remove-class:active',
    removeClassDone: 'animation:remove-class:done',
    removeClassTimeout: 'animation:remove-class:timeout',

    addClassBegin: 'animation:add-class:begin',
    addClassActive: 'animation:add-class:active',
    addClassDone: 'animation:add-class:done',
    addClassTimeout: 'animation:add-class:timeout',

    animateBegin: 'animation:animate:begin',
    animateActive: 'animation:animate:active',
    animateDone: 'animation:animate:done',
    animateTimeout: 'animation:animate:timeout',

    sequenceBegin: 'animation:sequence:begin',
    sequenceDone: 'animation:sequence:done'
  };

  var Animator = exports.Animator = function () {
    function Animator() {
      
    }

    Animator.prototype.enter = function enter(element) {
      return Promise.resolve(false);
    };

    Animator.prototype.leave = function leave(element) {
      return Promise.resolve(false);
    };

    Animator.prototype.removeClass = function removeClass(element, className) {
      element.classList.remove(className);
      return Promise.resolve(false);
    };

    Animator.prototype.addClass = function addClass(element, className) {
      element.classList.add(className);
      return Promise.resolve(false);
    };

    Animator.prototype.animate = function animate(element, className) {
      return Promise.resolve(false);
    };

    Animator.prototype.runSequence = function runSequence(animations) {};

    Animator.prototype.registerEffect = function registerEffect(effectName, properties) {};

    Animator.prototype.unregisterEffect = function unregisterEffect(effectName) {};

    return Animator;
  }();

  var CompositionTransactionNotifier = exports.CompositionTransactionNotifier = function () {
    function CompositionTransactionNotifier(owner) {
      

      this.owner = owner;
      this.owner._compositionCount++;
    }

    CompositionTransactionNotifier.prototype.done = function done() {
      this.owner._compositionCount--;
      this.owner._tryCompleteTransaction();
    };

    return CompositionTransactionNotifier;
  }();

  var CompositionTransactionOwnershipToken = exports.CompositionTransactionOwnershipToken = function () {
    function CompositionTransactionOwnershipToken(owner) {
      

      this.owner = owner;
      this.owner._ownershipToken = this;
      this.thenable = this._createThenable();
    }

    CompositionTransactionOwnershipToken.prototype.waitForCompositionComplete = function waitForCompositionComplete() {
      this.owner._tryCompleteTransaction();
      return this.thenable;
    };

    CompositionTransactionOwnershipToken.prototype.resolve = function resolve() {
      this._resolveCallback();
    };

    CompositionTransactionOwnershipToken.prototype._createThenable = function _createThenable() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        _this._resolveCallback = resolve;
      });
    };

    return CompositionTransactionOwnershipToken;
  }();

  var CompositionTransaction = exports.CompositionTransaction = function () {
    function CompositionTransaction() {
      

      this._ownershipToken = null;
      this._compositionCount = 0;
    }

    CompositionTransaction.prototype.tryCapture = function tryCapture() {
      return this._ownershipToken === null ? new CompositionTransactionOwnershipToken(this) : null;
    };

    CompositionTransaction.prototype.enlist = function enlist() {
      return new CompositionTransactionNotifier(this);
    };

    CompositionTransaction.prototype._tryCompleteTransaction = function _tryCompleteTransaction() {
      if (this._compositionCount <= 0) {
        this._compositionCount = 0;

        if (this._ownershipToken !== null) {
          var token = this._ownershipToken;
          this._ownershipToken = null;
          token.resolve();
        }
      }
    };

    return CompositionTransaction;
  }();

  var capitalMatcher = /([A-Z])/g;

  function addHyphenAndLower(char) {
    return '-' + char.toLowerCase();
  }

  function _hyphenate(name) {
    return (name.charAt(0).toLowerCase() + name.slice(1)).replace(capitalMatcher, addHyphenAndLower);
  }

  function _isAllWhitespace(node) {
    return !(node.auInterpolationTarget || /[^\t\n\r ]/.test(node.textContent));
  }

  var ViewEngineHooksResource = exports.ViewEngineHooksResource = function () {
    function ViewEngineHooksResource() {
      
    }

    ViewEngineHooksResource.prototype.initialize = function initialize(container, target) {
      this.instance = container.get(target);
    };

    ViewEngineHooksResource.prototype.register = function register(registry, name) {
      registry.registerViewEngineHooks(this.instance);
    };

    ViewEngineHooksResource.prototype.load = function load(container, target) {};

    ViewEngineHooksResource.convention = function convention(name) {
      if (name.endsWith('ViewEngineHooks')) {
        return new ViewEngineHooksResource();
      }
    };

    return ViewEngineHooksResource;
  }();

  function viewEngineHooks(target) {
    var deco = function deco(t) {
      _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new ViewEngineHooksResource(), t);
    };

    return target ? deco(target) : deco;
  }

  var ElementEvents = exports.ElementEvents = (_temp = _class = function () {
    function ElementEvents(element) {
      

      this.element = element;
      this.subscriptions = {};
    }

    ElementEvents.prototype._enqueueHandler = function _enqueueHandler(handler) {
      this.subscriptions[handler.eventName] = this.subscriptions[handler.eventName] || [];
      this.subscriptions[handler.eventName].push(handler);
    };

    ElementEvents.prototype._dequeueHandler = function _dequeueHandler(handler) {
      var index = void 0;
      var subscriptions = this.subscriptions[handler.eventName];
      if (subscriptions) {
        index = subscriptions.indexOf(handler);
        if (index > -1) {
          subscriptions.splice(index, 1);
        }
      }
      return handler;
    };

    ElementEvents.prototype.publish = function publish(eventName) {
      var detail = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var bubbles = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
      var cancelable = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

      var event = _aureliaPal.DOM.createCustomEvent(eventName, { cancelable: cancelable, bubbles: bubbles, detail: detail });
      this.element.dispatchEvent(event);
    };

    ElementEvents.prototype.subscribe = function subscribe(eventName, handler, captureOrOptions) {
      if (typeof handler === 'function') {
        if (captureOrOptions === undefined) {
          captureOrOptions = ElementEvents.defaultListenerOptions;
        }
        var eventHandler = new EventHandlerImpl(this, eventName, handler, captureOrOptions, false);
        return eventHandler;
      }

      return undefined;
    };

    ElementEvents.prototype.subscribeOnce = function subscribeOnce(eventName, handler, captureOrOptions) {
      if (typeof handler === 'function') {
        if (captureOrOptions === undefined) {
          captureOrOptions = ElementEvents.defaultListenerOptions;
        }
        var eventHandler = new EventHandlerImpl(this, eventName, handler, captureOrOptions, true);
        return eventHandler;
      }

      return undefined;
    };

    ElementEvents.prototype.dispose = function dispose(eventName) {
      if (eventName && typeof eventName === 'string') {
        var subscriptions = this.subscriptions[eventName];
        if (subscriptions) {
          while (subscriptions.length) {
            var subscription = subscriptions.pop();
            if (subscription) {
              subscription.dispose();
            }
          }
        }
      } else {
        this.disposeAll();
      }
    };

    ElementEvents.prototype.disposeAll = function disposeAll() {
      for (var _key in this.subscriptions) {
        this.dispose(_key);
      }
    };

    return ElementEvents;
  }(), _class.defaultListenerOptions = true, _temp);

  var EventHandlerImpl = function () {
    function EventHandlerImpl(owner, eventName, handler, captureOrOptions, once) {
      

      this.owner = owner;
      this.eventName = eventName;
      this.handler = handler;

      this.capture = typeof captureOrOptions === 'boolean' ? captureOrOptions : captureOrOptions.capture;
      this.bubbles = !this.capture;
      this.captureOrOptions = captureOrOptions;
      this.once = once;
      owner.element.addEventListener(eventName, this, captureOrOptions);
      owner._enqueueHandler(this);
    }

    EventHandlerImpl.prototype.handleEvent = function handleEvent(e) {
      var fn = this.handler;
      fn(e);
      if (this.once) {
        this.dispose();
      }
    };

    EventHandlerImpl.prototype.dispose = function dispose() {
      this.owner.element.removeEventListener(this.eventName, this, this.captureOrOptions);
      this.owner._dequeueHandler(this);
      this.owner = this.handler = null;
    };

    return EventHandlerImpl;
  }();

  var ResourceLoadContext = exports.ResourceLoadContext = function () {
    function ResourceLoadContext() {
      

      this.dependencies = {};
    }

    ResourceLoadContext.prototype.addDependency = function addDependency(url) {
      this.dependencies[url] = true;
    };

    ResourceLoadContext.prototype.hasDependency = function hasDependency(url) {
      return url in this.dependencies;
    };

    return ResourceLoadContext;
  }();

  var ViewCompileInstruction = exports.ViewCompileInstruction = function ViewCompileInstruction() {
    var targetShadowDOM = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    var compileSurrogate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    

    this.targetShadowDOM = targetShadowDOM;
    this.compileSurrogate = compileSurrogate;
    this.associatedModuleId = null;
  };

  ViewCompileInstruction.normal = new ViewCompileInstruction();

  var BehaviorInstruction = exports.BehaviorInstruction = function () {
    function BehaviorInstruction() {
      
    }

    BehaviorInstruction.enhance = function enhance() {
      var instruction = new BehaviorInstruction();
      instruction.enhance = true;
      return instruction;
    };

    BehaviorInstruction.unitTest = function unitTest(type, attributes) {
      var instruction = new BehaviorInstruction();
      instruction.type = type;
      instruction.attributes = attributes || {};
      return instruction;
    };

    BehaviorInstruction.element = function element(node, type) {
      var instruction = new BehaviorInstruction();
      instruction.type = type;
      instruction.attributes = {};
      instruction.anchorIsContainer = !(node.hasAttribute('containerless') || type.containerless);
      instruction.initiatedByBehavior = true;
      return instruction;
    };

    BehaviorInstruction.attribute = function attribute(attrName, type) {
      var instruction = new BehaviorInstruction();
      instruction.attrName = attrName;
      instruction.type = type || null;
      instruction.attributes = {};
      return instruction;
    };

    BehaviorInstruction.dynamic = function dynamic(host, viewModel, viewFactory) {
      var instruction = new BehaviorInstruction();
      instruction.host = host;
      instruction.viewModel = viewModel;
      instruction.viewFactory = viewFactory;
      instruction.inheritBindingContext = true;
      return instruction;
    };

    return BehaviorInstruction;
  }();

  var biProto = BehaviorInstruction.prototype;
  biProto.initiatedByBehavior = false;
  biProto.enhance = false;
  biProto.partReplacements = null;
  biProto.viewFactory = null;
  biProto.originalAttrName = null;
  biProto.skipContentProcessing = false;
  biProto.contentFactory = null;
  biProto.viewModel = null;
  biProto.anchorIsContainer = false;
  biProto.host = null;
  biProto.attributes = null;
  biProto.type = null;
  biProto.attrName = null;
  biProto.inheritBindingContext = false;

  BehaviorInstruction.normal = new BehaviorInstruction();

  var TargetInstruction = exports.TargetInstruction = (_temp2 = _class2 = function () {
    function TargetInstruction() {
      
    }

    TargetInstruction.shadowSlot = function shadowSlot(parentInjectorId) {
      var instruction = new TargetInstruction();
      instruction.parentInjectorId = parentInjectorId;
      instruction.shadowSlot = true;
      return instruction;
    };

    TargetInstruction.contentExpression = function contentExpression(expression) {
      var instruction = new TargetInstruction();
      instruction.contentExpression = expression;
      return instruction;
    };

    TargetInstruction.letElement = function letElement(expressions) {
      var instruction = new TargetInstruction();
      instruction.expressions = expressions;
      instruction.letElement = true;
      return instruction;
    };

    TargetInstruction.lifting = function lifting(parentInjectorId, liftingInstruction) {
      var instruction = new TargetInstruction();
      instruction.parentInjectorId = parentInjectorId;
      instruction.expressions = TargetInstruction.noExpressions;
      instruction.behaviorInstructions = [liftingInstruction];
      instruction.viewFactory = liftingInstruction.viewFactory;
      instruction.providers = [liftingInstruction.type.target];
      instruction.lifting = true;
      return instruction;
    };

    TargetInstruction.normal = function normal(injectorId, parentInjectorId, providers, behaviorInstructions, expressions, elementInstruction) {
      var instruction = new TargetInstruction();
      instruction.injectorId = injectorId;
      instruction.parentInjectorId = parentInjectorId;
      instruction.providers = providers;
      instruction.behaviorInstructions = behaviorInstructions;
      instruction.expressions = expressions;
      instruction.anchorIsContainer = elementInstruction ? elementInstruction.anchorIsContainer : true;
      instruction.elementInstruction = elementInstruction;
      return instruction;
    };

    TargetInstruction.surrogate = function surrogate(providers, behaviorInstructions, expressions, values) {
      var instruction = new TargetInstruction();
      instruction.expressions = expressions;
      instruction.behaviorInstructions = behaviorInstructions;
      instruction.providers = providers;
      instruction.values = values;
      return instruction;
    };

    return TargetInstruction;
  }(), _class2.noExpressions = Object.freeze([]), _temp2);


  var tiProto = TargetInstruction.prototype;

  tiProto.injectorId = null;
  tiProto.parentInjectorId = null;

  tiProto.shadowSlot = false;
  tiProto.slotName = null;
  tiProto.slotFallbackFactory = null;

  tiProto.contentExpression = null;
  tiProto.letElement = false;

  tiProto.expressions = null;
  tiProto.expressions = null;
  tiProto.providers = null;

  tiProto.viewFactory = null;

  tiProto.anchorIsContainer = false;
  tiProto.elementInstruction = null;
  tiProto.lifting = false;

  tiProto.values = null;

  var viewStrategy = exports.viewStrategy = _aureliaMetadata.protocol.create('aurelia:view-strategy', {
    validate: function validate(target) {
      if (!(typeof target.loadViewFactory === 'function')) {
        return 'View strategies must implement: loadViewFactory(viewEngine: ViewEngine, compileInstruction: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewFactory>';
      }

      return true;
    },
    compose: function compose(target) {
      if (!(typeof target.makeRelativeTo === 'function')) {
        target.makeRelativeTo = _aureliaPal.PLATFORM.noop;
      }
    }
  });

  var RelativeViewStrategy = exports.RelativeViewStrategy = (_dec = viewStrategy(), _dec(_class3 = function () {
    function RelativeViewStrategy(path) {
      

      this.path = path;
      this.absolutePath = null;
    }

    RelativeViewStrategy.prototype.loadViewFactory = function loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      if (this.absolutePath === null && this.moduleId) {
        this.absolutePath = (0, _aureliaPath.relativeToFile)(this.path, this.moduleId);
      }

      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(this.absolutePath || this.path, compileInstruction, loadContext, target);
    };

    RelativeViewStrategy.prototype.makeRelativeTo = function makeRelativeTo(file) {
      if (this.absolutePath === null) {
        this.absolutePath = (0, _aureliaPath.relativeToFile)(this.path, file);
      }
    };

    return RelativeViewStrategy;
  }()) || _class3);
  var ConventionalViewStrategy = exports.ConventionalViewStrategy = (_dec2 = viewStrategy(), _dec2(_class4 = function () {
    function ConventionalViewStrategy(viewLocator, origin) {
      

      this.moduleId = origin.moduleId;
      this.viewUrl = viewLocator.convertOriginToViewUrl(origin);
    }

    ConventionalViewStrategy.prototype.loadViewFactory = function loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(this.viewUrl, compileInstruction, loadContext, target);
    };

    return ConventionalViewStrategy;
  }()) || _class4);
  var NoViewStrategy = exports.NoViewStrategy = (_dec3 = viewStrategy(), _dec3(_class5 = function () {
    function NoViewStrategy(dependencies, dependencyBaseUrl) {
      

      this.dependencies = dependencies || null;
      this.dependencyBaseUrl = dependencyBaseUrl || '';
    }

    NoViewStrategy.prototype.loadViewFactory = function loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      var entry = this.entry;
      var dependencies = this.dependencies;

      if (entry && entry.factoryIsReady) {
        return Promise.resolve(null);
      }

      this.entry = entry = new _aureliaLoader.TemplateRegistryEntry(this.moduleId || this.dependencyBaseUrl);

      entry.dependencies = [];
      entry.templateIsLoaded = true;

      if (dependencies !== null) {
        for (var i = 0, ii = dependencies.length; i < ii; ++i) {
          var current = dependencies[i];

          if (typeof current === 'string' || typeof current === 'function') {
            entry.addDependency(current);
          } else {
            entry.addDependency(current.from, current.as);
          }
        }
      }

      compileInstruction.associatedModuleId = this.moduleId;

      return viewEngine.loadViewFactory(entry, compileInstruction, loadContext, target);
    };

    return NoViewStrategy;
  }()) || _class5);
  var TemplateRegistryViewStrategy = exports.TemplateRegistryViewStrategy = (_dec4 = viewStrategy(), _dec4(_class6 = function () {
    function TemplateRegistryViewStrategy(moduleId, entry) {
      

      this.moduleId = moduleId;
      this.entry = entry;
    }

    TemplateRegistryViewStrategy.prototype.loadViewFactory = function loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      var entry = this.entry;

      if (entry.factoryIsReady) {
        return Promise.resolve(entry.factory);
      }

      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(entry, compileInstruction, loadContext, target);
    };

    return TemplateRegistryViewStrategy;
  }()) || _class6);
  var InlineViewStrategy = exports.InlineViewStrategy = (_dec5 = viewStrategy(), _dec5(_class7 = function () {
    function InlineViewStrategy(markup, dependencies, dependencyBaseUrl) {
      

      this.markup = markup;
      this.dependencies = dependencies || null;
      this.dependencyBaseUrl = dependencyBaseUrl || '';
    }

    InlineViewStrategy.prototype.loadViewFactory = function loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      var entry = this.entry;
      var dependencies = this.dependencies;

      if (entry && entry.factoryIsReady) {
        return Promise.resolve(entry.factory);
      }

      this.entry = entry = new _aureliaLoader.TemplateRegistryEntry(this.moduleId || this.dependencyBaseUrl);
      entry.template = _aureliaPal.DOM.createTemplateFromMarkup(this.markup);

      if (dependencies !== null) {
        for (var i = 0, ii = dependencies.length; i < ii; ++i) {
          var current = dependencies[i];

          if (typeof current === 'string' || typeof current === 'function') {
            entry.addDependency(current);
          } else {
            entry.addDependency(current.from, current.as);
          }
        }
      }

      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(entry, compileInstruction, loadContext, target);
    };

    return InlineViewStrategy;
  }()) || _class7);
  var StaticViewStrategy = exports.StaticViewStrategy = (_dec6 = viewStrategy(), _dec6(_class8 = function () {
    function StaticViewStrategy(config) {
      

      if (typeof config === 'string' || config instanceof _aureliaPal.DOM.Element && config.tagName === 'TEMPLATE') {
        config = {
          template: config
        };
      }
      this.template = config.template;
      this.dependencies = config.dependencies || [];
      this.factoryIsReady = false;
      this.onReady = null;
      this.moduleId = 'undefined';
    }

    StaticViewStrategy.prototype.loadViewFactory = function loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      var _this2 = this;

      if (this.factoryIsReady) {
        return Promise.resolve(this.factory);
      }
      var deps = this.dependencies;
      deps = typeof deps === 'function' ? deps() : deps;
      deps = deps ? deps : [];
      deps = Array.isArray(deps) ? deps : [deps];

      return Promise.all(deps).then(function (dependencies) {
        var container = viewEngine.container;
        var appResources = viewEngine.appResources;
        var viewCompiler = viewEngine.viewCompiler;
        var viewResources = new ViewResources(appResources);

        var resource = void 0;
        var elDeps = [];

        if (target) {
          viewResources.autoRegister(container, target);
        }

        for (var _iterator = dependencies, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
          var _ref;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
          }

          var dep = _ref;

          if (typeof dep === 'function') {
            resource = viewResources.autoRegister(container, dep);
            if (resource.elementName !== null) {
              elDeps.push(resource);
            }
          } else if (dep && (typeof dep === 'undefined' ? 'undefined' : _typeof(dep)) === 'object') {
            for (var _key2 in dep) {
              var exported = dep[_key2];
              if (typeof exported === 'function') {
                resource = viewResources.autoRegister(container, exported);
                if (resource.elementName !== null) {
                  elDeps.push(resource);
                }
              }
            }
          } else {
            throw new Error('dependency neither function nor object. Received: "' + (typeof dep === 'undefined' ? 'undefined' : _typeof(dep)) + '"');
          }
        }

        return Promise.all(elDeps.map(function (el) {
          return el.load(container, el.target);
        })).then(function () {
          var factory = _this2.template !== null ? viewCompiler.compile(_this2.template, viewResources, compileInstruction) : null;
          _this2.factoryIsReady = true;
          _this2.factory = factory;
          return factory;
        });
      });
    };

    return StaticViewStrategy;
  }()) || _class8);
  var ViewLocator = exports.ViewLocator = (_temp3 = _class9 = function () {
    function ViewLocator() {
      
    }

    ViewLocator.prototype.getViewStrategy = function getViewStrategy(value) {
      if (!value) {
        return null;
      }

      if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && 'getViewStrategy' in value) {
        var _origin = _aureliaMetadata.Origin.get(value.constructor);

        value = value.getViewStrategy();

        if (typeof value === 'string') {
          value = new RelativeViewStrategy(value);
        }

        viewStrategy.assert(value);

        if (_origin.moduleId) {
          value.makeRelativeTo(_origin.moduleId);
        }

        return value;
      }

      if (typeof value === 'string') {
        value = new RelativeViewStrategy(value);
      }

      if (viewStrategy.validate(value)) {
        return value;
      }

      if (typeof value !== 'function') {
        value = value.constructor;
      }

      if ('$view' in value) {
        var c = value.$view;
        var _view = void 0;
        c = typeof c === 'function' ? c.call(value) : c;
        if (c === null) {
          _view = new NoViewStrategy();
        } else {
          _view = c instanceof StaticViewStrategy ? c : new StaticViewStrategy(c);
        }
        _aureliaMetadata.metadata.define(ViewLocator.viewStrategyMetadataKey, _view, value);
        return _view;
      }

      var origin = _aureliaMetadata.Origin.get(value);
      var strategy = _aureliaMetadata.metadata.get(ViewLocator.viewStrategyMetadataKey, value);

      if (!strategy) {
        if (!origin.moduleId) {
          throw new Error('Cannot determine default view strategy for object.', value);
        }

        strategy = this.createFallbackViewStrategy(origin);
      } else if (origin.moduleId) {
        strategy.moduleId = origin.moduleId;
      }

      return strategy;
    };

    ViewLocator.prototype.createFallbackViewStrategy = function createFallbackViewStrategy(origin) {
      return new ConventionalViewStrategy(this, origin);
    };

    ViewLocator.prototype.convertOriginToViewUrl = function convertOriginToViewUrl(origin) {
      var moduleId = origin.moduleId;
      var id = moduleId.endsWith('.js') || moduleId.endsWith('.ts') ? moduleId.substring(0, moduleId.length - 3) : moduleId;
      return id + '.html';
    };

    return ViewLocator;
  }(), _class9.viewStrategyMetadataKey = 'aurelia:view-strategy', _temp3);


  function mi(name) {
    throw new Error('BindingLanguage must implement ' + name + '().');
  }

  var BindingLanguage = exports.BindingLanguage = function () {
    function BindingLanguage() {
      
    }

    BindingLanguage.prototype.inspectAttribute = function inspectAttribute(resources, elementName, attrName, attrValue) {
      mi('inspectAttribute');
    };

    BindingLanguage.prototype.createAttributeInstruction = function createAttributeInstruction(resources, element, info, existingInstruction) {
      mi('createAttributeInstruction');
    };

    BindingLanguage.prototype.createLetExpressions = function createLetExpressions(resources, element) {
      mi('createLetExpressions');
    };

    BindingLanguage.prototype.inspectTextContent = function inspectTextContent(resources, value) {
      mi('inspectTextContent');
    };

    return BindingLanguage;
  }();

  var noNodes = Object.freeze([]);

  var SlotCustomAttribute = exports.SlotCustomAttribute = function () {
    SlotCustomAttribute.inject = function inject() {
      return [_aureliaPal.DOM.Element];
    };

    function SlotCustomAttribute(element) {
      

      this.element = element;
      this.element.auSlotAttribute = this;
    }

    SlotCustomAttribute.prototype.valueChanged = function valueChanged(newValue, oldValue) {};

    return SlotCustomAttribute;
  }();

  var PassThroughSlot = exports.PassThroughSlot = function () {
    function PassThroughSlot(anchor, name, destinationName, fallbackFactory) {
      

      this.anchor = anchor;
      this.anchor.viewSlot = this;
      this.name = name;
      this.destinationName = destinationName;
      this.fallbackFactory = fallbackFactory;
      this.destinationSlot = null;

      this.projections = 0;

      this.contentView = null;

      var attr = new SlotCustomAttribute(this.anchor);
      attr.value = this.destinationName;
    }

    PassThroughSlot.prototype.renderFallbackContent = function renderFallbackContent(view, nodes, projectionSource, index) {
      if (this.contentView === null) {
        this.contentView = this.fallbackFactory.create(this.ownerView.container);
        this.contentView.bind(this.ownerView.bindingContext, this.ownerView.overrideContext);

        var slots = Object.create(null);
        slots[this.destinationSlot.name] = this.destinationSlot;

        ShadowDOM.distributeView(this.contentView, slots, projectionSource, index, this.destinationSlot.name);
      }
    };

    PassThroughSlot.prototype.passThroughTo = function passThroughTo(destinationSlot) {
      this.destinationSlot = destinationSlot;
    };

    PassThroughSlot.prototype.addNode = function addNode(view, node, projectionSource, index) {
      if (this.contentView !== null) {
        this.contentView.removeNodes();
        this.contentView.detached();
        this.contentView.unbind();
        this.contentView = null;
      }

      if (node.viewSlot instanceof PassThroughSlot) {
        node.viewSlot.passThroughTo(this);
        return;
      }

      this.projections++;
      this.destinationSlot.addNode(view, node, projectionSource, index);
    };

    PassThroughSlot.prototype.removeView = function removeView(view, projectionSource) {
      this.projections--;
      this.destinationSlot.removeView(view, projectionSource);

      if (this.needsFallbackRendering) {
        this.renderFallbackContent(null, noNodes, projectionSource);
      }
    };

    PassThroughSlot.prototype.removeAll = function removeAll(projectionSource) {
      this.projections = 0;
      this.destinationSlot.removeAll(projectionSource);

      if (this.needsFallbackRendering) {
        this.renderFallbackContent(null, noNodes, projectionSource);
      }
    };

    PassThroughSlot.prototype.projectFrom = function projectFrom(view, projectionSource) {
      this.destinationSlot.projectFrom(view, projectionSource);
    };

    PassThroughSlot.prototype.created = function created(ownerView) {
      this.ownerView = ownerView;
    };

    PassThroughSlot.prototype.bind = function bind(view) {
      if (this.contentView) {
        this.contentView.bind(view.bindingContext, view.overrideContext);
      }
    };

    PassThroughSlot.prototype.attached = function attached() {
      if (this.contentView) {
        this.contentView.attached();
      }
    };

    PassThroughSlot.prototype.detached = function detached() {
      if (this.contentView) {
        this.contentView.detached();
      }
    };

    PassThroughSlot.prototype.unbind = function unbind() {
      if (this.contentView) {
        this.contentView.unbind();
      }
    };

    _createClass(PassThroughSlot, [{
      key: 'needsFallbackRendering',
      get: function get() {
        return this.fallbackFactory && this.projections === 0;
      }
    }]);

    return PassThroughSlot;
  }();

  var ShadowSlot = exports.ShadowSlot = function () {
    function ShadowSlot(anchor, name, fallbackFactory) {
      

      this.anchor = anchor;
      this.anchor.isContentProjectionSource = true;
      this.anchor.viewSlot = this;
      this.name = name;
      this.fallbackFactory = fallbackFactory;
      this.contentView = null;
      this.projections = 0;

      this.children = [];
      this.projectFromAnchors = null;
      this.destinationSlots = null;
    }

    ShadowSlot.prototype.addNode = function addNode(view, node, projectionSource, index, destination) {
      if (this.contentView !== null) {
        this.contentView.removeNodes();
        this.contentView.detached();
        this.contentView.unbind();
        this.contentView = null;
      }

      if (node.viewSlot instanceof PassThroughSlot) {
        node.viewSlot.passThroughTo(this);
        return;
      }

      if (this.destinationSlots !== null) {
        ShadowDOM.distributeNodes(view, [node], this.destinationSlots, this, index);
      } else {
        node.auOwnerView = view;
        node.auProjectionSource = projectionSource;
        node.auAssignedSlot = this;

        var anchor = this._findAnchor(view, node, projectionSource, index);
        var parent = anchor.parentNode;

        parent.insertBefore(node, anchor);
        this.children.push(node);
        this.projections++;
      }
    };

    ShadowSlot.prototype.removeView = function removeView(view, projectionSource) {
      if (this.destinationSlots !== null) {
        ShadowDOM.undistributeView(view, this.destinationSlots, this);
      } else if (this.contentView && this.contentView.hasSlots) {
        ShadowDOM.undistributeView(view, this.contentView.slots, projectionSource);
      } else {
        var found = this.children.find(function (x) {
          return x.auSlotProjectFrom === projectionSource;
        });
        if (found) {
          var _children = found.auProjectionChildren;
          var ownChildren = this.children;

          for (var i = 0, ii = _children.length; i < ii; ++i) {
            var _child = _children[i];

            if (_child.auOwnerView === view) {
              _children.splice(i, 1);
              view.fragment.appendChild(_child);
              i--;ii--;

              this.projections--;
              var idx = ownChildren.indexOf(_child);
              if (idx > -1) {
                ownChildren.splice(idx, 1);
              }
            }
          }

          if (this.needsFallbackRendering) {
            this.renderFallbackContent(view, noNodes, projectionSource);
          }
        }
      }
    };

    ShadowSlot.prototype.removeAll = function removeAll(projectionSource) {
      if (this.destinationSlots !== null) {
        ShadowDOM.undistributeAll(this.destinationSlots, this);
      } else if (this.contentView && this.contentView.hasSlots) {
        ShadowDOM.undistributeAll(this.contentView.slots, projectionSource);
      } else {
        var found = this.children.find(function (x) {
          return x.auSlotProjectFrom === projectionSource;
        });

        if (found) {
          var _children2 = found.auProjectionChildren;
          var ownChildren = this.children;

          for (var i = 0, ii = _children2.length; i < ii; ++i) {
            var _child2 = _children2[i];
            _child2.auOwnerView.fragment.appendChild(_child2);

            this.projections--;
            var idx = ownChildren.indexOf(_child2);
            if (idx > -1) {
              ownChildren.splice(idx, 1);
            }
          }

          found.auProjectionChildren = [];

          if (this.needsFallbackRendering) {
            this.renderFallbackContent(null, noNodes, projectionSource);
          }
        }
      }
    };

    ShadowSlot.prototype._findAnchor = function _findAnchor(view, node, projectionSource, index) {
      if (projectionSource) {
        var found = this.children.find(function (x) {
          return x.auSlotProjectFrom === projectionSource;
        });
        if (found) {
          if (index !== undefined) {
            var _children3 = found.auProjectionChildren;
            var viewIndex = -1;
            var lastView = void 0;

            for (var i = 0, ii = _children3.length; i < ii; ++i) {
              var current = _children3[i];

              if (current.auOwnerView !== lastView) {
                viewIndex++;
                lastView = current.auOwnerView;

                if (viewIndex >= index && lastView !== view) {
                  _children3.splice(i, 0, node);
                  return current;
                }
              }
            }
          }

          found.auProjectionChildren.push(node);
          return found;
        }
      }

      return this.anchor;
    };

    ShadowSlot.prototype.projectTo = function projectTo(slots) {
      this.destinationSlots = slots;
    };

    ShadowSlot.prototype.projectFrom = function projectFrom(view, projectionSource) {
      var anchor = _aureliaPal.DOM.createComment('anchor');
      var parent = this.anchor.parentNode;
      anchor.auSlotProjectFrom = projectionSource;
      anchor.auOwnerView = view;
      anchor.auProjectionChildren = [];
      parent.insertBefore(anchor, this.anchor);
      this.children.push(anchor);

      if (this.projectFromAnchors === null) {
        this.projectFromAnchors = [];
      }

      this.projectFromAnchors.push(anchor);
    };

    ShadowSlot.prototype.renderFallbackContent = function renderFallbackContent(view, nodes, projectionSource, index) {
      if (this.contentView === null) {
        this.contentView = this.fallbackFactory.create(this.ownerView.container);
        this.contentView.bind(this.ownerView.bindingContext, this.ownerView.overrideContext);
        this.contentView.insertNodesBefore(this.anchor);
      }

      if (this.contentView.hasSlots) {
        var slots = this.contentView.slots;
        var projectFromAnchors = this.projectFromAnchors;

        if (projectFromAnchors !== null) {
          for (var slotName in slots) {
            var slot = slots[slotName];

            for (var i = 0, ii = projectFromAnchors.length; i < ii; ++i) {
              var anchor = projectFromAnchors[i];
              slot.projectFrom(anchor.auOwnerView, anchor.auSlotProjectFrom);
            }
          }
        }

        this.fallbackSlots = slots;
        ShadowDOM.distributeNodes(view, nodes, slots, projectionSource, index);
      }
    };

    ShadowSlot.prototype.created = function created(ownerView) {
      this.ownerView = ownerView;
    };

    ShadowSlot.prototype.bind = function bind(view) {
      if (this.contentView) {
        this.contentView.bind(view.bindingContext, view.overrideContext);
      }
    };

    ShadowSlot.prototype.attached = function attached() {
      if (this.contentView) {
        this.contentView.attached();
      }
    };

    ShadowSlot.prototype.detached = function detached() {
      if (this.contentView) {
        this.contentView.detached();
      }
    };

    ShadowSlot.prototype.unbind = function unbind() {
      if (this.contentView) {
        this.contentView.unbind();
      }
    };

    _createClass(ShadowSlot, [{
      key: 'needsFallbackRendering',
      get: function get() {
        return this.fallbackFactory && this.projections === 0;
      }
    }]);

    return ShadowSlot;
  }();

  var ShadowDOM = exports.ShadowDOM = (_temp4 = _class10 = function () {
    function ShadowDOM() {
      
    }

    ShadowDOM.getSlotName = function getSlotName(node) {
      if (node.auSlotAttribute === undefined) {
        return ShadowDOM.defaultSlotKey;
      }

      return node.auSlotAttribute.value;
    };

    ShadowDOM.distributeView = function distributeView(view, slots, projectionSource, index, destinationOverride) {
      var nodes = void 0;

      if (view === null) {
        nodes = noNodes;
      } else {
        var childNodes = view.fragment.childNodes;
        var ii = childNodes.length;
        nodes = new Array(ii);

        for (var i = 0; i < ii; ++i) {
          nodes[i] = childNodes[i];
        }
      }

      ShadowDOM.distributeNodes(view, nodes, slots, projectionSource, index, destinationOverride);
    };

    ShadowDOM.undistributeView = function undistributeView(view, slots, projectionSource) {
      for (var slotName in slots) {
        slots[slotName].removeView(view, projectionSource);
      }
    };

    ShadowDOM.undistributeAll = function undistributeAll(slots, projectionSource) {
      for (var slotName in slots) {
        slots[slotName].removeAll(projectionSource);
      }
    };

    ShadowDOM.distributeNodes = function distributeNodes(view, nodes, slots, projectionSource, index, destinationOverride) {
      for (var i = 0, ii = nodes.length; i < ii; ++i) {
        var currentNode = nodes[i];
        var nodeType = currentNode.nodeType;

        if (currentNode.isContentProjectionSource) {
          currentNode.viewSlot.projectTo(slots);

          for (var slotName in slots) {
            slots[slotName].projectFrom(view, currentNode.viewSlot);
          }

          nodes.splice(i, 1);
          ii--;i--;
        } else if (nodeType === 1 || nodeType === 3 || currentNode.viewSlot instanceof PassThroughSlot) {
          if (nodeType === 3 && _isAllWhitespace(currentNode)) {
            nodes.splice(i, 1);
            ii--;i--;
          } else {
            var found = slots[destinationOverride || ShadowDOM.getSlotName(currentNode)];

            if (found) {
              found.addNode(view, currentNode, projectionSource, index);
              nodes.splice(i, 1);
              ii--;i--;
            }
          }
        } else {
          nodes.splice(i, 1);
          ii--;i--;
        }
      }

      for (var _slotName in slots) {
        var slot = slots[_slotName];

        if (slot.needsFallbackRendering) {
          slot.renderFallbackContent(view, nodes, projectionSource, index);
        }
      }
    };

    return ShadowDOM;
  }(), _class10.defaultSlotKey = '__au-default-slot-key__', _temp4);


  function register(lookup, name, resource, type) {
    if (!name) {
      return;
    }

    var existing = lookup[name];
    if (existing) {
      if (existing !== resource) {
        throw new Error('Attempted to register ' + type + ' when one with the same name already exists. Name: ' + name + '.');
      }

      return;
    }

    lookup[name] = resource;
  }

  function validateBehaviorName(name, type) {
    if (/[A-Z]/.test(name)) {
      var newName = _hyphenate(name);
      LogManager.getLogger('templating').warn('\'' + name + '\' is not a valid ' + type + ' name and has been converted to \'' + newName + '\'. Upper-case letters are not allowed because the DOM is not case-sensitive.');
      return newName;
    }
    return name;
  }

  var conventionMark = '__au_resource__';

  var ViewResources = exports.ViewResources = function () {
    ViewResources.convention = function convention(target, existing) {
      var resource = void 0;

      if (existing && conventionMark in existing) {
        return existing;
      }
      if ('$resource' in target) {
        var config = target.$resource;

        if (typeof config === 'string') {
          resource = existing || new HtmlBehaviorResource();
          resource[conventionMark] = true;
          if (!resource.elementName) {
            resource.elementName = validateBehaviorName(config, 'custom element');
          }
        } else {
          if (typeof config === 'function') {
            config = config.call(target);
          }
          if (typeof config === 'string') {
            config = { name: config };
          }

          config = Object.assign({}, config);

          var resourceType = config.type || 'element';

          var _name = config.name;
          switch (resourceType) {
            case 'element':case 'attribute':
              resource = existing || new HtmlBehaviorResource();
              resource[conventionMark] = true;
              if (resourceType === 'element') {
                if (!resource.elementName) {
                  resource.elementName = _name ? validateBehaviorName(_name, 'custom element') : _hyphenate(target.name);
                }
              } else {
                if (!resource.attributeName) {
                  resource.attributeName = _name ? validateBehaviorName(_name, 'custom attribute') : _hyphenate(target.name);
                }
              }
              if ('templateController' in config) {
                config.liftsContent = config.templateController;
                delete config.templateController;
              }
              if ('defaultBindingMode' in config && resource.attributeDefaultBindingMode !== undefined) {
                config.attributeDefaultBindingMode = config.defaultBindingMode;
                delete config.defaultBindingMode;
              }

              delete config.name;

              Object.assign(resource, config);
              break;
            case 'valueConverter':
              resource = new _aureliaBinding.ValueConverterResource((0, _aureliaBinding.camelCase)(_name || target.name));
              break;
            case 'bindingBehavior':
              resource = new _aureliaBinding.BindingBehaviorResource((0, _aureliaBinding.camelCase)(_name || target.name));
              break;
            case 'viewEngineHooks':
              resource = new ViewEngineHooksResource();
              break;
          }
        }

        if (resource instanceof HtmlBehaviorResource) {
          var _bindables = typeof config === 'string' ? undefined : config.bindables;
          var currentProps = resource.properties;
          if (Array.isArray(_bindables)) {
            for (var i = 0, ii = _bindables.length; ii > i; ++i) {
              var prop = _bindables[i];
              if (!prop || typeof prop !== 'string' && !prop.name) {
                throw new Error('Invalid bindable property at "' + i + '" for class "' + target.name + '". Expected either a string or an object with "name" property.');
              }
              var newProp = new BindableProperty(prop);

              var existed = false;
              for (var j = 0, jj = currentProps.length; jj > j; ++j) {
                if (currentProps[j].name === newProp.name) {
                  existed = true;
                  break;
                }
              }
              if (existed) {
                continue;
              }
              newProp.registerWith(target, resource);
            }
          }
        }
      }
      return resource;
    };

    function ViewResources(parent, viewUrl) {
      

      this.bindingLanguage = null;

      this.parent = parent || null;
      this.hasParent = this.parent !== null;
      this.viewUrl = viewUrl || '';
      this.lookupFunctions = {
        valueConverters: this.getValueConverter.bind(this),
        bindingBehaviors: this.getBindingBehavior.bind(this)
      };
      this.attributes = Object.create(null);
      this.elements = Object.create(null);
      this.valueConverters = Object.create(null);
      this.bindingBehaviors = Object.create(null);
      this.attributeMap = Object.create(null);
      this.values = Object.create(null);
      this.beforeCompile = this.afterCompile = this.beforeCreate = this.afterCreate = this.beforeBind = this.beforeUnbind = false;
    }

    ViewResources.prototype._tryAddHook = function _tryAddHook(obj, name) {
      if (typeof obj[name] === 'function') {
        var func = obj[name].bind(obj);
        var counter = 1;
        var callbackName = void 0;

        while (this[callbackName = name + counter.toString()] !== undefined) {
          counter++;
        }

        this[name] = true;
        this[callbackName] = func;
      }
    };

    ViewResources.prototype._invokeHook = function _invokeHook(name, one, two, three, four) {
      if (this.hasParent) {
        this.parent._invokeHook(name, one, two, three, four);
      }

      if (this[name]) {
        this[name + '1'](one, two, three, four);

        var callbackName = name + '2';
        if (this[callbackName]) {
          this[callbackName](one, two, three, four);

          callbackName = name + '3';
          if (this[callbackName]) {
            this[callbackName](one, two, three, four);

            var counter = 4;

            while (this[callbackName = name + counter.toString()] !== undefined) {
              this[callbackName](one, two, three, four);
              counter++;
            }
          }
        }
      }
    };

    ViewResources.prototype.registerViewEngineHooks = function registerViewEngineHooks(hooks) {
      this._tryAddHook(hooks, 'beforeCompile');
      this._tryAddHook(hooks, 'afterCompile');
      this._tryAddHook(hooks, 'beforeCreate');
      this._tryAddHook(hooks, 'afterCreate');
      this._tryAddHook(hooks, 'beforeBind');
      this._tryAddHook(hooks, 'beforeUnbind');
    };

    ViewResources.prototype.getBindingLanguage = function getBindingLanguage(bindingLanguageFallback) {
      return this.bindingLanguage || (this.bindingLanguage = bindingLanguageFallback);
    };

    ViewResources.prototype.patchInParent = function patchInParent(newParent) {
      var originalParent = this.parent;

      this.parent = newParent || null;
      this.hasParent = this.parent !== null;

      if (newParent.parent === null) {
        newParent.parent = originalParent;
        newParent.hasParent = originalParent !== null;
      }
    };

    ViewResources.prototype.relativeToView = function relativeToView(path) {
      return (0, _aureliaPath.relativeToFile)(path, this.viewUrl);
    };

    ViewResources.prototype.registerElement = function registerElement(tagName, behavior) {
      register(this.elements, tagName, behavior, 'an Element');
    };

    ViewResources.prototype.getElement = function getElement(tagName) {
      return this.elements[tagName] || (this.hasParent ? this.parent.getElement(tagName) : null);
    };

    ViewResources.prototype.mapAttribute = function mapAttribute(attribute) {
      return this.attributeMap[attribute] || (this.hasParent ? this.parent.mapAttribute(attribute) : null);
    };

    ViewResources.prototype.registerAttribute = function registerAttribute(attribute, behavior, knownAttribute) {
      this.attributeMap[attribute] = knownAttribute;
      register(this.attributes, attribute, behavior, 'an Attribute');
    };

    ViewResources.prototype.getAttribute = function getAttribute(attribute) {
      return this.attributes[attribute] || (this.hasParent ? this.parent.getAttribute(attribute) : null);
    };

    ViewResources.prototype.registerValueConverter = function registerValueConverter(name, valueConverter) {
      register(this.valueConverters, name, valueConverter, 'a ValueConverter');
    };

    ViewResources.prototype.getValueConverter = function getValueConverter(name) {
      return this.valueConverters[name] || (this.hasParent ? this.parent.getValueConverter(name) : null);
    };

    ViewResources.prototype.registerBindingBehavior = function registerBindingBehavior(name, bindingBehavior) {
      register(this.bindingBehaviors, name, bindingBehavior, 'a BindingBehavior');
    };

    ViewResources.prototype.getBindingBehavior = function getBindingBehavior(name) {
      return this.bindingBehaviors[name] || (this.hasParent ? this.parent.getBindingBehavior(name) : null);
    };

    ViewResources.prototype.registerValue = function registerValue(name, value) {
      register(this.values, name, value, 'a value');
    };

    ViewResources.prototype.getValue = function getValue(name) {
      return this.values[name] || (this.hasParent ? this.parent.getValue(name) : null);
    };

    ViewResources.prototype.autoRegister = function autoRegister(container, impl) {
      var resourceTypeMeta = _aureliaMetadata.metadata.getOwn(_aureliaMetadata.metadata.resource, impl);
      if (resourceTypeMeta) {
        if (resourceTypeMeta instanceof HtmlBehaviorResource) {
          ViewResources.convention(impl, resourceTypeMeta);

          if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
            HtmlBehaviorResource.convention(impl.name, resourceTypeMeta);
          }
          if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
            resourceTypeMeta.elementName = _hyphenate(impl.name);
          }
        }
      } else {
        resourceTypeMeta = ViewResources.convention(impl) || HtmlBehaviorResource.convention(impl.name) || _aureliaBinding.ValueConverterResource.convention(impl.name) || _aureliaBinding.BindingBehaviorResource.convention(impl.name) || ViewEngineHooksResource.convention(impl.name);
        if (!resourceTypeMeta) {
          resourceTypeMeta = new HtmlBehaviorResource();
          resourceTypeMeta.elementName = _hyphenate(impl.name);
        }
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, resourceTypeMeta, impl);
      }
      resourceTypeMeta.initialize(container, impl);
      resourceTypeMeta.register(this);
      return resourceTypeMeta;
    };

    return ViewResources;
  }();

  var View = exports.View = function () {
    function View(container, viewFactory, fragment, controllers, bindings, children, slots) {
      

      this.container = container;
      this.viewFactory = viewFactory;
      this.resources = viewFactory.resources;
      this.fragment = fragment;
      this.firstChild = fragment.firstChild;
      this.lastChild = fragment.lastChild;
      this.controllers = controllers;
      this.bindings = bindings;
      this.children = children;
      this.slots = slots;
      this.hasSlots = false;
      this.fromCache = false;
      this.isBound = false;
      this.isAttached = false;
      this.bindingContext = null;
      this.overrideContext = null;
      this.controller = null;
      this.viewModelScope = null;
      this.animatableElement = undefined;
      this._isUserControlled = false;
      this.contentView = null;

      for (var _key3 in slots) {
        this.hasSlots = true;
        break;
      }
    }

    View.prototype.returnToCache = function returnToCache() {
      this.viewFactory.returnViewToCache(this);
    };

    View.prototype.created = function created() {
      var i = void 0;
      var ii = void 0;
      var controllers = this.controllers;

      for (i = 0, ii = controllers.length; i < ii; ++i) {
        controllers[i].created(this);
      }
    };

    View.prototype.bind = function bind(bindingContext, overrideContext, _systemUpdate) {
      var controllers = void 0;
      var bindings = void 0;
      var children = void 0;
      var i = void 0;
      var ii = void 0;

      if (_systemUpdate && this._isUserControlled) {
        return;
      }

      if (this.isBound) {
        if (this.bindingContext === bindingContext) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.bindingContext = bindingContext;
      this.overrideContext = overrideContext || (0, _aureliaBinding.createOverrideContext)(bindingContext);

      this.resources._invokeHook('beforeBind', this);

      bindings = this.bindings;
      for (i = 0, ii = bindings.length; i < ii; ++i) {
        bindings[i].bind(this);
      }

      if (this.viewModelScope !== null) {
        bindingContext.bind(this.viewModelScope.bindingContext, this.viewModelScope.overrideContext);
        this.viewModelScope = null;
      }

      controllers = this.controllers;
      for (i = 0, ii = controllers.length; i < ii; ++i) {
        controllers[i].bind(this);
      }

      children = this.children;
      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].bind(bindingContext, overrideContext, true);
      }

      if (this.hasSlots) {
        ShadowDOM.distributeView(this.contentView, this.slots);
      }
    };

    View.prototype.addBinding = function addBinding(binding) {
      this.bindings.push(binding);

      if (this.isBound) {
        binding.bind(this);
      }
    };

    View.prototype.unbind = function unbind() {
      var controllers = void 0;
      var bindings = void 0;
      var children = void 0;
      var i = void 0;
      var ii = void 0;

      if (this.isBound) {
        this.isBound = false;
        this.resources._invokeHook('beforeUnbind', this);

        if (this.controller !== null) {
          this.controller.unbind();
        }

        bindings = this.bindings;
        for (i = 0, ii = bindings.length; i < ii; ++i) {
          bindings[i].unbind();
        }

        controllers = this.controllers;
        for (i = 0, ii = controllers.length; i < ii; ++i) {
          controllers[i].unbind();
        }

        children = this.children;
        for (i = 0, ii = children.length; i < ii; ++i) {
          children[i].unbind();
        }

        this.bindingContext = null;
        this.overrideContext = null;
      }
    };

    View.prototype.insertNodesBefore = function insertNodesBefore(refNode) {
      refNode.parentNode.insertBefore(this.fragment, refNode);
    };

    View.prototype.appendNodesTo = function appendNodesTo(parent) {
      parent.appendChild(this.fragment);
    };

    View.prototype.removeNodes = function removeNodes() {
      var fragment = this.fragment;
      var current = this.firstChild;
      var end = this.lastChild;
      var next = void 0;

      while (current) {
        next = current.nextSibling;
        fragment.appendChild(current);

        if (current === end) {
          break;
        }

        current = next;
      }
    };

    View.prototype.attached = function attached() {
      var controllers = void 0;
      var children = void 0;
      var i = void 0;
      var ii = void 0;

      if (this.isAttached) {
        return;
      }

      this.isAttached = true;

      if (this.controller !== null) {
        this.controller.attached();
      }

      controllers = this.controllers;
      for (i = 0, ii = controllers.length; i < ii; ++i) {
        controllers[i].attached();
      }

      children = this.children;
      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].attached();
      }
    };

    View.prototype.detached = function detached() {
      var controllers = void 0;
      var children = void 0;
      var i = void 0;
      var ii = void 0;

      if (this.isAttached) {
        this.isAttached = false;

        if (this.controller !== null) {
          this.controller.detached();
        }

        controllers = this.controllers;
        for (i = 0, ii = controllers.length; i < ii; ++i) {
          controllers[i].detached();
        }

        children = this.children;
        for (i = 0, ii = children.length; i < ii; ++i) {
          children[i].detached();
        }
      }
    };

    return View;
  }();

  function getAnimatableElement(view) {
    if (view.animatableElement !== undefined) {
      return view.animatableElement;
    }

    var current = view.firstChild;

    while (current && current.nodeType !== 1) {
      current = current.nextSibling;
    }

    if (current && current.nodeType === 1) {
      return view.animatableElement = current.classList.contains('au-animate') ? current : null;
    }

    return view.animatableElement = null;
  }

  var ViewSlot = exports.ViewSlot = function () {
    function ViewSlot(anchor, anchorIsContainer) {
      var animator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Animator.instance;

      

      this.anchor = anchor;
      this.anchorIsContainer = anchorIsContainer;
      this.bindingContext = null;
      this.overrideContext = null;
      this.animator = animator;
      this.children = [];
      this.isBound = false;
      this.isAttached = false;
      this.contentSelectors = null;
      anchor.viewSlot = this;
      anchor.isContentProjectionSource = false;
    }

    ViewSlot.prototype.animateView = function animateView(view) {
      var direction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'enter';

      var animatableElement = getAnimatableElement(view);

      if (animatableElement !== null) {
        switch (direction) {
          case 'enter':
            return this.animator.enter(animatableElement);
          case 'leave':
            return this.animator.leave(animatableElement);
          default:
            throw new Error('Invalid animation direction: ' + direction);
        }
      }
    };

    ViewSlot.prototype.transformChildNodesIntoView = function transformChildNodesIntoView() {
      var parent = this.anchor;

      this.children.push({
        fragment: parent,
        firstChild: parent.firstChild,
        lastChild: parent.lastChild,
        returnToCache: function returnToCache() {},
        removeNodes: function removeNodes() {
          var last = void 0;

          while (last = parent.lastChild) {
            parent.removeChild(last);
          }
        },
        created: function created() {},
        bind: function bind() {},
        unbind: function unbind() {},
        attached: function attached() {},
        detached: function detached() {}
      });
    };

    ViewSlot.prototype.bind = function bind(bindingContext, overrideContext) {
      var i = void 0;
      var ii = void 0;
      var children = void 0;

      if (this.isBound) {
        if (this.bindingContext === bindingContext) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.bindingContext = bindingContext = bindingContext || this.bindingContext;
      this.overrideContext = overrideContext = overrideContext || this.overrideContext;

      children = this.children;
      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].bind(bindingContext, overrideContext, true);
      }
    };

    ViewSlot.prototype.unbind = function unbind() {
      if (this.isBound) {
        var i = void 0;
        var ii = void 0;
        var _children4 = this.children;

        this.isBound = false;
        this.bindingContext = null;
        this.overrideContext = null;

        for (i = 0, ii = _children4.length; i < ii; ++i) {
          _children4[i].unbind();
        }
      }
    };

    ViewSlot.prototype.add = function add(view) {
      if (this.anchorIsContainer) {
        view.appendNodesTo(this.anchor);
      } else {
        view.insertNodesBefore(this.anchor);
      }

      this.children.push(view);

      if (this.isAttached) {
        view.attached();
        return this.animateView(view, 'enter');
      }
    };

    ViewSlot.prototype.insert = function insert(index, view) {
      var children = this.children;
      var length = children.length;

      if (index === 0 && length === 0 || index >= length) {
        return this.add(view);
      }

      view.insertNodesBefore(children[index].firstChild);
      children.splice(index, 0, view);

      if (this.isAttached) {
        view.attached();
        return this.animateView(view, 'enter');
      }
    };

    ViewSlot.prototype.move = function move(sourceIndex, targetIndex) {
      if (sourceIndex === targetIndex) {
        return;
      }

      var children = this.children;
      var view = children[sourceIndex];

      view.removeNodes();
      view.insertNodesBefore(children[targetIndex].firstChild);
      children.splice(sourceIndex, 1);
      children.splice(targetIndex, 0, view);
    };

    ViewSlot.prototype.remove = function remove(view, returnToCache, skipAnimation) {
      return this.removeAt(this.children.indexOf(view), returnToCache, skipAnimation);
    };

    ViewSlot.prototype.removeMany = function removeMany(viewsToRemove, returnToCache, skipAnimation) {
      var _this3 = this;

      var children = this.children;
      var ii = viewsToRemove.length;
      var i = void 0;
      var rmPromises = [];

      viewsToRemove.forEach(function (child) {
        if (skipAnimation) {
          child.removeNodes();
          return;
        }

        var animation = _this3.animateView(child, 'leave');
        if (animation) {
          rmPromises.push(animation.then(function () {
            return child.removeNodes();
          }));
        } else {
          child.removeNodes();
        }
      });

      var removeAction = function removeAction() {
        if (_this3.isAttached) {
          for (i = 0; i < ii; ++i) {
            viewsToRemove[i].detached();
          }
        }

        if (returnToCache) {
          for (i = 0; i < ii; ++i) {
            viewsToRemove[i].returnToCache();
          }
        }

        for (i = 0; i < ii; ++i) {
          var index = children.indexOf(viewsToRemove[i]);
          if (index >= 0) {
            children.splice(index, 1);
          }
        }
      };

      if (rmPromises.length > 0) {
        return Promise.all(rmPromises).then(function () {
          return removeAction();
        });
      }

      return removeAction();
    };

    ViewSlot.prototype.removeAt = function removeAt(index, returnToCache, skipAnimation) {
      var _this4 = this;

      var view = this.children[index];

      var removeAction = function removeAction() {
        index = _this4.children.indexOf(view);
        view.removeNodes();
        _this4.children.splice(index, 1);

        if (_this4.isAttached) {
          view.detached();
        }

        if (returnToCache) {
          view.returnToCache();
        }

        return view;
      };

      if (!skipAnimation) {
        var animation = this.animateView(view, 'leave');
        if (animation) {
          return animation.then(function () {
            return removeAction();
          });
        }
      }

      return removeAction();
    };

    ViewSlot.prototype.removeAll = function removeAll(returnToCache, skipAnimation) {
      var _this5 = this;

      var children = this.children;
      var ii = children.length;
      var i = void 0;
      var rmPromises = [];

      children.forEach(function (child) {
        if (skipAnimation) {
          child.removeNodes();
          return;
        }

        var animation = _this5.animateView(child, 'leave');
        if (animation) {
          rmPromises.push(animation.then(function () {
            return child.removeNodes();
          }));
        } else {
          child.removeNodes();
        }
      });

      var removeAction = function removeAction() {
        if (_this5.isAttached) {
          for (i = 0; i < ii; ++i) {
            children[i].detached();
          }
        }

        if (returnToCache) {
          for (i = 0; i < ii; ++i) {
            var _child3 = children[i];

            if (_child3) {
              _child3.returnToCache();
            }
          }
        }

        _this5.children = [];
      };

      if (rmPromises.length > 0) {
        return Promise.all(rmPromises).then(function () {
          return removeAction();
        });
      }

      return removeAction();
    };

    ViewSlot.prototype.attached = function attached() {
      var i = void 0;
      var ii = void 0;
      var children = void 0;
      var child = void 0;

      if (this.isAttached) {
        return;
      }

      this.isAttached = true;

      children = this.children;
      for (i = 0, ii = children.length; i < ii; ++i) {
        child = children[i];
        child.attached();
        this.animateView(child, 'enter');
      }
    };

    ViewSlot.prototype.detached = function detached() {
      var i = void 0;
      var ii = void 0;
      var children = void 0;

      if (this.isAttached) {
        this.isAttached = false;
        children = this.children;
        for (i = 0, ii = children.length; i < ii; ++i) {
          children[i].detached();
        }
      }
    };

    ViewSlot.prototype.projectTo = function projectTo(slots) {
      var _this6 = this;

      this.projectToSlots = slots;
      this.add = this._projectionAdd;
      this.insert = this._projectionInsert;
      this.move = this._projectionMove;
      this.remove = this._projectionRemove;
      this.removeAt = this._projectionRemoveAt;
      this.removeMany = this._projectionRemoveMany;
      this.removeAll = this._projectionRemoveAll;
      this.children.forEach(function (view) {
        return ShadowDOM.distributeView(view, slots, _this6);
      });
    };

    ViewSlot.prototype._projectionAdd = function _projectionAdd(view) {
      ShadowDOM.distributeView(view, this.projectToSlots, this);

      this.children.push(view);

      if (this.isAttached) {
        view.attached();
      }
    };

    ViewSlot.prototype._projectionInsert = function _projectionInsert(index, view) {
      if (index === 0 && !this.children.length || index >= this.children.length) {
        this.add(view);
      } else {
        ShadowDOM.distributeView(view, this.projectToSlots, this, index);

        this.children.splice(index, 0, view);

        if (this.isAttached) {
          view.attached();
        }
      }
    };

    ViewSlot.prototype._projectionMove = function _projectionMove(sourceIndex, targetIndex) {
      if (sourceIndex === targetIndex) {
        return;
      }

      var children = this.children;
      var view = children[sourceIndex];

      ShadowDOM.undistributeView(view, this.projectToSlots, this);
      ShadowDOM.distributeView(view, this.projectToSlots, this, targetIndex);

      children.splice(sourceIndex, 1);
      children.splice(targetIndex, 0, view);
    };

    ViewSlot.prototype._projectionRemove = function _projectionRemove(view, returnToCache) {
      ShadowDOM.undistributeView(view, this.projectToSlots, this);
      this.children.splice(this.children.indexOf(view), 1);

      if (this.isAttached) {
        view.detached();
      }
      if (returnToCache) {
        view.returnToCache();
      }
    };

    ViewSlot.prototype._projectionRemoveAt = function _projectionRemoveAt(index, returnToCache) {
      var view = this.children[index];

      ShadowDOM.undistributeView(view, this.projectToSlots, this);
      this.children.splice(index, 1);

      if (this.isAttached) {
        view.detached();
      }
      if (returnToCache) {
        view.returnToCache();
      }
    };

    ViewSlot.prototype._projectionRemoveMany = function _projectionRemoveMany(viewsToRemove, returnToCache) {
      var _this7 = this;

      viewsToRemove.forEach(function (view) {
        return _this7.remove(view, returnToCache);
      });
    };

    ViewSlot.prototype._projectionRemoveAll = function _projectionRemoveAll(returnToCache) {
      ShadowDOM.undistributeAll(this.projectToSlots, this);

      var children = this.children;
      var ii = children.length;

      for (var i = 0; i < ii; ++i) {
        if (returnToCache) {
          children[i].returnToCache();
        } else if (this.isAttached) {
          children[i].detached();
        }
      }

      this.children = [];
    };

    return ViewSlot;
  }();

  var ProviderResolver = (0, _aureliaDependencyInjection.resolver)(_class12 = function () {
    function ProviderResolver() {
      
    }

    ProviderResolver.prototype.get = function get(container, key) {
      var id = key.__providerId__;
      return id in container ? container[id] : container[id] = container.invoke(key);
    };

    return ProviderResolver;
  }()) || _class12;

  var providerResolverInstance = new ProviderResolver();

  function elementContainerGet(key) {
    if (key === _aureliaPal.DOM.Element) {
      return this.element;
    }

    if (key === BoundViewFactory) {
      if (this.boundViewFactory) {
        return this.boundViewFactory;
      }

      var factory = this.instruction.viewFactory;
      var _partReplacements = this.partReplacements;

      if (_partReplacements) {
        factory = _partReplacements[factory.part] || factory;
      }

      this.boundViewFactory = new BoundViewFactory(this, factory, _partReplacements);
      return this.boundViewFactory;
    }

    if (key === ViewSlot) {
      if (this.viewSlot === undefined) {
        this.viewSlot = new ViewSlot(this.element, this.instruction.anchorIsContainer);
        this.element.isContentProjectionSource = this.instruction.lifting;
        this.children.push(this.viewSlot);
      }

      return this.viewSlot;
    }

    if (key === ElementEvents) {
      return this.elementEvents || (this.elementEvents = new ElementEvents(this.element));
    }

    if (key === CompositionTransaction) {
      return this.compositionTransaction || (this.compositionTransaction = this.parent.get(key));
    }

    if (key === ViewResources) {
      return this.viewResources;
    }

    if (key === TargetInstruction) {
      return this.instruction;
    }

    return this.superGet(key);
  }

  function createElementContainer(parent, element, instruction, children, partReplacements, resources) {
    var container = parent.createChild();
    var providers = void 0;
    var i = void 0;

    container.element = element;
    container.instruction = instruction;
    container.children = children;
    container.viewResources = resources;
    container.partReplacements = partReplacements;

    providers = instruction.providers;
    i = providers.length;

    while (i--) {
      container._resolvers.set(providers[i], providerResolverInstance);
    }

    container.superGet = container.get;
    container.get = elementContainerGet;

    return container;
  }

  function hasAttribute(name) {
    return this._element.hasAttribute(name);
  }

  function getAttribute(name) {
    return this._element.getAttribute(name);
  }

  function setAttribute(name, value) {
    this._element.setAttribute(name, value);
  }

  function makeElementIntoAnchor(element, elementInstruction) {
    var anchor = _aureliaPal.DOM.createComment('anchor');

    if (elementInstruction) {
      var firstChild = element.firstChild;

      if (firstChild && firstChild.tagName === 'AU-CONTENT') {
        anchor.contentElement = firstChild;
      }

      anchor._element = element;

      anchor.hasAttribute = hasAttribute;
      anchor.getAttribute = getAttribute;
      anchor.setAttribute = setAttribute;
    }

    _aureliaPal.DOM.replaceNode(anchor, element);

    return anchor;
  }

  function applyInstructions(containers, element, instruction, controllers, bindings, children, shadowSlots, partReplacements, resources) {
    var behaviorInstructions = instruction.behaviorInstructions;
    var expressions = instruction.expressions;
    var elementContainer = void 0;
    var i = void 0;
    var ii = void 0;
    var current = void 0;
    var instance = void 0;

    if (instruction.contentExpression) {
      bindings.push(instruction.contentExpression.createBinding(element.nextSibling));
      element.nextSibling.auInterpolationTarget = true;
      element.parentNode.removeChild(element);
      return;
    }

    if (instruction.shadowSlot) {
      var commentAnchor = _aureliaPal.DOM.createComment('slot');
      var slot = void 0;

      if (instruction.slotDestination) {
        slot = new PassThroughSlot(commentAnchor, instruction.slotName, instruction.slotDestination, instruction.slotFallbackFactory);
      } else {
        slot = new ShadowSlot(commentAnchor, instruction.slotName, instruction.slotFallbackFactory);
      }

      _aureliaPal.DOM.replaceNode(commentAnchor, element);
      shadowSlots[instruction.slotName] = slot;
      controllers.push(slot);
      return;
    }

    if (instruction.letElement) {
      for (i = 0, ii = expressions.length; i < ii; ++i) {
        bindings.push(expressions[i].createBinding());
      }
      element.parentNode.removeChild(element);
      return;
    }

    if (behaviorInstructions.length) {
      if (!instruction.anchorIsContainer) {
        element = makeElementIntoAnchor(element, instruction.elementInstruction);
      }

      containers[instruction.injectorId] = elementContainer = createElementContainer(containers[instruction.parentInjectorId], element, instruction, children, partReplacements, resources);

      for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
        current = behaviorInstructions[i];
        instance = current.type.create(elementContainer, current, element, bindings);
        controllers.push(instance);
      }
    }

    for (i = 0, ii = expressions.length; i < ii; ++i) {
      bindings.push(expressions[i].createBinding(element));
    }
  }

  function styleStringToObject(style, target) {
    var attributes = style.split(';');
    var firstIndexOfColon = void 0;
    var i = void 0;
    var current = void 0;
    var key = void 0;
    var value = void 0;

    target = target || {};

    for (i = 0; i < attributes.length; i++) {
      current = attributes[i];
      firstIndexOfColon = current.indexOf(':');
      key = current.substring(0, firstIndexOfColon).trim();
      value = current.substring(firstIndexOfColon + 1).trim();
      target[key] = value;
    }

    return target;
  }

  function styleObjectToString(obj) {
    var result = '';

    for (var _key4 in obj) {
      result += _key4 + ':' + obj[_key4] + ';';
    }

    return result;
  }

  function applySurrogateInstruction(container, element, instruction, controllers, bindings, children) {
    var behaviorInstructions = instruction.behaviorInstructions;
    var expressions = instruction.expressions;
    var providers = instruction.providers;
    var values = instruction.values;
    var i = void 0;
    var ii = void 0;
    var current = void 0;
    var instance = void 0;
    var currentAttributeValue = void 0;

    i = providers.length;
    while (i--) {
      container._resolvers.set(providers[i], providerResolverInstance);
    }

    for (var _key5 in values) {
      currentAttributeValue = element.getAttribute(_key5);

      if (currentAttributeValue) {
        if (_key5 === 'class') {
          element.setAttribute('class', currentAttributeValue + ' ' + values[_key5]);
        } else if (_key5 === 'style') {
          var styleObject = styleStringToObject(values[_key5]);
          styleStringToObject(currentAttributeValue, styleObject);
          element.setAttribute('style', styleObjectToString(styleObject));
        }
      } else {
        element.setAttribute(_key5, values[_key5]);
      }
    }

    if (behaviorInstructions.length) {
      for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
        current = behaviorInstructions[i];
        instance = current.type.create(container, current, element, bindings);

        if (instance.contentView) {
          children.push(instance.contentView);
        }

        controllers.push(instance);
      }
    }

    for (i = 0, ii = expressions.length; i < ii; ++i) {
      bindings.push(expressions[i].createBinding(element));
    }
  }

  var BoundViewFactory = exports.BoundViewFactory = function () {
    function BoundViewFactory(parentContainer, viewFactory, partReplacements) {
      

      this.parentContainer = parentContainer;
      this.viewFactory = viewFactory;
      this.factoryCreateInstruction = { partReplacements: partReplacements };
    }

    BoundViewFactory.prototype.create = function create() {
      var view = this.viewFactory.create(this.parentContainer.createChild(), this.factoryCreateInstruction);
      view._isUserControlled = true;
      return view;
    };

    BoundViewFactory.prototype.setCacheSize = function setCacheSize(size, doNotOverrideIfAlreadySet) {
      this.viewFactory.setCacheSize(size, doNotOverrideIfAlreadySet);
    };

    BoundViewFactory.prototype.getCachedView = function getCachedView() {
      return this.viewFactory.getCachedView();
    };

    BoundViewFactory.prototype.returnViewToCache = function returnViewToCache(view) {
      this.viewFactory.returnViewToCache(view);
    };

    _createClass(BoundViewFactory, [{
      key: 'isCaching',
      get: function get() {
        return this.viewFactory.isCaching;
      }
    }]);

    return BoundViewFactory;
  }();

  var ViewFactory = exports.ViewFactory = function () {
    function ViewFactory(template, instructions, resources) {
      

      this.isCaching = false;

      this.template = template;
      this.instructions = instructions;
      this.resources = resources;
      this.cacheSize = -1;
      this.cache = null;
    }

    ViewFactory.prototype.setCacheSize = function setCacheSize(size, doNotOverrideIfAlreadySet) {
      if (size) {
        if (size === '*') {
          size = Number.MAX_VALUE;
        } else if (typeof size === 'string') {
          size = parseInt(size, 10);
        }
      }

      if (this.cacheSize === -1 || !doNotOverrideIfAlreadySet) {
        this.cacheSize = size;
      }

      if (this.cacheSize > 0) {
        this.cache = [];
      } else {
        this.cache = null;
      }

      this.isCaching = this.cacheSize > 0;
    };

    ViewFactory.prototype.getCachedView = function getCachedView() {
      return this.cache !== null ? this.cache.pop() || null : null;
    };

    ViewFactory.prototype.returnViewToCache = function returnViewToCache(view) {
      if (view.isAttached) {
        view.detached();
      }

      if (view.isBound) {
        view.unbind();
      }

      if (this.cache !== null && this.cache.length < this.cacheSize) {
        view.fromCache = true;
        this.cache.push(view);
      }
    };

    ViewFactory.prototype.create = function create(container, createInstruction, element) {
      createInstruction = createInstruction || BehaviorInstruction.normal;

      var cachedView = this.getCachedView();
      if (cachedView !== null) {
        return cachedView;
      }

      var fragment = createInstruction.enhance ? this.template : this.template.cloneNode(true);
      var instructables = fragment.querySelectorAll('.au-target');
      var instructions = this.instructions;
      var resources = this.resources;
      var controllers = [];
      var bindings = [];
      var children = [];
      var shadowSlots = Object.create(null);
      var containers = { root: container };
      var partReplacements = createInstruction.partReplacements;
      var i = void 0;
      var ii = void 0;
      var view = void 0;
      var instructable = void 0;
      var instruction = void 0;

      this.resources._invokeHook('beforeCreate', this, container, fragment, createInstruction);

      if (element && this.surrogateInstruction !== null) {
        applySurrogateInstruction(container, element, this.surrogateInstruction, controllers, bindings, children);
      }

      if (createInstruction.enhance && fragment.hasAttribute('au-target-id')) {
        instructable = fragment;
        instruction = instructions[instructable.getAttribute('au-target-id')];
        applyInstructions(containers, instructable, instruction, controllers, bindings, children, shadowSlots, partReplacements, resources);
      }

      for (i = 0, ii = instructables.length; i < ii; ++i) {
        instructable = instructables[i];
        instruction = instructions[instructable.getAttribute('au-target-id')];
        applyInstructions(containers, instructable, instruction, controllers, bindings, children, shadowSlots, partReplacements, resources);
      }

      view = new View(container, this, fragment, controllers, bindings, children, shadowSlots);

      if (!createInstruction.initiatedByBehavior) {
        view.created();
      }

      this.resources._invokeHook('afterCreate', view);

      return view;
    };

    return ViewFactory;
  }();

  var nextInjectorId = 0;
  function getNextInjectorId() {
    return ++nextInjectorId;
  }

  var lastAUTargetID = 0;
  function getNextAUTargetID() {
    return (++lastAUTargetID).toString();
  }

  function makeIntoInstructionTarget(element) {
    var value = element.getAttribute('class');
    var auTargetID = getNextAUTargetID();

    element.setAttribute('class', value ? value + ' au-target' : 'au-target');
    element.setAttribute('au-target-id', auTargetID);

    return auTargetID;
  }

  function makeShadowSlot(compiler, resources, node, instructions, parentInjectorId) {
    var auShadowSlot = _aureliaPal.DOM.createElement('au-shadow-slot');
    _aureliaPal.DOM.replaceNode(auShadowSlot, node);

    var auTargetID = makeIntoInstructionTarget(auShadowSlot);
    var instruction = TargetInstruction.shadowSlot(parentInjectorId);

    instruction.slotName = node.getAttribute('name') || ShadowDOM.defaultSlotKey;
    instruction.slotDestination = node.getAttribute('slot');

    if (node.innerHTML.trim()) {
      var fragment = _aureliaPal.DOM.createDocumentFragment();
      var _child4 = void 0;

      while (_child4 = node.firstChild) {
        fragment.appendChild(_child4);
      }

      instruction.slotFallbackFactory = compiler.compile(fragment, resources);
    }

    instructions[auTargetID] = instruction;

    return auShadowSlot;
  }

  var defaultLetHandler = BindingLanguage.prototype.createLetExpressions;

  var ViewCompiler = exports.ViewCompiler = function () {
    ViewCompiler.inject = function inject() {
      return [BindingLanguage, ViewResources];
    };

    function ViewCompiler(bindingLanguage, resources) {
      

      this.bindingLanguage = bindingLanguage;
      this.resources = resources;
    }

    ViewCompiler.prototype.compile = function compile(source, resources, compileInstruction) {
      resources = resources || this.resources;
      compileInstruction = compileInstruction || ViewCompileInstruction.normal;
      source = typeof source === 'string' ? _aureliaPal.DOM.createTemplateFromMarkup(source) : source;

      var content = void 0;
      var part = void 0;
      var cacheSize = void 0;

      if (source.content) {
        part = source.getAttribute('part');
        cacheSize = source.getAttribute('view-cache');
        content = _aureliaPal.DOM.adoptNode(source.content);
      } else {
        content = source;
      }

      compileInstruction.targetShadowDOM = compileInstruction.targetShadowDOM && _aureliaPal.FEATURE.shadowDOM;
      resources._invokeHook('beforeCompile', content, resources, compileInstruction);

      var instructions = {};
      this._compileNode(content, resources, instructions, source, 'root', !compileInstruction.targetShadowDOM);

      var firstChild = content.firstChild;
      if (firstChild && firstChild.nodeType === 1) {
        var targetId = firstChild.getAttribute('au-target-id');
        if (targetId) {
          var ins = instructions[targetId];

          if (ins.shadowSlot || ins.lifting || ins.elementInstruction && !ins.elementInstruction.anchorIsContainer) {
            content.insertBefore(_aureliaPal.DOM.createComment('view'), firstChild);
          }
        }
      }

      var factory = new ViewFactory(content, instructions, resources);

      factory.surrogateInstruction = compileInstruction.compileSurrogate ? this._compileSurrogate(source, resources) : null;
      factory.part = part;

      if (cacheSize) {
        factory.setCacheSize(cacheSize);
      }

      resources._invokeHook('afterCompile', factory);

      return factory;
    };

    ViewCompiler.prototype._compileNode = function _compileNode(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM) {
      switch (node.nodeType) {
        case 1:
          return this._compileElement(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM);
        case 3:
          var expression = resources.getBindingLanguage(this.bindingLanguage).inspectTextContent(resources, node.wholeText);
          if (expression) {
            var marker = _aureliaPal.DOM.createElement('au-marker');
            var auTargetID = makeIntoInstructionTarget(marker);
            (node.parentNode || parentNode).insertBefore(marker, node);
            node.textContent = ' ';
            instructions[auTargetID] = TargetInstruction.contentExpression(expression);

            while (node.nextSibling && node.nextSibling.nodeType === 3) {
              (node.parentNode || parentNode).removeChild(node.nextSibling);
            }
          } else {
            while (node.nextSibling && node.nextSibling.nodeType === 3) {
              node = node.nextSibling;
            }
          }
          return node.nextSibling;
        case 11:
          var currentChild = node.firstChild;
          while (currentChild) {
            currentChild = this._compileNode(currentChild, resources, instructions, node, parentInjectorId, targetLightDOM);
          }
          break;
        default:
          break;
      }

      return node.nextSibling;
    };

    ViewCompiler.prototype._compileSurrogate = function _compileSurrogate(node, resources) {
      var tagName = node.tagName.toLowerCase();
      var attributes = node.attributes;
      var bindingLanguage = resources.getBindingLanguage(this.bindingLanguage);
      var knownAttribute = void 0;
      var property = void 0;
      var instruction = void 0;
      var i = void 0;
      var ii = void 0;
      var attr = void 0;
      var attrName = void 0;
      var attrValue = void 0;
      var info = void 0;
      var type = void 0;
      var expressions = [];
      var expression = void 0;
      var behaviorInstructions = [];
      var values = {};
      var hasValues = false;
      var providers = [];

      for (i = 0, ii = attributes.length; i < ii; ++i) {
        attr = attributes[i];
        attrName = attr.name;
        attrValue = attr.value;

        info = bindingLanguage.inspectAttribute(resources, tagName, attrName, attrValue);
        type = resources.getAttribute(info.attrName);

        if (type) {
          knownAttribute = resources.mapAttribute(info.attrName);
          if (knownAttribute) {
            property = type.attributes[knownAttribute];

            if (property) {
              info.defaultBindingMode = property.defaultBindingMode;

              if (!info.command && !info.expression) {
                info.command = property.hasOptions ? 'options' : null;
              }

              if (info.command && info.command !== 'options' && type.primaryProperty) {
                var _primaryProperty = type.primaryProperty;
                attrName = info.attrName = _primaryProperty.attribute;

                info.defaultBindingMode = _primaryProperty.defaultBindingMode;
              }
            }
          }
        }

        instruction = bindingLanguage.createAttributeInstruction(resources, node, info, undefined, type);

        if (instruction) {
          if (instruction.alteredAttr) {
            type = resources.getAttribute(instruction.attrName);
          }

          if (instruction.discrete) {
            expressions.push(instruction);
          } else {
            if (type) {
              instruction.type = type;
              this._configureProperties(instruction, resources);

              if (type.liftsContent) {
                throw new Error('You cannot place a template controller on a surrogate element.');
              } else {
                behaviorInstructions.push(instruction);
              }
            } else {
              expressions.push(instruction.attributes[instruction.attrName]);
            }
          }
        } else {
          if (type) {
            instruction = BehaviorInstruction.attribute(attrName, type);
            instruction.attributes[resources.mapAttribute(attrName)] = attrValue;

            if (type.liftsContent) {
              throw new Error('You cannot place a template controller on a surrogate element.');
            } else {
              behaviorInstructions.push(instruction);
            }
          } else if (attrName !== 'id' && attrName !== 'part' && attrName !== 'replace-part') {
            hasValues = true;
            values[attrName] = attrValue;
          }
        }
      }

      if (expressions.length || behaviorInstructions.length || hasValues) {
        for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
          instruction = behaviorInstructions[i];
          instruction.type.compile(this, resources, node, instruction);
          providers.push(instruction.type.target);
        }

        for (i = 0, ii = expressions.length; i < ii; ++i) {
          expression = expressions[i];
          if (expression.attrToRemove !== undefined) {
            node.removeAttribute(expression.attrToRemove);
          }
        }

        return TargetInstruction.surrogate(providers, behaviorInstructions, expressions, values);
      }

      return null;
    };

    ViewCompiler.prototype._compileElement = function _compileElement(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM) {
      var tagName = node.tagName.toLowerCase();
      var attributes = node.attributes;
      var expressions = [];
      var expression = void 0;
      var behaviorInstructions = [];
      var providers = [];
      var bindingLanguage = resources.getBindingLanguage(this.bindingLanguage);
      var liftingInstruction = void 0;
      var viewFactory = void 0;
      var type = void 0;
      var elementInstruction = void 0;
      var elementProperty = void 0;
      var i = void 0;
      var ii = void 0;
      var attr = void 0;
      var attrName = void 0;
      var attrValue = void 0;
      var originalAttrName = void 0;
      var instruction = void 0;
      var info = void 0;
      var property = void 0;
      var knownAttribute = void 0;
      var auTargetID = void 0;
      var injectorId = void 0;

      if (tagName === 'slot') {
        if (targetLightDOM) {
          node = makeShadowSlot(this, resources, node, instructions, parentInjectorId);
        }
        return node.nextSibling;
      } else if (tagName === 'template') {
        if (!('content' in node)) {
          throw new Error('You cannot place a template element within ' + node.namespaceURI + ' namespace');
        }
        viewFactory = this.compile(node, resources);
        viewFactory.part = node.getAttribute('part');
      } else {
        type = resources.getElement(node.getAttribute('as-element') || tagName);

        if (tagName === 'let' && !type && bindingLanguage.createLetExpressions !== defaultLetHandler) {
          expressions = bindingLanguage.createLetExpressions(resources, node);
          auTargetID = makeIntoInstructionTarget(node);
          instructions[auTargetID] = TargetInstruction.letElement(expressions);
          return node.nextSibling;
        }
        if (type) {
          elementInstruction = BehaviorInstruction.element(node, type);
          type.processAttributes(this, resources, node, attributes, elementInstruction);
          behaviorInstructions.push(elementInstruction);
        }
      }

      for (i = 0, ii = attributes.length; i < ii; ++i) {
        attr = attributes[i];
        originalAttrName = attrName = attr.name;
        attrValue = attr.value;
        info = bindingLanguage.inspectAttribute(resources, tagName, attrName, attrValue);

        if (targetLightDOM && info.attrName === 'slot') {
          info.attrName = attrName = 'au-slot';
        }

        type = resources.getAttribute(info.attrName);
        elementProperty = null;

        if (type) {
          knownAttribute = resources.mapAttribute(info.attrName);
          if (knownAttribute) {
            property = type.attributes[knownAttribute];

            if (property) {
              info.defaultBindingMode = property.defaultBindingMode;

              if (!info.command && !info.expression) {
                info.command = property.hasOptions ? 'options' : null;
              }

              if (info.command && info.command !== 'options' && type.primaryProperty) {
                var _primaryProperty2 = type.primaryProperty;
                attrName = info.attrName = _primaryProperty2.attribute;

                info.defaultBindingMode = _primaryProperty2.defaultBindingMode;
              }
            }
          }
        } else if (elementInstruction) {
          elementProperty = elementInstruction.type.attributes[info.attrName];
          if (elementProperty) {
            info.defaultBindingMode = elementProperty.defaultBindingMode;
          }
        }

        if (elementProperty) {
          instruction = bindingLanguage.createAttributeInstruction(resources, node, info, elementInstruction);
        } else {
          instruction = bindingLanguage.createAttributeInstruction(resources, node, info, undefined, type);
        }

        if (instruction) {
          if (instruction.alteredAttr) {
            type = resources.getAttribute(instruction.attrName);
          }

          if (instruction.discrete) {
            expressions.push(instruction);
          } else {
            if (type) {
              instruction.type = type;
              this._configureProperties(instruction, resources);

              if (type.liftsContent) {
                instruction.originalAttrName = originalAttrName;
                liftingInstruction = instruction;
                break;
              } else {
                behaviorInstructions.push(instruction);
              }
            } else if (elementProperty) {
              elementInstruction.attributes[info.attrName].targetProperty = elementProperty.name;
            } else {
              expressions.push(instruction.attributes[instruction.attrName]);
            }
          }
        } else {
          if (type) {
            instruction = BehaviorInstruction.attribute(attrName, type);
            instruction.attributes[resources.mapAttribute(attrName)] = attrValue;

            if (type.liftsContent) {
              instruction.originalAttrName = originalAttrName;
              liftingInstruction = instruction;
              break;
            } else {
              behaviorInstructions.push(instruction);
            }
          } else if (elementProperty) {
            elementInstruction.attributes[attrName] = attrValue;
          }
        }
      }

      if (liftingInstruction) {
        liftingInstruction.viewFactory = viewFactory;
        node = liftingInstruction.type.compile(this, resources, node, liftingInstruction, parentNode);
        auTargetID = makeIntoInstructionTarget(node);
        instructions[auTargetID] = TargetInstruction.lifting(parentInjectorId, liftingInstruction);
      } else {
        var skipContentProcessing = false;

        if (expressions.length || behaviorInstructions.length) {
          injectorId = behaviorInstructions.length ? getNextInjectorId() : false;

          for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
            instruction = behaviorInstructions[i];
            instruction.type.compile(this, resources, node, instruction, parentNode);
            providers.push(instruction.type.target);
            skipContentProcessing = skipContentProcessing || instruction.skipContentProcessing;
          }

          for (i = 0, ii = expressions.length; i < ii; ++i) {
            expression = expressions[i];
            if (expression.attrToRemove !== undefined) {
              node.removeAttribute(expression.attrToRemove);
            }
          }

          auTargetID = makeIntoInstructionTarget(node);
          instructions[auTargetID] = TargetInstruction.normal(injectorId, parentInjectorId, providers, behaviorInstructions, expressions, elementInstruction);
        }

        if (skipContentProcessing) {
          return node.nextSibling;
        }

        var currentChild = node.firstChild;
        while (currentChild) {
          currentChild = this._compileNode(currentChild, resources, instructions, node, injectorId || parentInjectorId, targetLightDOM);
        }
      }

      return node.nextSibling;
    };

    ViewCompiler.prototype._configureProperties = function _configureProperties(instruction, resources) {
      var type = instruction.type;
      var attrName = instruction.attrName;
      var attributes = instruction.attributes;
      var property = void 0;
      var key = void 0;
      var value = void 0;

      var knownAttribute = resources.mapAttribute(attrName);
      if (knownAttribute && attrName in attributes && knownAttribute !== attrName) {
        attributes[knownAttribute] = attributes[attrName];
        delete attributes[attrName];
      }

      for (key in attributes) {
        value = attributes[key];

        if (value !== null && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
          property = type.attributes[key];

          if (property !== undefined) {
            value.targetProperty = property.name;
          } else {
            value.targetProperty = key;
          }
        }
      }
    };

    return ViewCompiler;
  }();

  var ResourceModule = exports.ResourceModule = function () {
    function ResourceModule(moduleId) {
      

      this.id = moduleId;
      this.moduleInstance = null;
      this.mainResource = null;
      this.resources = null;
      this.viewStrategy = null;
      this.isInitialized = false;
      this.onLoaded = null;
      this.loadContext = null;
    }

    ResourceModule.prototype.initialize = function initialize(container) {
      var current = this.mainResource;
      var resources = this.resources;
      var vs = this.viewStrategy;

      if (this.isInitialized) {
        return;
      }

      this.isInitialized = true;

      if (current !== undefined) {
        current.metadata.viewStrategy = vs;
        current.initialize(container);
      }

      for (var i = 0, ii = resources.length; i < ii; ++i) {
        current = resources[i];
        current.metadata.viewStrategy = vs;
        current.initialize(container);
      }
    };

    ResourceModule.prototype.register = function register(registry, name) {
      var main = this.mainResource;
      var resources = this.resources;

      if (main !== undefined) {
        main.register(registry, name);
        name = null;
      }

      for (var i = 0, ii = resources.length; i < ii; ++i) {
        resources[i].register(registry, name);
        name = null;
      }
    };

    ResourceModule.prototype.load = function load(container, loadContext) {
      if (this.onLoaded !== null) {
        return this.loadContext === loadContext ? Promise.resolve() : this.onLoaded;
      }

      var main = this.mainResource;
      var resources = this.resources;
      var loads = void 0;

      if (main !== undefined) {
        loads = new Array(resources.length + 1);
        loads[0] = main.load(container, loadContext);
        for (var i = 0, ii = resources.length; i < ii; ++i) {
          loads[i + 1] = resources[i].load(container, loadContext);
        }
      } else {
        loads = new Array(resources.length);
        for (var _i2 = 0, _ii = resources.length; _i2 < _ii; ++_i2) {
          loads[_i2] = resources[_i2].load(container, loadContext);
        }
      }

      this.loadContext = loadContext;
      this.onLoaded = Promise.all(loads);
      return this.onLoaded;
    };

    return ResourceModule;
  }();

  var ResourceDescription = exports.ResourceDescription = function () {
    function ResourceDescription(key, exportedValue, resourceTypeMeta) {
      

      if (!resourceTypeMeta) {
        resourceTypeMeta = _aureliaMetadata.metadata.get(_aureliaMetadata.metadata.resource, exportedValue);

        if (!resourceTypeMeta) {
          resourceTypeMeta = new HtmlBehaviorResource();
          resourceTypeMeta.elementName = _hyphenate(key);
          _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, resourceTypeMeta, exportedValue);
        }
      }

      if (resourceTypeMeta instanceof HtmlBehaviorResource) {
        if (resourceTypeMeta.elementName === undefined) {
          resourceTypeMeta.elementName = _hyphenate(key);
        } else if (resourceTypeMeta.attributeName === undefined) {
          resourceTypeMeta.attributeName = _hyphenate(key);
        } else if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
          HtmlBehaviorResource.convention(key, resourceTypeMeta);
        }
      } else if (!resourceTypeMeta.name) {
        resourceTypeMeta.name = _hyphenate(key);
      }

      this.metadata = resourceTypeMeta;
      this.value = exportedValue;
    }

    ResourceDescription.prototype.initialize = function initialize(container) {
      this.metadata.initialize(container, this.value);
    };

    ResourceDescription.prototype.register = function register(registry, name) {
      this.metadata.register(registry, name);
    };

    ResourceDescription.prototype.load = function load(container, loadContext) {
      return this.metadata.load(container, this.value, loadContext);
    };

    return ResourceDescription;
  }();

  var ModuleAnalyzer = exports.ModuleAnalyzer = function () {
    function ModuleAnalyzer() {
      

      this.cache = Object.create(null);
    }

    ModuleAnalyzer.prototype.getAnalysis = function getAnalysis(moduleId) {
      return this.cache[moduleId];
    };

    ModuleAnalyzer.prototype.analyze = function analyze(moduleId, moduleInstance, mainResourceKey) {
      var mainResource = void 0;
      var fallbackValue = void 0;
      var fallbackKey = void 0;
      var resourceTypeMeta = void 0;
      var key = void 0;
      var exportedValue = void 0;
      var resources = [];
      var conventional = void 0;
      var vs = void 0;
      var resourceModule = void 0;

      resourceModule = this.cache[moduleId];
      if (resourceModule) {
        return resourceModule;
      }

      resourceModule = new ResourceModule(moduleId);
      this.cache[moduleId] = resourceModule;

      if (typeof moduleInstance === 'function') {
        moduleInstance = { 'default': moduleInstance };
      }

      if (mainResourceKey) {
        mainResource = new ResourceDescription(mainResourceKey, moduleInstance[mainResourceKey]);
      }

      for (key in moduleInstance) {
        exportedValue = moduleInstance[key];

        if (key === mainResourceKey || typeof exportedValue !== 'function') {
          continue;
        }

        resourceTypeMeta = _aureliaMetadata.metadata.get(_aureliaMetadata.metadata.resource, exportedValue);

        if (resourceTypeMeta) {
          if (resourceTypeMeta instanceof HtmlBehaviorResource) {
            ViewResources.convention(exportedValue, resourceTypeMeta);

            if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
              HtmlBehaviorResource.convention(key, resourceTypeMeta);
            }

            if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
              resourceTypeMeta.elementName = _hyphenate(key);
            }
          }

          if (!mainResource && resourceTypeMeta instanceof HtmlBehaviorResource && resourceTypeMeta.elementName !== null) {
            mainResource = new ResourceDescription(key, exportedValue, resourceTypeMeta);
          } else {
            resources.push(new ResourceDescription(key, exportedValue, resourceTypeMeta));
          }
        } else if (viewStrategy.decorates(exportedValue)) {
          vs = exportedValue;
        } else if (exportedValue instanceof _aureliaLoader.TemplateRegistryEntry) {
          vs = new TemplateRegistryViewStrategy(moduleId, exportedValue);
        } else {
          if (conventional = ViewResources.convention(exportedValue)) {
            if (conventional.elementName !== null && !mainResource) {
              mainResource = new ResourceDescription(key, exportedValue, conventional);
            } else {
              resources.push(new ResourceDescription(key, exportedValue, conventional));
            }
            _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, conventional, exportedValue);
          } else if (conventional = HtmlBehaviorResource.convention(key)) {
            if (conventional.elementName !== null && !mainResource) {
              mainResource = new ResourceDescription(key, exportedValue, conventional);
            } else {
              resources.push(new ResourceDescription(key, exportedValue, conventional));
            }

            _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, conventional, exportedValue);
          } else if (conventional = _aureliaBinding.ValueConverterResource.convention(key) || _aureliaBinding.BindingBehaviorResource.convention(key) || ViewEngineHooksResource.convention(key)) {
            resources.push(new ResourceDescription(key, exportedValue, conventional));
            _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, conventional, exportedValue);
          } else if (!fallbackValue) {
            fallbackValue = exportedValue;
            fallbackKey = key;
          }
        }
      }

      if (!mainResource && fallbackValue) {
        mainResource = new ResourceDescription(fallbackKey, fallbackValue);
      }

      resourceModule.moduleInstance = moduleInstance;
      resourceModule.mainResource = mainResource;
      resourceModule.resources = resources;
      resourceModule.viewStrategy = vs;

      return resourceModule;
    };

    return ModuleAnalyzer;
  }();

  var logger = LogManager.getLogger('templating');

  function ensureRegistryEntry(loader, urlOrRegistryEntry) {
    if (urlOrRegistryEntry instanceof _aureliaLoader.TemplateRegistryEntry) {
      return Promise.resolve(urlOrRegistryEntry);
    }

    return loader.loadTemplate(urlOrRegistryEntry);
  }

  var ProxyViewFactory = function () {
    function ProxyViewFactory(promise) {
      var _this8 = this;

      

      promise.then(function (x) {
        return _this8.viewFactory = x;
      });
    }

    ProxyViewFactory.prototype.create = function create(container, bindingContext, createInstruction, element) {
      return this.viewFactory.create(container, bindingContext, createInstruction, element);
    };

    ProxyViewFactory.prototype.setCacheSize = function setCacheSize(size, doNotOverrideIfAlreadySet) {
      this.viewFactory.setCacheSize(size, doNotOverrideIfAlreadySet);
    };

    ProxyViewFactory.prototype.getCachedView = function getCachedView() {
      return this.viewFactory.getCachedView();
    };

    ProxyViewFactory.prototype.returnViewToCache = function returnViewToCache(view) {
      this.viewFactory.returnViewToCache(view);
    };

    _createClass(ProxyViewFactory, [{
      key: 'isCaching',
      get: function get() {
        return this.viewFactory.isCaching;
      }
    }]);

    return ProxyViewFactory;
  }();

  var auSlotBehavior = null;

  var ViewEngine = exports.ViewEngine = (_temp5 = _class14 = function () {
    ViewEngine.inject = function inject() {
      return [_aureliaLoader.Loader, _aureliaDependencyInjection.Container, ViewCompiler, ModuleAnalyzer, ViewResources];
    };

    function ViewEngine(loader, container, viewCompiler, moduleAnalyzer, appResources) {
      

      this.loader = loader;
      this.container = container;
      this.viewCompiler = viewCompiler;
      this.moduleAnalyzer = moduleAnalyzer;
      this.appResources = appResources;
      this._pluginMap = {};

      if (auSlotBehavior === null) {
        auSlotBehavior = new HtmlBehaviorResource();
        auSlotBehavior.attributeName = 'au-slot';
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, auSlotBehavior, SlotCustomAttribute);
      }

      auSlotBehavior.initialize(container, SlotCustomAttribute);
      auSlotBehavior.register(appResources);
    }

    ViewEngine.prototype.addResourcePlugin = function addResourcePlugin(extension, implementation) {
      var name = extension.replace('.', '') + '-resource-plugin';
      this._pluginMap[extension] = name;
      this.loader.addPlugin(name, implementation);
    };

    ViewEngine.prototype.loadViewFactory = function loadViewFactory(urlOrRegistryEntry, compileInstruction, loadContext, target) {
      var _this9 = this;

      loadContext = loadContext || new ResourceLoadContext();

      return ensureRegistryEntry(this.loader, urlOrRegistryEntry).then(function (registryEntry) {
        var url = registryEntry.address;

        if (registryEntry.onReady) {
          if (!loadContext.hasDependency(url)) {
            loadContext.addDependency(url);
            return registryEntry.onReady;
          }

          if (registryEntry.template === null) {
            return registryEntry.onReady;
          }

          return Promise.resolve(new ProxyViewFactory(registryEntry.onReady));
        }

        loadContext.addDependency(url);

        registryEntry.onReady = _this9.loadTemplateResources(registryEntry, compileInstruction, loadContext, target).then(function (resources) {
          registryEntry.resources = resources;

          if (registryEntry.template === null) {
            return registryEntry.factory = null;
          }

          var viewFactory = _this9.viewCompiler.compile(registryEntry.template, resources, compileInstruction);
          return registryEntry.factory = viewFactory;
        });

        return registryEntry.onReady;
      });
    };

    ViewEngine.prototype.loadTemplateResources = function loadTemplateResources(registryEntry, compileInstruction, loadContext, target) {
      var resources = new ViewResources(this.appResources, registryEntry.address);
      var dependencies = registryEntry.dependencies;
      var importIds = void 0;
      var names = void 0;

      compileInstruction = compileInstruction || ViewCompileInstruction.normal;

      if (dependencies.length === 0 && !compileInstruction.associatedModuleId) {
        return Promise.resolve(resources);
      }

      importIds = dependencies.map(function (x) {
        return x.src;
      });
      names = dependencies.map(function (x) {
        return x.name;
      });
      logger.debug('importing resources for ' + registryEntry.address, importIds);

      if (target) {
        var viewModelRequires = _aureliaMetadata.metadata.get(ViewEngine.viewModelRequireMetadataKey, target);
        if (viewModelRequires) {
          var templateImportCount = importIds.length;
          for (var i = 0, ii = viewModelRequires.length; i < ii; ++i) {
            var req = viewModelRequires[i];
            var importId = typeof req === 'function' ? _aureliaMetadata.Origin.get(req).moduleId : (0, _aureliaPath.relativeToFile)(req.src || req, registryEntry.address);

            if (importIds.indexOf(importId) === -1) {
              importIds.push(importId);
              names.push(req.as);
            }
          }
          logger.debug('importing ViewModel resources for ' + compileInstruction.associatedModuleId, importIds.slice(templateImportCount));
        }
      }

      return this.importViewResources(importIds, names, resources, compileInstruction, loadContext);
    };

    ViewEngine.prototype.importViewModelResource = function importViewModelResource(moduleImport, moduleMember) {
      var _this10 = this;

      return this.loader.loadModule(moduleImport).then(function (viewModelModule) {
        var normalizedId = _aureliaMetadata.Origin.get(viewModelModule).moduleId;
        var resourceModule = _this10.moduleAnalyzer.analyze(normalizedId, viewModelModule, moduleMember);

        if (!resourceModule.mainResource) {
          throw new Error('No view model found in module "' + moduleImport + '".');
        }

        resourceModule.initialize(_this10.container);

        return resourceModule.mainResource;
      });
    };

    ViewEngine.prototype.importViewResources = function importViewResources(moduleIds, names, resources, compileInstruction, loadContext) {
      var _this11 = this;

      loadContext = loadContext || new ResourceLoadContext();
      compileInstruction = compileInstruction || ViewCompileInstruction.normal;

      moduleIds = moduleIds.map(function (x) {
        return _this11._applyLoaderPlugin(x);
      });

      return this.loader.loadAllModules(moduleIds).then(function (imports) {
        var i = void 0;
        var ii = void 0;
        var analysis = void 0;
        var normalizedId = void 0;
        var current = void 0;
        var associatedModule = void 0;
        var container = _this11.container;
        var moduleAnalyzer = _this11.moduleAnalyzer;
        var allAnalysis = new Array(imports.length);

        for (i = 0, ii = imports.length; i < ii; ++i) {
          current = imports[i];
          normalizedId = _aureliaMetadata.Origin.get(current).moduleId;

          analysis = moduleAnalyzer.analyze(normalizedId, current);
          analysis.initialize(container);
          analysis.register(resources, names[i]);

          allAnalysis[i] = analysis;
        }

        if (compileInstruction.associatedModuleId) {
          associatedModule = moduleAnalyzer.getAnalysis(compileInstruction.associatedModuleId);

          if (associatedModule) {
            associatedModule.register(resources);
          }
        }

        for (i = 0, ii = allAnalysis.length; i < ii; ++i) {
          allAnalysis[i] = allAnalysis[i].load(container, loadContext);
        }

        return Promise.all(allAnalysis).then(function () {
          return resources;
        });
      });
    };

    ViewEngine.prototype._applyLoaderPlugin = function _applyLoaderPlugin(id) {
      var index = id.lastIndexOf('.');
      if (index !== -1) {
        var ext = id.substring(index);
        var pluginName = this._pluginMap[ext];

        if (pluginName === undefined) {
          return id;
        }

        return this.loader.applyPluginToUrl(id, pluginName);
      }

      return id;
    };

    return ViewEngine;
  }(), _class14.viewModelRequireMetadataKey = 'aurelia:view-model-require', _temp5);

  var Controller = exports.Controller = function () {
    function Controller(behavior, instruction, viewModel, container) {
      

      this.behavior = behavior;
      this.instruction = instruction;
      this.viewModel = viewModel;
      this.isAttached = false;
      this.view = null;
      this.isBound = false;
      this.scope = null;
      this.container = container;
      this.elementEvents = container.elementEvents || null;

      var observerLookup = behavior.observerLocator.getOrCreateObserversLookup(viewModel);
      var handlesBind = behavior.handlesBind;
      var attributes = instruction.attributes;
      var boundProperties = this.boundProperties = [];
      var properties = behavior.properties;
      var i = void 0;
      var ii = void 0;

      behavior._ensurePropertiesDefined(viewModel, observerLookup);

      for (i = 0, ii = properties.length; i < ii; ++i) {
        properties[i]._initialize(viewModel, observerLookup, attributes, handlesBind, boundProperties);
      }
    }

    Controller.prototype.created = function created(owningView) {
      if (this.behavior.handlesCreated) {
        this.viewModel.created(owningView, this.view);
      }
    };

    Controller.prototype.automate = function automate(overrideContext, owningView) {
      this.view.bindingContext = this.viewModel;
      this.view.overrideContext = overrideContext || (0, _aureliaBinding.createOverrideContext)(this.viewModel);
      this.view._isUserControlled = true;

      if (this.behavior.handlesCreated) {
        this.viewModel.created(owningView || null, this.view);
      }

      this.bind(this.view);
    };

    Controller.prototype.bind = function bind(scope) {
      var skipSelfSubscriber = this.behavior.handlesBind;
      var boundProperties = this.boundProperties;
      var i = void 0;
      var ii = void 0;
      var x = void 0;
      var observer = void 0;
      var selfSubscriber = void 0;

      if (this.isBound) {
        if (this.scope === scope) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.scope = scope;

      for (i = 0, ii = boundProperties.length; i < ii; ++i) {
        x = boundProperties[i];
        observer = x.observer;
        selfSubscriber = observer.selfSubscriber;
        observer.publishing = false;

        if (skipSelfSubscriber) {
          observer.selfSubscriber = null;
        }

        x.binding.bind(scope);
        observer.call();

        observer.publishing = true;
        observer.selfSubscriber = selfSubscriber;
      }

      var overrideContext = void 0;
      if (this.view !== null) {
        if (skipSelfSubscriber) {
          this.view.viewModelScope = scope;
        }

        if (this.viewModel === scope.overrideContext.bindingContext) {
          overrideContext = scope.overrideContext;
        } else if (this.instruction.inheritBindingContext) {
          overrideContext = (0, _aureliaBinding.createOverrideContext)(this.viewModel, scope.overrideContext);
        } else {
          overrideContext = (0, _aureliaBinding.createOverrideContext)(this.viewModel);
          overrideContext.__parentOverrideContext = scope.overrideContext;
        }

        this.view.bind(this.viewModel, overrideContext);
      } else if (skipSelfSubscriber) {
        overrideContext = scope.overrideContext;

        if (scope.overrideContext.__parentOverrideContext !== undefined && this.viewModel.viewFactory && this.viewModel.viewFactory.factoryCreateInstruction.partReplacements) {
          overrideContext = Object.assign({}, scope.overrideContext);
          overrideContext.parentOverrideContext = scope.overrideContext.__parentOverrideContext;
        }
        this.viewModel.bind(scope.bindingContext, overrideContext);
      }
    };

    Controller.prototype.unbind = function unbind() {
      if (this.isBound) {
        var _boundProperties = this.boundProperties;
        var _i3 = void 0;
        var _ii2 = void 0;

        this.isBound = false;
        this.scope = null;

        if (this.view !== null) {
          this.view.unbind();
        }

        if (this.behavior.handlesUnbind) {
          this.viewModel.unbind();
        }

        if (this.elementEvents !== null) {
          this.elementEvents.disposeAll();
        }

        for (_i3 = 0, _ii2 = _boundProperties.length; _i3 < _ii2; ++_i3) {
          _boundProperties[_i3].binding.unbind();
        }
      }
    };

    Controller.prototype.attached = function attached() {
      if (this.isAttached) {
        return;
      }

      this.isAttached = true;

      if (this.behavior.handlesAttached) {
        this.viewModel.attached();
      }

      if (this.view !== null) {
        this.view.attached();
      }
    };

    Controller.prototype.detached = function detached() {
      if (this.isAttached) {
        this.isAttached = false;

        if (this.view !== null) {
          this.view.detached();
        }

        if (this.behavior.handlesDetached) {
          this.viewModel.detached();
        }
      }
    };

    return Controller;
  }();

  var BehaviorPropertyObserver = exports.BehaviorPropertyObserver = (_dec7 = (0, _aureliaBinding.subscriberCollection)(), _dec7(_class15 = function () {
    function BehaviorPropertyObserver(taskQueue, obj, propertyName, selfSubscriber, initialValue) {
      

      this.taskQueue = taskQueue;
      this.obj = obj;
      this.propertyName = propertyName;
      this.notqueued = true;
      this.publishing = false;
      this.selfSubscriber = selfSubscriber;
      this.currentValue = this.oldValue = initialValue;
    }

    BehaviorPropertyObserver.prototype.getValue = function getValue() {
      return this.currentValue;
    };

    BehaviorPropertyObserver.prototype.setValue = function setValue(newValue) {
      var oldValue = this.currentValue;

      if (!Object.is(newValue, oldValue)) {
        this.oldValue = oldValue;
        this.currentValue = newValue;

        if (this.publishing && this.notqueued) {
          if (this.taskQueue.flushing) {
            this.call();
          } else {
            this.notqueued = false;
            this.taskQueue.queueMicroTask(this);
          }
        }
      }
    };

    BehaviorPropertyObserver.prototype.call = function call() {
      var oldValue = this.oldValue;
      var newValue = this.currentValue;

      this.notqueued = true;

      if (Object.is(newValue, oldValue)) {
        return;
      }

      if (this.selfSubscriber) {
        this.selfSubscriber(newValue, oldValue);
      }

      this.callSubscribers(newValue, oldValue);
      this.oldValue = newValue;
    };

    BehaviorPropertyObserver.prototype.subscribe = function subscribe(context, callable) {
      this.addSubscriber(context, callable);
    };

    BehaviorPropertyObserver.prototype.unsubscribe = function unsubscribe(context, callable) {
      this.removeSubscriber(context, callable);
    };

    return BehaviorPropertyObserver;
  }()) || _class15);


  function getObserver(instance, name) {
    var lookup = instance.__observers__;

    if (lookup === undefined) {
      var ctor = Object.getPrototypeOf(instance).constructor;
      var _behavior = _aureliaMetadata.metadata.get(_aureliaMetadata.metadata.resource, ctor);
      if (!_behavior.isInitialized) {
        _behavior.initialize(_aureliaDependencyInjection.Container.instance || new _aureliaDependencyInjection.Container(), instance.constructor);
      }

      lookup = _behavior.observerLocator.getOrCreateObserversLookup(instance);
      _behavior._ensurePropertiesDefined(instance, lookup);
    }

    return lookup[name];
  }

  var BindableProperty = exports.BindableProperty = function () {
    function BindableProperty(nameOrConfig) {
      

      if (typeof nameOrConfig === 'string') {
        this.name = nameOrConfig;
      } else {
        Object.assign(this, nameOrConfig);
      }

      this.attribute = this.attribute || _hyphenate(this.name);
      var defaultBindingMode = this.defaultBindingMode;
      if (defaultBindingMode === null || defaultBindingMode === undefined) {
        this.defaultBindingMode = _aureliaBinding.bindingMode.oneWay;
      } else if (typeof defaultBindingMode === 'string') {
        this.defaultBindingMode = _aureliaBinding.bindingMode[defaultBindingMode] || _aureliaBinding.bindingMode.oneWay;
      }
      this.changeHandler = this.changeHandler || null;
      this.owner = null;
      this.descriptor = null;
    }

    BindableProperty.prototype.registerWith = function registerWith(target, behavior, descriptor) {
      behavior.properties.push(this);
      behavior.attributes[this.attribute] = this;
      this.owner = behavior;

      if (descriptor) {
        this.descriptor = descriptor;
        return this._configureDescriptor(descriptor);
      }

      return undefined;
    };

    BindableProperty.prototype._configureDescriptor = function _configureDescriptor(descriptor) {
      var name = this.name;

      descriptor.configurable = true;
      descriptor.enumerable = true;

      if ('initializer' in descriptor) {
        this.defaultValue = descriptor.initializer;
        delete descriptor.initializer;
        delete descriptor.writable;
      }

      if ('value' in descriptor) {
        this.defaultValue = descriptor.value;
        delete descriptor.value;
        delete descriptor.writable;
      }

      descriptor.get = function () {
        return getObserver(this, name).getValue();
      };

      descriptor.set = function (value) {
        getObserver(this, name).setValue(value);
      };

      descriptor.get.getObserver = function (obj) {
        return getObserver(obj, name);
      };

      return descriptor;
    };

    BindableProperty.prototype.defineOn = function defineOn(target, behavior) {
      var name = this.name;
      var handlerName = void 0;

      if (this.changeHandler === null) {
        handlerName = name + 'Changed';
        if (handlerName in target.prototype) {
          this.changeHandler = handlerName;
        }
      }

      if (this.descriptor === null) {
        Object.defineProperty(target.prototype, name, this._configureDescriptor(behavior, {}));
      }
    };

    BindableProperty.prototype.createObserver = function createObserver(viewModel) {
      var selfSubscriber = null;
      var defaultValue = this.defaultValue;
      var changeHandlerName = this.changeHandler;
      var name = this.name;
      var initialValue = void 0;

      if (this.hasOptions) {
        return undefined;
      }

      if (changeHandlerName in viewModel) {
        if ('propertyChanged' in viewModel) {
          selfSubscriber = function selfSubscriber(newValue, oldValue) {
            viewModel[changeHandlerName](newValue, oldValue);
            viewModel.propertyChanged(name, newValue, oldValue);
          };
        } else {
          selfSubscriber = function selfSubscriber(newValue, oldValue) {
            return viewModel[changeHandlerName](newValue, oldValue);
          };
        }
      } else if ('propertyChanged' in viewModel) {
        selfSubscriber = function selfSubscriber(newValue, oldValue) {
          return viewModel.propertyChanged(name, newValue, oldValue);
        };
      } else if (changeHandlerName !== null) {
        throw new Error('Change handler ' + changeHandlerName + ' was specified but not declared on the class.');
      }

      if (defaultValue !== undefined) {
        initialValue = typeof defaultValue === 'function' ? defaultValue.call(viewModel) : defaultValue;
      }

      return new BehaviorPropertyObserver(this.owner.taskQueue, viewModel, this.name, selfSubscriber, initialValue);
    };

    BindableProperty.prototype._initialize = function _initialize(viewModel, observerLookup, attributes, behaviorHandlesBind, boundProperties) {
      var selfSubscriber = void 0;
      var observer = void 0;
      var attribute = void 0;
      var defaultValue = this.defaultValue;

      if (this.isDynamic) {
        for (var _key6 in attributes) {
          this._createDynamicProperty(viewModel, observerLookup, behaviorHandlesBind, _key6, attributes[_key6], boundProperties);
        }
      } else if (!this.hasOptions) {
        observer = observerLookup[this.name];

        if (attributes !== null) {
          selfSubscriber = observer.selfSubscriber;
          attribute = attributes[this.attribute];

          if (behaviorHandlesBind) {
            observer.selfSubscriber = null;
          }

          if (typeof attribute === 'string') {
            viewModel[this.name] = attribute;
            observer.call();
          } else if (attribute) {
            boundProperties.push({ observer: observer, binding: attribute.createBinding(viewModel) });
          } else if (defaultValue !== undefined) {
            observer.call();
          }

          observer.selfSubscriber = selfSubscriber;
        }

        observer.publishing = true;
      }
    };

    BindableProperty.prototype._createDynamicProperty = function _createDynamicProperty(viewModel, observerLookup, behaviorHandlesBind, name, attribute, boundProperties) {
      var changeHandlerName = name + 'Changed';
      var selfSubscriber = null;
      var observer = void 0;
      var info = void 0;

      if (changeHandlerName in viewModel) {
        if ('propertyChanged' in viewModel) {
          selfSubscriber = function selfSubscriber(newValue, oldValue) {
            viewModel[changeHandlerName](newValue, oldValue);
            viewModel.propertyChanged(name, newValue, oldValue);
          };
        } else {
          selfSubscriber = function selfSubscriber(newValue, oldValue) {
            return viewModel[changeHandlerName](newValue, oldValue);
          };
        }
      } else if ('propertyChanged' in viewModel) {
        selfSubscriber = function selfSubscriber(newValue, oldValue) {
          return viewModel.propertyChanged(name, newValue, oldValue);
        };
      }

      observer = observerLookup[name] = new BehaviorPropertyObserver(this.owner.taskQueue, viewModel, name, selfSubscriber);

      Object.defineProperty(viewModel, name, {
        configurable: true,
        enumerable: true,
        get: observer.getValue.bind(observer),
        set: observer.setValue.bind(observer)
      });

      if (behaviorHandlesBind) {
        observer.selfSubscriber = null;
      }

      if (typeof attribute === 'string') {
        viewModel[name] = attribute;
        observer.call();
      } else if (attribute) {
        info = { observer: observer, binding: attribute.createBinding(viewModel) };
        boundProperties.push(info);
      }

      observer.publishing = true;
      observer.selfSubscriber = selfSubscriber;
    };

    return BindableProperty;
  }();

  var lastProviderId = 0;

  function nextProviderId() {
    return ++lastProviderId;
  }

  function doProcessContent() {
    return true;
  }
  function doProcessAttributes() {}

  var HtmlBehaviorResource = exports.HtmlBehaviorResource = function () {
    function HtmlBehaviorResource() {
      

      this.elementName = null;
      this.attributeName = null;
      this.attributeDefaultBindingMode = undefined;
      this.liftsContent = false;
      this.targetShadowDOM = false;
      this.shadowDOMOptions = null;
      this.processAttributes = doProcessAttributes;
      this.processContent = doProcessContent;
      this.usesShadowDOM = false;
      this.childBindings = null;
      this.hasDynamicOptions = false;
      this.containerless = false;
      this.properties = [];
      this.attributes = {};
      this.isInitialized = false;
      this.primaryProperty = null;
    }

    HtmlBehaviorResource.convention = function convention(name, existing) {
      var behavior = void 0;

      if (name.endsWith('CustomAttribute')) {
        behavior = existing || new HtmlBehaviorResource();
        behavior.attributeName = _hyphenate(name.substring(0, name.length - 15));
      }

      if (name.endsWith('CustomElement')) {
        behavior = existing || new HtmlBehaviorResource();
        behavior.elementName = _hyphenate(name.substring(0, name.length - 13));
      }

      return behavior;
    };

    HtmlBehaviorResource.prototype.addChildBinding = function addChildBinding(behavior) {
      if (this.childBindings === null) {
        this.childBindings = [];
      }

      this.childBindings.push(behavior);
    };

    HtmlBehaviorResource.prototype.initialize = function initialize(container, target) {
      var proto = target.prototype;
      var properties = this.properties;
      var attributeName = this.attributeName;
      var attributeDefaultBindingMode = this.attributeDefaultBindingMode;
      var i = void 0;
      var ii = void 0;
      var current = void 0;

      if (this.isInitialized) {
        return;
      }

      this.isInitialized = true;
      target.__providerId__ = nextProviderId();

      this.observerLocator = container.get(_aureliaBinding.ObserverLocator);
      this.taskQueue = container.get(_aureliaTaskQueue.TaskQueue);

      this.target = target;
      this.usesShadowDOM = this.targetShadowDOM && _aureliaPal.FEATURE.shadowDOM;
      this.handlesCreated = 'created' in proto;
      this.handlesBind = 'bind' in proto;
      this.handlesUnbind = 'unbind' in proto;
      this.handlesAttached = 'attached' in proto;
      this.handlesDetached = 'detached' in proto;
      this.htmlName = this.elementName || this.attributeName;

      if (attributeName !== null) {
        if (properties.length === 0) {
          new BindableProperty({
            name: 'value',
            changeHandler: 'valueChanged' in proto ? 'valueChanged' : null,
            attribute: attributeName,
            defaultBindingMode: attributeDefaultBindingMode
          }).registerWith(target, this);
        }

        current = properties[0];

        if (properties.length === 1 && current.name === 'value') {
          current.isDynamic = current.hasOptions = this.hasDynamicOptions;
          current.defineOn(target, this);
        } else {
          for (i = 0, ii = properties.length; i < ii; ++i) {
            properties[i].defineOn(target, this);
            if (properties[i].primaryProperty) {
              if (this.primaryProperty) {
                throw new Error('Only one bindable property on a custom element can be defined as the default');
              }
              this.primaryProperty = properties[i];
            }
          }

          current = new BindableProperty({
            name: 'value',
            changeHandler: 'valueChanged' in proto ? 'valueChanged' : null,
            attribute: attributeName,
            defaultBindingMode: attributeDefaultBindingMode
          });

          current.hasOptions = true;
          current.registerWith(target, this);
        }
      } else {
        for (i = 0, ii = properties.length; i < ii; ++i) {
          properties[i].defineOn(target, this);
        }

        this._copyInheritedProperties(container, target);
      }
    };

    HtmlBehaviorResource.prototype.register = function register(registry, name) {
      var _this12 = this;

      if (this.attributeName !== null) {
        registry.registerAttribute(name || this.attributeName, this, this.attributeName);

        if (Array.isArray(this.aliases)) {
          this.aliases.forEach(function (alias) {
            registry.registerAttribute(alias, _this12, _this12.attributeName);
          });
        }
      }

      if (this.elementName !== null) {
        registry.registerElement(name || this.elementName, this);
      }
    };

    HtmlBehaviorResource.prototype.load = function load(container, target, loadContext, viewStrategy, transientView) {
      var _this13 = this;

      var options = void 0;

      if (this.elementName !== null) {
        viewStrategy = container.get(ViewLocator).getViewStrategy(viewStrategy || this.viewStrategy || target);
        options = new ViewCompileInstruction(this.targetShadowDOM, true);

        if (!viewStrategy.moduleId) {
          viewStrategy.moduleId = _aureliaMetadata.Origin.get(target).moduleId;
        }

        return viewStrategy.loadViewFactory(container.get(ViewEngine), options, loadContext, target).then(function (viewFactory) {
          if (!transientView || !_this13.viewFactory) {
            _this13.viewFactory = viewFactory;
          }

          return viewFactory;
        });
      }

      return Promise.resolve(this);
    };

    HtmlBehaviorResource.prototype.compile = function compile(compiler, resources, node, instruction, parentNode) {
      if (this.liftsContent) {
        if (!instruction.viewFactory) {
          var _template = _aureliaPal.DOM.createElement('template');
          var fragment = _aureliaPal.DOM.createDocumentFragment();
          var cacheSize = node.getAttribute('view-cache');
          var part = node.getAttribute('part');

          node.removeAttribute(instruction.originalAttrName);
          _aureliaPal.DOM.replaceNode(_template, node, parentNode);
          fragment.appendChild(node);
          instruction.viewFactory = compiler.compile(fragment, resources);

          if (part) {
            instruction.viewFactory.part = part;
            node.removeAttribute('part');
          }

          if (cacheSize) {
            instruction.viewFactory.setCacheSize(cacheSize);
            node.removeAttribute('view-cache');
          }

          node = _template;
        }
      } else if (this.elementName !== null) {
        var _partReplacements2 = {};

        if (this.processContent(compiler, resources, node, instruction) && node.hasChildNodes()) {
          var currentChild = node.firstChild;
          var contentElement = this.usesShadowDOM ? null : _aureliaPal.DOM.createElement('au-content');
          var nextSibling = void 0;
          var toReplace = void 0;

          while (currentChild) {
            nextSibling = currentChild.nextSibling;

            if (currentChild.tagName === 'TEMPLATE' && (toReplace = currentChild.getAttribute('replace-part'))) {
              _partReplacements2[toReplace] = compiler.compile(currentChild, resources);
              _aureliaPal.DOM.removeNode(currentChild, parentNode);
              instruction.partReplacements = _partReplacements2;
            } else if (contentElement !== null) {
              if (currentChild.nodeType === 3 && _isAllWhitespace(currentChild)) {
                _aureliaPal.DOM.removeNode(currentChild, parentNode);
              } else {
                contentElement.appendChild(currentChild);
              }
            }

            currentChild = nextSibling;
          }

          if (contentElement !== null && contentElement.hasChildNodes()) {
            node.appendChild(contentElement);
          }

          instruction.skipContentProcessing = false;
        } else {
          instruction.skipContentProcessing = true;
        }
      } else if (!this.processContent(compiler, resources, node, instruction)) {
        instruction.skipContentProcessing = true;
      }

      return node;
    };

    HtmlBehaviorResource.prototype.create = function create(container, instruction, element, bindings) {
      var viewHost = void 0;
      var au = null;

      instruction = instruction || BehaviorInstruction.normal;
      element = element || null;
      bindings = bindings || null;

      if (this.elementName !== null && element) {
        if (this.usesShadowDOM) {
          viewHost = element.attachShadow(this.shadowDOMOptions);
          container.registerInstance(_aureliaPal.DOM.boundary, viewHost);
        } else {
          viewHost = element;
          if (this.targetShadowDOM) {
            container.registerInstance(_aureliaPal.DOM.boundary, viewHost);
          }
        }
      }

      if (element !== null) {
        element.au = au = element.au || {};
      }

      var viewModel = instruction.viewModel || container.get(this.target);
      var controller = new Controller(this, instruction, viewModel, container);
      var childBindings = this.childBindings;
      var viewFactory = void 0;

      if (this.liftsContent) {
        au.controller = controller;
      } else if (this.elementName !== null) {
        viewFactory = instruction.viewFactory || this.viewFactory;
        container.viewModel = viewModel;

        if (viewFactory) {
          controller.view = viewFactory.create(container, instruction, element);
        }

        if (element !== null) {
          au.controller = controller;

          if (controller.view) {
            if (!this.usesShadowDOM && (element.childNodes.length === 1 || element.contentElement)) {
              var contentElement = element.childNodes[0] || element.contentElement;
              controller.view.contentView = { fragment: contentElement };
              contentElement.parentNode && _aureliaPal.DOM.removeNode(contentElement);
            }

            if (instruction.anchorIsContainer) {
              if (childBindings !== null) {
                for (var _i4 = 0, _ii3 = childBindings.length; _i4 < _ii3; ++_i4) {
                  controller.view.addBinding(childBindings[_i4].create(element, viewModel, controller));
                }
              }

              controller.view.appendNodesTo(viewHost);
            } else {
              controller.view.insertNodesBefore(viewHost);
            }
          } else if (childBindings !== null) {
            for (var _i5 = 0, _ii4 = childBindings.length; _i5 < _ii4; ++_i5) {
              bindings.push(childBindings[_i5].create(element, viewModel, controller));
            }
          }
        } else if (controller.view) {
          controller.view.controller = controller;

          if (childBindings !== null) {
            for (var _i6 = 0, _ii5 = childBindings.length; _i6 < _ii5; ++_i6) {
              controller.view.addBinding(childBindings[_i6].create(instruction.host, viewModel, controller));
            }
          }
        } else if (childBindings !== null) {
          for (var _i7 = 0, _ii6 = childBindings.length; _i7 < _ii6; ++_i7) {
            bindings.push(childBindings[_i7].create(instruction.host, viewModel, controller));
          }
        }
      } else if (childBindings !== null) {
        for (var _i8 = 0, _ii7 = childBindings.length; _i8 < _ii7; ++_i8) {
          bindings.push(childBindings[_i8].create(element, viewModel, controller));
        }
      }

      if (au !== null) {
        au[this.htmlName] = controller;
      }

      if (instruction.initiatedByBehavior && viewFactory) {
        controller.view.created();
      }

      return controller;
    };

    HtmlBehaviorResource.prototype._ensurePropertiesDefined = function _ensurePropertiesDefined(instance, lookup) {
      var properties = void 0;
      var i = void 0;
      var ii = void 0;
      var observer = void 0;

      if ('__propertiesDefined__' in lookup) {
        return;
      }

      lookup.__propertiesDefined__ = true;
      properties = this.properties;

      for (i = 0, ii = properties.length; i < ii; ++i) {
        observer = properties[i].createObserver(instance);

        if (observer !== undefined) {
          lookup[observer.propertyName] = observer;
        }
      }
    };

    HtmlBehaviorResource.prototype._copyInheritedProperties = function _copyInheritedProperties(container, target) {
      var _this14 = this;

      var behavior = void 0;
      var derived = target;

      while (true) {
        var proto = Object.getPrototypeOf(target.prototype);
        target = proto && proto.constructor;
        if (!target) {
          return;
        }
        behavior = _aureliaMetadata.metadata.getOwn(_aureliaMetadata.metadata.resource, target);
        if (behavior) {
          break;
        }
      }
      behavior.initialize(container, target);

      var _loop = function _loop(_i9, _ii8) {
        var prop = behavior.properties[_i9];

        if (_this14.properties.some(function (p) {
          return p.name === prop.name;
        })) {
          return 'continue';
        }

        new BindableProperty(prop).registerWith(derived, _this14);
      };

      for (var _i9 = 0, _ii8 = behavior.properties.length; _i9 < _ii8; ++_i9) {
        var _ret = _loop(_i9, _ii8);

        if (_ret === 'continue') continue;
      }
    };

    return HtmlBehaviorResource;
  }();

  function createChildObserverDecorator(selectorOrConfig, all) {
    return function (target, key, descriptor) {
      var actualTarget = typeof key === 'string' ? target.constructor : target;
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, actualTarget);

      if (typeof selectorOrConfig === 'string') {
        selectorOrConfig = {
          selector: selectorOrConfig,
          name: key
        };
      }

      if (descriptor) {
        descriptor.writable = true;
        descriptor.configurable = true;
      }

      selectorOrConfig.all = all;
      r.addChildBinding(new ChildObserver(selectorOrConfig));
    };
  }

  function children(selectorOrConfig) {
    return createChildObserverDecorator(selectorOrConfig, true);
  }

  function child(selectorOrConfig) {
    return createChildObserverDecorator(selectorOrConfig, false);
  }

  var ChildObserver = function () {
    function ChildObserver(config) {
      

      this.name = config.name;
      this.changeHandler = config.changeHandler || this.name + 'Changed';
      this.selector = config.selector;
      this.all = config.all;
    }

    ChildObserver.prototype.create = function create(viewHost, viewModel, controller) {
      return new ChildObserverBinder(this.selector, viewHost, this.name, viewModel, controller, this.changeHandler, this.all);
    };

    return ChildObserver;
  }();

  var noMutations = [];

  function trackMutation(groupedMutations, binder, record) {
    var mutations = groupedMutations.get(binder);

    if (!mutations) {
      mutations = [];
      groupedMutations.set(binder, mutations);
    }

    mutations.push(record);
  }

  function onChildChange(mutations, observer) {
    var binders = observer.binders;
    var bindersLength = binders.length;

    var groupedMutations = new Map();

    for (var _i10 = 0, _ii9 = mutations.length; _i10 < _ii9; ++_i10) {
      var record = mutations[_i10];
      var added = record.addedNodes;
      var removed = record.removedNodes;

      for (var j = 0, jj = removed.length; j < jj; ++j) {
        var _node = removed[j];
        if (_node.nodeType === 1) {
          for (var k = 0; k < bindersLength; ++k) {
            var binder = binders[k];

            if (binder.onRemove(_node)) {
              trackMutation(groupedMutations, binder, record);
            }
          }
        }
      }

      for (var _j = 0, _jj = added.length; _j < _jj; ++_j) {
        var _node2 = added[_j];
        if (_node2.nodeType === 1) {
          for (var _k = 0; _k < bindersLength; ++_k) {
            var _binder = binders[_k];

            if (_binder.onAdd(_node2)) {
              trackMutation(groupedMutations, _binder, record);
            }
          }
        }
      }
    }

    groupedMutations.forEach(function (mutationRecords, binder) {
      if (binder.isBound && binder.changeHandler !== null) {
        binder.viewModel[binder.changeHandler](mutationRecords);
      }
    });
  }

  var ChildObserverBinder = function () {
    function ChildObserverBinder(selector, viewHost, property, viewModel, controller, changeHandler, all) {
      

      this.selector = selector;

      this.viewHost = viewHost;
      this.property = property;
      this.viewModel = viewModel;
      this.controller = controller;
      this.changeHandler = changeHandler in viewModel ? changeHandler : null;
      this.usesShadowDOM = controller.behavior.usesShadowDOM;
      this.all = all;

      if (!this.usesShadowDOM && controller.view && controller.view.contentView) {
        this.contentView = controller.view.contentView;
      } else {
        this.contentView = null;
      }
      this.source = null;
      this.isBound = false;
    }

    ChildObserverBinder.prototype.matches = function matches(element) {
      if (element.matches(this.selector)) {
        if (this.contentView === null) {
          return true;
        }

        var contentView = this.contentView;
        var assignedSlot = element.auAssignedSlot;

        if (assignedSlot && assignedSlot.projectFromAnchors) {
          var anchors = assignedSlot.projectFromAnchors;

          for (var _i11 = 0, _ii10 = anchors.length; _i11 < _ii10; ++_i11) {
            if (anchors[_i11].auOwnerView === contentView) {
              return true;
            }
          }

          return false;
        }

        return element.auOwnerView === contentView;
      }

      return false;
    };

    ChildObserverBinder.prototype.bind = function bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.source = source;
      }
      this.isBound = true;

      var viewHost = this.viewHost;
      var viewModel = this.viewModel;
      var observer = viewHost.__childObserver__;

      if (!observer) {
        observer = viewHost.__childObserver__ = _aureliaPal.DOM.createMutationObserver(onChildChange);

        var options = {
          childList: true,
          subtree: !this.usesShadowDOM
        };

        observer.observe(viewHost, options);
        observer.binders = [];
      }

      observer.binders.push(this);

      if (this.usesShadowDOM) {
        var current = viewHost.firstElementChild;

        if (this.all) {
          var items = viewModel[this.property];
          if (!items) {
            items = viewModel[this.property] = [];
          } else {
            items.splice(0);
          }

          while (current) {
            if (this.matches(current)) {
              items.push(current.au && current.au.controller ? current.au.controller.viewModel : current);
            }

            current = current.nextElementSibling;
          }

          if (this.changeHandler !== null) {
            this.viewModel[this.changeHandler](noMutations);
          }
        } else {
          while (current) {
            if (this.matches(current)) {
              var _value = current.au && current.au.controller ? current.au.controller.viewModel : current;
              this.viewModel[this.property] = _value;

              if (this.changeHandler !== null) {
                this.viewModel[this.changeHandler](_value);
              }

              break;
            }

            current = current.nextElementSibling;
          }
        }
      }
    };

    ChildObserverBinder.prototype.onRemove = function onRemove(element) {
      if (this.matches(element)) {
        var _value2 = element.au && element.au.controller ? element.au.controller.viewModel : element;

        if (this.all) {
          var items = this.viewModel[this.property] || (this.viewModel[this.property] = []);
          var index = items.indexOf(_value2);

          if (index !== -1) {
            items.splice(index, 1);
          }

          return true;
        }

        var currentValue = this.viewModel[this.property];
        if (currentValue === _value2) {
          this.viewModel[this.property] = null;

          if (this.isBound && this.changeHandler !== null) {
            this.viewModel[this.changeHandler](_value2);
          }
        }
      }

      return false;
    };

    ChildObserverBinder.prototype.onAdd = function onAdd(element) {
      if (this.matches(element)) {
        var _value3 = element.au && element.au.controller ? element.au.controller.viewModel : element;

        if (this.all) {
          var items = this.viewModel[this.property] || (this.viewModel[this.property] = []);

          if (this.selector === '*') {
            items.push(_value3);
            return true;
          }

          var index = 0;
          var prev = element.previousElementSibling;

          while (prev) {
            if (this.matches(prev)) {
              index++;
            }

            prev = prev.previousElementSibling;
          }

          items.splice(index, 0, _value3);
          return true;
        }

        this.viewModel[this.property] = _value3;

        if (this.isBound && this.changeHandler !== null) {
          this.viewModel[this.changeHandler](_value3);
        }
      }

      return false;
    };

    ChildObserverBinder.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      this.source = null;
      var childObserver = this.viewHost.__childObserver__;
      if (childObserver) {
        var binders = childObserver.binders;
        if (binders && binders.length) {
          var idx = binders.indexOf(this);
          if (idx !== -1) {
            binders.splice(idx, 1);
          }
          if (binders.length === 0) {
            childObserver.disconnect();
            this.viewHost.__childObserver__ = null;
          }
        }

        if (this.usesShadowDOM) {
          this.viewModel[this.property] = null;
        }
      }
    };

    return ChildObserverBinder;
  }();

  function remove(viewSlot, previous) {
    return Array.isArray(previous) ? viewSlot.removeMany(previous, true) : viewSlot.remove(previous, true);
  }

  var SwapStrategies = exports.SwapStrategies = {
    before: function before(viewSlot, previous, callback) {
      return previous === undefined ? callback() : callback().then(function () {
        return remove(viewSlot, previous);
      });
    },
    with: function _with(viewSlot, previous, callback) {
      return previous === undefined ? callback() : Promise.all([remove(viewSlot, previous), callback()]);
    },
    after: function after(viewSlot, previous, callback) {
      return Promise.resolve(viewSlot.removeAll(true)).then(callback);
    }
  };

  function tryActivateViewModel(context) {
    if (context.skipActivation || typeof context.viewModel.activate !== 'function') {
      return Promise.resolve();
    }

    return context.viewModel.activate(context.model) || Promise.resolve();
  }

  var CompositionEngine = exports.CompositionEngine = (_dec8 = (0, _aureliaDependencyInjection.inject)(ViewEngine, ViewLocator), _dec8(_class16 = function () {
    function CompositionEngine(viewEngine, viewLocator) {
      

      this.viewEngine = viewEngine;
      this.viewLocator = viewLocator;
    }

    CompositionEngine.prototype._swap = function _swap(context, view) {
      var swapStrategy = SwapStrategies[context.swapOrder] || SwapStrategies.after;
      var previousViews = context.viewSlot.children.slice();

      return swapStrategy(context.viewSlot, previousViews, function () {
        return Promise.resolve(context.viewSlot.add(view)).then(function () {
          if (context.currentController) {
            context.currentController.unbind();
          }
        });
      }).then(function () {
        if (context.compositionTransactionNotifier) {
          context.compositionTransactionNotifier.done();
        }
      });
    };

    CompositionEngine.prototype._createControllerAndSwap = function _createControllerAndSwap(context) {
      var _this15 = this;

      return this.createController(context).then(function (controller) {
        if (context.compositionTransactionOwnershipToken) {
          return context.compositionTransactionOwnershipToken.waitForCompositionComplete().then(function () {
            controller.automate(context.overrideContext, context.owningView);

            return _this15._swap(context, controller.view);
          }).then(function () {
            return controller;
          });
        }

        controller.automate(context.overrideContext, context.owningView);

        return _this15._swap(context, controller.view).then(function () {
          return controller;
        });
      });
    };

    CompositionEngine.prototype.createController = function createController(context) {
      var _this16 = this;

      var childContainer = void 0;
      var viewModel = void 0;
      var viewModelResource = void 0;

      var m = void 0;

      return this.ensureViewModel(context).then(tryActivateViewModel).then(function () {
        childContainer = context.childContainer;
        viewModel = context.viewModel;
        viewModelResource = context.viewModelResource;
        m = viewModelResource.metadata;

        var viewStrategy = _this16.viewLocator.getViewStrategy(context.view || viewModel);

        if (context.viewResources) {
          viewStrategy.makeRelativeTo(context.viewResources.viewUrl);
        }

        return m.load(childContainer, viewModelResource.value, null, viewStrategy, true);
      }).then(function (viewFactory) {
        return m.create(childContainer, BehaviorInstruction.dynamic(context.host, viewModel, viewFactory));
      });
    };

    CompositionEngine.prototype.ensureViewModel = function ensureViewModel(context) {
      var childContainer = context.childContainer = context.childContainer || context.container.createChild();

      if (typeof context.viewModel === 'string') {
        context.viewModel = context.viewResources ? context.viewResources.relativeToView(context.viewModel) : context.viewModel;

        return this.viewEngine.importViewModelResource(context.viewModel).then(function (viewModelResource) {
          childContainer.autoRegister(viewModelResource.value);

          if (context.host) {
            childContainer.registerInstance(_aureliaPal.DOM.Element, context.host);
          }

          context.viewModel = childContainer.viewModel = childContainer.get(viewModelResource.value);
          context.viewModelResource = viewModelResource;
          return context;
        });
      }

      var ctor = context.viewModel.constructor;
      var isClass = typeof context.viewModel === 'function';
      if (isClass) {
        ctor = context.viewModel;
        childContainer.autoRegister(ctor);
      }
      var m = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, ctor);

      m.elementName = m.elementName || 'dynamic-element';

      m.initialize(isClass ? childContainer : context.container || childContainer, ctor);

      context.viewModelResource = { metadata: m, value: ctor };

      if (context.host) {
        childContainer.registerInstance(_aureliaPal.DOM.Element, context.host);
      }
      childContainer.viewModel = context.viewModel = isClass ? childContainer.get(ctor) : context.viewModel;
      return Promise.resolve(context);
    };

    CompositionEngine.prototype.compose = function compose(context) {
      var _this17 = this;

      context.childContainer = context.childContainer || context.container.createChild();
      context.view = this.viewLocator.getViewStrategy(context.view);

      var transaction = context.childContainer.get(CompositionTransaction);
      var compositionTransactionOwnershipToken = transaction.tryCapture();

      if (compositionTransactionOwnershipToken) {
        context.compositionTransactionOwnershipToken = compositionTransactionOwnershipToken;
      } else {
        context.compositionTransactionNotifier = transaction.enlist();
      }

      if (context.viewModel) {
        return this._createControllerAndSwap(context);
      } else if (context.view) {
        if (context.viewResources) {
          context.view.makeRelativeTo(context.viewResources.viewUrl);
        }

        return context.view.loadViewFactory(this.viewEngine, new ViewCompileInstruction()).then(function (viewFactory) {
          var result = viewFactory.create(context.childContainer);
          result.bind(context.bindingContext, context.overrideContext);

          if (context.compositionTransactionOwnershipToken) {
            return context.compositionTransactionOwnershipToken.waitForCompositionComplete().then(function () {
              return _this17._swap(context, result);
            }).then(function () {
              return result;
            });
          }

          return _this17._swap(context, result).then(function () {
            return result;
          });
        });
      } else if (context.viewSlot) {
        context.viewSlot.removeAll();

        if (context.compositionTransactionNotifier) {
          context.compositionTransactionNotifier.done();
        }

        return Promise.resolve(null);
      }

      return Promise.resolve(null);
    };

    return CompositionEngine;
  }()) || _class16);

  var ElementConfigResource = exports.ElementConfigResource = function () {
    function ElementConfigResource() {
      
    }

    ElementConfigResource.prototype.initialize = function initialize(container, target) {};

    ElementConfigResource.prototype.register = function register(registry, name) {};

    ElementConfigResource.prototype.load = function load(container, target) {
      var config = new target();
      var eventManager = container.get(_aureliaBinding.EventManager);
      eventManager.registerElementConfig(config);
    };

    return ElementConfigResource;
  }();

  function resource(instanceOrConfig) {
    return function (target) {
      var isConfig = typeof instanceOrConfig === 'string' || Object.getPrototypeOf(instanceOrConfig) === Object.prototype;
      if (isConfig) {
        target.$resource = instanceOrConfig;
      } else {
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, instanceOrConfig, target);
      }
    };
  }

  function behavior(override) {
    return function (target) {
      if (override instanceof HtmlBehaviorResource) {
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, override, target);
      } else {
        var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, target);
        Object.assign(r, override);
      }
    };
  }

  function customElement(name) {
    return function (target) {
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, target);
      r.elementName = validateBehaviorName(name, 'custom element');
    };
  }

  function customAttribute(name, defaultBindingMode, aliases) {
    return function (target) {
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, target);
      r.attributeName = validateBehaviorName(name, 'custom attribute');
      r.attributeDefaultBindingMode = defaultBindingMode;
      r.aliases = aliases;
    };
  }

  function templateController(target) {
    var deco = function deco(t) {
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);
      r.liftsContent = true;
    };

    return target ? deco(target) : deco;
  }

  function bindable(nameOrConfigOrTarget, key, descriptor) {
    var deco = function deco(target, key2, descriptor2) {
      var actualTarget = key2 ? target.constructor : target;
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, actualTarget);
      var prop = void 0;

      if (key2) {
        nameOrConfigOrTarget = nameOrConfigOrTarget || {};
        nameOrConfigOrTarget.name = key2;
      }

      prop = new BindableProperty(nameOrConfigOrTarget);
      return prop.registerWith(actualTarget, r, descriptor2);
    };

    if (!nameOrConfigOrTarget) {
      return deco;
    }

    if (key) {
      var _target = nameOrConfigOrTarget;
      nameOrConfigOrTarget = null;
      return deco(_target, key, descriptor);
    }

    return deco;
  }

  function dynamicOptions(target) {
    var deco = function deco(t) {
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);
      r.hasDynamicOptions = true;
    };

    return target ? deco(target) : deco;
  }

  var defaultShadowDOMOptions = { mode: 'open' };
  function useShadowDOM(targetOrOptions) {
    var options = typeof targetOrOptions === 'function' || !targetOrOptions ? defaultShadowDOMOptions : targetOrOptions;

    var deco = function deco(t) {
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);
      r.targetShadowDOM = true;
      r.shadowDOMOptions = options;
    };

    return typeof targetOrOptions === 'function' ? deco(targetOrOptions) : deco;
  }

  function processAttributes(processor) {
    return function (t) {
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);
      r.processAttributes = function (compiler, resources, node, attributes, elementInstruction) {
        try {
          processor(compiler, resources, node, attributes, elementInstruction);
        } catch (error) {
          LogManager.getLogger('templating').error(error);
        }
      };
    };
  }

  function doNotProcessContent() {
    return false;
  }

  function processContent(processor) {
    return function (t) {
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);
      r.processContent = processor ? function (compiler, resources, node, instruction) {
        try {
          return processor(compiler, resources, node, instruction);
        } catch (error) {
          LogManager.getLogger('templating').error(error);
          return false;
        }
      } : doNotProcessContent;
    };
  }

  function containerless(target) {
    var deco = function deco(t) {
      var r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);
      r.containerless = true;
    };

    return target ? deco(target) : deco;
  }

  function useViewStrategy(strategy) {
    return function (target) {
      _aureliaMetadata.metadata.define(ViewLocator.viewStrategyMetadataKey, strategy, target);
    };
  }

  function useView(path) {
    return useViewStrategy(new RelativeViewStrategy(path));
  }

  function inlineView(markup, dependencies, dependencyBaseUrl) {
    return useViewStrategy(new InlineViewStrategy(markup, dependencies, dependencyBaseUrl));
  }

  function noView(targetOrDependencies, dependencyBaseUrl) {
    var target = void 0;
    var dependencies = void 0;
    if (typeof targetOrDependencies === 'function') {
      target = targetOrDependencies;
    } else {
      dependencies = targetOrDependencies;
      target = undefined;
    }

    var deco = function deco(t) {
      _aureliaMetadata.metadata.define(ViewLocator.viewStrategyMetadataKey, new NoViewStrategy(dependencies, dependencyBaseUrl), t);
    };

    return target ? deco(target) : deco;
  }

  function view(templateOrConfig) {
    return function (target) {
      target.$view = templateOrConfig;
    };
  }

  function elementConfig(target) {
    var deco = function deco(t) {
      _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new ElementConfigResource(), t);
    };

    return target ? deco(target) : deco;
  }

  function viewResources() {
    for (var _len = arguments.length, resources = Array(_len), _key7 = 0; _key7 < _len; _key7++) {
      resources[_key7] = arguments[_key7];
    }

    return function (target) {
      _aureliaMetadata.metadata.define(ViewEngine.viewModelRequireMetadataKey, resources, target);
    };
  }

  var TemplatingEngine = exports.TemplatingEngine = (_dec9 = (0, _aureliaDependencyInjection.inject)(_aureliaDependencyInjection.Container, ModuleAnalyzer, ViewCompiler, CompositionEngine), _dec9(_class17 = function () {
    function TemplatingEngine(container, moduleAnalyzer, viewCompiler, compositionEngine) {
      

      this._container = container;
      this._moduleAnalyzer = moduleAnalyzer;
      this._viewCompiler = viewCompiler;
      this._compositionEngine = compositionEngine;
      container.registerInstance(Animator, Animator.instance = new Animator());
    }

    TemplatingEngine.prototype.configureAnimator = function configureAnimator(animator) {
      this._container.unregister(Animator);
      this._container.registerInstance(Animator, Animator.instance = animator);
    };

    TemplatingEngine.prototype.compose = function compose(context) {
      return this._compositionEngine.compose(context);
    };

    TemplatingEngine.prototype.enhance = function enhance(instruction) {
      if (instruction instanceof _aureliaPal.DOM.Element) {
        instruction = { element: instruction };
      }

      var compilerInstructions = { letExpressions: [] };
      var resources = instruction.resources || this._container.get(ViewResources);

      this._viewCompiler._compileNode(instruction.element, resources, compilerInstructions, instruction.element.parentNode, 'root', true);

      var factory = new ViewFactory(instruction.element, compilerInstructions, resources);
      var container = instruction.container || this._container.createChild();
      var view = factory.create(container, BehaviorInstruction.enhance());

      view.bind(instruction.bindingContext || {}, instruction.overrideContext);

      view.firstChild = view.lastChild = view.fragment;
      view.fragment = _aureliaPal.DOM.createDocumentFragment();
      view.attached();

      return view;
    };

    return TemplatingEngine;
  }()) || _class17);
});
define('aurelia-templating-binding',['exports', 'aurelia-logging', 'aurelia-binding', 'aurelia-templating'], function (exports, _aureliaLogging, _aureliaBinding, _aureliaTemplating) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.TemplatingBindingLanguage = exports.SyntaxInterpreter = exports.LetInterpolationBinding = exports.LetInterpolationBindingExpression = exports.LetBinding = exports.LetExpression = exports.ChildInterpolationBinding = exports.InterpolationBinding = exports.InterpolationBindingExpression = exports.AttributeMap = undefined;
  exports.configure = configure;

  var LogManager = _interopRequireWildcard(_aureliaLogging);

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    } else {
      var newObj = {};

      if (obj != null) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
        }
      }

      newObj.default = obj;
      return newObj;
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  

  var _class, _temp, _dec, _class2, _dec2, _class3, _class4, _temp2, _class5, _temp3;

  var AttributeMap = exports.AttributeMap = (_temp = _class = function () {
    function AttributeMap(svg) {
      

      this.elements = Object.create(null);
      this.allElements = Object.create(null);

      this.svg = svg;

      this.registerUniversal('accesskey', 'accessKey');
      this.registerUniversal('contenteditable', 'contentEditable');
      this.registerUniversal('tabindex', 'tabIndex');
      this.registerUniversal('textcontent', 'textContent');
      this.registerUniversal('innerhtml', 'innerHTML');
      this.registerUniversal('scrolltop', 'scrollTop');
      this.registerUniversal('scrollleft', 'scrollLeft');
      this.registerUniversal('readonly', 'readOnly');

      this.register('label', 'for', 'htmlFor');

      this.register('img', 'usemap', 'useMap');

      this.register('input', 'maxlength', 'maxLength');
      this.register('input', 'minlength', 'minLength');
      this.register('input', 'formaction', 'formAction');
      this.register('input', 'formenctype', 'formEncType');
      this.register('input', 'formmethod', 'formMethod');
      this.register('input', 'formnovalidate', 'formNoValidate');
      this.register('input', 'formtarget', 'formTarget');

      this.register('textarea', 'maxlength', 'maxLength');

      this.register('td', 'rowspan', 'rowSpan');
      this.register('td', 'colspan', 'colSpan');
      this.register('th', 'rowspan', 'rowSpan');
      this.register('th', 'colspan', 'colSpan');
    }

    AttributeMap.prototype.register = function register(elementName, attributeName, propertyName) {
      elementName = elementName.toLowerCase();
      attributeName = attributeName.toLowerCase();
      var element = this.elements[elementName] = this.elements[elementName] || Object.create(null);
      element[attributeName] = propertyName;
    };

    AttributeMap.prototype.registerUniversal = function registerUniversal(attributeName, propertyName) {
      attributeName = attributeName.toLowerCase();
      this.allElements[attributeName] = propertyName;
    };

    AttributeMap.prototype.map = function map(elementName, attributeName) {
      if (this.svg.isStandardSvgAttribute(elementName, attributeName)) {
        return attributeName;
      }
      elementName = elementName.toLowerCase();
      attributeName = attributeName.toLowerCase();
      var element = this.elements[elementName];
      if (element !== undefined && attributeName in element) {
        return element[attributeName];
      }
      if (attributeName in this.allElements) {
        return this.allElements[attributeName];
      }

      if (/(?:^data-)|(?:^aria-)|:/.test(attributeName)) {
        return attributeName;
      }
      return (0, _aureliaBinding.camelCase)(attributeName);
    };

    return AttributeMap;
  }(), _class.inject = [_aureliaBinding.SVGAnalyzer], _temp);

  var InterpolationBindingExpression = exports.InterpolationBindingExpression = function () {
    function InterpolationBindingExpression(observerLocator, targetProperty, parts, mode, lookupFunctions, attribute) {
      

      this.observerLocator = observerLocator;
      this.targetProperty = targetProperty;
      this.parts = parts;
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
      this.attribute = this.attrToRemove = attribute;
      this.discrete = false;
    }

    InterpolationBindingExpression.prototype.createBinding = function createBinding(target) {
      if (this.parts.length === 3) {
        return new ChildInterpolationBinding(target, this.observerLocator, this.parts[1], this.mode, this.lookupFunctions, this.targetProperty, this.parts[0], this.parts[2]);
      }
      return new InterpolationBinding(this.observerLocator, this.parts, target, this.targetProperty, this.mode, this.lookupFunctions);
    };

    return InterpolationBindingExpression;
  }();

  function validateTarget(target, propertyName) {
    if (propertyName === 'style') {
      LogManager.getLogger('templating-binding').info('Internet Explorer does not support interpolation in "style" attributes.  Use the style attribute\'s alias, "css" instead.');
    } else if (target.parentElement && target.parentElement.nodeName === 'TEXTAREA' && propertyName === 'textContent') {
      throw new Error('Interpolation binding cannot be used in the content of a textarea element.  Use <textarea value.bind="expression"></textarea> instead.');
    }
  }

  var InterpolationBinding = exports.InterpolationBinding = function () {
    function InterpolationBinding(observerLocator, parts, target, targetProperty, mode, lookupFunctions) {
      

      validateTarget(target, targetProperty);
      this.observerLocator = observerLocator;
      this.parts = parts;
      this.target = target;
      this.targetProperty = targetProperty;
      this.targetAccessor = observerLocator.getAccessor(target, targetProperty);
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
    }

    InterpolationBinding.prototype.interpolate = function interpolate() {
      if (this.isBound) {
        var value = '';
        var parts = this.parts;
        for (var i = 0, ii = parts.length; i < ii; i++) {
          value += i % 2 === 0 ? parts[i] : this['childBinding' + i].value;
        }
        this.targetAccessor.setValue(value, this.target, this.targetProperty);
      }
    };

    InterpolationBinding.prototype.updateOneTimeBindings = function updateOneTimeBindings() {
      for (var i = 1, ii = this.parts.length; i < ii; i += 2) {
        var child = this['childBinding' + i];
        if (child.mode === _aureliaBinding.bindingMode.oneTime) {
          child.call();
        }
      }
    };

    InterpolationBinding.prototype.bind = function bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.unbind();
      }
      this.source = source;

      var parts = this.parts;
      for (var i = 1, ii = parts.length; i < ii; i += 2) {
        var binding = new ChildInterpolationBinding(this, this.observerLocator, parts[i], this.mode, this.lookupFunctions);
        binding.bind(source);
        this['childBinding' + i] = binding;
      }

      this.isBound = true;
      this.interpolate();
    };

    InterpolationBinding.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      this.source = null;
      var parts = this.parts;
      for (var i = 1, ii = parts.length; i < ii; i += 2) {
        var name = 'childBinding' + i;
        this[name].unbind();
      }
    };

    return InterpolationBinding;
  }();

  var ChildInterpolationBinding = exports.ChildInterpolationBinding = (_dec = (0, _aureliaBinding.connectable)(), _dec(_class2 = function () {
    function ChildInterpolationBinding(target, observerLocator, sourceExpression, mode, lookupFunctions, targetProperty, left, right) {
      

      if (target instanceof InterpolationBinding) {
        this.parent = target;
      } else {
        validateTarget(target, targetProperty);
        this.target = target;
        this.targetProperty = targetProperty;
        this.targetAccessor = observerLocator.getAccessor(target, targetProperty);
      }
      this.observerLocator = observerLocator;
      this.sourceExpression = sourceExpression;
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
      this.left = left;
      this.right = right;
    }

    ChildInterpolationBinding.prototype.updateTarget = function updateTarget(value) {
      value = value === null || value === undefined ? '' : value.toString();
      if (value !== this.value) {
        this.value = value;
        if (this.parent) {
          this.parent.interpolate();
        } else {
          this.targetAccessor.setValue(this.left + value + this.right, this.target, this.targetProperty);
        }
      }
    };

    ChildInterpolationBinding.prototype.call = function call() {
      if (!this.isBound) {
        return;
      }

      this.rawValue = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
      this.updateTarget(this.rawValue);

      if (this.mode !== _aureliaBinding.bindingMode.oneTime) {
        this._version++;
        this.sourceExpression.connect(this, this.source);
        if (this.rawValue instanceof Array) {
          this.observeArray(this.rawValue);
        }
        this.unobserve(false);
      }
    };

    ChildInterpolationBinding.prototype.bind = function bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.unbind();
      }
      this.isBound = true;
      this.source = source;

      var sourceExpression = this.sourceExpression;
      if (sourceExpression.bind) {
        sourceExpression.bind(this, source, this.lookupFunctions);
      }

      this.rawValue = sourceExpression.evaluate(source, this.lookupFunctions);
      this.updateTarget(this.rawValue);

      if (this.mode === _aureliaBinding.bindingMode.oneWay) {
        (0, _aureliaBinding.enqueueBindingConnect)(this);
      }
    };

    ChildInterpolationBinding.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      var sourceExpression = this.sourceExpression;
      if (sourceExpression.unbind) {
        sourceExpression.unbind(this, this.source);
      }
      this.source = null;
      this.value = null;
      this.rawValue = null;
      this.unobserve(true);
    };

    ChildInterpolationBinding.prototype.connect = function connect(evaluate) {
      if (!this.isBound) {
        return;
      }
      if (evaluate) {
        this.rawValue = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
        this.updateTarget(this.rawValue);
      }
      this.sourceExpression.connect(this, this.source);
      if (this.rawValue instanceof Array) {
        this.observeArray(this.rawValue);
      }
    };

    return ChildInterpolationBinding;
  }()) || _class2);

  var LetExpression = exports.LetExpression = function () {
    function LetExpression(observerLocator, targetProperty, sourceExpression, lookupFunctions, toBindingContext) {
      

      this.observerLocator = observerLocator;
      this.sourceExpression = sourceExpression;
      this.targetProperty = targetProperty;
      this.lookupFunctions = lookupFunctions;
      this.toBindingContext = toBindingContext;
    }

    LetExpression.prototype.createBinding = function createBinding() {
      return new LetBinding(this.observerLocator, this.sourceExpression, this.targetProperty, this.lookupFunctions, this.toBindingContext);
    };

    return LetExpression;
  }();

  var LetBinding = exports.LetBinding = (_dec2 = (0, _aureliaBinding.connectable)(), _dec2(_class3 = function () {
    function LetBinding(observerLocator, sourceExpression, targetProperty, lookupFunctions, toBindingContext) {
      

      this.observerLocator = observerLocator;
      this.sourceExpression = sourceExpression;
      this.targetProperty = targetProperty;
      this.lookupFunctions = lookupFunctions;
      this.source = null;
      this.target = null;
      this.toBindingContext = toBindingContext;
    }

    LetBinding.prototype.updateTarget = function updateTarget() {
      var value = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
      this.target[this.targetProperty] = value;
    };

    LetBinding.prototype.call = function call(context) {
      if (!this.isBound) {
        return;
      }
      if (context === _aureliaBinding.sourceContext) {
        this.updateTarget();
        return;
      }
      throw new Error('Unexpected call context ' + context);
    };

    LetBinding.prototype.bind = function bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.unbind();
      }

      this.isBound = true;
      this.source = source;
      this.target = this.toBindingContext ? source.bindingContext : source.overrideContext;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }

      (0, _aureliaBinding.enqueueBindingConnect)(this);
    };

    LetBinding.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }
      this.source = null;
      this.target = null;
      this.unobserve(true);
    };

    LetBinding.prototype.connect = function connect() {
      if (!this.isBound) {
        return;
      }
      this.updateTarget();
      this.sourceExpression.connect(this, this.source);
    };

    return LetBinding;
  }()) || _class3);

  var LetInterpolationBindingExpression = exports.LetInterpolationBindingExpression = function () {
    function LetInterpolationBindingExpression(observerLocator, targetProperty, parts, lookupFunctions, toBindingContext) {
      

      this.observerLocator = observerLocator;
      this.targetProperty = targetProperty;
      this.parts = parts;
      this.lookupFunctions = lookupFunctions;
      this.toBindingContext = toBindingContext;
    }

    LetInterpolationBindingExpression.prototype.createBinding = function createBinding() {
      return new LetInterpolationBinding(this.observerLocator, this.targetProperty, this.parts, this.lookupFunctions, this.toBindingContext);
    };

    return LetInterpolationBindingExpression;
  }();

  var LetInterpolationBinding = exports.LetInterpolationBinding = function () {
    function LetInterpolationBinding(observerLocator, targetProperty, parts, lookupFunctions, toBindingContext) {
      

      this.observerLocator = observerLocator;
      this.parts = parts;
      this.targetProperty = targetProperty;
      this.lookupFunctions = lookupFunctions;
      this.toBindingContext = toBindingContext;
      this.target = null;
    }

    LetInterpolationBinding.prototype.bind = function bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }
        this.unbind();
      }

      this.isBound = true;
      this.source = source;
      this.target = this.toBindingContext ? source.bindingContext : source.overrideContext;

      this.interpolationBinding = this.createInterpolationBinding();
      this.interpolationBinding.bind(source);
    };

    LetInterpolationBinding.prototype.unbind = function unbind() {
      if (!this.isBound) {
        return;
      }
      this.isBound = false;
      this.source = null;
      this.target = null;
      this.interpolationBinding.unbind();
      this.interpolationBinding = null;
    };

    LetInterpolationBinding.prototype.createInterpolationBinding = function createInterpolationBinding() {
      if (this.parts.length === 3) {
        return new ChildInterpolationBinding(this.target, this.observerLocator, this.parts[1], _aureliaBinding.bindingMode.oneWay, this.lookupFunctions, this.targetProperty, this.parts[0], this.parts[2]);
      }
      return new InterpolationBinding(this.observerLocator, this.parts, this.target, this.targetProperty, _aureliaBinding.bindingMode.oneWay, this.lookupFunctions);
    };

    return LetInterpolationBinding;
  }();

  var SyntaxInterpreter = exports.SyntaxInterpreter = (_temp2 = _class4 = function () {
    function SyntaxInterpreter(parser, observerLocator, eventManager, attributeMap) {
      

      this.parser = parser;
      this.observerLocator = observerLocator;
      this.eventManager = eventManager;
      this.attributeMap = attributeMap;
    }

    SyntaxInterpreter.prototype.interpret = function interpret(resources, element, info, existingInstruction, context) {
      if (info.command in this) {
        return this[info.command](resources, element, info, existingInstruction, context);
      }

      return this.handleUnknownCommand(resources, element, info, existingInstruction, context);
    };

    SyntaxInterpreter.prototype.handleUnknownCommand = function handleUnknownCommand(resources, element, info, existingInstruction, context) {
      LogManager.getLogger('templating-binding').warn('Unknown binding command.', info);
      return existingInstruction;
    };

    SyntaxInterpreter.prototype.determineDefaultBindingMode = function determineDefaultBindingMode(element, attrName, context) {
      var tagName = element.tagName.toLowerCase();

      if (tagName === 'input' && (attrName === 'value' || attrName === 'files') && element.type !== 'checkbox' && element.type !== 'radio' || tagName === 'input' && attrName === 'checked' && (element.type === 'checkbox' || element.type === 'radio') || (tagName === 'textarea' || tagName === 'select') && attrName === 'value' || (attrName === 'textcontent' || attrName === 'innerhtml') && element.contentEditable === 'true' || attrName === 'scrolltop' || attrName === 'scrollleft') {
        return _aureliaBinding.bindingMode.twoWay;
      }

      if (context && attrName in context.attributes && context.attributes[attrName] && context.attributes[attrName].defaultBindingMode >= _aureliaBinding.bindingMode.oneTime) {
        return context.attributes[attrName].defaultBindingMode;
      }

      return _aureliaBinding.bindingMode.oneWay;
    };

    SyntaxInterpreter.prototype.bind = function bind(resources, element, info, existingInstruction, context) {
      var instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), info.defaultBindingMode === undefined || info.defaultBindingMode === null ? this.determineDefaultBindingMode(element, info.attrName, context) : info.defaultBindingMode, resources.lookupFunctions);

      return instruction;
    };

    SyntaxInterpreter.prototype.trigger = function trigger(resources, element, info) {
      return new _aureliaBinding.ListenerExpression(this.eventManager, info.attrName, this.parser.parse(info.attrValue), _aureliaBinding.delegationStrategy.none, true, resources.lookupFunctions);
    };

    SyntaxInterpreter.prototype.capture = function capture(resources, element, info) {
      return new _aureliaBinding.ListenerExpression(this.eventManager, info.attrName, this.parser.parse(info.attrValue), _aureliaBinding.delegationStrategy.capturing, true, resources.lookupFunctions);
    };

    SyntaxInterpreter.prototype.delegate = function delegate(resources, element, info) {
      return new _aureliaBinding.ListenerExpression(this.eventManager, info.attrName, this.parser.parse(info.attrValue), _aureliaBinding.delegationStrategy.bubbling, true, resources.lookupFunctions);
    };

    SyntaxInterpreter.prototype.call = function call(resources, element, info, existingInstruction) {
      var instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.CallExpression(this.observerLocator, info.attrName, this.parser.parse(info.attrValue), resources.lookupFunctions);

      return instruction;
    };

    SyntaxInterpreter.prototype.options = function options(resources, element, info, existingInstruction, context) {
      var instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);
      var attrValue = info.attrValue;
      var language = this.language;
      var name = null;
      var target = '';
      var current = void 0;
      var i = void 0;
      var ii = void 0;
      var inString = false;
      var inEscape = false;
      var foundName = false;

      for (i = 0, ii = attrValue.length; i < ii; ++i) {
        current = attrValue[i];

        if (current === ';' && !inString) {
          if (!foundName) {
            name = this._getPrimaryPropertyName(resources, context);
          }
          info = language.inspectAttribute(resources, '?', name, target.trim());
          language.createAttributeInstruction(resources, element, info, instruction, context);

          if (!instruction.attributes[info.attrName]) {
            instruction.attributes[info.attrName] = info.attrValue;
          }

          target = '';
          name = null;
        } else if (current === ':' && name === null) {
          foundName = true;
          name = target.trim();
          target = '';
        } else if (current === '\\') {
          target += current;
          inEscape = true;
          continue;
        } else {
          target += current;

          if (name !== null && inEscape === false && current === '\'') {
            inString = !inString;
          }
        }

        inEscape = false;
      }

      if (!foundName) {
        name = this._getPrimaryPropertyName(resources, context);
      }

      if (name !== null) {
        info = language.inspectAttribute(resources, '?', name, target.trim());
        language.createAttributeInstruction(resources, element, info, instruction, context);

        if (!instruction.attributes[info.attrName]) {
          instruction.attributes[info.attrName] = info.attrValue;
        }
      }

      return instruction;
    };

    SyntaxInterpreter.prototype._getPrimaryPropertyName = function _getPrimaryPropertyName(resources, context) {
      var type = resources.getAttribute(context.attributeName);
      if (type && type.primaryProperty) {
        return type.primaryProperty.attribute;
      }
      return null;
    };

    SyntaxInterpreter.prototype['for'] = function _for(resources, element, info, existingInstruction) {
      var parts = void 0;
      var keyValue = void 0;
      var instruction = void 0;
      var attrValue = void 0;
      var isDestructuring = void 0;

      attrValue = info.attrValue;
      isDestructuring = attrValue.match(/^ *[[].+[\]]/);
      parts = isDestructuring ? attrValue.split('of ') : attrValue.split(' of ');

      if (parts.length !== 2) {
        throw new Error('Incorrect syntax for "for". The form is: "$local of $items" or "[$key, $value] of $items".');
      }

      instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      if (isDestructuring) {
        keyValue = parts[0].replace(/[[\]]/g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        instruction.attributes.key = keyValue[0];
        instruction.attributes.value = keyValue[1];
      } else {
        instruction.attributes.local = parts[0];
      }

      instruction.attributes.items = new _aureliaBinding.BindingExpression(this.observerLocator, 'items', this.parser.parse(parts[1]), _aureliaBinding.bindingMode.oneWay, resources.lookupFunctions);

      return instruction;
    };

    SyntaxInterpreter.prototype['two-way'] = function twoWay(resources, element, info, existingInstruction) {
      var instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), _aureliaBinding.bindingMode.twoWay, resources.lookupFunctions);

      return instruction;
    };

    SyntaxInterpreter.prototype['to-view'] = function toView(resources, element, info, existingInstruction) {
      var instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), _aureliaBinding.bindingMode.toView, resources.lookupFunctions);

      return instruction;
    };

    SyntaxInterpreter.prototype['from-view'] = function fromView(resources, element, info, existingInstruction) {
      var instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), _aureliaBinding.bindingMode.fromView, resources.lookupFunctions);

      return instruction;
    };

    SyntaxInterpreter.prototype['one-time'] = function oneTime(resources, element, info, existingInstruction) {
      var instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), _aureliaBinding.bindingMode.oneTime, resources.lookupFunctions);

      return instruction;
    };

    return SyntaxInterpreter;
  }(), _class4.inject = [_aureliaBinding.Parser, _aureliaBinding.ObserverLocator, _aureliaBinding.EventManager, AttributeMap], _temp2);


  SyntaxInterpreter.prototype['one-way'] = SyntaxInterpreter.prototype['to-view'];

  var info = {};

  var TemplatingBindingLanguage = exports.TemplatingBindingLanguage = (_temp3 = _class5 = function (_BindingLanguage) {
    _inherits(TemplatingBindingLanguage, _BindingLanguage);

    function TemplatingBindingLanguage(parser, observerLocator, syntaxInterpreter, attributeMap) {
      

      var _this = _possibleConstructorReturn(this, _BindingLanguage.call(this));

      _this.parser = parser;
      _this.observerLocator = observerLocator;
      _this.syntaxInterpreter = syntaxInterpreter;
      _this.emptyStringExpression = _this.parser.parse('\'\'');
      syntaxInterpreter.language = _this;
      _this.attributeMap = attributeMap;
      _this.toBindingContextAttr = 'to-binding-context';
      return _this;
    }

    TemplatingBindingLanguage.prototype.inspectAttribute = function inspectAttribute(resources, elementName, attrName, attrValue) {
      var parts = attrName.split('.');

      info.defaultBindingMode = null;

      if (parts.length === 2) {
        info.attrName = parts[0].trim();
        info.attrValue = attrValue;
        info.command = parts[1].trim();

        if (info.command === 'ref') {
          info.expression = new _aureliaBinding.NameExpression(this.parser.parse(attrValue), info.attrName, resources.lookupFunctions);
          info.command = null;
          info.attrName = 'ref';
        } else {
          info.expression = null;
        }
      } else if (attrName === 'ref') {
        info.attrName = attrName;
        info.attrValue = attrValue;
        info.command = null;
        info.expression = new _aureliaBinding.NameExpression(this.parser.parse(attrValue), 'element', resources.lookupFunctions);
      } else {
        info.attrName = attrName;
        info.attrValue = attrValue;
        info.command = null;
        var interpolationParts = this.parseInterpolation(resources, attrValue);
        if (interpolationParts === null) {
          info.expression = null;
        } else {
          info.expression = new InterpolationBindingExpression(this.observerLocator, this.attributeMap.map(elementName, attrName), interpolationParts, _aureliaBinding.bindingMode.oneWay, resources.lookupFunctions, attrName);
        }
      }

      return info;
    };

    TemplatingBindingLanguage.prototype.createAttributeInstruction = function createAttributeInstruction(resources, element, theInfo, existingInstruction, context) {
      var instruction = void 0;

      if (theInfo.expression) {
        if (theInfo.attrName === 'ref') {
          return theInfo.expression;
        }

        instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(theInfo.attrName);
        instruction.attributes[theInfo.attrName] = theInfo.expression;
      } else if (theInfo.command) {
        instruction = this.syntaxInterpreter.interpret(resources, element, theInfo, existingInstruction, context);
      }

      return instruction;
    };

    TemplatingBindingLanguage.prototype.createLetExpressions = function createLetExpressions(resources, letElement) {
      var expressions = [];
      var attributes = letElement.attributes;

      var attr = void 0;

      var parts = void 0;
      var attrName = void 0;
      var attrValue = void 0;
      var command = void 0;
      var toBindingContextAttr = this.toBindingContextAttr;
      var toBindingContext = letElement.hasAttribute(toBindingContextAttr);
      for (var i = 0, ii = attributes.length; ii > i; ++i) {
        attr = attributes[i];
        attrName = attr.name;
        attrValue = attr.nodeValue;
        parts = attrName.split('.');

        if (attrName === toBindingContextAttr) {
          continue;
        }

        if (parts.length === 2) {
          command = parts[1];
          if (command !== 'bind') {
            LogManager.getLogger('templating-binding-language').warn('Detected invalid let command. Expected "' + parts[0] + '.bind", given "' + attrName + '"');
            continue;
          }
          expressions.push(new LetExpression(this.observerLocator, (0, _aureliaBinding.camelCase)(parts[0]), this.parser.parse(attrValue), resources.lookupFunctions, toBindingContext));
        } else {
          attrName = (0, _aureliaBinding.camelCase)(attrName);
          parts = this.parseInterpolation(resources, attrValue);
          if (parts === null) {
            LogManager.getLogger('templating-binding-language').warn('Detected string literal in let bindings. Did you mean "' + attrName + '.bind=' + attrValue + '" or "' + attrName + '=${' + attrValue + '}" ?');
          }
          if (parts) {
            expressions.push(new LetInterpolationBindingExpression(this.observerLocator, attrName, parts, resources.lookupFunctions, toBindingContext));
          } else {
            expressions.push(new LetExpression(this.observerLocator, attrName, new _aureliaBinding.LiteralString(attrValue), resources.lookupFunctions, toBindingContext));
          }
        }
      }
      return expressions;
    };

    TemplatingBindingLanguage.prototype.inspectTextContent = function inspectTextContent(resources, value) {
      var parts = this.parseInterpolation(resources, value);
      if (parts === null) {
        return null;
      }
      return new InterpolationBindingExpression(this.observerLocator, 'textContent', parts, _aureliaBinding.bindingMode.oneWay, resources.lookupFunctions, 'textContent');
    };

    TemplatingBindingLanguage.prototype.parseInterpolation = function parseInterpolation(resources, value) {
      var i = value.indexOf('${', 0);
      var ii = value.length;
      var char = void 0;
      var pos = 0;
      var open = 0;
      var quote = null;
      var interpolationStart = void 0;
      var parts = void 0;
      var partIndex = 0;

      while (i >= 0 && i < ii - 2) {
        open = 1;
        interpolationStart = i;
        i += 2;

        do {
          char = value[i];
          i++;

          if (char === "'" || char === '"') {
            if (quote === null) {
              quote = char;
            } else if (quote === char) {
              quote = null;
            }
            continue;
          }

          if (char === '\\') {
            i++;
            continue;
          }

          if (quote !== null) {
            continue;
          }

          if (char === '{') {
            open++;
          } else if (char === '}') {
            open--;
          }
        } while (open > 0 && i < ii);

        if (open === 0) {
          parts = parts || [];
          if (value[interpolationStart - 1] === '\\' && value[interpolationStart - 2] !== '\\') {
            parts[partIndex] = value.substring(pos, interpolationStart - 1) + value.substring(interpolationStart, i);
            partIndex++;
            parts[partIndex] = this.emptyStringExpression;
            partIndex++;
          } else {
            parts[partIndex] = value.substring(pos, interpolationStart);
            partIndex++;
            parts[partIndex] = this.parser.parse(value.substring(interpolationStart + 2, i - 1));
            partIndex++;
          }
          pos = i;
          i = value.indexOf('${', i);
        } else {
          break;
        }
      }

      if (partIndex === 0) {
        return null;
      }

      parts[partIndex] = value.substr(pos);
      return parts;
    };

    return TemplatingBindingLanguage;
  }(_aureliaTemplating.BindingLanguage), _class5.inject = [_aureliaBinding.Parser, _aureliaBinding.ObserverLocator, SyntaxInterpreter, AttributeMap], _temp3);
  function configure(config) {
    config.container.registerSingleton(_aureliaTemplating.BindingLanguage, TemplatingBindingLanguage);
    config.container.registerAlias(_aureliaTemplating.BindingLanguage, TemplatingBindingLanguage);
  }
});
define('text',{});
define('aurelia-templating-resources/aurelia-templating-resources',['exports', 'aurelia-dependency-injection', 'aurelia-pal', 'aurelia-task-queue', 'aurelia-templating', 'aurelia-binding', 'aurelia-logging', 'aurelia-loader', 'aurelia-path', 'aurelia-metadata'], function (exports, aureliaDependencyInjection, aureliaPal, aureliaTaskQueue, aureliaTemplating, aureliaBinding, aureliaLogging, aureliaLoader, aureliaPath, aureliaMetadata) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    var ActivationStrategy;
    (function (ActivationStrategy) {
        ActivationStrategy["InvokeLifecycle"] = "invoke-lifecycle";
        ActivationStrategy["Replace"] = "replace";
    })(ActivationStrategy || (ActivationStrategy = {}));
    var Compose = (function () {
        function Compose(element, container, compositionEngine, viewSlot, viewResources, taskQueue) {
            this.activationStrategy = ActivationStrategy.InvokeLifecycle;
            this.element = element;
            this.container = container;
            this.compositionEngine = compositionEngine;
            this.viewSlot = viewSlot;
            this.viewResources = viewResources;
            this.taskQueue = taskQueue;
            this.currentController = null;
            this.currentViewModel = null;
            this.changes = Object.create(null);
        }
        Compose.inject = function () {
            return [aureliaPal.DOM.Element, aureliaDependencyInjection.Container, aureliaTemplating.CompositionEngine, aureliaTemplating.ViewSlot, aureliaTemplating.ViewResources, aureliaTaskQueue.TaskQueue];
        };
        Compose.prototype.created = function (owningView) {
            this.owningView = owningView;
        };
        Compose.prototype.bind = function (bindingContext, overrideContext) {
            this.bindingContext = bindingContext;
            this.overrideContext = overrideContext;
            var changes = this.changes;
            changes.view = this.view;
            changes.viewModel = this.viewModel;
            changes.model = this.model;
            if (!this.pendingTask) {
                processChanges(this);
            }
        };
        Compose.prototype.unbind = function () {
            this.changes = Object.create(null);
            this.bindingContext = null;
            this.overrideContext = null;
            var returnToCache = true;
            var skipAnimation = true;
            this.viewSlot.removeAll(returnToCache, skipAnimation);
        };
        Compose.prototype.modelChanged = function (newValue, oldValue) {
            this.changes.model = newValue;
            requestUpdate(this);
        };
        Compose.prototype.viewChanged = function (newValue, oldValue) {
            this.changes.view = newValue;
            requestUpdate(this);
        };
        Compose.prototype.viewModelChanged = function (newValue, oldValue) {
            this.changes.viewModel = newValue;
            requestUpdate(this);
        };
        __decorate([
            aureliaTemplating.bindable
        ], Compose.prototype, "model", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], Compose.prototype, "view", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], Compose.prototype, "viewModel", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], Compose.prototype, "activationStrategy", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], Compose.prototype, "swapOrder", void 0);
        Compose = __decorate([
            aureliaTemplating.noView,
            aureliaTemplating.customElement('compose')
        ], Compose);
        return Compose;
    }());
    function isEmpty(obj) {
        for (var _ in obj) {
            return false;
        }
        return true;
    }
    function tryActivateViewModel(vm, model) {
        if (vm && typeof vm.activate === 'function') {
            return Promise.resolve(vm.activate(model));
        }
    }
    function createInstruction(composer, instruction) {
        return Object.assign(instruction, {
            bindingContext: composer.bindingContext,
            overrideContext: composer.overrideContext,
            owningView: composer.owningView,
            container: composer.container,
            viewSlot: composer.viewSlot,
            viewResources: composer.viewResources,
            currentController: composer.currentController,
            host: composer.element,
            swapOrder: composer.swapOrder
        });
    }
    function processChanges(composer) {
        var changes = composer.changes;
        composer.changes = Object.create(null);
        if (needsReInitialization(composer, changes)) {
            var instruction = {
                view: composer.view,
                viewModel: composer.currentViewModel || composer.viewModel,
                model: composer.model
            };
            instruction = Object.assign(instruction, changes);
            instruction = createInstruction(composer, instruction);
            composer.pendingTask = composer.compositionEngine.compose(instruction).then(function (controller) {
                composer.currentController = controller;
                composer.currentViewModel = controller ? controller.viewModel : null;
            });
        }
        else {
            composer.pendingTask = tryActivateViewModel(composer.currentViewModel, changes.model);
            if (!composer.pendingTask) {
                return;
            }
        }
        composer.pendingTask = composer.pendingTask
            .then(function () {
            completeCompositionTask(composer);
        }, function (reason) {
            completeCompositionTask(composer);
            throw reason;
        });
    }
    function completeCompositionTask(composer) {
        composer.pendingTask = null;
        if (!isEmpty(composer.changes)) {
            processChanges(composer);
        }
    }
    function requestUpdate(composer) {
        if (composer.pendingTask || composer.updateRequested) {
            return;
        }
        composer.updateRequested = true;
        composer.taskQueue.queueMicroTask(function () {
            composer.updateRequested = false;
            processChanges(composer);
        });
    }
    function needsReInitialization(composer, changes) {
        var activationStrategy = composer.activationStrategy;
        var vm = composer.currentViewModel;
        if (vm && typeof vm.determineActivationStrategy === 'function') {
            activationStrategy = vm.determineActivationStrategy();
        }
        return 'view' in changes
            || 'viewModel' in changes
            || activationStrategy === ActivationStrategy.Replace;
    }

    var IfCore = (function () {
        function IfCore(viewFactory, viewSlot) {
            this.viewFactory = viewFactory;
            this.viewSlot = viewSlot;
            this.view = null;
            this.bindingContext = null;
            this.overrideContext = null;
            this.showing = false;
            this.cache = true;
        }
        IfCore.prototype.bind = function (bindingContext, overrideContext) {
            this.bindingContext = bindingContext;
            this.overrideContext = overrideContext;
        };
        IfCore.prototype.unbind = function () {
            if (this.view === null) {
                return;
            }
            this.view.unbind();
            if (!this.viewFactory.isCaching) {
                return;
            }
            if (this.showing) {
                this.showing = false;
                this.viewSlot.remove(this.view, true, true);
            }
            else {
                this.view.returnToCache();
            }
            this.view = null;
        };
        IfCore.prototype._show = function () {
            if (this.showing) {
                if (!this.view.isBound) {
                    this.view.bind(this.bindingContext, this.overrideContext);
                }
                return;
            }
            if (this.view === null) {
                this.view = this.viewFactory.create();
            }
            if (!this.view.isBound) {
                this.view.bind(this.bindingContext, this.overrideContext);
            }
            this.showing = true;
            return this.viewSlot.add(this.view);
        };
        IfCore.prototype._hide = function () {
            var _this = this;
            if (!this.showing) {
                return;
            }
            this.showing = false;
            var removed = this.viewSlot.remove(this.view);
            if (removed instanceof Promise) {
                return removed.then(function () {
                    _this._unbindView();
                });
            }
            this._unbindView();
        };
        IfCore.prototype._unbindView = function () {
            var cache = this.cache === 'false' ? false : !!this.cache;
            this.view.unbind();
            if (!cache) {
                this.view = null;
            }
        };
        return IfCore;
    }());

    var If = (function (_super) {
        __extends(If, _super);
        function If() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.cache = true;
            return _this;
        }
        If.prototype.bind = function (bindingContext, overrideContext) {
            _super.prototype.bind.call(this, bindingContext, overrideContext);
            if (this.condition) {
                this._show();
            }
            else {
                this._hide();
            }
        };
        If.prototype.conditionChanged = function (newValue) {
            this._update(newValue);
        };
        If.prototype._update = function (show) {
            var _this = this;
            if (this.animating) {
                return;
            }
            var promise;
            if (this.elseVm) {
                promise = show ? this._swap(this.elseVm, this) : this._swap(this, this.elseVm);
            }
            else {
                promise = show ? this._show() : this._hide();
            }
            if (promise) {
                this.animating = true;
                promise.then(function () {
                    _this.animating = false;
                    if (_this.condition !== _this.showing) {
                        _this._update(_this.condition);
                    }
                });
            }
        };
        If.prototype._swap = function (remove, add) {
            switch (this.swapOrder) {
                case 'before':
                    return Promise.resolve(add._show()).then(function () { return remove._hide(); });
                case 'with':
                    return Promise.all([remove._hide(), add._show()]);
                default:
                    var promise = remove._hide();
                    return promise ? promise.then(function () { return add._show(); }) : add._show();
            }
        };
        __decorate([
            aureliaTemplating.bindable({ primaryProperty: true })
        ], If.prototype, "condition", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], If.prototype, "swapOrder", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], If.prototype, "cache", void 0);
        If = __decorate([
            aureliaTemplating.customAttribute('if'),
            aureliaTemplating.templateController,
            aureliaDependencyInjection.inject(aureliaTemplating.BoundViewFactory, aureliaTemplating.ViewSlot)
        ], If);
        return If;
    }(IfCore));

    var Else = (function (_super) {
        __extends(Else, _super);
        function Else(viewFactory, viewSlot) {
            var _this = _super.call(this, viewFactory, viewSlot) || this;
            _this._registerInIf();
            return _this;
        }
        Else.prototype.bind = function (bindingContext, overrideContext) {
            _super.prototype.bind.call(this, bindingContext, overrideContext);
            if (this.ifVm.condition) {
                this._hide();
            }
            else {
                this._show();
            }
        };
        Else.prototype._registerInIf = function () {
            var previous = this.viewSlot.anchor.previousSibling;
            while (previous && !previous.au) {
                previous = previous.previousSibling;
            }
            if (!previous || !previous.au.if) {
                throw new Error("Can't find matching If for Else custom attribute.");
            }
            this.ifVm = previous.au.if.viewModel;
            this.ifVm.elseVm = this;
        };
        Else = __decorate([
            aureliaTemplating.customAttribute('else'),
            aureliaTemplating.templateController,
            aureliaDependencyInjection.inject(aureliaTemplating.BoundViewFactory, aureliaTemplating.ViewSlot)
        ], Else);
        return Else;
    }(IfCore));

    var With = (function () {
        function With(viewFactory, viewSlot) {
            this.viewFactory = viewFactory;
            this.viewSlot = viewSlot;
            this.parentOverrideContext = null;
            this.view = null;
        }
        With.prototype.bind = function (bindingContext, overrideContext) {
            this.parentOverrideContext = overrideContext;
            this.valueChanged(this.value);
        };
        With.prototype.valueChanged = function (newValue) {
            var overrideContext = aureliaBinding.createOverrideContext(newValue, this.parentOverrideContext);
            var view = this.view;
            if (!view) {
                view = this.view = this.viewFactory.create();
                view.bind(newValue, overrideContext);
                this.viewSlot.add(view);
            }
            else {
                view.bind(newValue, overrideContext);
            }
        };
        With.prototype.unbind = function () {
            var view = this.view;
            this.parentOverrideContext = null;
            if (view) {
                view.unbind();
            }
        };
        With = __decorate([
            aureliaTemplating.customAttribute('with'),
            aureliaTemplating.templateController,
            aureliaDependencyInjection.inject(aureliaTemplating.BoundViewFactory, aureliaTemplating.ViewSlot)
        ], With);
        return With;
    }());

    var oneTime = aureliaBinding.bindingMode.oneTime;
    function updateOverrideContexts(views, startIndex) {
        var length = views.length;
        if (startIndex > 0) {
            startIndex = startIndex - 1;
        }
        for (; startIndex < length; ++startIndex) {
            updateOverrideContext(views[startIndex].overrideContext, startIndex, length);
        }
    }
    function createFullOverrideContext(repeat, data, index, length, key) {
        var bindingContext = {};
        var overrideContext = aureliaBinding.createOverrideContext(bindingContext, repeat.scope.overrideContext);
        if (typeof key !== 'undefined') {
            bindingContext[repeat.key] = key;
            bindingContext[repeat.value] = data;
        }
        else {
            bindingContext[repeat.local] = data;
        }
        updateOverrideContext(overrideContext, index, length);
        return overrideContext;
    }
    function updateOverrideContext(overrideContext, index, length) {
        var first = (index === 0);
        var last = (index === length - 1);
        var even = index % 2 === 0;
        overrideContext.$index = index;
        overrideContext.$first = first;
        overrideContext.$last = last;
        overrideContext.$middle = !(first || last);
        overrideContext.$odd = !even;
        overrideContext.$even = even;
    }
    function getItemsSourceExpression(instruction, attrName) {
        return instruction.behaviorInstructions
            .filter(function (bi) { return bi.originalAttrName === attrName; })[0]
            .attributes
            .items
            .sourceExpression;
    }
    function unwrapExpression(expression) {
        var unwrapped = false;
        while (expression instanceof aureliaBinding.BindingBehavior) {
            expression = expression.expression;
        }
        while (expression instanceof aureliaBinding.ValueConverter) {
            expression = expression.expression;
            unwrapped = true;
        }
        return unwrapped ? expression : null;
    }
    function isOneTime(expression) {
        while (expression instanceof aureliaBinding.BindingBehavior) {
            if (expression.name === 'oneTime') {
                return true;
            }
            expression = expression.expression;
        }
        return false;
    }
    function updateOneTimeBinding(binding) {
        if (binding.call && binding.mode === oneTime) {
            binding.call(aureliaBinding.sourceContext);
        }
        else if (binding.updateOneTimeBindings) {
            binding.updateOneTimeBindings();
        }
    }
    function indexOf(array, item, matcher, startIndex) {
        if (!matcher) {
            return array.indexOf(item);
        }
        var length = array.length;
        for (var index = startIndex || 0; index < length; index++) {
            if (matcher(array[index], item)) {
                return index;
            }
        }
        return -1;
    }

    var ArrayRepeatStrategy = (function () {
        function ArrayRepeatStrategy() {
        }
        ArrayRepeatStrategy.prototype.getCollectionObserver = function (observerLocator, items) {
            return observerLocator.getArrayObserver(items);
        };
        ArrayRepeatStrategy.prototype.instanceChanged = function (repeat, items) {
            var _this = this;
            var $repeat = repeat;
            var itemsLength = items.length;
            if (!items || itemsLength === 0) {
                $repeat.removeAllViews(true, !$repeat.viewsRequireLifecycle);
                return;
            }
            var children = $repeat.views();
            var viewsLength = children.length;
            if (viewsLength === 0) {
                this._standardProcessInstanceChanged($repeat, items);
                return;
            }
            if ($repeat.viewsRequireLifecycle) {
                var childrenSnapshot = children.slice(0);
                var itemNameInBindingContext = $repeat.local;
                var matcher_1 = $repeat.matcher();
                var itemsPreviouslyInViews_1 = [];
                var viewsToRemove = [];
                for (var index = 0; index < viewsLength; index++) {
                    var view = childrenSnapshot[index];
                    var oldItem = view.bindingContext[itemNameInBindingContext];
                    if (indexOf(items, oldItem, matcher_1) === -1) {
                        viewsToRemove.push(view);
                    }
                    else {
                        itemsPreviouslyInViews_1.push(oldItem);
                    }
                }
                var updateViews = void 0;
                var removePromise = void 0;
                if (itemsPreviouslyInViews_1.length > 0) {
                    removePromise = $repeat.removeViews(viewsToRemove, true, !$repeat.viewsRequireLifecycle);
                    updateViews = function () {
                        for (var index = 0; index < itemsLength; index++) {
                            var item = items[index];
                            var indexOfView = indexOf(itemsPreviouslyInViews_1, item, matcher_1, index);
                            var view = void 0;
                            if (indexOfView === -1) {
                                var overrideContext = createFullOverrideContext($repeat, items[index], index, itemsLength);
                                $repeat.insertView(index, overrideContext.bindingContext, overrideContext);
                                itemsPreviouslyInViews_1.splice(index, 0, undefined);
                            }
                            else if (indexOfView === index) {
                                view = children[indexOfView];
                                itemsPreviouslyInViews_1[indexOfView] = undefined;
                            }
                            else {
                                view = children[indexOfView];
                                $repeat.moveView(indexOfView, index);
                                itemsPreviouslyInViews_1.splice(indexOfView, 1);
                                itemsPreviouslyInViews_1.splice(index, 0, undefined);
                            }
                            if (view) {
                                updateOverrideContext(view.overrideContext, index, itemsLength);
                            }
                        }
                        _this._inPlaceProcessItems($repeat, items);
                    };
                }
                else {
                    removePromise = $repeat.removeAllViews(true, !$repeat.viewsRequireLifecycle);
                    updateViews = function () { return _this._standardProcessInstanceChanged($repeat, items); };
                }
                if (removePromise instanceof Promise) {
                    removePromise.then(updateViews);
                }
                else {
                    updateViews();
                }
            }
            else {
                this._inPlaceProcessItems($repeat, items);
            }
        };
        ArrayRepeatStrategy.prototype._standardProcessInstanceChanged = function (repeat, items) {
            for (var i = 0, ii = items.length; i < ii; i++) {
                var overrideContext = createFullOverrideContext(repeat, items[i], i, ii);
                repeat.addView(overrideContext.bindingContext, overrideContext);
            }
        };
        ArrayRepeatStrategy.prototype._inPlaceProcessItems = function (repeat, items) {
            var itemsLength = items.length;
            var viewsLength = repeat.viewCount();
            while (viewsLength > itemsLength) {
                viewsLength--;
                repeat.removeView(viewsLength, true, !repeat.viewsRequireLifecycle);
            }
            var local = repeat.local;
            for (var i = 0; i < viewsLength; i++) {
                var view = repeat.view(i);
                var last = i === itemsLength - 1;
                var middle = i !== 0 && !last;
                var bindingContext = view.bindingContext;
                var overrideContext = view.overrideContext;
                if (bindingContext[local] === items[i]
                    && overrideContext.$middle === middle
                    && overrideContext.$last === last) {
                    continue;
                }
                bindingContext[local] = items[i];
                overrideContext.$middle = middle;
                overrideContext.$last = last;
                repeat.updateBindings(view);
            }
            for (var i = viewsLength; i < itemsLength; i++) {
                var overrideContext = createFullOverrideContext(repeat, items[i], i, itemsLength);
                repeat.addView(overrideContext.bindingContext, overrideContext);
            }
        };
        ArrayRepeatStrategy.prototype.instanceMutated = function (repeat, array, splices) {
            var _this = this;
            if (repeat.__queuedSplices) {
                for (var i = 0, ii = splices.length; i < ii; ++i) {
                    var _a = splices[i], index = _a.index, removed = _a.removed, addedCount = _a.addedCount;
                    aureliaBinding.mergeSplice(repeat.__queuedSplices, index, removed, addedCount);
                }
                repeat.__array = array.slice(0);
                return;
            }
            var maybePromise = this._runSplices(repeat, array.slice(0), splices);
            if (maybePromise instanceof Promise) {
                var queuedSplices_1 = repeat.__queuedSplices = [];
                var runQueuedSplices_1 = function () {
                    if (!queuedSplices_1.length) {
                        repeat.__queuedSplices = undefined;
                        repeat.__array = undefined;
                        return;
                    }
                    var nextPromise = _this._runSplices(repeat, repeat.__array, queuedSplices_1) || Promise.resolve();
                    queuedSplices_1 = repeat.__queuedSplices = [];
                    nextPromise.then(runQueuedSplices_1);
                };
                maybePromise.then(runQueuedSplices_1);
            }
        };
        ArrayRepeatStrategy.prototype._runSplices = function (repeat, array, splices) {
            var _this = this;
            var removeDelta = 0;
            var rmPromises = [];
            for (var i = 0, ii = splices.length; i < ii; ++i) {
                var splice = splices[i];
                var removed = splice.removed;
                for (var j = 0, jj = removed.length; j < jj; ++j) {
                    var viewOrPromise = repeat.removeView(splice.index + removeDelta + rmPromises.length, true);
                    if (viewOrPromise instanceof Promise) {
                        rmPromises.push(viewOrPromise);
                    }
                }
                removeDelta -= splice.addedCount;
            }
            if (rmPromises.length > 0) {
                return Promise.all(rmPromises).then(function () {
                    var spliceIndexLow = _this._handleAddedSplices(repeat, array, splices);
                    updateOverrideContexts(repeat.views(), spliceIndexLow);
                });
            }
            var spliceIndexLow = this._handleAddedSplices(repeat, array, splices);
            updateOverrideContexts(repeat.views(), spliceIndexLow);
            return undefined;
        };
        ArrayRepeatStrategy.prototype._handleAddedSplices = function (repeat, array, splices) {
            var spliceIndex;
            var spliceIndexLow;
            var arrayLength = array.length;
            for (var i = 0, ii = splices.length; i < ii; ++i) {
                var splice = splices[i];
                var addIndex = spliceIndex = splice.index;
                var end = splice.index + splice.addedCount;
                if (typeof spliceIndexLow === 'undefined' || spliceIndexLow === null || spliceIndexLow > splice.index) {
                    spliceIndexLow = spliceIndex;
                }
                for (; addIndex < end; ++addIndex) {
                    var overrideContext = createFullOverrideContext(repeat, array[addIndex], addIndex, arrayLength);
                    repeat.insertView(addIndex, overrideContext.bindingContext, overrideContext);
                }
            }
            return spliceIndexLow;
        };
        return ArrayRepeatStrategy;
    }());

    var MapRepeatStrategy = (function () {
        function MapRepeatStrategy() {
        }
        MapRepeatStrategy.prototype.getCollectionObserver = function (observerLocator, items) {
            return observerLocator.getMapObserver(items);
        };
        MapRepeatStrategy.prototype.instanceChanged = function (repeat, items) {
            var _this = this;
            var removePromise = repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
            if (removePromise instanceof Promise) {
                removePromise.then(function () { return _this._standardProcessItems(repeat, items); });
                return;
            }
            this._standardProcessItems(repeat, items);
        };
        MapRepeatStrategy.prototype._standardProcessItems = function (repeat, items) {
            var index = 0;
            var overrideContext;
            items.forEach(function (value, key) {
                overrideContext = createFullOverrideContext(repeat, value, index, items.size, key);
                repeat.addView(overrideContext.bindingContext, overrideContext);
                ++index;
            });
        };
        MapRepeatStrategy.prototype.instanceMutated = function (repeat, map, records) {
            var key;
            var i;
            var ii;
            var overrideContext;
            var removeIndex;
            var addIndex;
            var record;
            var rmPromises = [];
            var viewOrPromise;
            for (i = 0, ii = records.length; i < ii; ++i) {
                record = records[i];
                key = record.key;
                switch (record.type) {
                    case 'update':
                        removeIndex = this._getViewIndexByKey(repeat, key);
                        viewOrPromise = repeat.removeView(removeIndex, true, !repeat.viewsRequireLifecycle);
                        if (viewOrPromise instanceof Promise) {
                            rmPromises.push(viewOrPromise);
                        }
                        overrideContext = createFullOverrideContext(repeat, map.get(key), removeIndex, map.size, key);
                        repeat.insertView(removeIndex, overrideContext.bindingContext, overrideContext);
                        break;
                    case 'add':
                        addIndex = repeat.viewCount() <= map.size - 1 ? repeat.viewCount() : map.size - 1;
                        overrideContext = createFullOverrideContext(repeat, map.get(key), addIndex, map.size, key);
                        repeat.insertView(map.size - 1, overrideContext.bindingContext, overrideContext);
                        break;
                    case 'delete':
                        if (record.oldValue === undefined) {
                            return;
                        }
                        removeIndex = this._getViewIndexByKey(repeat, key);
                        viewOrPromise = repeat.removeView(removeIndex, true, !repeat.viewsRequireLifecycle);
                        if (viewOrPromise instanceof Promise) {
                            rmPromises.push(viewOrPromise);
                        }
                        break;
                    case 'clear':
                        repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
                        break;
                    default:
                        continue;
                }
            }
            if (rmPromises.length > 0) {
                Promise.all(rmPromises).then(function () {
                    updateOverrideContexts(repeat.views(), 0);
                });
            }
            else {
                updateOverrideContexts(repeat.views(), 0);
            }
        };
        MapRepeatStrategy.prototype._getViewIndexByKey = function (repeat, key) {
            var i;
            var ii;
            var child;
            for (i = 0, ii = repeat.viewCount(); i < ii; ++i) {
                child = repeat.view(i);
                if (child.bindingContext[repeat.key] === key) {
                    return i;
                }
            }
            return undefined;
        };
        return MapRepeatStrategy;
    }());

    var NullRepeatStrategy = (function () {
        function NullRepeatStrategy() {
        }
        NullRepeatStrategy.prototype.instanceChanged = function (repeat, items) {
            repeat.removeAllViews(true);
        };
        NullRepeatStrategy.prototype.getCollectionObserver = function (observerLocator, items) {
        };
        return NullRepeatStrategy;
    }());

    var NumberRepeatStrategy = (function () {
        function NumberRepeatStrategy() {
        }
        NumberRepeatStrategy.prototype.getCollectionObserver = function () {
            return null;
        };
        NumberRepeatStrategy.prototype.instanceChanged = function (repeat, value) {
            var _this = this;
            var removePromise = repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
            if (removePromise instanceof Promise) {
                removePromise.then(function () { return _this._standardProcessItems(repeat, value); });
                return;
            }
            this._standardProcessItems(repeat, value);
        };
        NumberRepeatStrategy.prototype._standardProcessItems = function (repeat, value) {
            var childrenLength = repeat.viewCount();
            var i;
            var ii;
            var overrideContext;
            var viewsToRemove;
            value = Math.floor(value);
            viewsToRemove = childrenLength - value;
            if (viewsToRemove > 0) {
                if (viewsToRemove > childrenLength) {
                    viewsToRemove = childrenLength;
                }
                for (i = 0, ii = viewsToRemove; i < ii; ++i) {
                    repeat.removeView(childrenLength - (i + 1), true, !repeat.viewsRequireLifecycle);
                }
                return;
            }
            for (i = childrenLength, ii = value; i < ii; ++i) {
                overrideContext = createFullOverrideContext(repeat, i, i, ii);
                repeat.addView(overrideContext.bindingContext, overrideContext);
            }
            updateOverrideContexts(repeat.views(), 0);
        };
        return NumberRepeatStrategy;
    }());

    var SetRepeatStrategy = (function () {
        function SetRepeatStrategy() {
        }
        SetRepeatStrategy.prototype.getCollectionObserver = function (observerLocator, items) {
            return observerLocator.getSetObserver(items);
        };
        SetRepeatStrategy.prototype.instanceChanged = function (repeat, items) {
            var _this = this;
            var removePromise = repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
            if (removePromise instanceof Promise) {
                removePromise.then(function () { return _this._standardProcessItems(repeat, items); });
                return;
            }
            this._standardProcessItems(repeat, items);
        };
        SetRepeatStrategy.prototype._standardProcessItems = function (repeat, items) {
            var index = 0;
            var overrideContext;
            items.forEach(function (value) {
                overrideContext = createFullOverrideContext(repeat, value, index, items.size);
                repeat.addView(overrideContext.bindingContext, overrideContext);
                ++index;
            });
        };
        SetRepeatStrategy.prototype.instanceMutated = function (repeat, set, records) {
            var value;
            var i;
            var ii;
            var overrideContext;
            var removeIndex;
            var record;
            var rmPromises = [];
            var viewOrPromise;
            for (i = 0, ii = records.length; i < ii; ++i) {
                record = records[i];
                value = record.value;
                switch (record.type) {
                    case 'add':
                        var size = Math.max(set.size - 1, 0);
                        overrideContext = createFullOverrideContext(repeat, value, size, set.size);
                        repeat.insertView(size, overrideContext.bindingContext, overrideContext);
                        break;
                    case 'delete':
                        removeIndex = this._getViewIndexByValue(repeat, value);
                        viewOrPromise = repeat.removeView(removeIndex, true, !repeat.viewsRequireLifecycle);
                        if (viewOrPromise instanceof Promise) {
                            rmPromises.push(viewOrPromise);
                        }
                        break;
                    case 'clear':
                        repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
                        break;
                    default:
                        continue;
                }
            }
            if (rmPromises.length > 0) {
                Promise.all(rmPromises).then(function () {
                    updateOverrideContexts(repeat.views(), 0);
                });
            }
            else {
                updateOverrideContexts(repeat.views(), 0);
            }
        };
        SetRepeatStrategy.prototype._getViewIndexByValue = function (repeat, value) {
            var i;
            var ii;
            var child;
            for (i = 0, ii = repeat.viewCount(); i < ii; ++i) {
                child = repeat.view(i);
                if (child.bindingContext[repeat.local] === value) {
                    return i;
                }
            }
            return undefined;
        };
        return SetRepeatStrategy;
    }());

    var RepeatStrategyLocator = (function () {
        function RepeatStrategyLocator() {
            this.matchers = [];
            this.strategies = [];
            this.addStrategy(function (items) { return items === null || items === undefined; }, new NullRepeatStrategy());
            this.addStrategy(function (items) { return items instanceof Array; }, new ArrayRepeatStrategy());
            this.addStrategy(function (items) { return items instanceof Map; }, new MapRepeatStrategy());
            this.addStrategy(function (items) { return items instanceof Set; }, new SetRepeatStrategy());
            this.addStrategy(function (items) { return typeof items === 'number'; }, new NumberRepeatStrategy());
        }
        RepeatStrategyLocator.prototype.addStrategy = function (matcher, strategy) {
            this.matchers.push(matcher);
            this.strategies.push(strategy);
        };
        RepeatStrategyLocator.prototype.getStrategy = function (items) {
            var matchers = this.matchers;
            for (var i = 0, ii = matchers.length; i < ii; ++i) {
                if (matchers[i](items)) {
                    return this.strategies[i];
                }
            }
            return null;
        };
        return RepeatStrategyLocator;
    }());

    var lifecycleOptionalBehaviors = ['focus', 'if', 'else', 'repeat', 'show', 'hide', 'with'];
    function behaviorRequiresLifecycle(instruction) {
        var t = instruction.type;
        var name = t.elementName !== null ? t.elementName : t.attributeName;
        return lifecycleOptionalBehaviors.indexOf(name) === -1 && (t.handlesAttached || t.handlesBind || t.handlesCreated || t.handlesDetached || t.handlesUnbind)
            || t.viewFactory && viewsRequireLifecycle(t.viewFactory)
            || instruction.viewFactory && viewsRequireLifecycle(instruction.viewFactory);
    }
    function targetRequiresLifecycle(instruction) {
        var behaviors = instruction.behaviorInstructions;
        if (behaviors) {
            var i = behaviors.length;
            while (i--) {
                if (behaviorRequiresLifecycle(behaviors[i])) {
                    return true;
                }
            }
        }
        return instruction.viewFactory && viewsRequireLifecycle(instruction.viewFactory);
    }
    function viewsRequireLifecycle(viewFactory) {
        if ('_viewsRequireLifecycle' in viewFactory) {
            return viewFactory._viewsRequireLifecycle;
        }
        viewFactory._viewsRequireLifecycle = false;
        if (viewFactory.viewFactory) {
            viewFactory._viewsRequireLifecycle = viewsRequireLifecycle(viewFactory.viewFactory);
            return viewFactory._viewsRequireLifecycle;
        }
        if (viewFactory.template.querySelector('.au-animate')) {
            viewFactory._viewsRequireLifecycle = true;
            return true;
        }
        for (var id in viewFactory.instructions) {
            if (targetRequiresLifecycle(viewFactory.instructions[id])) {
                viewFactory._viewsRequireLifecycle = true;
                return true;
            }
        }
        viewFactory._viewsRequireLifecycle = false;
        return false;
    }

    var AbstractRepeater = (function () {
        function AbstractRepeater(options) {
            Object.assign(this, {
                local: 'items',
                viewsRequireLifecycle: true
            }, options);
        }
        AbstractRepeater.prototype.viewCount = function () {
            throw new Error('subclass must implement `viewCount`');
        };
        AbstractRepeater.prototype.views = function () {
            throw new Error('subclass must implement `views`');
        };
        AbstractRepeater.prototype.view = function (index) {
            throw new Error('subclass must implement `view`');
        };
        AbstractRepeater.prototype.matcher = function () {
            throw new Error('subclass must implement `matcher`');
        };
        AbstractRepeater.prototype.addView = function (bindingContext, overrideContext) {
            throw new Error('subclass must implement `addView`');
        };
        AbstractRepeater.prototype.insertView = function (index, bindingContext, overrideContext) {
            throw new Error('subclass must implement `insertView`');
        };
        AbstractRepeater.prototype.moveView = function (sourceIndex, targetIndex) {
            throw new Error('subclass must implement `moveView`');
        };
        AbstractRepeater.prototype.removeAllViews = function (returnToCache, skipAnimation) {
            throw new Error('subclass must implement `removeAllViews`');
        };
        AbstractRepeater.prototype.removeViews = function (viewsToRemove, returnToCache, skipAnimation) {
            throw new Error('subclass must implement `removeView`');
        };
        AbstractRepeater.prototype.removeView = function (index, returnToCache, skipAnimation) {
            throw new Error('subclass must implement `removeView`');
        };
        AbstractRepeater.prototype.updateBindings = function (view) {
            throw new Error('subclass must implement `updateBindings`');
        };
        return AbstractRepeater;
    }());

    var matcherExtractionMarker = '__marker_extracted__';
    var Repeat = (function (_super) {
        __extends(Repeat, _super);
        function Repeat(viewFactory, instruction, viewSlot, viewResources, observerLocator, strategyLocator) {
            var _this = _super.call(this, {
                local: 'item',
                viewsRequireLifecycle: viewsRequireLifecycle(viewFactory)
            }) || this;
            _this.viewFactory = viewFactory;
            _this.instruction = instruction;
            _this.viewSlot = viewSlot;
            _this.lookupFunctions = viewResources.lookupFunctions;
            _this.observerLocator = observerLocator;
            _this.key = 'key';
            _this.value = 'value';
            _this.strategyLocator = strategyLocator;
            _this.ignoreMutation = false;
            _this.sourceExpression = getItemsSourceExpression(_this.instruction, 'repeat.for');
            _this.isOneTime = isOneTime(_this.sourceExpression);
            _this.viewsRequireLifecycle = viewsRequireLifecycle(viewFactory);
            return _this;
        }
        Repeat_1 = Repeat;
        Repeat.prototype.call = function (context, changes) {
            this[context](this.items, changes);
        };
        Repeat.prototype.bind = function (bindingContext, overrideContext) {
            this.scope = { bindingContext: bindingContext, overrideContext: overrideContext };
            var instruction = this.instruction;
            if (!(matcherExtractionMarker in instruction)) {
                instruction[matcherExtractionMarker] = this._captureAndRemoveMatcherBinding();
            }
            this.matcherBinding = instruction[matcherExtractionMarker];
            this.itemsChanged();
        };
        Repeat.prototype.unbind = function () {
            this.scope = null;
            this.items = null;
            this.matcherBinding = null;
            this.viewSlot.removeAll(true, true);
            this._unsubscribeCollection();
        };
        Repeat.prototype._unsubscribeCollection = function () {
            if (this.collectionObserver) {
                this.collectionObserver.unsubscribe(this.callContext, this);
                this.collectionObserver = null;
                this.callContext = null;
            }
        };
        Repeat.prototype.itemsChanged = function () {
            var _this = this;
            this._unsubscribeCollection();
            if (!this.scope) {
                return;
            }
            var items = this.items;
            this.strategy = this.strategyLocator.getStrategy(items);
            if (!this.strategy) {
                throw new Error("Value for '" + this.sourceExpression + "' is non-repeatable");
            }
            if (!this.isOneTime && !this._observeInnerCollection()) {
                this._observeCollection();
            }
            this.ignoreMutation = true;
            this.strategy.instanceChanged(this, items);
            this.observerLocator.taskQueue.queueMicroTask(function () {
                _this.ignoreMutation = false;
            });
        };
        Repeat.prototype._getInnerCollection = function () {
            var expression = unwrapExpression(this.sourceExpression);
            if (!expression) {
                return null;
            }
            return expression.evaluate(this.scope, null);
        };
        Repeat.prototype.handleCollectionMutated = function (collection, changes) {
            if (!this.collectionObserver) {
                return;
            }
            if (this.ignoreMutation) {
                return;
            }
            this.strategy.instanceMutated(this, collection, changes);
        };
        Repeat.prototype.handleInnerCollectionMutated = function (collection, changes) {
            var _this = this;
            if (!this.collectionObserver) {
                return;
            }
            if (this.ignoreMutation) {
                return;
            }
            this.ignoreMutation = true;
            var newItems = this.sourceExpression.evaluate(this.scope, this.lookupFunctions);
            this.observerLocator.taskQueue.queueMicroTask(function () { return _this.ignoreMutation = false; });
            if (newItems === this.items) {
                this.itemsChanged();
            }
            else {
                this.items = newItems;
            }
        };
        Repeat.prototype._observeInnerCollection = function () {
            var items = this._getInnerCollection();
            var strategy = this.strategyLocator.getStrategy(items);
            if (!strategy) {
                return false;
            }
            this.collectionObserver = strategy.getCollectionObserver(this.observerLocator, items);
            if (!this.collectionObserver) {
                return false;
            }
            this.callContext = 'handleInnerCollectionMutated';
            this.collectionObserver.subscribe(this.callContext, this);
            return true;
        };
        Repeat.prototype._observeCollection = function () {
            var items = this.items;
            this.collectionObserver = this.strategy.getCollectionObserver(this.observerLocator, items);
            if (this.collectionObserver) {
                this.callContext = 'handleCollectionMutated';
                this.collectionObserver.subscribe(this.callContext, this);
            }
        };
        Repeat.prototype._captureAndRemoveMatcherBinding = function () {
            var viewFactory = this.viewFactory.viewFactory;
            if (viewFactory) {
                var template = viewFactory.template;
                var instructions = viewFactory.instructions;
                if (Repeat_1.useInnerMatcher) {
                    return extractMatcherBindingExpression(instructions);
                }
                if (getChildrenCount(template) > 1) {
                    return undefined;
                }
                var repeatedElement = getFirstElementChild(template);
                if (!repeatedElement.hasAttribute('au-target-id')) {
                    return undefined;
                }
                var repeatedElementTargetId = repeatedElement.getAttribute('au-target-id');
                return extractMatcherBindingExpression(instructions, repeatedElementTargetId);
            }
            return undefined;
        };
        Repeat.prototype.viewCount = function () { return this.viewSlot.children.length; };
        Repeat.prototype.views = function () { return this.viewSlot.children; };
        Repeat.prototype.view = function (index) { return this.viewSlot.children[index]; };
        Repeat.prototype.matcher = function () {
            var matcherBinding = this.matcherBinding;
            return matcherBinding
                ? matcherBinding.sourceExpression.evaluate(this.scope, matcherBinding.lookupFunctions)
                : null;
        };
        Repeat.prototype.addView = function (bindingContext, overrideContext) {
            var view = this.viewFactory.create();
            view.bind(bindingContext, overrideContext);
            this.viewSlot.add(view);
        };
        Repeat.prototype.insertView = function (index, bindingContext, overrideContext) {
            var view = this.viewFactory.create();
            view.bind(bindingContext, overrideContext);
            this.viewSlot.insert(index, view);
        };
        Repeat.prototype.moveView = function (sourceIndex, targetIndex) {
            this.viewSlot.move(sourceIndex, targetIndex);
        };
        Repeat.prototype.removeAllViews = function (returnToCache, skipAnimation) {
            return this.viewSlot.removeAll(returnToCache, skipAnimation);
        };
        Repeat.prototype.removeViews = function (viewsToRemove, returnToCache, skipAnimation) {
            return this.viewSlot.removeMany(viewsToRemove, returnToCache, skipAnimation);
        };
        Repeat.prototype.removeView = function (index, returnToCache, skipAnimation) {
            return this.viewSlot.removeAt(index, returnToCache, skipAnimation);
        };
        Repeat.prototype.updateBindings = function (view) {
            var $view = view;
            var j = $view.bindings.length;
            while (j--) {
                updateOneTimeBinding($view.bindings[j]);
            }
            j = $view.controllers.length;
            while (j--) {
                var k = $view.controllers[j].boundProperties.length;
                while (k--) {
                    var binding = $view.controllers[j].boundProperties[k].binding;
                    updateOneTimeBinding(binding);
                }
            }
        };
        var Repeat_1;
        Repeat.useInnerMatcher = true;
        __decorate([
            aureliaTemplating.bindable
        ], Repeat.prototype, "items", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], Repeat.prototype, "local", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], Repeat.prototype, "key", void 0);
        __decorate([
            aureliaTemplating.bindable
        ], Repeat.prototype, "value", void 0);
        Repeat = Repeat_1 = __decorate([
            aureliaTemplating.customAttribute('repeat'),
            aureliaTemplating.templateController,
            aureliaDependencyInjection.inject(aureliaTemplating.BoundViewFactory, aureliaTemplating.TargetInstruction, aureliaTemplating.ViewSlot, aureliaTemplating.ViewResources, aureliaBinding.ObserverLocator, RepeatStrategyLocator)
        ], Repeat);
        return Repeat;
    }(AbstractRepeater));
    var extractMatcherBindingExpression = function (instructions, targetedElementId) {
        var instructionIds = Object.keys(instructions);
        for (var i = 0; i < instructionIds.length; i++) {
            var instructionId = instructionIds[i];
            if (targetedElementId !== undefined && instructionId !== targetedElementId) {
                continue;
            }
            var expressions = instructions[instructionId].expressions;
            if (expressions) {
                for (var ii = 0; ii < expressions.length; ii++) {
                    if (expressions[ii].targetProperty === 'matcher') {
                        var matcherBindingExpression = expressions[ii];
                        expressions.splice(ii, 1);
                        return matcherBindingExpression;
                    }
                }
            }
        }
    };
    var getChildrenCount = function (el) {
        var childNodes = el.childNodes;
        var count = 0;
        for (var i = 0, ii = childNodes.length; ii > i; ++i) {
            if (childNodes[i].nodeType === 1) {
                ++count;
            }
        }
        return count;
    };
    var getFirstElementChild = function (el) {
        var firstChild = el.firstChild;
        while (firstChild !== null) {
            if (firstChild.nodeType === 1) {
                return firstChild;
            }
            firstChild = firstChild.nextSibling;
        }
        return null;
    };

    var aureliaHideClassName = 'aurelia-hide';
    var aureliaHideClass = "." + aureliaHideClassName + " { display:none !important; }";
    function injectAureliaHideStyleAtHead() {
        aureliaPal.DOM.injectStyles(aureliaHideClass);
    }
    function injectAureliaHideStyleAtBoundary(domBoundary) {
        if (aureliaPal.FEATURE.shadowDOM && domBoundary && !domBoundary.hasAureliaHideStyle) {
            domBoundary.hasAureliaHideStyle = true;
            aureliaPal.DOM.injectStyles(aureliaHideClass, domBoundary);
        }
    }

    var Show = (function () {
        function Show(element, animator, domBoundary) {
            this.element = element;
            this.animator = animator;
            this.domBoundary = domBoundary;
        }
        Show.inject = function () {
            return [aureliaPal.DOM.Element, aureliaTemplating.Animator, aureliaDependencyInjection.Optional.of(aureliaPal.DOM.boundary, true)];
        };
        Show.prototype.created = function () {
            injectAureliaHideStyleAtBoundary(this.domBoundary);
        };
        Show.prototype.valueChanged = function (newValue) {
            var element = this.element;
            var animator = this.animator;
            if (newValue) {
                animator.removeClass(element, aureliaHideClassName);
            }
            else {
                animator.addClass(element, aureliaHideClassName);
            }
        };
        Show.prototype.bind = function (bindingContext) {
            this.valueChanged(this.value);
        };
        Show = __decorate([
            aureliaTemplating.customAttribute('show')
        ], Show);
        return Show;
    }());

    var Hide = (function () {
        function Hide(element, animator, domBoundary) {
            this.element = element;
            this.animator = animator;
            this.domBoundary = domBoundary;
        }
        Hide.inject = function () {
            return [aureliaPal.DOM.Element, aureliaTemplating.Animator, aureliaDependencyInjection.Optional.of(aureliaPal.DOM.boundary, true)];
        };
        Hide.prototype.created = function () {
            injectAureliaHideStyleAtBoundary(this.domBoundary);
        };
        Hide.prototype.valueChanged = function (newValue) {
            if (newValue) {
                this.animator.addClass(this.element, aureliaHideClassName);
            }
            else {
                this.animator.removeClass(this.element, aureliaHideClassName);
            }
        };
        Hide.prototype.bind = function (bindingContext) {
            this.valueChanged(this.value);
        };
        Hide.prototype.value = function (value) {
            throw new Error('Method not implemented.');
        };
        Hide = __decorate([
            aureliaTemplating.customAttribute('hide')
        ], Hide);
        return Hide;
    }());

    var SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    var needsToWarn = true;
    var HTMLSanitizer = (function () {
        function HTMLSanitizer() {
        }
        HTMLSanitizer.prototype.sanitize = function (input) {
            if (needsToWarn) {
                needsToWarn = false;
                aureliaLogging.getLogger('html-sanitizer')
                    .warn("CAUTION: The default HTMLSanitizer does NOT provide security against a wide variety of sophisticated XSS attacks,\nand should not be relied on for sanitizing input from unknown sources.\nPlease see https://aurelia.io/docs/binding/basics#element-content for instructions on how to use a secure solution like DOMPurify or sanitize-html.");
            }
            return input.replace(SCRIPT_REGEX, '');
        };
        return HTMLSanitizer;
    }());

    var SanitizeHTMLValueConverter = (function () {
        function SanitizeHTMLValueConverter(sanitizer) {
            this.sanitizer = sanitizer;
        }
        SanitizeHTMLValueConverter.prototype.toView = function (untrustedMarkup) {
            if (untrustedMarkup === null || untrustedMarkup === undefined) {
                return null;
            }
            return this.sanitizer.sanitize(untrustedMarkup);
        };
        SanitizeHTMLValueConverter = __decorate([
            aureliaBinding.valueConverter('sanitizeHTML'),
            aureliaDependencyInjection.inject(HTMLSanitizer)
        ], SanitizeHTMLValueConverter);
        return SanitizeHTMLValueConverter;
    }());

    var Replaceable = (function () {
        function Replaceable(viewFactory, viewSlot) {
            this.viewFactory = viewFactory;
            this.viewSlot = viewSlot;
            this.view = null;
        }
        Replaceable.prototype.bind = function (bindingContext, overrideContext) {
            if (this.view === null) {
                this.view = this.viewFactory.create();
                this.viewSlot.add(this.view);
            }
            this.view.bind(bindingContext, overrideContext);
        };
        Replaceable.prototype.unbind = function () {
            this.view.unbind();
        };
        Replaceable = __decorate([
            aureliaTemplating.customAttribute('replaceable'),
            aureliaTemplating.templateController,
            aureliaDependencyInjection.inject(aureliaTemplating.BoundViewFactory, aureliaTemplating.ViewSlot)
        ], Replaceable);
        return Replaceable;
    }());

    var Focus = (function () {
        function Focus(element, taskQueue) {
            this.element = element;
            this.taskQueue = taskQueue;
            this.isAttached = false;
            this.needsApply = false;
        }
        Focus.inject = function () {
            return [aureliaPal.DOM.Element, aureliaTaskQueue.TaskQueue];
        };
        Focus.prototype.valueChanged = function (newValue) {
            if (this.isAttached) {
                this._apply();
            }
            else {
                this.needsApply = true;
            }
        };
        Focus.prototype._apply = function () {
            var _this = this;
            if (this.value) {
                this.taskQueue.queueMicroTask(function () {
                    if (_this.value) {
                        _this.element.focus();
                    }
                });
            }
            else {
                this.element.blur();
            }
        };
        Focus.prototype.attached = function () {
            this.isAttached = true;
            if (this.needsApply) {
                this.needsApply = false;
                this._apply();
            }
            this.element.addEventListener('focus', this);
            this.element.addEventListener('blur', this);
        };
        Focus.prototype.detached = function () {
            this.isAttached = false;
            this.element.removeEventListener('focus', this);
            this.element.removeEventListener('blur', this);
        };
        Focus.prototype.handleEvent = function (e) {
            if (e.type === 'focus') {
                this.value = true;
            }
            else if (aureliaPal.DOM.activeElement !== this.element) {
                this.value = false;
            }
        };
        Focus = __decorate([
            aureliaTemplating.customAttribute('focus', aureliaBinding.bindingMode.twoWay)
        ], Focus);
        return Focus;
    }());

    var cssUrlMatcher = /url\((?!['"]data)([^)]+)\)/gi;
    function fixupCSSUrls(address, css) {
        if (typeof css !== 'string') {
            throw new Error("Failed loading required CSS file: " + address);
        }
        return css.replace(cssUrlMatcher, function (match, p1) {
            var quote = p1.charAt(0);
            if (quote === '\'' || quote === '"') {
                p1 = p1.substr(1, p1.length - 2);
            }
            return 'url(\'' + aureliaPath.relativeToFile(p1, address) + '\')';
        });
    }
    var CSSResource = (function () {
        function CSSResource(address) {
            this.address = address;
            this._scoped = null;
            this._global = false;
            this._alreadyGloballyInjected = false;
        }
        CSSResource.prototype.initialize = function (container, Target) {
            this._scoped = new Target(this);
        };
        CSSResource.prototype.register = function (registry, name) {
            if (name === 'scoped') {
                registry.registerViewEngineHooks(this._scoped);
            }
            else {
                this._global = true;
            }
        };
        CSSResource.prototype.load = function (container) {
            var _this = this;
            return container.get(aureliaLoader.Loader)
                .loadText(this.address)
                .catch(function (err) { return null; })
                .then(function (text) {
                text = fixupCSSUrls(_this.address, text);
                _this._scoped.css = text;
                if (_this._global) {
                    _this._alreadyGloballyInjected = true;
                    aureliaPal.DOM.injectStyles(text);
                }
            });
        };
        return CSSResource;
    }());
    var CSSViewEngineHooks = (function () {
        function CSSViewEngineHooks(owner) {
            this.owner = owner;
            this.css = null;
        }
        CSSViewEngineHooks.prototype.beforeCompile = function (content, resources, instruction) {
            if (instruction.targetShadowDOM) {
                aureliaPal.DOM.injectStyles(this.css, content, true);
            }
            else if (aureliaPal.FEATURE.scopedCSS) {
                var styleNode = aureliaPal.DOM.injectStyles(this.css, content, true);
                styleNode.setAttribute('scoped', 'scoped');
            }
            else if (this._global && !this.owner._alreadyGloballyInjected) {
                aureliaPal.DOM.injectStyles(this.css);
                this.owner._alreadyGloballyInjected = true;
            }
        };
        return CSSViewEngineHooks;
    }());
    function _createCSSResource(address) {
        var ViewCSS = (function (_super) {
            __extends(ViewCSS, _super);
            function ViewCSS() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            ViewCSS = __decorate([
                aureliaTemplating.resource(new CSSResource(address))
            ], ViewCSS);
            return ViewCSS;
        }(CSSViewEngineHooks));
        return ViewCSS;
    }

    var AttrBindingBehavior = (function () {
        function AttrBindingBehavior() {
        }
        AttrBindingBehavior.prototype.bind = function (binding, source) {
            binding.targetObserver = new aureliaBinding.DataAttributeObserver(binding.target, binding.targetProperty);
        };
        AttrBindingBehavior.prototype.unbind = function (binding, source) {
        };
        AttrBindingBehavior = __decorate([
            aureliaBinding.bindingBehavior('attr')
        ], AttrBindingBehavior);
        return AttrBindingBehavior;
    }());

    var modeBindingBehavior = {
        bind: function (binding, source, lookupFunctions) {
            binding.originalMode = binding.mode;
            binding.mode = this.mode;
        },
        unbind: function (binding, source) {
            binding.mode = binding.originalMode;
            binding.originalMode = null;
        }
    };
    var OneTimeBindingBehavior = (function () {
        function OneTimeBindingBehavior() {
            this.mode = aureliaBinding.bindingMode.oneTime;
        }
        OneTimeBindingBehavior = __decorate([
            aureliaMetadata.mixin(modeBindingBehavior),
            aureliaBinding.bindingBehavior('oneTime')
        ], OneTimeBindingBehavior);
        return OneTimeBindingBehavior;
    }());
    var OneWayBindingBehavior = (function () {
        function OneWayBindingBehavior() {
            this.mode = aureliaBinding.bindingMode.toView;
        }
        OneWayBindingBehavior = __decorate([
            aureliaMetadata.mixin(modeBindingBehavior),
            aureliaBinding.bindingBehavior('oneWay')
        ], OneWayBindingBehavior);
        return OneWayBindingBehavior;
    }());
    var ToViewBindingBehavior = (function () {
        function ToViewBindingBehavior() {
            this.mode = aureliaBinding.bindingMode.toView;
        }
        ToViewBindingBehavior = __decorate([
            aureliaMetadata.mixin(modeBindingBehavior),
            aureliaBinding.bindingBehavior('toView')
        ], ToViewBindingBehavior);
        return ToViewBindingBehavior;
    }());
    var FromViewBindingBehavior = (function () {
        function FromViewBindingBehavior() {
            this.mode = aureliaBinding.bindingMode.fromView;
        }
        FromViewBindingBehavior = __decorate([
            aureliaMetadata.mixin(modeBindingBehavior),
            aureliaBinding.bindingBehavior('fromView')
        ], FromViewBindingBehavior);
        return FromViewBindingBehavior;
    }());
    var TwoWayBindingBehavior = (function () {
        function TwoWayBindingBehavior() {
            this.mode = aureliaBinding.bindingMode.twoWay;
        }
        TwoWayBindingBehavior = __decorate([
            aureliaMetadata.mixin(modeBindingBehavior),
            aureliaBinding.bindingBehavior('twoWay')
        ], TwoWayBindingBehavior);
        return TwoWayBindingBehavior;
    }());

    function throttle(newValue) {
        var _this = this;
        var state = this.throttleState;
        var elapsed = +new Date() - state.last;
        if (elapsed >= state.delay) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
            state.last = +new Date();
            this.throttledMethod(newValue);
            return;
        }
        state.newValue = newValue;
        if (state.timeoutId === null) {
            state.timeoutId = setTimeout(function () {
                state.timeoutId = null;
                state.last = +new Date();
                _this.throttledMethod(state.newValue);
            }, state.delay - elapsed);
        }
    }
    var ThrottleBindingBehavior = (function () {
        function ThrottleBindingBehavior() {
        }
        ThrottleBindingBehavior.prototype.bind = function (binding, source, delay) {
            if (delay === void 0) { delay = 200; }
            var methodToThrottle = 'updateTarget';
            if (binding.callSource) {
                methodToThrottle = 'callSource';
            }
            else if (binding.updateSource && binding.mode === aureliaBinding.bindingMode.twoWay) {
                methodToThrottle = 'updateSource';
            }
            binding.throttledMethod = binding[methodToThrottle];
            binding.throttledMethod.originalName = methodToThrottle;
            binding[methodToThrottle] = throttle;
            binding.throttleState = {
                delay: delay,
                last: 0,
                timeoutId: null
            };
        };
        ThrottleBindingBehavior.prototype.unbind = function (binding, source) {
            var methodToRestore = binding.throttledMethod.originalName;
            binding[methodToRestore] = binding.throttledMethod;
            binding.throttledMethod = null;
            clearTimeout(binding.throttleState.timeoutId);
            binding.throttleState = null;
        };
        ThrottleBindingBehavior = __decorate([
            aureliaBinding.bindingBehavior('throttle')
        ], ThrottleBindingBehavior);
        return ThrottleBindingBehavior;
    }());

    var unset = {};
    function debounceCallSource(event) {
        var _this = this;
        var state = this.debounceState;
        clearTimeout(state.timeoutId);
        state.timeoutId = setTimeout(function () { return _this.debouncedMethod(event); }, state.delay);
    }
    function debounceCall(context, newValue, oldValue) {
        var _this = this;
        var state = this.debounceState;
        clearTimeout(state.timeoutId);
        if (context !== state.callContextToDebounce) {
            state.oldValue = unset;
            this.debouncedMethod(context, newValue, oldValue);
            return;
        }
        if (state.oldValue === unset) {
            state.oldValue = oldValue;
        }
        state.timeoutId = setTimeout(function () {
            var _oldValue = state.oldValue;
            state.oldValue = unset;
            _this.debouncedMethod(context, newValue, _oldValue);
        }, state.delay);
    }
    var DebounceBindingBehavior = (function () {
        function DebounceBindingBehavior() {
        }
        DebounceBindingBehavior.prototype.bind = function (binding, source, delay) {
            if (delay === void 0) { delay = 200; }
            var isCallSource = binding.callSource !== undefined;
            var methodToDebounce = isCallSource ? 'callSource' : 'call';
            var debouncer = isCallSource ? debounceCallSource : debounceCall;
            var mode = binding.mode;
            var callContextToDebounce = mode === aureliaBinding.bindingMode.twoWay || mode === aureliaBinding.bindingMode.fromView ? aureliaBinding.targetContext : aureliaBinding.sourceContext;
            binding.debouncedMethod = binding[methodToDebounce];
            binding.debouncedMethod.originalName = methodToDebounce;
            binding[methodToDebounce] = debouncer;
            binding.debounceState = {
                callContextToDebounce: callContextToDebounce,
                delay: delay,
                timeoutId: 0,
                oldValue: unset
            };
        };
        DebounceBindingBehavior.prototype.unbind = function (binding, source) {
            var methodToRestore = binding.debouncedMethod.originalName;
            binding[methodToRestore] = binding.debouncedMethod;
            binding.debouncedMethod = null;
            clearTimeout(binding.debounceState.timeoutId);
            binding.debounceState = null;
        };
        DebounceBindingBehavior = __decorate([
            aureliaBinding.bindingBehavior('debounce')
        ], DebounceBindingBehavior);
        return DebounceBindingBehavior;
    }());

    function findOriginalEventTarget(event) {
        return (event.path && event.path[0]) || (event.deepPath && event.deepPath[0]) || event.target;
    }
    function handleSelfEvent(event) {
        var target = findOriginalEventTarget(event);
        if (this.target !== target) {
            return;
        }
        this.selfEventCallSource(event);
    }
    var SelfBindingBehavior = (function () {
        function SelfBindingBehavior() {
        }
        SelfBindingBehavior.prototype.bind = function (binding, source) {
            if (!binding.callSource || !binding.targetEvent) {
                throw new Error('Self binding behavior only supports event.');
            }
            binding.selfEventCallSource = binding.callSource;
            binding.callSource = handleSelfEvent;
        };
        SelfBindingBehavior.prototype.unbind = function (binding, source) {
            binding.callSource = binding.selfEventCallSource;
            binding.selfEventCallSource = null;
        };
        SelfBindingBehavior = __decorate([
            aureliaBinding.bindingBehavior('self')
        ], SelfBindingBehavior);
        return SelfBindingBehavior;
    }());

    var BindingSignaler = (function () {
        function BindingSignaler() {
            this.signals = {};
        }
        BindingSignaler.prototype.signal = function (name) {
            var bindings = this.signals[name];
            if (!bindings) {
                return;
            }
            var i = bindings.length;
            while (i--) {
                bindings[i].call(aureliaBinding.sourceContext);
            }
        };
        return BindingSignaler;
    }());

    var SignalBindingBehavior = (function () {
        function SignalBindingBehavior(bindingSignaler) {
            this.signals = bindingSignaler.signals;
        }
        SignalBindingBehavior.inject = function () { return [BindingSignaler]; };
        SignalBindingBehavior.prototype.bind = function (binding, source) {
            var names = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                names[_i - 2] = arguments[_i];
            }
            if (!binding.updateTarget) {
                throw new Error('Only property bindings and string interpolation bindings can be signaled.  Trigger, delegate and call bindings cannot be signaled.');
            }
            var signals = this.signals;
            if (names.length === 1) {
                var name_1 = names[0];
                var bindings = signals[name_1] || (signals[name_1] = []);
                bindings.push(binding);
                binding.signalName = name_1;
            }
            else if (names.length > 1) {
                var i = names.length;
                while (i--) {
                    var name_2 = names[i];
                    var bindings = signals[name_2] || (signals[name_2] = []);
                    bindings.push(binding);
                }
                binding.signalName = names;
            }
            else {
                throw new Error('Signal name is required.');
            }
        };
        SignalBindingBehavior.prototype.unbind = function (binding, source) {
            var signals = this.signals;
            var name = binding.signalName;
            binding.signalName = null;
            if (Array.isArray(name)) {
                var names = name;
                var i = names.length;
                while (i--) {
                    var n = names[i];
                    var bindings = signals[n];
                    bindings.splice(bindings.indexOf(binding), 1);
                }
            }
            else {
                var bindings = signals[name];
                bindings.splice(bindings.indexOf(binding), 1);
            }
        };
        SignalBindingBehavior = __decorate([
            aureliaBinding.bindingBehavior('signal')
        ], SignalBindingBehavior);
        return SignalBindingBehavior;
    }());

    var eventNamesRequired = 'The updateTrigger binding behavior requires at least one event name argument: eg <input value.bind="firstName & updateTrigger:\'blur\'">';
    var notApplicableMessage = 'The updateTrigger binding behavior can only be applied to two-way/ from-view bindings on input/select elements.';
    var UpdateTriggerBindingBehavior = (function () {
        function UpdateTriggerBindingBehavior() {
        }
        UpdateTriggerBindingBehavior.prototype.bind = function (binding, source) {
            var events = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                events[_i - 2] = arguments[_i];
            }
            if (events.length === 0) {
                throw new Error(eventNamesRequired);
            }
            if (binding.mode !== aureliaBinding.bindingMode.twoWay && binding.mode !== aureliaBinding.bindingMode.fromView) {
                throw new Error(notApplicableMessage);
            }
            var targetObserver = binding.observerLocator.getObserver(binding.target, binding.targetProperty);
            if (!targetObserver.handler) {
                throw new Error(notApplicableMessage);
            }
            binding.targetObserver = targetObserver;
            targetObserver.originalHandler = binding.targetObserver.handler;
            var handler = new aureliaBinding.EventSubscriber(events);
            targetObserver.handler = handler;
        };
        UpdateTriggerBindingBehavior.prototype.unbind = function (binding, source) {
            var targetObserver = binding.targetObserver;
            targetObserver.handler.dispose();
            targetObserver.handler = targetObserver.originalHandler;
            targetObserver.originalHandler = null;
        };
        UpdateTriggerBindingBehavior = __decorate([
            aureliaBinding.bindingBehavior('updateTrigger')
        ], UpdateTriggerBindingBehavior);
        return UpdateTriggerBindingBehavior;
    }());

    function _createDynamicElement(_a) {
        var name = _a.name, viewUrl = _a.viewUrl, bindableNames = _a.bindableNames, useShadowDOMmode = _a.useShadowDOMmode;
        var DynamicElement = (function () {
            function DynamicElement() {
            }
            DynamicElement.prototype.bind = function (bindingContext) {
                this.$parent = bindingContext;
            };
            DynamicElement = __decorate([
                aureliaTemplating.customElement(name),
                aureliaTemplating.useView(viewUrl)
            ], DynamicElement);
            return DynamicElement;
        }());
        for (var i = 0, ii = bindableNames.length; i < ii; ++i) {
            aureliaTemplating.bindable(bindableNames[i])(DynamicElement);
        }
        switch (useShadowDOMmode) {
            case 'open':
                aureliaTemplating.useShadowDOM({ mode: 'open' })(DynamicElement);
                break;
            case 'closed':
                aureliaTemplating.useShadowDOM({ mode: 'closed' })(DynamicElement);
                break;
            case '':
                aureliaTemplating.useShadowDOM(DynamicElement);
                break;
            case null:
                break;
            default:
                aureliaLogging.getLogger('aurelia-html-only-element')
                    .warn("Expected 'use-shadow-dom' value to be \"close\", \"open\" or \"\", received " + useShadowDOMmode);
                break;
        }
        return DynamicElement;
    }

    function getElementName(address) {
        return /([^\/^\?]+)\.html/i.exec(address)[1].toLowerCase();
    }
    function configure(config) {
        var viewEngine = config.container.get(aureliaTemplating.ViewEngine);
        var loader = config.aurelia.loader;
        viewEngine.addResourcePlugin('.html', {
            'fetch': function (viewUrl) {
                return loader.loadTemplate(viewUrl).then(function (registryEntry) {
                    var _a;
                    var bindableNames = registryEntry.template.getAttribute('bindable');
                    var useShadowDOMmode = registryEntry.template.getAttribute('use-shadow-dom');
                    var name = getElementName(viewUrl);
                    if (bindableNames) {
                        bindableNames = bindableNames.split(',').map(function (x) { return x.trim(); });
                        registryEntry.template.removeAttribute('bindable');
                    }
                    else {
                        bindableNames = [];
                    }
                    return _a = {}, _a[name] = _createDynamicElement({ name: name, viewUrl: viewUrl, bindableNames: bindableNames, useShadowDOMmode: useShadowDOMmode }), _a;
                });
            }
        });
    }

    function configure$1(config) {
        injectAureliaHideStyleAtHead();
        config.globalResources(Compose, If, Else, With, Repeat, Show, Hide, Replaceable, Focus, SanitizeHTMLValueConverter, OneTimeBindingBehavior, OneWayBindingBehavior, ToViewBindingBehavior, FromViewBindingBehavior, TwoWayBindingBehavior, ThrottleBindingBehavior, DebounceBindingBehavior, SelfBindingBehavior, SignalBindingBehavior, UpdateTriggerBindingBehavior, AttrBindingBehavior);
        configure(config);
        var viewEngine = config.container.get(aureliaTemplating.ViewEngine);
        var styleResourcePlugin = {
            fetch: function (address) {
                var _a;
                return _a = {}, _a[address] = _createCSSResource(address), _a;
            }
        };
        ['.css', '.less', '.sass', '.scss', '.styl'].forEach(function (ext) { return viewEngine.addResourcePlugin(ext, styleResourcePlugin); });
    }

    exports.AbstractRepeater = AbstractRepeater;
    exports.ArrayRepeatStrategy = ArrayRepeatStrategy;
    exports.AttrBindingBehavior = AttrBindingBehavior;
    exports.BindingSignaler = BindingSignaler;
    exports.Compose = Compose;
    exports.DebounceBindingBehavior = DebounceBindingBehavior;
    exports.Else = Else;
    exports.Focus = Focus;
    exports.FromViewBindingBehavior = FromViewBindingBehavior;
    exports.HTMLSanitizer = HTMLSanitizer;
    exports.Hide = Hide;
    exports.If = If;
    exports.MapRepeatStrategy = MapRepeatStrategy;
    exports.NullRepeatStrategy = NullRepeatStrategy;
    exports.NumberRepeatStrategy = NumberRepeatStrategy;
    exports.OneTimeBindingBehavior = OneTimeBindingBehavior;
    exports.OneWayBindingBehavior = OneWayBindingBehavior;
    exports.Repeat = Repeat;
    exports.RepeatStrategyLocator = RepeatStrategyLocator;
    exports.Replaceable = Replaceable;
    exports.SanitizeHTMLValueConverter = SanitizeHTMLValueConverter;
    exports.SelfBindingBehavior = SelfBindingBehavior;
    exports.SetRepeatStrategy = SetRepeatStrategy;
    exports.Show = Show;
    exports.SignalBindingBehavior = SignalBindingBehavior;
    exports.ThrottleBindingBehavior = ThrottleBindingBehavior;
    exports.ToViewBindingBehavior = ToViewBindingBehavior;
    exports.TwoWayBindingBehavior = TwoWayBindingBehavior;
    exports.UpdateTriggerBindingBehavior = UpdateTriggerBindingBehavior;
    exports.With = With;
    exports.configure = configure$1;
    exports.createFullOverrideContext = createFullOverrideContext;
    exports.getItemsSourceExpression = getItemsSourceExpression;
    exports.isOneTime = isOneTime;
    exports.unwrapExpression = unwrapExpression;
    exports.updateOneTimeBinding = updateOneTimeBinding;
    exports.updateOverrideContext = updateOverrideContext;
    exports.viewsRequireLifecycle = viewsRequireLifecycle;

    Object.defineProperty(exports, '__esModule', { value: true });

});
//# sourceMappingURL=aurelia-templating-resources.js.map
;define('aurelia-templating-resources', ['aurelia-templating-resources/aurelia-templating-resources'], function (main) { return main; });

define('aurelia-testing/aurelia-testing',["require", "exports", "./compile-spy", "./view-spy", "./component-tester", "./wait"], function (require, exports, compile_spy_1, view_spy_1, component_tester_1, wait_1) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    __export(compile_spy_1);
    __export(view_spy_1);
    __export(component_tester_1);
    __export(wait_1);
    function configure(config) {
        config.globalResources([
            './compile-spy',
            './view-spy'
        ]);
    }
    exports.configure = configure;
});
;define('aurelia-testing', ['aurelia-testing/aurelia-testing'], function (main) { return main; });

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define('aurelia-testing/compile-spy',["require", "exports", "aurelia-templating", "aurelia-dependency-injection", "aurelia-logging", "aurelia-pal"], function (require, exports, aurelia_templating_1, aurelia_dependency_injection_1, aurelia_logging_1, aurelia_pal_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Attribute to be placed on any element to have it emit the View Compiler's
     * TargetInstruction into the debug console, giving you insight into all the
     * parsed bindings, behaviors and event handers for the targeted element.
     */
    var CompileSpy = /** @class */ (function () {
        /**
         * Creates and instanse of CompileSpy.
         * @param element target element on where attribute is placed on.
         * @param instruction instructions for how the target element should be enhanced.
         */
        function CompileSpy(element, instruction) {
            aurelia_logging_1.getLogger('compile-spy').info(element.toString(), instruction);
        }
        CompileSpy = __decorate([
            aurelia_templating_1.customAttribute('compile-spy'),
            aurelia_dependency_injection_1.inject(aurelia_pal_1.DOM.Element, aurelia_templating_1.TargetInstruction)
        ], CompileSpy);
        return CompileSpy;
    }());
    exports.CompileSpy = CompileSpy;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define('aurelia-testing/view-spy',["require", "exports", "aurelia-templating", "aurelia-logging"], function (require, exports, aurelia_templating_1, aurelia_logging_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Attribute to be placed on any HTML element in a view to emit the View instance
     * to the debug console, giving you insight into the live View instance, including
     * all child views, live bindings, behaviors and more.
     */
    var ViewSpy = /** @class */ (function () {
        /**
         * Creates a new instance of ViewSpy.
         */
        function ViewSpy() {
            this.logger = aurelia_logging_1.getLogger('view-spy');
        }
        ViewSpy.prototype._log = function (lifecycleName, context) {
            if (!this.value && lifecycleName === 'created') {
                this.logger.info(lifecycleName, this.view);
            }
            else if (this.value && this.value.indexOf(lifecycleName) !== -1) {
                this.logger.info(lifecycleName, this.view, context);
            }
        };
        /**
         * Invoked when the target view is created.
         * @param view The target view.
         */
        ViewSpy.prototype.created = function (view) {
            this.view = view;
            this._log('created');
        };
        /**
         * Invoked when the target view is bound.
         * @param bindingContext The target view's binding context.
         */
        ViewSpy.prototype.bind = function (bindingContext) {
            this._log('bind', bindingContext);
        };
        /**
         * Invoked when the target element is attached to the DOM.
         */
        ViewSpy.prototype.attached = function () {
            this._log('attached');
        };
        /**
         * Invoked when the target element is detached from the DOM.
         */
        ViewSpy.prototype.detached = function () {
            this._log('detached');
        };
        /**
         * Invoked when the target element is unbound.
         */
        ViewSpy.prototype.unbind = function () {
            this._log('unbind');
        };
        ViewSpy = __decorate([
            aurelia_templating_1.customAttribute('view-spy')
        ], ViewSpy);
        return ViewSpy;
    }());
    exports.ViewSpy = ViewSpy;
});

define('aurelia-testing/component-tester',["require", "exports", "aurelia-templating", "./wait"], function (require, exports, aurelia_templating_1, wait_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var StageComponent = /** @class */ (function () {
        function StageComponent() {
        }
        StageComponent.withResources = function (resources) {
            if (resources === void 0) { resources = []; }
            return new ComponentTester().withResources(resources);
        };
        return StageComponent;
    }());
    exports.StageComponent = StageComponent;
    var ComponentTester = /** @class */ (function () {
        function ComponentTester() {
            this.resources = [];
        }
        ComponentTester.prototype.configure = function (aurelia) {
            return aurelia.use.standardConfiguration();
        };
        ComponentTester.prototype.bootstrap = function (configure) {
            this.configure = configure;
        };
        ComponentTester.prototype.withResources = function (resources) {
            this.resources = resources;
            return this;
        };
        ComponentTester.prototype.inView = function (html) {
            this.html = html;
            return this;
        };
        ComponentTester.prototype.boundTo = function (bindingContext) {
            this.bindingContext = bindingContext;
            return this;
        };
        ComponentTester.prototype.manuallyHandleLifecycle = function () {
            this._prepareLifecycle();
            return this;
        };
        ComponentTester.prototype.create = function (bootstrap) {
            var _this = this;
            return bootstrap(function (aurelia) {
                return Promise.resolve(_this.configure(aurelia)).then(function () {
                    if (_this.resources) {
                        aurelia.use.globalResources(_this.resources);
                    }
                    return aurelia.start().then(function () {
                        _this.host = document.createElement('div');
                        _this.host.innerHTML = _this.html;
                        document.body.appendChild(_this.host);
                        return aurelia.enhance(_this.bindingContext, _this.host).then(function () {
                            _this.rootView = aurelia.root;
                            _this.element = _this.host.firstElementChild;
                            if (aurelia.root.controllers.length) {
                                _this.viewModel = aurelia.root.controllers[0].viewModel;
                            }
                            return new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 0); });
                        });
                    });
                });
            });
        };
        ComponentTester.prototype.dispose = function () {
            if (this.host === undefined || this.rootView === undefined) {
                throw new Error('Cannot call ComponentTester.dispose() before ComponentTester.create()');
            }
            this.rootView.detached();
            this.rootView.unbind();
            return this.host.parentNode.removeChild(this.host);
        };
        ComponentTester.prototype._prepareLifecycle = function () {
            var _this = this;
            // bind
            var bindPrototype = aurelia_templating_1.View.prototype.bind;
            // tslint:disable-next-line:no-empty
            aurelia_templating_1.View.prototype.bind = function () { };
            this.bind = function (bindingContext) { return new Promise(function (resolve) {
                aurelia_templating_1.View.prototype.bind = bindPrototype;
                if (bindingContext !== undefined) {
                    _this.bindingContext = bindingContext;
                }
                _this.rootView.bind(_this.bindingContext);
                setTimeout(function () { return resolve(); }, 0);
            }); };
            // attached
            var attachedPrototype = aurelia_templating_1.View.prototype.attached;
            // tslint:disable-next-line:no-empty
            aurelia_templating_1.View.prototype.attached = function () { };
            this.attached = function () { return new Promise(function (resolve) {
                aurelia_templating_1.View.prototype.attached = attachedPrototype;
                _this.rootView.attached();
                setTimeout(function () { return resolve(); }, 0);
            }); };
            // detached
            this.detached = function () { return new Promise(function (resolve) {
                _this.rootView.detached();
                setTimeout(function () { return resolve(); }, 0);
            }); };
            // unbind
            this.unbind = function () { return new Promise(function (resolve) {
                _this.rootView.unbind();
                setTimeout(function () { return resolve(); }, 0);
            }); };
        };
        ComponentTester.prototype.waitForElement = function (selector, options) {
            var _this = this;
            return wait_1.waitFor(function () { return _this.element.querySelector(selector); }, options);
        };
        ComponentTester.prototype.waitForElements = function (selector, options) {
            var _this = this;
            return wait_1.waitFor(function () { return _this.element.querySelectorAll(selector); }, options);
        };
        return ComponentTester;
    }());
    exports.ComponentTester = ComponentTester;
});

var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
define('aurelia-testing/wait',["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Generic function to wait for something to happen. Uses polling
     * @param getter: a getter function that returns anything else than `null` or an
     *                empty array or an empty jQuery object when the
     *                condition is met
     * @param options: lookup options, defaults to
     *                 `{present: true, interval: 50, timeout: 5000}`
     */
    function waitFor(getter, options) {
        if (options === void 0) { options = { present: true, interval: 50, timeout: 5000 }; }
        // prevents infinite recursion if the request times out
        var timedOut = false;
        options = __assign({ present: true, interval: 50, timeout: 5000 }, options);
        function wait() {
            var element = getter();
            // boolean is needed here, hence the length > 0
            var found = element !== null && (!(element instanceof NodeList) &&
                !element.jquery || element.length > 0);
            if (!options.present === !found || timedOut) {
                return Promise.resolve(element);
            }
            return new Promise(function (rs) { return setTimeout(rs, options.interval); }).then(wait);
        }
        return Promise.race([
            new Promise(function (_, rj) { return setTimeout(function () {
                timedOut = true;
                rj(new Error(options.present ? 'Element not found' : 'Element not removed'));
            }, options.timeout); }),
            wait()
        ]);
    }
    exports.waitFor = waitFor;
    function waitForDocumentElement(selector, options) {
        return waitFor(function () { return document.querySelector(selector); }, options);
    }
    exports.waitForDocumentElement = waitForDocumentElement;
    function waitForDocumentElements(selector, options) {
        return waitFor(function () { return document.querySelectorAll(selector); }, options);
    }
    exports.waitForDocumentElements = waitForDocumentElements;
});

//# sourceMappingURL=app-bundle.js.map