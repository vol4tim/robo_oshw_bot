import fs from "fs";

export const products = [
  {
    id: "1",
    image: {
      source: fs.createReadStream(__dirname + "/../images/P1012625.JPG")
    },
    // "https://image.easyeda.com/pullimage/AdzPFbw5oAkRvTSohmfmEKrm5oB35ibXHLdnsal1.jpeg",
    title: "Universal IR Remote Control",
    price: 20,
    description:
      "Build smart climate control with any ANY A-N-Y air conditioner, setup open/close operations for any ANY A-N-Y gates in your home. We`ve built universal IR remote control with an open-source Tasmota firmware onboard. We installed USB-C port for your better experience - upgrade the firmware for the remote control just with a simple wired connection!",
    features: [
      "supports wide range of devices",
      "firmware upgradable by plug-in usb-c por",
      "home assistant friendly"
    ]
  },
  {
    id: "2",
    image: {
      source: fs.createReadStream(__dirname + "/../images/P1012619.JPG")
    },
    // "https://image.easyeda.com/pullimage/7ui3Jj4k8Y219wcWZAsmLNTWrQjtbBUigp57wkFH.jpeg",
    title: "Smart Energy Power Consumption Monitoring",
    price: 38,
    description:
      "Have you ever wondered what consumes the most electricity inyour home? Our smart DIN energy power meter is designed to help you identify the major sources of electricity usage and prevent unwanted energy leaks. This energy meter works both, with an individual assert or an entirebuilding, doesn`t need any cloud, MQTT protocol onboard, can be used with Home Assistant and it`s useful energy management dashboard.",
    features: [
      "efficient energy monitoring consumption",
      "doesn`t need any cloud service",
      "home assistant friendly"
    ]
  }
];
