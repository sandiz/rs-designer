/* eslint-disable */
(function (f) { if (typeof exports === "object" && typeof module !== "undefined") { module.exports = f() } else if (typeof define === "function" && define.amd) { define([], f) } else { var g; if (typeof window !== "undefined") { g = window } else if (typeof global !== "undefined") { g = global } else if (typeof self !== "undefined") { g = self } else { g = this } g.WebAudioScheduler = f() } })(function () {
    var define, module, exports; return (function e(t, n, r) { function s(o, u) { if (!n[o]) { if (!t[o]) { var a = typeof require == "function" && require; if (!u && a) return a(o, !0); if (i) return i(o, !0); var f = new Error("Cannot find module '" + o + "'"); throw f.code = "MODULE_NOT_FOUND", f } var l = n[o] = { exports: {} }; t[o][0].call(l.exports, function (e) { var n = t[o][1][e]; return s(n ? n : e) }, l, l.exports, e, t, n, r) } return n[o].exports } var i = typeof require == "function" && require; for (var o = 0; o < r.length; o++)s(r[o]); return s })({
        1: [function (require, module, exports) {
            // Copyright Joyent, Inc. and other Node contributors.
            //
            // Permission is hereby granted, free of charge, to any person obtaining a
            // copy of this software and associated documentation files (the
            // "Software"), to deal in the Software without restriction, including
            // without limitation the rights to use, copy, modify, merge, publish,
            // distribute, sublicense, and/or sell copies of the Software, and to permit
            // persons to whom the Software is furnished to do so, subject to the
            // following conditions:
            //
            // The above copyright notice and this permission notice shall be included
            // in all copies or substantial portions of the Software.
            //
            // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
            // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
            // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
            // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
            // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
            // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
            // USE OR OTHER DEALINGS IN THE SOFTWARE.

            function EventEmitter() {
                this._events = this._events || {};
                this._maxListeners = this._maxListeners || undefined;
            }
            module.exports = EventEmitter;

            // Backwards-compat with node 0.10.x
            EventEmitter.EventEmitter = EventEmitter;

            EventEmitter.prototype._events = undefined;
            EventEmitter.prototype._maxListeners = undefined;

            // By default EventEmitters will print a warning if more than 10 listeners are
            // added to it. This is a useful default which helps finding memory leaks.
            EventEmitter.defaultMaxListeners = 10;

            // Obviously not all Emitters should be limited to 10. This function allows
            // that to be increased. Set to zero for unlimited.
            EventEmitter.prototype.setMaxListeners = function (n) {
                if (!isNumber(n) || n < 0 || isNaN(n))
                    throw TypeError('n must be a positive number');
                this._maxListeners = n;
                return this;
            };

            EventEmitter.prototype.emit = function (type) {
                var er, handler, len, args, i, listeners;

                if (!this._events)
                    this._events = {};

                // If there is no 'error' event listener then throw.
                if (type === 'error') {
                    if (!this._events.error ||
                        (isObject(this._events.error) && !this._events.error.length)) {
                        er = arguments[1];
                        if (er instanceof Error) {
                            throw er; // Unhandled 'error' event
                        } else {
                            // At least give some kind of context to the user
                            var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
                            err.context = er;
                            throw err;
                        }
                    }
                }

                handler = this._events[type];

                if (isUndefined(handler))
                    return false;

                if (isFunction(handler)) {
                    switch (arguments.length) {
                        // fast cases
                        case 1:
                            handler.call(this);
                            break;
                        case 2:
                            handler.call(this, arguments[1]);
                            break;
                        case 3:
                            handler.call(this, arguments[1], arguments[2]);
                            break;
                        // slower
                        default:
                            args = Array.prototype.slice.call(arguments, 1);
                            handler.apply(this, args);
                    }
                } else if (isObject(handler)) {
                    args = Array.prototype.slice.call(arguments, 1);
                    listeners = handler.slice();
                    len = listeners.length;
                    for (i = 0; i < len; i++)
                        listeners[i].apply(this, args);
                }

                return true;
            };

            EventEmitter.prototype.addListener = function (type, listener) {
                var m;

                if (!isFunction(listener))
                    throw TypeError('listener must be a function');

                if (!this._events)
                    this._events = {};

                // To avoid recursion in the case that type === "newListener"! Before
                // adding it to the listeners, first emit "newListener".
                if (this._events.newListener)
                    this.emit('newListener', type,
                        isFunction(listener.listener) ?
                            listener.listener : listener);

                if (!this._events[type])
                    // Optimize the case of one listener. Don't need the extra array object.
                    this._events[type] = listener;
                else if (isObject(this._events[type]))
                    // If we've already got an array, just append.
                    this._events[type].push(listener);
                else
                    // Adding the second element, need to change to array.
                    this._events[type] = [this._events[type], listener];

                // Check for listener leak
                if (isObject(this._events[type]) && !this._events[type].warned) {
                    if (!isUndefined(this._maxListeners)) {
                        m = this._maxListeners;
                    } else {
                        m = EventEmitter.defaultMaxListeners;
                    }

                    if (m && m > 0 && this._events[type].length > m) {
                        this._events[type].warned = true;
                        console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            this._events[type].length);
                        if (typeof console.trace === 'function') {
                            // not supported in IE 10
                            console.trace();
                        }
                    }
                }

                return this;
            };

            EventEmitter.prototype.on = EventEmitter.prototype.addListener;

            EventEmitter.prototype.once = function (type, listener) {
                if (!isFunction(listener))
                    throw TypeError('listener must be a function');

                var fired = false;

                function g() {
                    this.removeListener(type, g);

                    if (!fired) {
                        fired = true;
                        listener.apply(this, arguments);
                    }
                }

                g.listener = listener;
                this.on(type, g);

                return this;
            };

            // emits a 'removeListener' event iff the listener was removed
            EventEmitter.prototype.removeListener = function (type, listener) {
                var list, position, length, i;

                if (!isFunction(listener))
                    throw TypeError('listener must be a function');

                if (!this._events || !this._events[type])
                    return this;

                list = this._events[type];
                length = list.length;
                position = -1;

                if (list === listener ||
                    (isFunction(list.listener) && list.listener === listener)) {
                    delete this._events[type];
                    if (this._events.removeListener)
                        this.emit('removeListener', type, listener);

                } else if (isObject(list)) {
                    for (i = length; i-- > 0;) {
                        if (list[i] === listener ||
                            (list[i].listener && list[i].listener === listener)) {
                            position = i;
                            break;
                        }
                    }

                    if (position < 0)
                        return this;

                    if (list.length === 1) {
                        list.length = 0;
                        delete this._events[type];
                    } else {
                        list.splice(position, 1);
                    }

                    if (this._events.removeListener)
                        this.emit('removeListener', type, listener);
                }

                return this;
            };

            EventEmitter.prototype.removeAllListeners = function (type) {
                var key, listeners;

                if (!this._events)
                    return this;

                // not listening for removeListener, no need to emit
                if (!this._events.removeListener) {
                    if (arguments.length === 0)
                        this._events = {};
                    else if (this._events[type])
                        delete this._events[type];
                    return this;
                }

                // emit removeListener for all listeners on all events
                if (arguments.length === 0) {
                    for (key in this._events) {
                        if (key === 'removeListener') continue;
                        this.removeAllListeners(key);
                    }
                    this.removeAllListeners('removeListener');
                    this._events = {};
                    return this;
                }

                listeners = this._events[type];

                if (isFunction(listeners)) {
                    this.removeListener(type, listeners);
                } else if (listeners) {
                    // LIFO order
                    while (listeners.length)
                        this.removeListener(type, listeners[listeners.length - 1]);
                }
                delete this._events[type];

                return this;
            };

            EventEmitter.prototype.listeners = function (type) {
                var ret;
                if (!this._events || !this._events[type])
                    ret = [];
                else if (isFunction(this._events[type]))
                    ret = [this._events[type]];
                else
                    ret = this._events[type].slice();
                return ret;
            };

            EventEmitter.prototype.listenerCount = function (type) {
                if (this._events) {
                    var evlistener = this._events[type];

                    if (isFunction(evlistener))
                        return 1;
                    else if (evlistener)
                        return evlistener.length;
                }
                return 0;
            };

            EventEmitter.listenerCount = function (emitter, type) {
                return emitter.listenerCount(type);
            };

            function isFunction(arg) {
                return typeof arg === 'function';
            }

            function isNumber(arg) {
                return typeof arg === 'number';
            }

            function isObject(arg) {
                return typeof arg === 'object' && arg !== null;
            }

            function isUndefined(arg) {
                return arg === void 0;
            }

        }, {}], 2: [function (require, module, exports) {
            (function (global) {
                "use strict";

                var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

                function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

                function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

                function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

                var events = require("events");
                var defaults = require("./utils/defaults");
                var defaultContext = require("./defaultContext");

                var WebAudioScheduler = function (_events$EventEmitter) {
                    _inherits(WebAudioScheduler, _events$EventEmitter);

                    function WebAudioScheduler(opts) {
                        _classCallCheck(this, WebAudioScheduler);

                        opts = opts || /* istanbul ignore next */{};

                        var _this = _possibleConstructorReturn(this, (WebAudioScheduler.__proto__ || Object.getPrototypeOf(WebAudioScheduler)).call(this));

                        _this.context = defaults(opts.context, defaultContext);
                        _this.interval = defaults(opts.interval, 0.025);
                        _this.aheadTime = defaults(opts.aheadTime, 0.1);
                        _this.timerAPI = defaults(opts.timerAPI, global);
                        _this.playbackTime = _this.currentTime;

                        _this._timerId = 0;
                        _this._schedId = 0;
                        _this._scheds = [];
                        return _this;
                    }

                    _createClass(WebAudioScheduler, [{
                        key: "start",
                        value: function start(callback, args) {
                            var loop = this.process.bind(this);

                            if (this._timerId === 0) {
                                this._timerId = this.timerAPI.setInterval(loop, this.interval * 1000);

                                this.emit("start");

                                if (callback) {
                                    this.insert(this.context.currentTime, callback, args);
                                    loop();
                                }
                            } else if (callback) {
                                this.insert(this.context.currentTime, callback, args);
                            }

                            return this;
                        }
                    }, {
                        key: "stop",
                        value: function stop() {
                            var reset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

                            if (this._timerId !== 0) {
                                this.timerAPI.clearInterval(this._timerId);
                                this._timerId = 0;

                                this.emit("stop");
                            }

                            if (reset) {
                                this._scheds.splice(0);
                            }

                            return this;
                        }
                    }, {
                        key: "insert",
                        value: function insert(time, callback, args) {
                            var id = ++this._schedId;
                            var event = { id: id, time: time, callback: callback, args: args };
                            var scheds = this._scheds;

                            if (scheds.length === 0 || scheds[scheds.length - 1].time <= time) {
                                scheds.push(event);
                            } else {
                                for (var i = 0, imax = scheds.length; i < imax; i++) {
                                    if (time < scheds[i].time) {
                                        scheds.splice(i, 0, event);
                                        break;
                                    }
                                }
                            }

                            return id;
                        }
                    }, {
                        key: "nextTick",
                        value: function nextTick(time, callback, args) {
                            if (typeof time === "function") {
                                args = callback;
                                callback = time;
                                time = this.playbackTime;
                            }

                            return this.insert(time + this.aheadTime, callback, args);
                        }
                    }, {
                        key: "remove",
                        value: function remove(schedId) {
                            var scheds = this._scheds;

                            if (typeof schedId === "number") {
                                for (var i = 0, imax = scheds.length; i < imax; i++) {
                                    if (schedId === scheds[i].id) {
                                        scheds.splice(i, 1);
                                        break;
                                    }
                                }
                            }

                            return schedId;
                        }
                    }, {
                        key: "removeAll",
                        value: function removeAll() {
                            this._scheds.splice(0);
                        }
                    }, {
                        key: "process",
                        value: function process() {
                            var t0 = this.context.currentTime;
                            var t1 = t0 + this.aheadTime;

                            this._process(t0, t1);
                        }
                    }, {
                        key: "_process",
                        value: function _process(t0, t1) {
                            var scheds = this._scheds;
                            var playbackTime = t0;

                            this.playbackTime = playbackTime;
                            this.emit("process", { playbackTime: playbackTime });

                            while (scheds.length && scheds[0].time < t1) {
                                var event = scheds.shift();
                                var _playbackTime = event.time;
                                var args = event.args;

                                this.playbackTime = _playbackTime;

                                event.callback({ playbackTime: _playbackTime, args: args });
                            }

                            this.playbackTime = playbackTime;
                            this.emit("processed", { playbackTime: playbackTime });
                        }
                    }, {
                        key: "state",
                        get: function get() {
                            return this._timerId !== 0 ? "running" : "suspended";
                        }
                    }, {
                        key: "currentTime",
                        get: function get() {
                            return this.context.currentTime;
                        }
                    }, {
                        key: "events",
                        get: function get() {
                            return this._scheds.slice();
                        }
                    }]);

                    return WebAudioScheduler;
                }(events.EventEmitter);

                module.exports = WebAudioScheduler;

            }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
        }, { "./defaultContext": 3, "./utils/defaults": 4, "events": 1 }], 3: [function (require, module, exports) {
            "use strict";

            module.exports = {
                get currentTime() {
                    return Date.now() / 1000;
                }
            };

        }, {}], 4: [function (require, module, exports) {
            "use strict";

            function defaults(value, defaultValue) {
                return value !== undefined ? value : defaultValue;
            }

            module.exports = defaults;

        }, {}], 5: [function (require, module, exports) {
            "use strict";

            module.exports = require("./WebAudioScheduler");

        }, { "./WebAudioScheduler": 2 }]
    }, {}, [5])(5)
});