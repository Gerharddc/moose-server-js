declare module "connman-node-api" {
    class ConnMan {
        constructor(enableAgent: any);
        constructor();
        init: (callback: (err: Error | undefined) => void) => void;
        technologies: ConnMan.TechDict;
        Agent: ConnMan.Agent;
        getService: (serviceName: string, callback: (err: string, ser: ConnMan.Service) => void) => void;
        getServices: (type: string, callback: (err: string, services: ConnMan.ServiceDataDict) => void) => void;
        Wifi: ConnMan.Wifi;
    }

    import * as EventEmitter from "events";

    namespace ConnMan {
        interface TechDict {
            [index: string]: Technology;
        }

        interface AccessPoint {
            Name: string;
            Strength: string;
            Security: string;
        }

        interface Service extends EventEmitter {
            connect: (callback: (err: string, agent: Agent) => void) => void;
            disconnect: (callback: () => void) => void;
        }

        interface ServiceData {
            Name: string;
            serviceName: string;
            Security: string;
            State: string;
        }

        interface ServiceDataDict {
            [index: string]: ServiceData;
        }

        interface Agent extends EventEmitter {}

        interface Technology extends EventEmitter {
            scan: (callback: () => void) => void;
            listAccessPoints: (callback: (err: Error, list: AccessPoint[]) => void) => void;
            findAccessPoint: (ssid: string, callback: (err: string, service: Service) => void) => void;
            enableTethering: (ssid: string, pwd: string, callback: (err: string) => void) => void;
            disableTethering: (callback: (err: string, res: string) => void) => void;
            setProperty: (name: string, value: any, callback: () => void) => void;
            getServices: (callback: (err: string, services: ServiceDataDict) => void) => void;
            getProperties: (callback: (err: string, props: any) => void) => void;
        }

        interface Wifi {
            disconnect: (callback: () => void) => void;
        }
    }
    export = ConnMan;
}