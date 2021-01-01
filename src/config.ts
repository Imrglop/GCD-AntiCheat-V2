import { CheckConfiguration } from "./classes/Check";
import { log } from "./index";
//import { CheckConfiguration } from './classes/Check';
export namespace config {
    var initialized = false;
    export var config : any;
    export function init() {
        if (!initialized) {
            try {
                eval("config = server.__GCD_CONFIG__;");
            } catch (e) {
                log("Couldn't load config! err: " + e);
                return;
            }
            initialized = true;
        }// else throw Error("Already initialized");
    }

    export function getCheckSettings<T>(nid : string) : CheckConfiguration<T>  {
        return config.checks.nid;
    }

    export function getActionType<T>(nid : string) : any {
        return getCheckSettings<T>(nid).onFlagged;
    }
}