import * as EventEmitter from "events";
import * as LineByLineReader from "line-by-line";
import * as SerialPort from "serialport";
import { rootPath } from "./files";

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
            sendLine(msg.line, msg.promise, msg.reject, true);
            break;
        case "resetLineNum":
            resetLineNum();
            break;
        case "checkRoomForLines":
            checkRoomForLines();
            break;
        case "sendFile":
            sendFile(msg.filePath);
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

export function sendCode(code: string) {
    if (port === null) {
        throw new Error("Printer serial port not open for reading");
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

function checkRoomForLines() {
    if (process.send) {
        process.send({
            roomForLines: sentLines < maxSentLines,
            type: "roomForLines",
        });
    }
}

type CallBack = (msg: string) => void;

// Synchronously sends line
function sendLine(line: string, resolve?: CallBack | undefined,
                  reject?: CallBack | undefined, externalResolve = false) {
    if (port === null) {
        throw new Error("Printer serial port not open for writing");
    }

    // Remove comments
    line = line.split(";")[0];
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
    checkRoomForLines();
}

async function sendLineAsync(line: string) {
    return new Promise((resolve, reject) => {
        sendLine(line, resolve, reject);
    });
}

let watingForTemp = false;
setInterval(async () => {
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
}, 1000);

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
    }
}

function sendFile(filePath: string) {
    const lineReader = new LineByLineReader(rootPath + filePath);

    lineReader.on("line", (line) => {
        if (printFlow.Paused || printFlow.Stopped) {
            return;
        }

        lineReader.pause();

        const res = sendLineAsync(line);
        if (res instanceof Promise) {
            res.then((m) => lineReader.resume());
        } else {
            lineReader.resume();
        }
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

checkRoomForLines();
