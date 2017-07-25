import * as async from "async";
import * as ConnMan from "connman-node-api";
import * as WebSocket from "ws";
import { Notify, NotifyError } from "./notify";

class SSID {
    public Name: string;
    public Secured: boolean;
}

const ssids: SSID[] = [];

let connected = false;
let connectedSSID: SSID | null = null;
let connectingSSID: SSID | null = null;
let connectingPassword = "";
let connectedService: ConnMan.Service | null = null;

let Hosting = false;
let HostingSSID = "MooseNet";
let HostingPWD = "MoosePass";

const connman = new ConnMan(true);
let wifi: ConnMan.Technology | null = null;
connman.init((err) => {
    if (err instanceof Error) {
        console.log(err.message);
        return;
    }

    // tslint:disable-next-line:no-string-literal
    wifi = connman.technologies["WiFi"];

    if (!wifi) {
        console.log("Could not get wifi technology");
    } else {
        // Ensure the wifi is on
        wifi.setProperty("Powered", true, () => {
            console.log("Enabled wifi");
        });

        wifi.on("PropertyChanged", (name, value) => {
            console.log("Tech prop change: " + name + "=" + value);

            if (name === "Connected" && value === false) {
                notifyDisConnected();
            }
            if (name === "Tethering") {
                Hosting = value;
                Notify("Wifi", 0, "Hosting", null);
            }
        });

        wifi.getProperties((error, props) => {
            if (error) {
                console.log("Get wifi props error: " + error);
                return;
            }

            if (props.hasOwnProperty("Connected")) {
                connected = props.Connected;
            }

            if (props.hasOwnProperty("Tethering")) {
                Hosting = props.Tethering;

                if (props.hasOwnProperty("TetheringIdentifier")) {
                    HostingSSID = props.TetheringIdentifier;
                }
                if (props.hasOwnProperty("TetheringPassphrase")) {
                    HostingPWD = props.TetheringPassphrase;
                }
            }

            if (!wifi) {
                return;
            }

            if (connected) {
                // Find the connected service
                wifi.getServices((err2, services) => {
                    for (const serviceName in services) {
                        if (services[serviceName].State === "ready") {
                            connman.getService(serviceName, (err3, ser) => {
                                if (err3) {
                                    console.log("Getservice-error: " + err3);
                                    NotifyError("Connection error: " + err3);
                                } else {
                                    connectedService = ser;
                                    const ap = services[serviceName];
                                    connectingSSID = {
                                        Name: ap.Name,
                                        Secured: ap.Security !== "none",
                                    };
                                    connectedSSID = connectingSSID;
                                }
                            });
                            notifyConnected();
                            setTimeout(() => scanWifi(), 500);
                            return;
                        }
                    }

                    NotifyError("Could not identify acces point connected to");
                });
            } else {
                // Scan for availale networks and start hosting if we could
                async.series([
                    (next) => {
                        if (Hosting) {
                            console.log("Stopping hosting for scan");
                            stopHosting();
                            setTimeout(next, 500);
                        } else {
                            next();
                        }
                    },
                    (next) => {
                        console.log("Scanning");
                        scanWifi();
                        setTimeout(next, 2000);
                    },
                    (next) => {
                        console.log("Starting hosting again");
                        startHosting(HostingSSID, HostingPWD, null);
                    },
                ]);
            }
        });
    }

    if (connman.Agent) {
        connman.Agent.on("Release", () => {
            console.log("Connman agent release");
        });

        connman.Agent.on("ReportError", (path, error) => {
            console.log("Connaman agent ReportError:");
            console.log(error);
        });

        connman.Agent.on("RequestBrowser", (path, url) => {
            console.log("Connman agent RequestBrowser");
        });

        connman.Agent.on("RequestInput", (path, dict, callback) => {
            console.log("Connman agent RequestInput: ");
            console.log(dict);

            if ("Passphrase" in dict) {
                callback({ Passphrase: connectingPassword });
            }
        });

        connman.Agent.on("Cancel", () => {
            console.log("Connman agent canceled");
        });
    } else {
        console.log("Error: agent unavailable");
    }
});

export function getSSIDS() {
    return ssids;
}

export function scanWifi(callback: (() => void) | null = null) {
    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    console.log("Scanning...");
    wifi.scan(() => {
        // Getting list of access points
        wifi!.listAccessPoints((err, list) => {
            console.log("Got " + list.length + " Access Point(s)");

            ssids.length = 0;
            for (const ap of list) {
                ssids.push({
                    Name: ap.Name,
                    Secured: ap.Security !== "none",
                });
            }

            Notify("Wifi", 0, "SSIDS", null);

            if (callback) {
                callback();
            }
        });
    });
}

function notifyDisConnected() {
    connected = false;
    connectedSSID = null;
    Notify("Wifi", 0, "ConnectedSSID", null);
    Notify("Wifi", 0, "Connected", null);
}

function notifyConnected() {
    if (connectedService) {
        connectedService.removeListener("PropertyChanged", handleServiceChange);
    }

    connected = true;
    connectedSSID = connectingSSID;
    Notify("Wifi", 0, "ConnectedSSID", null);
    Notify("Wifi", 0, "Connected", null);
}

function handleServiceChange(name: any, value: any) {
    console.log("Wifi service: " + name + " = " + value);
    if (name === "State") {
        switch (value) {
            case "failure":
                console.log("Connection failed");
                NotifyError("Connection failed");
                notifyDisConnected();
                break;
            case "association":
                console.log("Associating ...");
                break;
            case "configuration":
                console.log("Configuring ...");
                break;
            case "online":
                console.log("Online...");
            case "ready":
                console.log("Connected");
                notifyConnected();
                break;
        }
    }
}

export function connectSSID(ssid: SSID, password: string) {
    if (ssid === connectedSSID) {
        return;
    }

    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    connectingPassword = password;

    const connectToService = (service: ConnMan.Service) => {
        if (!service) {
            NotifyError("No such access point");
            return;
        }

        if (!service.connect) {
            NotifyError("Service is not connectable");
            return;
        }

        connectedService = service;
        connectingSSID = ssid;

        service.on("PropertyChanged", handleServiceChange);

        service.connect((error, agent) => {
            if (error) {
                console.log("Wifi connect error: " + error);
                NotifyError("Connection error: " + error);
                notifyDisConnected();
            }
        });
    };

    const doConnect = () => {
        if (!wifi) {
            return;
        }

        wifi.getServices((err, services) => {
            for (const serviceName in services) {
                if (services[serviceName].Name === ssid.Name) {
                    connman.getService(serviceName, (err2, ser) => {
                        if (err2) {
                            console.log("Getservice-error: " + err2);
                            NotifyError("Connection error: " + err2);
                        } else {
                            connectToService(ser);

                            setTimeout(() => scanWifi(), 500);
                        }
                    });
                    return;
                }
            }

            NotifyError("No such access point");
        });
    };

    if (Hosting) {
        async.series([
            (next) => {
                console.log("Stopping hosting for connecting");
                stopHosting();
                setTimeout(next, 500);
            },
            (next) => {
                console.log("Scanning before connect");
                scanWifi();
                setTimeout(next, 1000);
            },
            (next) => {
                console.log("Trying to connect");
                doConnect();
                setTimeout(next, 1000);
            },
            (next) => {
                if (connected) {
                    console.log("Connection successful");
                } else {
                    console.log("Connection unsuccessful, restarting host");
                    startHosting(HostingSSID, HostingPWD);
                }
            },
        ]);
    } else {
        doConnect();
    }
}

export function getConnectedSSID() {
    return connectedSSID;
}

export function getConnected() {
    return connected;
}

export function disconnect() {
    if (connectedService) {
        connectedService.disconnect(() => {
            console.log("Requested disconnect");

            setTimeout(() => {
                console.log("Restarted host after disconnect");
                startHosting(HostingSSID, HostingPWD);
            }, 1000);
        });
    }
}

export function getHosting() {
    return Hosting;
}

export function getHostingSSID() {
    return HostingSSID;
}

export function getHostingPWD() {
    return HostingPWD;
}

export function startHosting(ssid: string, pwd: string, client?: WebSocket | null) {
    let changed = false;

    if (ssid !== HostingSSID) {
        HostingSSID = ssid;
        Notify("Wifi", 0, "HostingSSID", client);
    } else {
        changed = true;
    }

    if (pwd !== HostingPWD) {
        HostingPWD = pwd;
        Notify("Wifi", 0, "HostingPWD", client);
    } else {
        changed = true;
    }

    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    if (Hosting) {
        wifi.disableTethering((err, res) => {
            if (!err) {
                console.log("Tethering disabled");
            } else {
                console.log(err);
            }
        });
    }

    wifi.enableTethering(HostingSSID, HostingPWD, (err) => {
        if (!err) {
            console.log("Tethering enabled");
        } else {
            console.log(err);
        }
    });
}

export function stopHosting(client?: WebSocket | null) {
    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    wifi.disableTethering((err, res) => {
        if (!err) {
            console.log("Tethering disabled");
        } else {
            console.log(err);
        }
    });
}
