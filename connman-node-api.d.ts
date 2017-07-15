declare module "connman-node-api" {
    class ConnMan {
        constructor(enableAgent: any);
        constructor();
        init: (callback: (err: Error | undefined) => void) => void;
    }

    namespace ConnMan {}
    export = ConnMan;
}