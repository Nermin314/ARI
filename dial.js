'use strict';

var ari = require('ari-client');
var util = require('util');

const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

ari.connect('http://localhost:8088', 'asterisk', 'asterisk', clientLoaded);

class ConferenceCalls{

    constructor(extensions,conferenceNumber,bridgeID){
        this.extenList=extensions;
        this.confNum=conferenceNumber;
        this.bridgeID=bridgeID;
    }

    inputExtension(extension){
        this.extenList.push(extension)
    }

    popExten(extension){
        this.extenList=this.extenList.filter(e=>e !== extension);
    }
    print(){
        if(this.extenList)
            console.log(this.confNum,this.extenList,this.bridgeID);
        else
            console.log("There is no conference room");
    }
}
let calls=[];
var num=1;

// handler for client being loaded
function clientLoaded(err, client) {
    if (err) {
        throw err;
    }
    var readline = require('readline');
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
rl.setPrompt('>');
rl.prompt();

rl.on('line', function(line) {

  let dial=/(^((\w+)?(dial))(\s[0-9]+)+$)/;
  let enterConf=/(^(enter)\s[a-zA-Z]+\d+\s\d+$)/;
  let conference=/((conf)\d+)/g;

    if(line.trim().match(enterConf)){
        let confNum=line.trim().match(conference)[0];
        let extension=line.trim().match(/\d{3,6}/g)[0];
       enterToConference(confNum,extension);
    }
    else if(line.trim().match(dial)){
    let extensions=line.trim().match(/[0-9]+/g);
    originate(extensions);
  }
    else if(line.trim()==='listCalls'){
    if(!(calls.length)) {
        console.log("There is no calls");
    }
    else {
        for(var call of calls) {
            call.print();
        }}
  } else {
        console.log('Usage: \n 1) dial [endpoint1] [endpoint2] [endpoint3] ... etc \n 2) listCalls - For listing all calls \n 3) enter ConferenceNumber [Endpoint] \n [endpoint]-300,539,..');
    }
    rl.setPrompt('>');
    rl.prompt();
    });
  
  function originate(extensions){

    var conf='conf'+num++;
    var bridge = client.Bridge();
    bridge.create({type: 'mixing'}, function(err, bridge) {
      if (err) {
        throw err;
      }
    });
      console.log('Bridge created : %s :)', bridge.id);
      calls.push(new ConferenceCalls(extensions,conf,bridge.id));

      //Creating and adding all channels to bridge
      for(var endpoint of extensions){
          client.channels.create({
              app: 'dial-test',
              endpoint: 'PJSIP/' + endpoint
          }, (err, channel) => {
              if (err) {
                  throw err;
              }
              console.log("Created Channel %s",channel.name);
              console.log("Adding Channel %s to bridge %s",channel.name,bridge.id);
              bridge.addChannel({channel:channel.id},function(err) {
                  if (err) {
                      throw err;
                  }
              });
              client.channels.dial({channelId:channel.id});
          });
      }

  }
    function enterToConference(confNum,extension){

      for(var call of calls){
          if(call.confNum===confNum){
              call.inputExtension(extension);
              client.channels.create({
                  app: 'dial-test',
                  endpoint: 'PJSIP/' + extension
              }, (err, channel) => {
                  if (err) {
                      throw err;
                  }
                  console.log("Created Channel %s",channel.name);
                  client.bridges.get({bridgeId:call.bridgeID},function(err,bridge){
                      console.log("Adding Channel %s to bridge %s",channel.name,bridge.id);
                      bridge.addChannel({channel:channel.id},function(err) {
                          if (err) {
                              throw err;
                          }
                      });
                  });
                  client.channels.dial({channelId:channel.id});
              });
          }
      }
    }
    
    function stasisStart(event, channel) {
        console.log(util.format('Channel %s has entered the application', channel.name));
    }

    function stasisEnd(event, channel) {

        let pjsipExtensionPart=/\d{3,6}-/;
        let extension=channel.name.match(pjsipExtensionPart)[0].replace('-','');
        console.log(extension);
        for (var call of calls){
            if(call.extenList.includes(extension)){
                call.popExten(extension);
                if(!call.extenList.length){
                    client.bridges.destroy(
                        {bridgeId: call.bridgeID},
                        function (err) {}
                    );
                    calls=calls.filter(e=>e.bridgeID !== call.bridgeID );
                }
            }

        }
        console.log(util.format('Channel %s has left the application', channel.name));
    }

    client.on('StasisStart', stasisStart);
    client.on('StasisEnd', stasisEnd);
    client.start('dial-test');
}
