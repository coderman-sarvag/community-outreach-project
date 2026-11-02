// Water quality monitor (TDS) - ESP8266 NodeMCU
// TDS board: VCC -> 3V3, GND -> GND, A (signal) -> A0
// TDS above the limit: complaint sent to Water Works

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>


// ---------- EDIT THESE ----------
const char* WIFI_SSID_1     = "vivo Y400 5G";
const char* WIFI_PASSWORD_1 = "12345678";
const char* WIFI_SSID_2     = "FRIEND_HOTSPOT_NAME";
const char* WIFI_PASSWORD_2 = "FRIEND_HOTSPOT_PASSWORD";

// Without deploying: http://<IP printed by the server>:5000/api/device/report
// After deploying:   https://<your-app-name>.onrender.com/api/device/report
const char* SERVER_URL = "https://community-outreach-gtfh.onrender.com/api/device/report";

const char* DEVICE_ID  = "HA-TDS-01";   // must match a device in the database (see npm run seed output)
const char* DEVICE_KEY = "key-ha-tds-01";
// --------------------------------

#define TDS_PIN A0
#define VREF 3.3            // NodeMCU A0 reads 0-3.3 V as 0-1023
#define SAMPLES 30
#define WATER_TEMP 25.0     // assumed water temperature in C
#define ZERO_OFFSET 0.028   // voltage read with probe in air (ADC offset)

const float TDS_LIMIT_PPM  = 100;  // above this = alert
const float TDS_RESET_PPM  = 60;  // must fall below this to re-arm
const int   CONFIRM_READINGS = 3;  // consecutive readings needed

bool alertActive = false;
int highCount = 0;
int okCount = 0;

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
    if (code == 400 || code == 401) {             // wrong DEVICE_ID / DEVICE_KEY: retrying won't help
      Serial.println("Check DEVICE_ID and DEVICE_KEY in the sketch - report dropped");
      return true;
    }
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

float readTds() {
  long sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(TDS_PIN);
    delay(10);
  }
  float voltage = (sum / (float)SAMPLES) * VREF / 1023.0 - ZERO_OFFSET;
  if (voltage < 0) voltage = 0;
  float v = voltage / (1.0 + 0.02 * (WATER_TEMP - 25.0));
  return (133.42 * v * v * v - 255.86 * v * v + 857.39 * v) * 0.5;
}

void setup() {
  Serial.begin(115200);

  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID_1, WIFI_PASSWORD_1);
  wifiMulti.addAP(WIFI_SSID_2, WIFI_PASSWORD_2);
  connectWiFi();
  Serial.println("Type t in the Serial Monitor to send a test report to the website");
}

void loop() {
  float tds = readTds();
  Serial.print("TDS: ");
  Serial.print(tds, 0);
  Serial.println(" ppm");

  // Manual test: lodges (or updates) the complaint without needing dirty water
  if (Serial.available() && Serial.read() == 't') {
    Serial.println("Manual test - reporting");
    queueReport(String(tds, 0) + " ppm (manual test)");
  }

  if (tds > TDS_LIMIT_PPM) { highCount++; okCount = 0; }
  else if (tds < TDS_RESET_PPM) { okCount++; highCount = 0; }

  if (!alertActive && highCount >= CONFIRM_READINGS) {
    alertActive = true;
    Serial.println("WATER QUALITY ALERT - reporting");
    queueReport(String(tds, 0) + " ppm");
  } else if (alertActive && okCount >= CONFIRM_READINGS) {
    alertActive = false;
    Serial.println("Water back to normal - ready for next report");
  }

  handleReport();
  delay(1000);
}
