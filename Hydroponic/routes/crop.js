var express = require('express');
var router = express.Router();
var user = require('./user.js')
var models = require('../models');

router.get('/all', user.authenticate(), function(req, res){
  var mac = req.query.mac;
  models.Crop.getCropsByDeviceMac(mac,
    function(result){
      var cropList = [];
      result.forEach(function(item, index){
        cropList.push(item.dataValues);
      });
      res.send(cropList);
    });
})

router.get('/one', user.authenticate(), function(req, res){
  var id = req.query.id;

  models.Crop.getCropById(id, function(result){
    res.send(result);
  })
})

router.post('/add', user.authenticate(), function(req, res){
  var newCrop = req.body;
  models.Crop.createCrop(newCrop, function(){
    // TODO: check time overlap between crops
    res.send({
      success: true,
      message: "Add crop success"
    });
  })
})

router.delete('/delete', user.authenticate(), function(req, res) {
  models.Crop.deleteCrop(req.query.id, function(success){
    if(success){
      res.send({
        success: true,
        message: "Crop is deleted"
      });
    } else {
      res.send({
        success: false,
        message: "Crop can not be deleted"
      });
    }
  })
})

router.put('/edit', user.authenticate(), function(req, res){
  models.Crop.getCropById(req.body.id, function(result){
    result.update({
      name: req.body.name,
      treetype: req.body.treetype,
      startdate: req.body.startdate,
      closedate: req.body.closedate,
      reporttime: req.body.reporttime
    }).then(function(resss){
      res.send({
        success: true,
        message: "Edit success"
      })
    });
  });

})
module.exports.router = router;
