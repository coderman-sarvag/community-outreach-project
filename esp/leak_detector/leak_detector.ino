// Leak detector - ESP8266 NodeMCU
// Rain sensor D0 -> D5, Relay IN -> D1, Buzzer + -> D2
// Leak: buzzer on, valve closed, complaint sent to Water Works

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

const char* DEVICE_ID  = "HA-LEAK-01";   // must match a device in the database (see npm run seed output)
const char* DEVICE_KEY = "key-ha-leak-01";
// --------------------------------

const bool RELAY_ACTIVE_LOW = true;        // set false if your relay switches on with HIGH
const unsigned long DRY_RESET_MS = 60000;  // must stay dry this long before a new leak can be reported

#define RAIN_PIN   14   // GPIO14 = pin D5 on a NodeMCU
#define RELAY_PIN  5    // GPIO5  = pin D1 on a NodeMCU
#define BUZZER_PIN 4    // GPIO4  = pin D2 on a NodeMCU

bool leakActive = false;
unsigned long lastWetTime = 0;

void relayOn()  { digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? LOW : HIGH); }
void relayOff() { digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW); }

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
  pinMode(RAIN_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  relayOn();  // normally-closed valve: keep powered so water flows

  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID_1, WIFI_PASSWORD_1);
  wifiMulti.addAP(WIFI_SSID_2, WIFI_PASSWORD_2);
  connectWiFi();
}

void loop() {
  bool wet = (digitalRead(RAIN_PIN) == LOW);  // module output goes LOW when wet

  if (wet) {
    lastWetTime = millis();
    if (!leakActive) {
      leakActive = true;
      Serial.println("LEAK DETECTED");
      relayOff();                     // valve closes, water stops
      digitalWrite(BUZZER_PIN, HIGH);
      queueReport("wet");             // one complaint per leak
    }
  } else if (leakActive && millis() - lastWetTime > DRY_RESET_MS) {
    leakActive = false;
    Serial.println("Dry again - system reset");
    digitalWrite(BUZZER_PIN, LOW);
    relayOn();
  }

  handleReport();
  delay(200);
}
