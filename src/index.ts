/*
 GCD AntiCheat (V2): A script that prevents players from cheating in certain Minecraft: Bedrock Edition servers.
 Copyright (C) 2021 Imrglop 
*/

/// <reference types="minecraft-scripting-types-server" />

export const system: IVanillaServerSystem = server.registerSystem(0, 0);

// ----------- Imports -----------


//#region checks
import { Check } from './classes/Check';
import { NBT } from './classes/checks/NBT';
import { Nuker } from './classes/checks/Nuker';
import { Reach } from './classes/checks/Reach';
//#endregion

import { Config } from './config';
import { TagComponent } from './playerdata';

// ----------- Variables -----------

var currentTick = 0;
var checks: Check[] = [];
var serverAny: any = server;
//var systemAny: any = system;

// ----------- Exports -----------

export var externalListeners = new Map<string, ((data: any) => boolean)[]>();
export var updateListeners: Function[] = [];

serverAny.__gcd_events__ = {
    flagged: {
        connect: function (flagType: string, listener: (data: any) => boolean) {
            var currentList = externalListeners.get(flagType);
            if (currentList == null) currentList = [];
            currentList.push(listener);
            externalListeners.set(flagType, currentList);
        }
    },
    extra: {
        getServerStats: function () {
            return serverStats;
        },
        banPlayer: banPlayer
    }
}

export function banPlayer(player: IEntity): boolean {
    const tag: TagComponent = system.getComponent(player, "minecraft:tag");
    if (!tag) return false;
    tag.data.push("GCDBanned");
    return true;
}

export function formatMessage(message: string, s1: string): string {
    return (message.split('&').join('\u00A7')).replace('%n', s1);
}

export var serverStats = {
    MSPT: 50,
    TPS: 20,
    server: {
        serverType: 'vanilla',
        setTimeoutEnabled: false,
        jsConsole: false
    }
}

export function debugLog(...i: any) {
    if (Config.getConfig().general.debug.general) {
        log(true, i);
    }
}

export function log(debug: boolean, ...i: any) {
    var finalLog: string = '';
    if (debug && !Config.getConfig().general.debug.general) return;
    for (var k of i) {
        switch (k + '') {
            case '[object Object]':
                finalLog += JSON.stringify(k);
                break;
            case '[object Undefined]':
                finalLog += "undefined";
                break;
            case '[object Null]':
                finalLog += "null";
                break;
            case '[object Array]':
                finalLog += JSON.stringify(k);
                break;
            default:
                finalLog += ((k + ""))
                    .split('\r\n').join('\n'); // mc only uses \n, looks cleaner
                break;
        }
        finalLog += " ";
    }
    if (serverStats.server.jsConsole) {
        console.log(`[${new Date().toLocaleString()}] [GCD] ${finalLog}`)
    } else {
        server.log("[GCD] " + finalLog);
    }
    if (serverAny.__GCD_CONFIG__.general.debug.logToChat) {
        const msgData = system.createEventData(SendToMinecraftServer.DisplayChat);
        if (!msgData) return;
        msgData.data.message = `[${new Date().toLocaleString()}] [GCD] ${finalLog}`;
        system.broadcastEvent(SendToMinecraftServer.DisplayChat, msgData);
    }
}

export const cGlobal = Config;

export function isImmune(player: IEntity): boolean {
    const tag: TagComponent = system.getComponent(player, "minecraft:tag");
    if (!tag) return false;
    return tag.data.includes("GCDAdmin");
}

// ----------- System -----------

system.shutdown = function () {
    shutdownChecks();
}

system.update = function () {
    for (let tickCheck of checks) {
        if (tickCheck.isEnabled()) {
            eval('tickCheck.onTick()');
        }
    }
    if (currentTick === 0) {
        onInitialize();
    }
    currentTick++;
}

// ----------- Events -----------

system.listenForEvent(ReceiveFromMinecraftServer.EntityCreated, (eventData) => {
    const {
        data: {
            entity
        }
    } = eventData;
    if (!system.hasComponent(entity, "minecraft:nameable")) return;
    var nameable: IComponent<any> = system.getComponent(entity, MinecraftComponent.Nameable);
    if (!nameable.data.name || nameable.data.name == '') return;
    if (entity.__identifier__ === "minecraft:player") {
        //wip
    }
})

// ----------- Functions -----------

function onInitialize() { // system.initialize broken?
    checkServerType();
    cGlobal.init();
    initializeChecks();
}

function checkServerType() {
    var checksPassed = 0;
    try {
        eval("setTimeout");
        serverStats.server.setTimeoutEnabled = true;
        serverStats.server.serverType = 'modded';
        checksPassed++;
    } catch { }
    try {
        eval("require");
        checksPassed++;
        serverStats.server.serverType = 'any-node';
    } catch { }
    try {
        eval("require(\"bdsx\")");
        checksPassed++;
        serverStats.server.serverType = 'bdsx-node';
    } catch { }
    if (checksPassed > 0) {
        serverStats.server.jsConsole = true;
    }
    log(false, `Checks passed: ${checksPassed}/3. Detected Server type: ${serverStats.server.serverType}`);
}

function initializeChecks() {
    log(false, "Enabling general checks...");
    var reachSettings = cGlobal.getCheckSettings<Reach>('reach');
    if (reachSettings.enabled) checks.push(new Reach());

    reachSettings = cGlobal.getCheckSettings<Reach>('nuker');
    if (reachSettings.enabled) checks.push(new Nuker());

    if (serverStats.server.serverType == 'bdsx-node') {
        // bdsx checks here
        log(false, `Enabling BDSX checks...`);
        var nbtSettings = cGlobal.getCheckSettings<NBT>('nbt');
        if (nbtSettings.enabled)
            checks.push(new NBT());
        serverAny.__gcd_commands_start__();
    }
    checks.forEach(_check => {
        var check: any = _check;
        _check.system = system;
        check.onEnable();
    });
    log(false, "Checks enabled.");
}

function shutdownChecks() {
    checks.forEach(_check => {
        var check: any = _check;
        check.onDisable();
    });
}