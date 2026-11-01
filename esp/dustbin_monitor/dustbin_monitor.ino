// Dustbin monitor - ESP8266 NodeMCU
// HC-SR04: VCC -> Vin (5V), GND -> GND, Trig -> D5, Echo -> D6 through 1k/2k divider
// Bin full: complaint sent to Sanitation

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>


// ---------- EDIT THESE ----------
const char* WIFI_SSID_1     = "YOUR_HOTSPOT_NAME";
const char* WIFI_PASSWORD_1 = "YOUR_HOTSPOT_PASSWORD";
const char* WIFI_SSID_2     = "FRIEND_HOTSPOT_NAME";
const char* WIFI_PASSWORD_2 = "FRIEND_HOTSPOT_PASSWORD";

// Without deploying: http://<IP printed by the server>:5000/api/device/report
// After deploying:   https://<your-app-name>.onrender.com/api/device/report
const char* SERVER_URL = "https://community-outreach-gtfh.onrender.com/api/device/report";

const char* DEVICE_ID  = "HA-BIN-01";   // must match a device in the database (see npm run seed output)
const char* DEVICE_KEY = "key-ha-bin-01";
// --------------------------------

#define TRIG_PIN D5
#define ECHO_PIN D6

const float FULL_THRESHOLD_CM = 5.0;  // garbage closer than this to the sensor = full
const float RESET_MARGIN_CM   = 3.0;  // must drop below threshold + margin to count as emptied
const int   CONFIRM_READINGS  = 3;    // consecutive readings needed (ignores a hand or a falling bag)

bool binFull = false;
int fullCount = 0;
int emptyCount = 0;

ESP8266WiFiMulti wifiMulti;

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  unsigned long start = millis();
  while (wifiMulti.run() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\nConnected to ");
    Serial.print(WiFi.SSID());
    Serial.print(", IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi not connected - sensing still running");
  }
}

// Sends one report to the website. Returns true once the server has it.
// The server keeps one open complaint per device, so repeats never create duplicate tickets.
bool sendReport(const String& reading) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi - will retry");
    return false;
  }

  String body = String("{\"deviceId\":\"") + DEVICE_ID + "\",\"apiKey\":\"" + DEVICE_KEY +
                "\",\"reading\":\"" + reading + "\"}";
  bool https = String(SERVER_URL).startsWith("https");

  for (int attempt = 1; attempt <= 3; attempt++) {
    WiFiClient plain;
    WiFiClientSecure secure;
    secure.setInsecure();      // deployed (https) server: encrypted, certificate not checked
    HTTPClient http;
    http.setTimeout(20000);    // free deployed servers can take time to wake up
    if (https) http.begin(secure, SERVER_URL);
    else       http.begin(plain, SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    int code = http.POST(body);
    String reply = code > 0 ? http.getString() : http.errorToString(code);
    http.end();
    Serial.printf("Report attempt %d: HTTP %d %s\n", attempt, code, reply.c_str());

    if (code == 200 || code == 201) return true;
    if (code == 400 || code == 401) return false;  // wrong DEVICE_ID / DEVICE_KEY: fix the sketch
    delay(3000);
  }
  return false;
}

// Keeps retrying a failed report every 30 s until it gets through
bool reportPending = false;
String pendingReading;
unsigned long lastAttempt = 0;

void queueReport(const String& reading) {
  reportPending = true;
  pendingReading = reading;
  lastAttempt = millis() - 30000;  // try immediately
}

void handleReport() {
  if (reportPending && millis() - lastAttempt >= 30000) {
    lastAttempt = millis();
    if (sendReport(pendingReading)) reportPending = false;
  }
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  return duration * 0.0343 / 2;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID_1, WIFI_PASSWORD_1);
  wifiMulti.addAP(WIFI_SSID_2, WIFI_PASSWORD_2);
  connectWiFi();
}

void loop() {
  float d = readDistanceCm();

  if (d < 0) {
    Serial.println("No echo - check wiring");
  } else {
    Serial.print("Distance: ");
    Serial.print(d, 1);
    Serial.print(" cm  ->  ");
    Serial.println(d < FULL_THRESHOLD_CM ? "FULL" : "FILLING");

    if (d < FULL_THRESHOLD_CM) { fullCount++; emptyCount = 0; }
    else if (d > FULL_THRESHOLD_CM + RESET_MARGIN_CM) { emptyCount++; fullCount = 0; }

    if (!binFull && fullCount >= CONFIRM_READINGS) {
      binFull = true;
      Serial.println("BIN FULL - reporting");
      queueReport(String(d, 1) + " cm");
    } else if (binFull && emptyCount >= CONFIRM_READINGS) {
      binFull = false;
      Serial.println("Bin emptied - ready for next report");
    }
  }

  handleReport();
  delay(500);
}
