// this script is injected into every page.

const inject = function (func) {
    // inject the hook
    const script = document.createElement('script');
    script.textContent = ';(' + func.toString() + ')(window)';
    document.documentElement.appendChild(script);
    script.parentNode.removeChild(script);
};

const detact = function (win) {
    setTimeout(() => {
        const all = document.querySelectorAll('*');
        const el = Array.prototype.find.call(all, (e) => e.__vue__);
        if (el) {
            let Vue = el.__vue__.constructor;
            while (Vue.super)
                Vue = Vue.super;
            win.postMessage({
                devtoolsEnabled: Vue.config.devtools,
                vueDetected: true,
            }, '*');
        }
    });
};

/**
 * Install the hook on window, which is an event emitter.
 * Note because Chrome content scripts cannot directly modify the window object,
 * we are evaling this function by inserting a script tag. That's why we have
 * to inline the whole event emitter implementation here.
 *
 * @param {Window} window
 */
/* eslint-disable prefer-rest-params */
const installHook = function (window) {
    let listeners = {};

    const hook = {
        Vue: null,
        on(event, fn) {
            event = '$' + event;
            (listeners[event] || (listeners[event] = [])).push(fn);
        },
        once(event, fn) {
            event = '$' + event;
            const on = function () {
                this.off(event, on);
                fn.apply(this, arguments);
            };
            (listeners[event] || (listeners[event] = [])).push(on);
        },
        off(event, fn) {
            event = '$' + event;
            if (!arguments.length)
                listeners = {};
            else {
                const cbs = listeners[event];
                if (cbs) {
                    if (!fn)
                        listeners[event] = null;
                    else {
                        for (let i = 0, l = cbs.length; i < l; i++) {
                            const cb = cbs[i];
                            if (cb === fn || cb.fn === fn) {
                                cbs.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
        },
        emit(event) {
            event = '$' + event;
            let cbs = listeners[event];
            if (cbs) {
                const args = [].slice.call(arguments, 1);
                cbs = cbs.slice();
                for (let i = 0, l = cbs.length; i < l; i++)
                    cbs[i].apply(this, args);
            }
        },
    };

    hook.once('init', (Vue) => hook.Vue = Vue);
    hook.once('vuex:init', (store) => hook.store = store);

    Object.defineProperty(window, '__VISION_DEVTOOLS_GLOBAL_HOOK__', {
        get() { return hook; },
    });
};

window.addEventListener('message', (e) => {
    if (e.source === window && e.data.vueDetected)
        chrome.runtime.sendMessage(e.data);
});

inject(installHook);
inject(detact);