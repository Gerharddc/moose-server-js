declare module "express-fileupload";

declare namespace Express {
    interface fileUpload {
        // Add fileUpload's properties in here
    }

    interface File {
        mv: (path: string, callback: (error: string) => void) => void,
        name: string
    }

    interface FileDict {
        [index: string]: File[];
    }

    export interface Request {
        files: FileDict
    }
}