import * as WebSocket from "ws";
import { Notify } from "./notify";
import * as Printer from "./printer";
const SystemName = "Heater";

export default class Heater {
    private targetTemp: number = 100;
    private currentTemp: number = 0;
    private id: number;
    private heating: boolean;
    private displayName: string;
    private heatbed: boolean;

    constructor(id: number, displayName: string, heatbed: boolean = false) {
        this.id = id;
        this.displayName = displayName;
        this.heatbed = heatbed;

        if (heatbed) {
            Printer.tempUpdateEmitter.on("BedTemp", (temp) => this.updateTemp(temp));
        } else {
            Printer.tempUpdateEmitter.on("ExtTemp", (temp) => this.updateTemp(temp));
        }
    }

    get Heatbed(): boolean {
        return this.heatbed;
    }

    get TargetTemp(): number {
        return this.targetTemp;
    }
    public setTargetTemp(temp: number, setter: WebSocket) {
        if (temp !== this.TargetTemp) {
            this.targetTemp = temp;
            this.sendTemp();
            Notify(SystemName, this.id, "TargetTemp", setter);
        }
    }

    get Heating(): boolean {
        return this.heating;
    }
    public setHeating(heating: boolean, setter: WebSocket) {
        if (heating !== this.heating) {
            this.heating = heating;
            this.sendTemp();
            Notify(SystemName, this.id, "Heating", setter);
        }
    }

    get DisplayName(): string {
        return this.displayName;
    }
    public setDisplayName(displayName: string, setter: WebSocket) {
        if (displayName !== this.displayName) {
            this.displayName = displayName;
            Notify(SystemName, this.id, "DisplayName", setter);
        }
    }

    get CurrentTemp(): number {
        return this.currentTemp;
    }

    get ID(): number {
        return this.id;
    }

    private sendTemp() {
        const temp = (this.heating) ? this.targetTemp : -300.0;

        if (this.heatbed) {
            Printer.SendLine("M140 S" + temp);
        } else {
            Printer.SendLine("M104 S" + temp);
        }
    }

    private updateTemp(temp: number) {
        if (temp !== this.currentTemp) {
            this.currentTemp = temp;
            Notify(SystemName, this.id, "CurrentTemp", null);
        }
    }
}
