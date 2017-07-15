import * as ConnMan from "connman-node-api";

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
}

export function connectSSID(ssid: string) {
    // TODO
}
