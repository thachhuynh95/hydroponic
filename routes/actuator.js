var express = require('express');
var router = express.Router();
var user = require('./user.js');
var models = require('../models');
var device = require('./device.js');
var utils = require('../utils/utils');
var mqtt = require('mqtt');
var protocolConstant = require('../utils/protocolConstant');
var parseMqttMsgUtils = require('../utils/parseMqttMsgUtils');
//====== auto query mac from database and subscribe to that chanel =======


//================================ end ===================================
router.post('/addactuator', user.authenticate(), function (req, res) {
  var newActuator = req.body.actuator;
  var deviceMac = req.body.devicemac;
  newActuator.DeviceMac = deviceMac;
  models.Actuator.getActuatorByIdOnboardAndDeviceMac(newActuator.idonboard, newActuator.DeviceMac, function (result) {
    if (result) {
      res.json({
        success: false,
        message: "This ID is already in use !"
      });
    } else {

      var deviceTopic = utils.getDeviceTopic(deviceMac);
      var serverTopic = utils.getServerTopic(deviceMac);
      const client = mqtt.connect(protocolConstant.MQTT_BROKER);
      var priority = newActuator.priority === 'Primary' ? '0' : '1';
      var message = deviceMac.replace(/:/g, "").toUpperCase() + '06' + '0004' + newActuator.idonboard + '0' + priority;

      // subscribe to server topic to get ACK package from device
      client.subscribe(serverTopic, function () {
        console.log('this line subscribe success to ' + serverTopic)
      })

      client.publish(deviceTopic, utils.encrypt(message), function (err) {
        if (err) {
          utils.log.error(err);
          console.log(err);
          client.end(false, function () {
            res.json({
              success: false,
              message: "Cannot send message to device"
            });
          })
        } else {
          client.on('message', function (topic, payload) {
            var ack = parseMqttMsgUtils.parseAckMsg(utils.decrypt(payload));
            if (ack) {
              if (ack.mac === deviceMac && ack.data === protocolConstant.ACK.HANDLED) {
                // if device received message, update database
                client.end();
                models.Actuator.createActuator(newActuator, function () {
                  res.json({
                    success: true,
                    message: "Add actuator success"
                  });
                }, function (err) {
                  utils.log.error(err);
                  console.log(err);
                  res.json({
                    success: false,
                    message: "Cannot add actuator !"
                  });
                })
              } else {
                res.json({
                  success: false,
                  message: 'Cannot send MQTT message to device'
                })
              }
            }
          })
        }
      })
    }
  })

});

router.get('/all', user.authenticate(), function (req, res) {
  var mac = req.query.mac;

  models.Device.getDeviceByMac(mac, function (device) {
    if (device) {
      device.getActuators().then(function (actuators) {
        var listActuators = [];
        actuators.forEach(function (item) {
          listActuators.push(item.dataValues);
        })
        res.json({
          success: true,
          data: listActuators,
          message: "Successfully to get all actuators!"
        })
      })
    }
    else {
      res.json({
        success: false,
        message: "MAC address is not matched with any device on database!"
      })
    }
  })
})

router.put('/status', user.authenticate(), function (req, res) {

  var deviceMac = req.body.mac;
  var deviceTopic = utils.getDeviceTopic(deviceMac);
  var serverTopic = utils.getServerTopic(deviceMac);
  const client = mqtt.connect(protocolConstant.MQTT_BROKER);

  // subscribe to server topic to get ACK package from device
  client.subscribe(serverTopic, function () {
    console.log('this line subscribe success to ' + serverTopic)
  })

  var status = req.body.status === 'on' ? '0' : '1';
  var message = deviceMac.replace(/:/g, "").toUpperCase() + '03' + '0003' + req.body.idonboard.toString() + status;
  client.publish(deviceTopic, utils.encrypt(message), function (err) {
    if (err) {
      console.log(err);
      utils.log.err(err);
      client.end(false, function () {
        res.json({
          success: false,
          message: 'Cannot send MQTT message to device'
        })
      })
    } else {
      // wait for ack message from device
      client.on('message', function (topic, payload) {
        var ack = parseMqttMsgUtils.parseAckMsg(utils.decrypt(payload));
        if (ack) {
          if (ack.mac === deviceMac && ack.data === protocolConstant.ACK.HANDLED) {
            // if device received message, update database
            client.end();
            models.Actuator.getActuatorById(req.body.id, function (actuator) {
              actuator.updateStatus(req.body.status, function () {
                res.json({
                  success: true,
                  message: 'Update actuator status successfully!'
                })
              }, function () {
                res.json({
                  success: false,
                  message: 'Something wrong: Cannot update actuator status!'
                })
              })
            })
          } else {
            res.json({
              success: false,
              message: 'Cannot send MQTT message to device'
            })
          }
        }
      })
    }
  });
})

router.put('/priority', user.authenticate(), function (req, res) {

  var deviceMac = req.body.mac;
  var deviceTopic = utils.getDeviceTopic(deviceMac);
  var serverTopic = utils.getServerTopic(deviceMac);
  const client = mqtt.connect(protocolConstant.MQTT_BROKER);

  // subscribe to server topic to get ACK package from device
  client.subscribe(serverTopic, function () {
    console.log('this line subscribe success to ' + serverTopic)
  })

  var priority;
  if (req.body.priority === 'Primary')
  {
    priority = '0';
  }else {
    priority =  '1';
  }
  var message = deviceMac.replace(/:/g, "").toUpperCase() + '06' + '0004' + req.body.idonboard.toString() + '2' + priority;

  console.log(message);
  client.publish(deviceTopic, utils.encrypt(message), function (err) {
    if (err) {
      console.log(err);
      utils.log.err(err);
      client.end(false, function () {
        res.json({
          success: false,
          message: 'Cannot send MQTT message to device'
        })
      })
    } else {
      // wait for ack message from device
      client.on('message', function (topic, payload) {
        var ack = parseMqttMsgUtils.parseAckMsg(utils.decrypt(payload));
        if (ack) {
          
          if (ack.mac === deviceMac && ack.data === protocolConstant.ACK.HANDLED) {
            // if device received message, update database
            client.end();
            models.Actuator.getActuatorById(req.body.id, function (actuator) {
              actuator.updatePriority(req.body.priority, function () {
                res.json({
                  success: true,
                  message: 'Update actuator priority successfully!'
                })
              }, function () {
                res.json({
                  success: false,
                  message: 'Something wrong: Cannot update actuator priority!'
                })
              })
            })

          } else {
            res.json({
              success: false,
              message: 'Cannot send MQTT message to device'
            })
          }
        }
      })
    }
  });
})

router.delete('/delete', user.authenticate(), function (req, res) {
  var deviceMac = req.query.mac;
  var deviceTopic = utils.getDeviceTopic(deviceMac);
  var serverTopic = utils.getServerTopic(deviceMac);
  const client = mqtt.connect(protocolConstant.MQTT_BROKER);

  // subscribe to server topic to get ACK package from device
  client.subscribe(serverTopic, function () {
    console.log('this line subscribe success to ' + serverTopic)
  })

  var priority = req.query.priority === 'Primary' ? '0' : '1';
  var message = deviceMac.replace(/:/g, "").toUpperCase() + '06' + '0004' + req.query.idonboard + '1' + priority;

  client.publish(deviceTopic, utils.encrypt(message), function (err) {
    if (err) {
      utils.log.error(err);
      console.log(err);
      client.end(false, function () {
        res.json({
          success: false,
          message: 'Error when send delete actuator msg MQTT!'
        })
      })
    } else {
      // wait for ack message from device
      client.on('message', function (topic, payload) {
        var ack = parseMqttMsgUtils.parseAckMsg(utils.decrypt(payload));
        if (ack) {
          if (ack.mac === deviceMac && ack.data === protocolConstant.ACK.HANDLED) {
            // if device received message, update database
            client.end();
            models.Actuator.deleteActuator(req.query.id, function () {
              res.json({
                success: true,
                message: 'Deleted actuator!'
              })
            }, function (err) {
              utils.log.error(err);
              console.log(err);
              res.json({
                success: false,
                message: 'Error when delete actuator!'
              })
            })
          } else {
            res.json({
              success: false,
              message: 'Cannot send MQTT delete message to device'
            })
          }
        }

      })
    }
  })
})

module.exports.router = router;
