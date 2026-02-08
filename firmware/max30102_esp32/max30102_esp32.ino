#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <Adafruit_MLX90614.h>

/* ================= CONFIG ================= */

const char* ssid = "qwerty";
const char* password = "qAzMlP<306>";

String serverUrl = "http://10.211.78.11:3000/api/vitals";
String deviceId  = "SENSOR_01";

/* ================= OBJECTS ================= */

MAX30105 particleSensor;
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

bool max30102_ok = false;
bool mlx_ok = false;

/* ================= SPO2 BUFFERS ================= */

#define BUFFER_SIZE 100

uint32_t irBuffer[BUFFER_SIZE];
uint32_t redBuffer[BUFFER_SIZE];

int32_t spo2;
int8_t  validSPO2;
int32_t heartRate;
int8_t  validHeartRate;

/* ================= TIMING ================= */

unsigned long lastPostTime = 0;
unsigned long lastTempRead = 0;
float bodyTempF = NAN;

/* ================= HELPERS ================= */

bool hrValidHuman(int hr) {
  return (hr >= 40 && hr <= 180);
}

void resetMAX30102() {
  Serial.println("⚠ Resetting MAX30102...");
  particleSensor.softReset();
  delay(100);
  particleSensor.setup(45, 8, 2, 100, 411, 4096);
}

void sendDataToServer(int hr, int spo2Val, float tempF) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping HTTP POST");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String tempStr = isnan(tempF) ? "0.0" : String(tempF, 2);

  String payload = "{";
  payload += "\"deviceId\":\"" + deviceId + "\",";
  payload += "\"heartrate\":" + String(hr) + ",";
  payload += "\"spo2\":" + String(spo2Val) + ",";
  payload += "\"temperature\":" + tempStr;
  payload += "}";

  int code = http.POST(payload);
  if (code <= 0) {
    Serial.print("HTTP POST failed: ");
    Serial.println(code);
  }

  http.end();
}

/* ================= SETUP ================= */

void setup() {
  Serial.begin(115200);
  delay(1000);

  /* ---- I2C INIT (CRITICAL) ---- */
  Wire.begin(21, 22, 100000);
  Wire.setTimeOut(50);

  Serial.println("Booting ESP32...");

  /* ---- WIFI ---- */
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi failed (continuing anyway)");
  }

  /* ---- MAX30102 ---- */
  Serial.println("Initializing MAX30102...");
  if (!particleSensor.begin(Wire)) {
    Serial.println("❌ MAX30102 not found");
  } else {
    max30102_ok = true;
    particleSensor.setup(
      45,    // LED brightness
      8,     // sample average
      2,     // red + IR
      100,   // sample rate
      411,   // pulse width
      4096  // ADC range
    );
    Serial.println("✅ MAX30102 ready");
  }

  /* ---- MLX90614 ---- */
  Serial.println("Initializing MLX90614...");
  if (!mlx.begin()) {
    Serial.println("❌ MLX90614 not found");
  } else {
    mlx_ok = true;
    Serial.println("✅ MLX90614 ready");
  }

  Serial.println("System ready.");
}

/* ================= LOOP ================= */

void loop() {
  if (!max30102_ok) {
    Serial.println("MAX30102 missing, retrying...");
    delay(2000);
    return;
  }

  /* ---- COLLECT DATA ---- */
  for (int i = 0; i < BUFFER_SIZE; i++) {
    while (!particleSensor.available())
      particleSensor.check();

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }

  /* ---- FINGER DETECTION ---- */
  uint32_t irSum = 0;
  for (int i = 0; i < BUFFER_SIZE; i++) irSum += irBuffer[i];
  uint32_t irAvg = irSum / BUFFER_SIZE;

  if (irAvg < 30000) {
    Serial.println("No finger detected");
    delay(500);
    return;
  }

  /* ---- SPO2 + HR ---- */
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_SIZE,
    redBuffer,
    &spo2, &validSPO2,
    &heartRate, &validHeartRate
  );

  if (!validSPO2 || !validHeartRate || !hrValidHuman(heartRate)) {
    Serial.println("Unstable signal...");
    delay(200);
    return;
  }

  /* ---- MLX TEMP (1 Hz) ---- */
  if (mlx_ok && millis() - lastTempRead > 1000) {
    bodyTempF = mlx.readObjectTempF();
    lastTempRead = millis();
  }

  if (particleSensor.getIR() < 1000) {
    resetMAX30102();
    return;
  }

  /* ---- DISPLAY ---- */
  Serial.print("HR: ");
  Serial.print(heartRate);
  Serial.print("  SpO2: ");
  Serial.print(spo2);
  Serial.print("  Body Temp: ");
  if (isnan(bodyTempF)) Serial.println("NA");
  else Serial.println(bodyTempF);

  /* ---- HTTP POST (every 5s) ---- */
  if (millis() - lastPostTime > 5000) {
    sendDataToServer(heartRate, spo2, bodyTempF);
    lastPostTime = millis();
  }
}
