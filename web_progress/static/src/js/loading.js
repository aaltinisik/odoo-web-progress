odoo.define('web.progress.loading', function (require) {
"use strict";

/**
 * Loading Progress Bar
 */

var core = require('web.core');
var Loading = require('web.Loading');

var _t = core._t;

Loading.include({

    init: function(parent) {
        this._super(parent);
        this.progress_timers = {};
        core.bus.on('rpc_progress_request', this, this.add_progress);
        core.bus.on("rpc_progress_result", this, this.remove_progress);
        core.bus.on("rpc_progress_cancel", this, this.cancel_progress);
        core.bus.on("rpc_progress_background", this, this.move_to_background);
    },
    destroy: function() {
        for (var key in this.progress_timers) {
            if (this.progress_timers.hasOwnProperty(key)) {
                clearTimeout(this.progress_timers[key]);
            }
        }
        this._super();
    },
    progress: function(fct_name, params, progress_code) {
        var self = this;
        this._rpc({
                model: 'web.progress',
                method: 'get_progress',
                args: [progress_code]
            }, {'shadow': true}).then(function (result_list) {
                console.debug(result_list);
                if (result_list.length > 0) {
                    var result = result_list[result_list.length - 1];
                    if (result.state === 'ongoing' && result.msg) {
                        core.bus.trigger('rpc_progress', result_list)
                    }
                    if (progress_code in self.progress_timers) {
                        self.progress_timers[progress_code] = setTimeout(function () {
                            if ('progress' in self) {
                                self.progress(fct_name, params, progress_code)
                            }
                        }, 2000);
                    }
                }
        })
    },
    move_to_background: function() {
        this.count = 0;
        // this.on_rpc_event(0);
        core.action_registry.get('reload')()
    },
    cancel_progress: function(progress_code) {
        var self = this;
        this._rpc({
                model: 'web.progress',
                method: 'cancel_progress',
                args: [progress_code]
            }, {'shadow': true})
    },
    add_progress: function(fct_name, params, progress_code) {
        var self = this;
        // console.debug([fct_name, params, progress_code]);
        if (fct_name === 'call' && 'args' in params && params.model !== 'web.progress') {
            this.progress_timers[progress_code] = setTimeout(function () {
                if ('progress' in self) {
                    self.progress(fct_name, params, progress_code)
                }
            }, 2000);
        }
    },
    remove_progress: function(progress_code) {
        if (progress_code in this.progress_timers) {
            clearTimeout(this.progress_timers[progress_code]);
            delete this.progress_timers[progress_code];
        }
    }
});

return Loading;
});

