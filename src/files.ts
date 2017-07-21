import * as fs from "fs";
import { Notify } from "./notify";

export const rootPath = "/home/printer/";

export function listFiles(): string[] {
    const files: string[] = [];
    fs.readdirSync(rootPath).forEach((file) => {
        files.push(file);
    });

    return files;
}

export function saveUploadedFile(file: Express.File) {
    file.mv(rootPath + file.name, (err) => {
        if (err) {
            throw new Error(err);
        }

        Notify("Printer", 0, "Files", null);
    });
}

export function deleteFile(path: string) {
    // TODO: secure
    fs.unlink(rootPath + path, (err) => {
        if (err) {
            console.log("Error deleting file: " + err);
        } else {
            console.log("Deleted file: " + path);
        }

        Notify("Printer", 0, "Files", null);
    });
}
