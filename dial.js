'use strict';

var ari = require('ari-client');
var util = require('util');

const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

ari.connect('http://localhost:8088', 'asterisk', 'asterisk', clientLoaded);

class ConfereceCall{

    constructor(extensions,conferenceNumber,bridgeID){
        this.extenList=extensions;
        this.confNum=conferenceNumber;
        this.bridgeID=bridgeID;
    }

     update(extensions,conferenceNumber,bridgeID){
        this.extenList=extensions;
        this.confNum=conferenceNumber;
        this.bridgeID=bridgeID;
    }
    print(){
        if(this.extenList)
            console.log(this.confNum,this.extenList,this.bridgeID);
        else
            console.log("There is no conference room");
    }
}

class ConferenceCalls {
    constructor() {
        this.calls=[];
    }

}


let calls=[];
//----------get input
//----------createchannels
//----------dial
//----------insert in bridge
//----------track call in map_of_calls 
//----------loop
//----------on Stasisend Destroy bridge if there is just 1 in conf?
//----------

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
rl.setPrompt('>>>');
rl.prompt();
-
rl.on('line', function(line) {

  let dial=/(^(dial)(\s[0-9]+)+$)/;
  let enterConf=/(^(enter)\s[a-zA-Z]+\d+$)/;
  
  //  console.log(line.trim().match(dial));
    if(line.trim().match(enterConf)){
        //enter some conference with "enter conf1"
        calls.print();
        console.log('entering conference');
    }

    else if(line.trim().match(dial)){
    //"dial endpoint1 enpoint2 ...etc"
    let extensions=line.trim().match(/[0-9]+/g);
    console.log('dial');
    originate(extensions);
  }
    else if(line.trim()==='listCalls'){
    console.log('ListCalls');
    calls.print();
  } else
    console.log('Usage: \n 1) dial endpoint1 endpoint2 endpoint3 etc \n 2) listCalls \n 3) enter ConferenceNumber');
}).on('close', function() {
  console.log('Have a great day!');
  process.exit(0);
});

  
  function originate(extensions){

    var bridge = client.Bridge();
    bridge.create({type: 'mixing'}, function(err, bridge) {
      if (err) {
        throw err;
      }
    });
      console.log('Bridge created : %s :)', bridge.id);
      console.log(extensions);
      calls.push(new ConferenceCalls(extensions,"conf1",bridge.id));

      //Creating and adding all channels to bridge

    client.channels.create({
      app: 'dial-test',
      endpoint: 'PJSIP/' + extensions[0]
  }, (err, channelOrig) => {
      if (err) {
          throw err;
      } else {
      console.log("Created Channel %s",channelOrig.name);
      console.log("Adding Channel %s to bridge %s",channelOrig.name,bridge.id);
      bridge.addChannel({channel:channelOrig.id},function(err) {
        if (err) {
          throw err;
        }
      });
          client.channels.create({
              app: 'dial-test',
              endpoint: 'PJSIP/' + extensions[1]
          }, (err, channelDestin) => {
            console.log("Created Channel %s",channelDestin.name);
            console.log("Adding Channel %s to bridge %s",channelDestin.name,bridge.id);
            bridge.addChannel({channel:channelDestin.id},function(err) {
              if (err) {
                throw err;
              }
            });
              calls=new listCalls(extensions,'conf1',bridge.id);
              calls.print();
              client.channels.dial({channelId:channelOrig.id});
              client.channels.dial({channelId:channelDestin.id});
          });
      }
  });

  }

    
    function stasisStart(event, channel) {

        console.log(util.format(
            'Channel %s has entered the application', channel.name));

    }

    function stasisEnd(event, channel) {
        //destroy bridges and update calls when someone hangup from conference To-DO

        console.log(util.format(
            'Channel %s has left the application', channel.name));
    }

    client.on('StasisStart', stasisStart);
    client.on('StasisEnd', stasisEnd);

    client.start('dial-test');
}
