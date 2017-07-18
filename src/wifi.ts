import * as ConnMan from "connman-node-api";
import * as WebSocket from "uws";
import { Notify } from "./notify";

const ssids: string[] = [];

const connman = new ConnMan();
connman.init((err) => {
    if (err instanceof Error) {
        console.log(err.message);
    }
});

export function getSSIDS() {
    return ssids;
}

export function scanWifi() {
    console.log("Called for scan");

    ssids.push("BS newtork");
    ssids.push("Random");
}

let connectedSSID = "";

export function connectSSID(ssid: string) {
    // TODO

    if (ssid === connectedSSID) {
        return;
    }

    if (ssids.indexOf(ssid) < 0) {
        throw new Error("SSID not available");
    }

    connectedSSID = ssid;
    Notify("Wifi", 0, "ConnectedSSID", null);
}

export function getConnectedSSID() {
    // TODO

    return connectedSSID;
}

let conState = "inactive";
export function getConnectionState() {
    return conState;
}

export function disconnect() {
    // TODO
}

let Hosting = false;
let HostingSSID = "";
let HostingPWD = "";

export function getHosting() {
    return Hosting;
}

export function setHosting(hosting: boolean, ssid: string, passphrase: string,
                           client: WebSocket) {
    // TODO
    /*Hosting = hosting;
    HostingSSID = ssid;
    HostingPWD = passphrase;

    if (hosting) {
        conState = "hosting";
    } else {
        conState = "inactive";
    }

    console.log("Constate now: " + conState);
    Notify("Wifi", 0, "ConnectionState", null);*/

    if (hosting !== Hosting) {
        Hosting = hosting;
        HostingSSID = ssid;
        HostingPWD = passphrase;
    }

    Notify("Wifi", 0, "Hosting", client);
}
