// @flow

import { Notify } from './notify';
import type { WebSocket } from './notify';

const SystemName = 'Heater';

export default class Heater {
    _targetTemp: number = 100;
    _id: number;
    _heating: boolean;
    _displayName: string;

    constructor(id: number, displayName: string) {
        this._id = id;
        this._displayName = displayName;
    }

    get targetTemp(): number {
        return this._targetTemp;
    }
    setTargetTemp(temp: number, setter: WebSocket) {
        if (temp !== this._targetTemp) {
            // TODO: send command to printer

            Notify(SystemName, this._id, 'TargetTemp', setter);
            this._targetTemp = temp;
        }
    }

    get heating(): boolean {
        return this._heating;
    }
    setHeating(heating: boolean, setter: WebSocket) {
        if (heating !== this._heating) {
            // TODO: send command to printer

            Notify(SystemName, this._id, 'Heating', setter);
            this._heating = heating;
        }
    }

    get displayName(): string {
        return this._displayName;
    }
    setDisplayName(displayName: string, setter: WebSocket) {
        if (displayName !== this._displayName) {
            // TODO: send command to printer

            Notify(SystemName, this._id, 'DisplayName', setter);
            this._displayName = displayName;
        }
    }

    get currentTemp(): number {
        // TODO: read from the printer

        return 25;
    }
}
