import * as Files from "./files";
import * as Printer from "./printer";
import * as Wifi from "./wifi";

type HandlerFunction = (data: any, client: WebSocket) => any;

const handlerFunctions: any = {
    GetTargetTemp: (data: any, client: WebSocket) => {
        if (typeof data.id !== "number") {
            throw new Error("HandleGetTargetTemp-Error: no id");
        }

        try {
            return Printer.getHeater(data.id).TargetTemp;
        } catch (e) {
            throw new Error("HandleGetTargetTemp-Error: " + e.message);
        }
    },

    SetTargetTemp: (data: any, client: WebSocket) => {
        if (typeof data.id !== "number") {
            throw new Error("HandleSetTargetTemp-Error: no id");
        }

        if (typeof data.temp !== "number") {
            throw new Error("HandleSetTargetTemp-Error: no temp");
        }

        try {
            Printer.getHeater(data.id).setTargetTemp(data.temp, client);
        } catch (e) {
            throw new Error("HandleSetTargetTemp-Error: " + e.message);
        }
    },

    GetHeaters: (data: any, client: WebSocket) => {
        return Printer.getHeaterList();
    },

    GetHeater: (data: any, client: WebSocket) => {
        if (typeof data.id !== "number") {
            throw new Error("HandleGetHeater-Error: no id");
        }

        try {
            const h = Printer.getHeater(data.id);
            return {
                current: h.CurrentTemp,
                displayName: h.DisplayName,
                isOn: h.Heating,
                target: h.TargetTemp,
            };
        } catch (e) {
            throw new Error("HandleGetHeater-Error: " + e.message);
        }
    },

    SetHeating: (data: any, client: WebSocket) => {
        if (typeof data.id !== "number") {
            throw new Error("HandleSetHeating-Error: no id");
        }

        if (typeof data.heating !== "boolean") {
            throw new Error("HandleSetHeating-Error: no heating");
        }

        try {
            Printer.getHeater(data.id).setHeating(data.heating, client);
        } catch (e) {
            throw new Error("HandleGetHeater-Error: " + e.message);
        }
    },

    GetHeating: (data: any, client: WebSocket) => {
        if (typeof data.id !== "number") {
            throw new Error("HandleGetHeating-Error: no id");
        }

        try {
            return Printer.getHeater(data.id).Heating;
        } catch (e) {
            throw new Error("HandleGetHeater-Error: " + e.message);
        }
    },

    GetCurrentTemp: (data: any, client: WebSocket) => {
        if (typeof data.id !== "number") {
            throw new Error("HandleGetCurrentTemp-Error: no id");
        }

        try {
            return Printer.getHeater(data.id).currentTemp;
        } catch (e) {
            throw new Error("HandleGetHeater-Error: " + e.message);
        }
    },

    ScanWifi: (data: any, client: WebSocket) => {
        try {
            Wifi.scanWifi();
        } catch (e) {
            throw new Error("ScanWifi-Error: " + e.message);
        }
    },

    GetSSIDS: (data: any, client: WebSocket) => {
        try {
            return Wifi.getSSIDS();
        } catch (e) {
            throw new Error("GetSSIDS-Error: " + e.message);
        }
    },

    GetConnectedSSID: (data: any, client: WebSocket) => {
        try {
            return Wifi.getConnectedSSID();
        } catch (e) {
            throw new Error("GetConnectedSSID-Error: " + e.message);
        }
    },

    GetConnectionState: (data: any, client: WebSocket) => {
        try {
            return Wifi.getConnectedSSID();
        } catch (e) {
            throw new Error("GetConnectedSSID-Error: " + e.message);
        }
    },

    ConnectSSID: (data: any, client: WebSocket) => {
        try {
            Wifi.connectSSID(data.ssid);
        } catch (e) {
            throw new Error("ConnectSSID-Error: " + e.message);
        }
    },

    DisconnectWifi: (data: any, client: WebSocket) => {
        try {
            Wifi.disconnect();
        } catch (e) {
            throw new Error("DisconnectWifi-Error: " + e.message);
        }
    },

    SetHosting: (data: any, client: WebSocket) => {
        try {
            Wifi.connectSSID(data.ssid);
        } catch (e) {
            throw new Error("ConnectSSID: " + e.message);
        }
    },

    MoveAxis: (data: any, client: WebSocket) => {
        try {
            Printer.moveAxis(data.distance, data.speed, data.forward, data.axis);
        } catch (e) {
            throw new Error("MoveAxis-Error: " + e.message);
        }
    },

    GetFiles: (data: any, client: WebSocket) => {
        try {
            return Files.listFiles();
        } catch (e) {
            throw new Error("GetFiles-Error: " + e.message);
        }
    },

    PrintFile: (data: any, client: WebSocket) => {
        try {
            return Printer.printFile(data.path);
        } catch (e) {
            throw new Error("PrintFile: " + e.message);
        }
    },

    DeleteFile: (data: any, client: WebSocket) => {
        try {
            return Files.deleteFile(data.path);
        } catch (e) {
            throw new Error("GetFiles-Error: " + e.message);
        }
    },

    GetPrinterStatus: (data: any, client: WebSocket) => {
        return Printer.getStatus();
    },
};

import * as WebSocket from "uws";

export function HandleRequest(message: string, client: WebSocket): string {
    let id;
    try {
        const req = JSON.parse(message);
        id = req.id;

        if (req.request instanceof String) {
            throw new Error("HandleRequest: no request");
        }

        if (typeof(req.id) !== "number") {
            throw new Error("HandleRequest: no id");
        }

        let resp = handlerFunctions[req.request](req.data, client);
        if (resp === undefined) {
            resp = null;
        }

        return JSON.stringify({
            id: req.id,
            request: req.request,
            response: resp,
            status: "success",
        });
    } catch (e) {
        return JSON.stringify({
            error: e.message,
            id,
            status: "error",
        });
    }
}
