// Geyser monitor (no hot water) - ESP8266 NodeMCU
// DS18B20: Red -> 3V3, Black -> GND, Yellow -> D5, 4.7k resistor between D5 and 3V3
// Libraries: OneWire, DallasTemperature
// Outlet stays cold too long: complaint sent to Electrical Maintenance

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ---------- EDIT THESE ----------
const char* WIFI_SSID_1     = "YOUR_HOTSPOT_NAME";
const char* WIFI_PASSWORD_1 = "YOUR_HOTSPOT_PASSWORD";
const char* WIFI_SSID_2     = "FRIEND_HOTSPOT_NAME";
const char* WIFI_PASSWORD_2 = "FRIEND_HOTSPOT_PASSWORD";

// Without deploying: http://<IP printed by the server>:5000/api/device/report
// After deploying:   https://<your-app-name>.onrender.com/api/device/report
const char* SERVER_URL = "https://community-outreach-gtfh.onrender.com/api/device/report";

const char* DEVICE_ID  = "HA-GEYSER-01";   // must match a device in the database (see npm run seed output)
const char* DEVICE_KEY = "key-ha-geyser-01";
// --------------------------------

#define ONE_WIRE_PIN D5

const float HOT_LIMIT_C = 35.0;            // below this the water counts as cold
const unsigned long COLD_TIME_MS = 60000;  // 1 min for the demo; use 30 min (1800000) for real use

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

bool faultReported = false;
bool cold = false;
unsigned long coldSince = 0;

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

void setup() {
  Serial.begin(115200);
  sensors.begin();

  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID_1, WIFI_PASSWORD_1);
  wifiMulti.addAP(WIFI_SSID_2, WIFI_PASSWORD_2);
  connectWiFi();
}

void loop() {
  sensors.requestTemperatures();
  float t = sensors.getTempCByIndex(0);

  if (t == DEVICE_DISCONNECTED_C) {
    Serial.println("Sensor not found - check wiring and the 4.7k resistor");
  } else {
    Serial.print("Temperature: ");
    Serial.print(t, 1);
    Serial.println(" C");

    if (t < HOT_LIMIT_C) {
      if (!cold) { cold = true; coldSince = millis(); }
      if (!faultReported && millis() - coldSince >= COLD_TIME_MS) {
        faultReported = true;
        Serial.println("NO HOT WATER - reporting");
        queueReport(String(t, 1) + " C");
      }
    } else {
      cold = false;
      if (faultReported) Serial.println("Hot water back - ready for next report");
      faultReported = false;
    }
  }

  handleReport();
  delay(1000);
}
