#include <node.h>
#include <uv.h>

#include <iostream>
#include <fstream>
#include <cmath>
#include <cstring>
#include <cstdlib>
#include <queue>

#include <stdio.h>
#include <fcntl.h>
#include <termios.h>
#include <unistd.h>
#include <errno.h>

static volatile int fd = -1;

struct SentLine {
	int num;
	char* line;
	size_t len;
};

static std::queue<SentLine> sentQueue;
//static volatile int sentLines = 0;
//static const int maxSentLines = 15;

static uv_thread_t readThread;
static v8::Persistent<v8::Function> serialCb;
static uv_async_t serialReport;

struct Msg
{
	const char *type;
	void *data;
	char dataType;
};

static std::queue<Msg> serialMsgs;

static int contains(const char* str, char c, int *idx) {
	for (int i = 0; i < (int)strlen(str); i++) {
		if (str[i] == c) {
			*idx = i;
			return true;
		}
	}

	*idx = -1;
	return false;
}

static int contains(const char* str, const char* sub, int *idx) {
	if (contains(str, sub[0], idx)) {
		if (strncmp(&(str[*idx]), sub, strlen(sub)) == 0)
			return true;
	}

	*idx = -1;
	return false;
}

static char* formatLine(const char* line, const int lineNum, const size_t len) {
	char num[8];
	sprintf(num, "N%d", lineNum);
	const size_t numLen = strlen(num);

	char* moded = (char*)malloc(len + numLen + 7);

	strncpy(moded, num, numLen);
	moded[numLen] = ' ';
    strncpy(&(moded[numLen + 1]), line, len);
	const size_t tailStart = numLen + 1 + len;

	const char* tail = " *";
	strncpy(&(moded[tailStart]), tail, 2);
	// Calculate checksum
	int cs = 0;
	for(int i = 0; moded[i] != '*'; i++)
   		cs = cs ^ moded[i];
	cs &= 0xff;  // Defensive programming...

	char check[4];
	sprintf(check, "%d", cs);
	const size_t checkLen = strlen(check);
	strncpy(&(moded[tailStart + 2]), check, checkLen);

	const size_t totalLen = tailStart + 2 + checkLen;
    moded[totalLen] = '\0';

	return moded;
}

static void ProcessResponse(const char* resp) {
	// TODO: Check for rs

	if (strcmp(resp, "") == 0)
		return;

	int idx;

	if (contains(resp, "ok", &idx)) {
		if (contains(resp, "T:B:", &idx)) {
			float *temp = new float;
			*temp = strtof(&(resp[idx + 4]), NULL);

			Msg msg = {"alltemp", temp, 'f'};
			serialMsgs.push(msg);
			uv_async_send(&serialReport);

		} else if (contains(resp, "T:", &idx)) {
			float *temp = new float;
			*temp = strtof(&(resp[idx + 2]), NULL);

			Msg msg = {"etemp", temp, 'f'};
			serialMsgs.push(msg);
			uv_async_send(&serialReport);

			if (contains(resp, "B:", &idx)) {
				float *temp = new float;
				*temp = strtof(&(resp[idx + 2]), NULL);

				Msg msg = {"btemp", temp, 'f'};
				serialMsgs.push(msg);
				uv_async_send(&serialReport);
			}
		}

		if (!sentQueue.empty()) {
			SentLine& topLine = sentQueue.front();
			free(topLine.line);
			//sentLines--;
			sentQueue.pop();
		}
	} else if (contains(resp, "rs", &idx)) {
		int ln = strtol(&(resp[idx + 3]), NULL, 10);

		std::cout << "Resend " << ln << std::endl;
		SentLine topLine = {-1, NULL, 0};

		if (!sentQueue.empty())
			topLine = sentQueue.front();

		if (topLine.num != ln) {
			std::cout << "Resend number mismatch, sending bs" << std::endl;

			char* buf = formatLine("M105", ln, 4);
			size_t len = strlen(buf);
			buf[len] = '\n';
			write(fd, buf, len);
			free(buf);
		} else {
			write(fd, topLine.line, topLine.len);
		}
	} else if (contains(resp, "!!", &idx)) {
		Msg msg = {"harderror", NULL, 'n'};
		serialMsgs.push(msg);
		uv_async_send(&serialReport);
		
		close(fd);
    	fd = -1;
	} else {
		char *buf = (char*)malloc(strlen(resp) + 1);
		memcpy(buf, buf, strlen(resp) + 1);

		Msg msg = {"unknown", buf, 's'};
		serialMsgs.push(msg);
		uv_async_send(&serialReport);

		std::cout << "serial: " << resp;
	}
}

static void ReadSerial(void* dat)
{
    char buf[150];

    while (fd != -1) {
		int bytes_read = read(fd, buf, 149);

        if (bytes_read > 0) {
			buf[bytes_read] = '\0';
			ProcessResponse(buf);
		}
    }

    std::cout << "Reader closed" << std::endl;
}

static void reportSerial(uv_async_t* handle) {
    v8::Isolate * isolate = v8::Isolate::GetCurrent();
    v8::HandleScope handleScope(isolate);

    v8::Local<v8::Function> cb = v8::Local<v8::Function>::New(isolate, serialCb);

	while (serialMsgs.size() > 0) {
		Msg &msg = serialMsgs.front();

		v8::Local<v8::Value> argv[2];
		argv[0] = v8::String::NewFromUtf8(isolate, msg.type);
		
		switch (msg.dataType) {
			case 'f':
				argv[1] = v8::Number::New(isolate, (double)(*(float*)msg.data));
				break;
			case 's':
				argv[1] = v8::String::NewFromUtf8(isolate, (char*)msg.data);
				break;
		}
		
    	cb->Call(v8::Null(isolate), 2, argv);

		free(msg.data);
		serialMsgs.pop();
	} 
}

static void OpenPort(const v8::FunctionCallbackInfo<v8::Value>& args) {
    if (fd != -1) {
        return;
    }

	v8::Isolate* isolate = args.GetIsolate();
	v8::String::Utf8Value param1(args[0]->ToString());

	auto cb = v8::Local<v8::Function>::Cast(args[1]);
	serialCb.Reset(isolate, cb);
	uv_async_init(uv_default_loop(), &serialReport, reportSerial);

	fd = open(*param1, O_RDWR | O_NOCTTY | O_SYNC);

	if (fd == -1) {
		std::cout << "Could not open serial" << std::endl;
		
		args.GetReturnValue().Set(v8::Number::New(isolate, static_cast<double>(-1)));
	} else {
		termios options;
		tcgetattr(fd, &options);

		cfsetispeed(&options,B115200);
		cfsetospeed(&options,B115200);

		/*cfmakeraw(&options);
		options.c_cflag |= (CLOCAL | CREAD);
		options.c_cflag &= ~CSIZE;
		options.c_cflag |= CS8;
		options.c_cflag &= ~PARENB;
		options.c_cflag &= ~CSTOPB;
		options.c_cflag &= ~CRTSCTS;

		options.c_iflag &= ~(IGNBRK | BRKINT | PARMRK | ISTRIP | INLCR | IGNCR | ICRNL);
		options.c_iflag |= (IXON | IXOFF | IXANY);
		options.c_lflag &= ~(ECHO | ECHONL | ISIG | IEXTEN | ICANON);*/
		//options.c_lflag |= ICANON;
		options.c_cflag &= ~(PARENB | CSTOPB | CSIZE | CRTSCTS);
		options.c_cflag |= (CREAD | CLOCAL | CS8) ;
		options.c_iflag |= (IXON | IXOFF | IXANY);
		options.c_lflag &= ~(ECHO | ECHOE | ISIG);
		options.c_lflag |= ICANON;
		options.c_oflag &= ~OPOST;

		//options.c_cc[VMIN] = 1;
		//options.c_cc[VTIME] = 1;
        
		tcflush(fd, TCIOFLUSH);
		tcsetattr(fd,TCSANOW,&options);

        uv_thread_create(&readThread, ReadSerial, NULL);

        std::cout << "Opened: " << fd << std::endl;
	}
}

static void ClosePort(const v8::FunctionCallbackInfo<v8::Value>& args) {
	close(fd);
    fd = -1;

    std::cout << "Closed" << std::endl;
}

static bool setLineNum = false;
static int curLineNum = 0;
static const int maxLineNum = 100000;

static void resetLineNum() {
	if (fd != -1) {
		const char* reset = "M110 N0\n";
		write(fd, reset, strlen(reset));
	}
}

static void writeLine(const char* line, size_t len) {
    if (fd != -1) {
		if (!setLineNum) {
			resetLineNum();
			setLineNum = true;
		} else if (curLineNum > maxLineNum) {
			resetLineNum();
			curLineNum = 0;
		}

		/*int slept = 0;
		while (fd != -1 && sentLines >= maxSentLines) {
			if (slept <= 100) {
				usleep(500);
				slept++;
			} else {
				sleep(1);
				std::cout << "maxlines" << std::endl;
			}
		}
		
		std::cout << "lines: " << sentLines << std::endl;*/

		char *moded = formatLine(line, curLineNum, len);
		//std::cout << "wrote: " << moded << std::endl;

		size_t totalLen = strlen(moded);
		moded[totalLen] = '\0';
        write(fd, moded, totalLen + 1);

		SentLine sl = {curLineNum, moded, (totalLen + 1)};
		sentQueue.push(sl);
		//sentLines++;
		curLineNum++;
    }
}

static volatile bool printing = false;
static volatile bool paused = false;
static v8::Persistent<v8::Function> fileCb;
static std::string filePath;
static volatile double elapsedTime = 0.0;
static volatile bool needTemp = false;

static void SendLine(const v8::FunctionCallbackInfo<v8::Value>& args) {
	v8::Isolate* isolate = args.GetIsolate();

	if (fd == -1) {
		isolate->ThrowException(v8::Exception::TypeError(
			v8::String::NewFromUtf8(isolate, "Port not open")
		));
		return;
	}

    v8::String::Utf8Value param1(args[0]->ToString());
	const char *line = *param1;
	writeLine(line, strlen(line));
}

static void asyncProg(uv_async_t* handle) {
    v8::Isolate * isolate = v8::Isolate::GetCurrent();
    v8::HandleScope handleScope(isolate);

    v8::Local<v8::Function> cb = v8::Local<v8::Function>::New(isolate, fileCb);
    v8::Local<v8::Value> argv[] = {
        v8::String::NewFromUtf8(isolate, "time"),
        v8::Number::New(isolate, static_cast<double>(elapsedTime))
    };
    cb->Call(v8::Null(isolate), 2, argv);
}

static uv_async_t progAsync;

static void SendFileWork(uv_work_t *req)
{   
    std::ifstream inFile(filePath);

	char lineBuf[150];
	while(inFile.getline(lineBuf, 150) && printing && fd != -1) {
		if (paused) {
			sleep(1);
		} else {
			uint8_t sepIdx = 0;
			bool running = true;
			while (running && sepIdx < 149) {
				char b = lineBuf[sepIdx];
				if (b == ';' || b == '\0') {
					running = false;
				} else {
					sepIdx++;
				}
			}

			// Request a temp if needed
			if (needTemp) {
				const char* code = "M105";
				writeLine(code, strlen(code));
				needTemp = false;
			}

			writeLine(lineBuf, sepIdx);

            double lt = strtod(&(lineBuf[sepIdx + 1]), NULL);
            elapsedTime += lt;
            uv_async_send(&progAsync);
		}
	}

	inFile.close();
    printing = false;
}

static void SendFileComplete(uv_work_t *req,int status) {
    v8::Isolate * isolate = v8::Isolate::GetCurrent();
    v8::HandleScope handleScope(isolate);

    v8::Local<v8::Function> cb = v8::Local<v8::Function>::New(isolate, fileCb);
    v8::Local<v8::Value> argv[1] = { v8::String::NewFromUtf8(isolate, "done") };
    cb->Call(v8::Null(isolate), 1, argv);

    // Free up the persistent function callback
    //fileCb.Reset();
}

static uv_work_t workData;

static void SendFile(const v8::FunctionCallbackInfo<v8::Value>& args) {
	v8::Isolate* isolate = args.GetIsolate();

	if (printing) {
		/*isolate->ThrowException(v8::Exception::TypeError(
			v8::String::NewFromUtf8(isolate, "Already sending a file")
		));*/
		std::cout << "Already priting" << std::endl;
		return;
	}

	v8::String::Utf8Value param1(args[0]->ToString());
	auto cb = v8::Local<v8::Function>::Cast(args[1]);
    fileCb.Reset(isolate, cb);

    filePath = std::string(*param1);

	auto loop = uv_default_loop();
    uv_async_init(loop, &progAsync, asyncProg);
    uv_queue_work(loop, &workData, SendFileWork, SendFileComplete);

	printing = true;
	paused = false;
    elapsedTime = 0.0;
}

static void RequestTemp(const v8::FunctionCallbackInfo<v8::Value>& args) {
	if (printing) {
		needTemp = true;
	} else if (fd != -1) {
		const char* code = "M105";
		writeLine(code, strlen(code));
	}
}

static void StopPrint(const v8::FunctionCallbackInfo<v8::Value>& args) {
    printing = false;
}

static void PausePrint(const v8::FunctionCallbackInfo<v8::Value>& args) {
    paused = true;
}

static void ResumePrint(const v8::FunctionCallbackInfo<v8::Value>& args) {
    paused = false;
}

static void Initialize(v8::Local<v8::Object> exports) {
	NODE_SET_METHOD(exports, "OpenPort", OpenPort);
	NODE_SET_METHOD(exports, "ClosePort", ClosePort);
	NODE_SET_METHOD(exports, "SendFile", SendFile);
	NODE_SET_METHOD(exports, "SendLine", SendLine);
    NODE_SET_METHOD(exports, "StopPrint", StopPrint);
	NODE_SET_METHOD(exports, "RequestTemp", RequestTemp);
	NODE_SET_METHOD(exports, "PausePrint", PausePrint);
	NODE_SET_METHOD(exports, "ResumePrint", ResumePrint);
}

NODE_MODULE(module_name, Initialize)