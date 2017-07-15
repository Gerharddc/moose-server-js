import * as WebSocket from "uws";
import { Notify } from "./notify";

const SystemName = "Heater";

export default class Heater {
    private targetTemp: number = 100;
    private id: number;
    private heating: boolean;
    private displayName: string;

    constructor(id: number, displayName: string) {
        this.id = id;
        this.displayName = displayName;
    }

    get TargetTemp(): number {
        return this.targetTemp;
    }
    public setTargetTemp(temp: number, setter: WebSocket) {
        if (temp !== this.TargetTemp) {
            // TODO: send command to printer

            Notify(SystemName, this.id, "TargetTemp", setter);
            this.targetTemp = temp;
        }
    }

    get Heating(): boolean {
        return this.heating;
    }
    public setHeating(heating: boolean, setter: WebSocket) {
        if (heating !== this.heating) {
            // TODO: send command to printer

            Notify(SystemName, this.id, "Heating", setter);
            this.heating = heating;
        }
    }

    get DisplayName(): string {
        return this.displayName;
    }
    public setDisplayName(displayName: string, setter: WebSocket) {
        if (displayName !== this.displayName) {
            // TODO: send command to printer

            Notify(SystemName, this.id, "DisplayName", setter);
            this.displayName = displayName;
        }
    }

    get currentTemp(): number {
        // TODO: read from the printer

        return 25;
    }

    get ID(): number {
        return this.id;
    }
}
