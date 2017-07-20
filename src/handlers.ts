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
            return Printer.getHeater(data.id).CurrentTemp;
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

    GetConnected: (data: any, client: WebSocket) => {
        try {
            return Wifi.getConnected();
        } catch (e) {
            throw new Error("GetConnected-Error: " + e.message);
        }
    },

    GetConnectedSSID: (data: any, client: WebSocket) => {
        try {
            return Wifi.getConnectedSSID();
        } catch (e) {
            throw new Error("GetConnectedSSID-Error: " + e.message);
        }
    },

    ConnectSSID: (data: any, client: WebSocket) => {
        try {
            Wifi.connectSSID(data.ssid, data.pwd);
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

    GetHosting: (data: any, client: WebSocket) => {
        try {
            return Wifi.getHosting();
        } catch (e) {
            throw new Error("GetConnectedSSID-Error: " + e.message);
        }
    },

    GetHostingSSID: (data: any, client: WebSocket) => {
        try {
            return Wifi.getHostingSSID();
        } catch (e) {
            throw new Error("GetHostingSSID-Error: " + e.message);
        }
    },

    GetHostingPWD: (data: any, client: WebSocket) => {
        try {
            return Wifi.getHostingPWD();
        } catch (e) {
            throw new Error("GetHostingPWD-Error: " + e.message);
        }
    },

    StartHosting: (data: any, client: WebSocket) => {
        try {
            Wifi.startHosting(data.ssid, data.pwd, client);
        } catch (e) {
            throw new Error("StartHosting-Error: " + e.message);
        }
    },

    StopHosting: (data: any, client: WebSocket) => {
        try {
            Wifi.stopHosting(client);
        } catch (e) {
            throw new Error("StartHosting-Error: " + e.message);
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

    PausePrint: (data: any, client: WebSocket) => {
        try {
            return Printer.pauseFilePrint();
        } catch (e) {
            throw new Error("PausePrint-Error: " + e.message);
        }
    },

    ResumePrint: (data: any, client: WebSocket) => {
        try {
            return Printer.resumeFilePrint();
        } catch (e) {
            throw new Error("ResumePrint-Error: " + e.message);
        }
    },

    StopPrint: (data: any, client: WebSocket) => {
        try {
            return Printer.stopFilePrint();
        } catch (e) {
            throw new Error("StopPrint-Error: " + e.message);
        }
    },

    GetPrinting: (data: any, client: WebSocket) => {
        try {
            return Printer.getPrinting();
        } catch (e) {
            throw new Error("GetPrinting-Error: " + e.message);
        }
    },

    GetPaused: (data: any, client: WebSocket) => {
        try {
            return Printer.getPaused();
        } catch (e) {
            throw new Error("GetPaused-Error: " + e.message);
        }
    },

    GetProgress: (data: any, client: WebSocket) => {
        try {
            return Printer.getProgress();
        } catch (e) {
            throw new Error("GetProgress-Error: " + e.message);
        }
    },

    GetETA: (data: any, client: WebSocket) => {
        try {
            return Printer.getETA();
        } catch (e) {
            throw new Error("GetETA-Error: " + e.message);
        }
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

        if (typeof (req.id) !== "number") {
            throw new Error("HandleRequest: no id");
        }

        const func = handlerFunctions[req.request];
        let resp = null;
        if (func) {
            resp = func(req.data, client);
            if (resp === undefined) {
                resp = null;
            }
        } else {
            console.log("Unkown request: " + req.request);
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
