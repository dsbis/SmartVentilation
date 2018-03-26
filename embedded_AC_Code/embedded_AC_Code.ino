#include <ESP8266WiFi.h>
#include <ESP8266WiFiAP.h>
#include <ESP8266WiFiGeneric.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266WiFiScan.h>
#include <ESP8266WiFiSTA.h>
#include <ESP8266WiFiType.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <WiFiServer.h>
#include <WiFiUdp.h>
#include <ESP8266mDNS.h>
#include <Servo.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>


/**
 * Pins we are using on the ESP8266
 */
#define SERVO_PIN 3
#define SDA 0
#define SCL 2

/**
 * Our wifi stuff
 */
#define WLAN_SSID       "INSERT_SSID_HERE"
#define WLAN_PASS       ""
String domain = "esp1";

/**
 * The set temperature
 */
byte setTemp = 100;

/**
 * Veriable to stop the servo from continuing to open and close
 */

/**
 * Swing temperature for efficency
 */

#define SWING 2

/**
 * The current temperature
 */
float currentTemp;

/**
 * The boolean veriable for telling flappy flaps to do their stuff
 */
boolean cooling = false;

/**
 * The servo object
 */
Servo servo;

//mlx.readAmbientTempF()
//mlx.readObjectTempF()
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// TCP server at port 80 will respond to HTTP requests
WiFiServer server(80);

void setup() {

  pinMode(SERVO_PIN, OUTPUT);
  //connect to wifi
  WiFi.begin(WLAN_SSID, WLAN_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  
  if (!MDNS.begin("room3")) {
    while(1) { 
      delay(1000);
    }
  }

  //start I2C, sensors and servo
  Wire.pins(SDA,SCL);
  Serial.begin(115200);
  mlx.begin();
  currentTemp = mlx.readAmbientTempF();
  
  server.begin();
  MDNS.addService("http", "tcp", 80);


}

void loop() {
  // Check if a client has connected
  WiFiClient client = server.available();
  
  //update the temperature while waiting for connection
  currentTemp = mlx.readAmbientTempF();

  //update the vents while waiting for connection
  ventControl();

  if (!client) {
    return;
  }

  // Wait for data from client to become available
  while(client.connected() && !client.available()){
    
    //update the temperature while waiting to recieve data
    currentTemp = mlx.readAmbientTempF();

    //update the vents while waiting to recieve data
    ventControl();
    delay(1);
  }

  // Read the first line of HTTP request
  String req = client.readStringUntil('\r');
  client.flush();
  

  if(req.charAt(0) == 's'){

    //find the new temperature value
    req = req.substring(1);

    //make sure the value is within range
    if(req.toInt() > 31 && req.toInt() < 101){
      setTemp = req.toInt();
      client.print(((int) setTemp)); //send the temperature back
    }
    //if if the data is out of range
    else{
      client.print("!!");
    }
  }

  // A request for the current value of the room
  else if(req.charAt(0) == 'r'){
    client.print((int) currentTemp);
  }

  //if the recieved value is not recognized
  else{
    client.print("!!");

  }
}

void ventControl(){
  if(currentTemp > (((int) setTemp) + SWING)){
    if(cooling == false){
      cooling = true;
      servo.attach(SERVO_PIN);
      for(int i = 10; i < 40; i++){
        servo.write(3*i);
        delay(50);
      }
      servo.detach();
    }
  }
  if(currentTemp < (int) setTemp){
    if(cooling == true){
      cooling = false;
      servo.attach(SERVO_PIN);
      for(int i = 40; i > 10; i--){
        servo.write(3*i);
        delay(50);
      }
     servo.detach();
    }
  }
}
