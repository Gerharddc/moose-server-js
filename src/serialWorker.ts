import * as EventEmitter from "events";
import * as LineByLineReader from "line-by-line";
import * as SerialPort from "serialport";
import { readyPath } from "./files";

class PrintFlow extends EventEmitter {
    private paused: boolean = false;
    private stopped: boolean = true;

    public pasuePrint() {
        this.paused = true;
        this.emit("pause");
    }

    public resumePrint() {
        this.paused = false;
        this.emit("resume");
    }

    public startPrint() {
        this.stopped = false;
        this.emit("start");
    }

    public stopPrint() {
        this.stopped = true;
        this.emit("stop");
    }

    get Paused(): boolean {
        return this.paused;
    }

    get Stopped(): boolean {
        return this.stopped;
    }
}

const printFlow = new PrintFlow();

process.on("message", (msg) => {
    switch (msg.action) {
        case "sendCode":
            sendCode(msg.code);
            break;
        case "sendLine":
            sendLine(msg.line, msg.resolve, msg.reject, true);
            break;
        case "resetLineNum":
            resetLineNum();
            break;
        case "sendFile":
            sendFile(msg.filePath, msg.fileTime);
            break;
        case "pauseFile":
            printFlow.pasuePrint();
            break;
        case "resumeFile":
            printFlow.resumePrint();
            break;
        case "stopFile":
            printFlow.stopPrint();
            break;
    }
});

let port: SerialPort | null = null;
try {
    port = new SerialPort("/dev/ttyS0", {
        baudRate: 57600,
        parser: SerialPort.parsers.readline("\r\n"),
    });

    port.on("error", (err) => {
        console.log("SerialPort-error: " + err);
    });

    port.on("open", () => console.log("Port open"));

    port.on("data", (data) => {
        handleSerialResponse(data);
    });
} catch (e) {
    console.log("SerialPort-error: " + e.message);
}

function reportError(error: string) {
    if (process.send) {
        process.send({
            error,
            type: "error",
        });
    }
}

export function sendCode(code: string) {
    if (port === null) {
        reportError("Printer serial port not open for reading");
        return;
    }

    port.write(code);
}

let curLineNum = 1;

export function resetLineNum(): void {
    sendCode("M110 N0");
    curLineNum = 0;
}

const sentLineMap = new Map();
let sentLines = 0;
const maxSentLines = 20;

function incrementLineNum() {
    // Wrap line numbers if needed
    curLineNum++;
    if (curLineNum > 100000) {
        resetLineNum();
    }
}

type CallBack = (msg?: string) => void;

const roomResolves: CallBack[] = [];

function waitForLinesRoom() {
    return new Promise((resolve, reject) => {
        if (sentLines < maxSentLines) {
            resolve();
        } else {
            roomResolves.push(resolve);
        }
    });
}

function resolveLinesRoom() {
    // TODO: make sure this works
    while (sentLines < maxSentLines && roomResolves.length > 0) {
        const resolve = roomResolves.shift();
        if (resolve) {
            resolve();
        }
    }
}

// Synchronously sends line
// it is assumed they don't have comments
function sendLine(line: string, resolve?: CallBack | undefined,
    reject?: CallBack | undefined, externalResolve = false) {
    if (port === null) {
        reportError("Printer serial port not open for writing");
        return;
    }

    line = "N" + curLineNum + " " + line + " *";

    // Add checksum
    let cs = 0;
    for (let i = 0; line[i] !== "*" && line[i] !== null; i++) {
        // tslint:disable-next-line:no-bitwise
        cs = cs ^ line.charCodeAt(i);
    }
    // tslint:disable-next-line:no-bitwise
    cs &= 0xff;
    line += cs;

    sendCode(line);

    sentLineMap.set(curLineNum, {
        externalResolve,
        line,
        reject,
        resolve,
    });

    sentLines++;
    incrementLineNum();
}

async function sendLineAsync(line: string) {
    return new Promise((resolve, reject) => {
        sendLine(line, resolve, reject);
    });
}

let watingForTemp = false;
/*setInterval(async () => {
    if (watingForTemp) {
        return;
    }

    watingForTemp = true;
    const resp = String(await sendLineAsync("M105"));
    const regex = /T:(\d+\.?\d+) B:(\d+\.?\d+)/;
    const extract = regex.exec(resp);

    let t: number | null = null;
    let b: number | null = null;
    if (extract && extract[1] && extract[2]) {
        t = Number.parseFloat(extract[1]);
        b = Number.parseFloat(extract[2]);
    }

    if (t && b) {
        if (process.send) {
            process.send({
                bedTemp: b,
                extTemp: t,
                type: "emitTemps",
            });
        }
    } else {
        console.log("Invalid temp response: " + resp);
    }

    watingForTemp = false;
}, 1000);*/

function handleSerialResponse(resp: string): void {
    if (resp.includes("rs")) {
        const ln = Number(resp.split(" "[1]));
        sendCode(String(sentLineMap.get(ln)));
    } else if (resp.includes("ok")) {
        const ln = Number(resp.split(" "[1]));
        sentLines--;
        const line = sentLineMap.get(ln);
        let resolve;
        let externalResolve;
        if (line) {
            resolve = line.resolve;
            externalResolve = line.externalResolve;
        }

        sentLineMap.delete(ln);
        if (resolve) {
            if (externalResolve && process.send) {
                process.send({
                    resolve,
                    resp,
                    type: "callResolve",
                });
            } else {
                resolve(resp);
            }
        }

        resolveLinesRoom();
    }
}

function reportTimeLeft(timeLeft: number) {
    if (process.send) {
        process.send({
            timeLeft,
            type: "timeLeft",
        });
    }
}

function sendFile(fileName: string, fileTime: number) {
    const lineReader = new LineByLineReader(readyPath + fileName);

    lineReader.on("line", async (line) => {
        if (printFlow.Paused || printFlow.Stopped) {
            return;
        }

        lineReader.pause();

        // Decode the line back to a gcode string
        const json = JSON.parse(line);
        if (json.blocks) {
            const blocks: Map<string, string> = new Map(json.blocks);

            let gcode = "";
            blocks.forEach((value, key) => {
                gcode += key + value;
            });

            await waitForLinesRoom();
            sendLineAsync(gcode);
        }

        if (json.time) {
            fileTime -= json.time;

            reportTimeLeft(fileTime);
        }

        lineReader.resume();
    });

    lineReader.on("error", (err) => {
        // TODO
        console.log("Linereader error: " + err);
    });

    lineReader.on("end", () => {
        if (process.send) {
            process.send({
                type: "notifyPrintDone",
            });
        }
    });

    printFlow.on("pause", () => {
        lineReader.pause();
    });

    printFlow.on("resume", () => {
        lineReader.resume();
    });

    printFlow.on("stop", () => {
        lineReader.pause();
        lineReader.close();
    });
}

console.log("Serial worker");
