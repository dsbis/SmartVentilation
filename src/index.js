/*
* Adapted from code by Brian Donohue
*/

'use strict';

const adafruitIO_username = 'example';

exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    var cardTitle = "Welcome to the smart ventilation system!"
    var speechOutput = "I can help change the temperature of your room to your preference."
    callback(session.attributes,
        buildSpeechletResponse(cardTitle, speechOutput, "", true));
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if (intentName == 'GetRoomTemperature') {
        getRoomTemperature(intent, session, callback);
    } else if (intentName == "SetRoomTemperature"){
        setRoomTemperature(intent, session, callback);
    }
    else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);
}

function getRoomTemperature(intent, session, callback) {
    var mqtt = require('mqtt');

    var client = mqtt.connect('mqtt://io.adafruit.com');

    var targetRoomNumber = intent.slots.RoomNumber.value;
    var targetRoom = 'Room ' + targetRoomNumber + " Temp";
    var temp;

    client.on('connect', () => {
        temp = client.subscribe(adafruitIO_username + '/feeds/' + targetRoom);
    });

    client.on('error', (error) => {
      console.log('MQTT Client Errored');
      console.log(error);
    });

    var message = "The temperature of room " + targetRoomNumber + " is " + temp;

    callback(session.attributes,
        buildSpeechletResponseWithoutCard(message, "", "true"));
}

function setRoomTemperature(intent, session, callback){
  var mqtt = require('mqtt');

  var client = mqtt.connect('mqtt://io.adafruit.com');

  var targetRoomNumber = intent.slots.RoomNumber.value;
  var targetRoom = 'room' + targetRoomNumber;
  var temperature = intent.slots.Temperature.value;
  var command = targetRoom + ",s" + temperature;


  client.on('connect', () => {
      client.publish(adafruitIO_username + '/feeds/echo-commands',command); // 
  });

  client.on('error', (error) => {
    console.log('MQTT Client Errored');
    console.log(error);
  });

  var message = "The temperature of room " + targetRoomNumber + " is now set to" + temperature;

  callback(session.attributes,
      buildSpeechletResponseWithoutCard(message, "", "true"));
}

// ------- Helper functions to build responses -------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
