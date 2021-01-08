// ----------- Imports -----------

import { Config } from '../config';
import { banPlayer, cGlobal, externalListeners, formatMessage } from '../index';
import { TagComponent } from '../playerdata';
import { getServerTPS } from '../tps';
import { ActionType } from './ActionType';

// ----------- Class -----------

export class Check {
    system: IVanillaServerSystem;
    settings = {
        name: '',
        actionType: '',
        nid: ''
    }
    constructor(name: string, actionType: ActionType, nid: string) {
        this.settings.name = name;
        this.settings.actionType = actionType;
        this.settings.nid = nid;
    }
    public isEnabled(): boolean {
        return Config.getCheckSettings(this.settings.nid).enabled;
    }

    /**
     * 
     * @param data the json to send to external scripts
     */
    public onFlagged(data: any): boolean {
        data.__check__ = {
            actionType: this.settings.actionType,
            name: this.settings.name
        }
        data.tickrateWhenFlagged = getServerTPS();
        var playerName = this.system.getComponent(data.player, MinecraftComponent.Nameable);
        if (!playerName) return;
        const name = playerName.data.name;
        switch (Config.getActionType(this.settings.nid)) {
            case ActionType.PLAYER_KICK:
                var messageBase = Config.getMessages('kick')[this.settings.nid];
                messageBase = messageBase ? messageBase : Config.getMessages('kick').default;
                this.system.executeCommand(`kick @a[name="${name}"] ${formatMessage(messageBase, this.settings.nid)}`, () => { });
                break;
            case ActionType.PLAYER_BAN:
                banPlayer(data.player);
                break;
        }
        if (cGlobal.getConfig().general.apiEnabled) {
            for (let listener of externalListeners.get(this.settings.nid)) {
                return listener(data);
            }
        }
        return false;
    }
}

// ----------- Exports -----------

export interface TCheck {
    onTick(): void
    onEnable(): void
    onDisable(): void
}

export interface IReach {
    readonly maxReach: number;
    readonly nextHit: number;
}

export interface INBT {
}

export interface INuker {
    readonly tolerance: number;
}

export interface CheckConfiguration<T> {
    readonly enabled: boolean
    readonly onFlagged: ActionType
    data: T
}