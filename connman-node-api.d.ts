declare module "connman-node-api" {
    class ConnMan {
        constructor(enableAgent: any);
        constructor();
        init: (callback: (err: Error | undefined) => void) => void;
        technologies: ConnMan.TechDict;
        Agent: ConnMan.Agent;
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
        }

        interface Agent extends EventEmitter {}

        interface Technology {
            scan: (callback: () => void) => void;
            listAccessPoints: (callback: (err: Error, list: AccessPoint[]) => void) => void;
            findAccessPoint: (ssid: string, callback: (err: string, service: Service) => void) => void;
        }
    }
    export = ConnMan;
}