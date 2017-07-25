#include <node.h>
#include <iostream>
#include <fstream>
#include <sstream>
#include <cmath>

const int maxValue = 10;  
int numberOfCalls = 0;

struct Poses {
		float X = 0;
		float Y = 0;
		float Z = 0;
		float E = 0;
};

struct TempPoses {
		int G = -1;
		float F = -1;
		float X = -1;
		float Y = -1;
		float Z = -1;
		float E = 1;
};

void TimeFile(const v8::FunctionCallbackInfo<v8::Value>& args) {  
	v8::Isolate* isolate = args.GetIsolate();

	// Check arguments
  if (args.Length() < 3) {
    isolate->ThrowException(v8::Exception::TypeError(
    	v8::String::NewFromUtf8(isolate, "Wrong number of arguments")
		));
    return;
  }

	if (!args[0]->IsString() || !args[1]->IsString() || 
		!args[2]->IsFunction() /*|| !args[3]->IsFunction()*/) {
		isolate->ThrowException(v8::Exception::TypeError(
			v8::String::NewFromUtf8(isolate, "Wrong argument types")
		));
		return;
	}

	v8::String::Utf8Value param1(args[0]->ToString());
	v8::String::Utf8Value param2(args[1]->ToString());

	v8::Local<v8::Function> cb = v8::Local<v8::Function>::Cast(args[2]);
	//v8::Local<v8::Function> cb2 = v8::Local<v8::Function>::Cast(args[3]);

	std::ifstream inFile(*param1);
  std::ofstream outFile(*param2);

	//args.GetReturnValue().SetUndefined();
	
	inFile.seekg(0, std::ifstream::end);
  long max = inFile.tellg();
  inFile.seekg(0, std::ifstream::beg);

	Poses lastPoses = Poses();
  double fileTime = 0;

  float lastFs[2] = {0};

  bool goingRelative = false;
  int lastProg = -1;

	std::string line;
	while(std::getline(inFile, line)) {
		// Remove comment
		std::string tok;
		std::getline(std::stringstream(line), tok, ';');
		line = tok;

		if (line == "")
			continue;

		TempPoses temp;

		std::stringstream ss(line);
		while (std::getline(ss, tok, ' ')) {
			switch (tok[0]) {
				case 'X':
					temp.X = stof(tok.substr(1));
					break;
				case 'Y':
					temp.Y = stof(tok.substr(1));
					break;
				case 'Z':
					temp.Z = stof(tok.substr(1));
					break;
				case 'E':
					temp.E = stof(tok.substr(1));
					break;
				case 'G':
					temp.G = stoi(tok.substr(1));
					break;
				case 'F':
					temp.F = stof(tok.substr(1));
					break;
			}
		}

		double lineTime = 0;

		const int g = temp.G;
		if (g == 0 || g == 1) {
			if (temp.F > 0) {
				lastFs[g] = temp.F / 6000;
			}

			float dist = 0;

#define DOAXIS(A) \
			if (temp.A > 0) { \
				const float now = temp.A; \
				if (goingRelative) { \
					dist += pow(now, 2); \
					lastPoses.A += now; \
				} else { \
					dist += pow(now - lastPoses.A, 2); \
					lastPoses.A = now; \
				}\
			}

			DOAXIS(X);
			DOAXIS(Y);
			DOAXIS(Z);
			DOAXIS(E);

			dist = sqrt(dist);

			// Calculate the time in milliseconds
			lineTime = (dist / lastFs[g]) * 1.1;
			fileTime += lineTime;
		} else if (g == 90) {
			goingRelative = false;
		} else if (g== 91) {
			goingRelative = true;
		}

		int prog = round((float)inFile.tellg() / (float)max * 100.0);
		if (prog != lastProg) {
			lastProg = prog;

			v8::Local<v8::Value> argv[1] = {v8::Number::New(isolate, static_cast<double>(prog))};
			cb->Call(v8::Null(isolate), 1, argv);
		}

		outFile << line + ";" <<  lineTime << std::endl;
	}

	inFile.close();
	outFile.close();

	//v8::Local<v8::Value> argv[1] = {v8::Number::New(isolate, static_cast<double>(fileTime))};
	//cb2->Call(v8::Null(isolate), 1, argv);
	args.GetReturnValue().Set(v8::Number::New(isolate, static_cast<double>(fileTime)));
}

void Initialize(v8::Local<v8::Object> exports) {  
	NODE_SET_METHOD(exports, "TimeFile", TimeFile);
}

NODE_MODULE(module_name, Initialize)  