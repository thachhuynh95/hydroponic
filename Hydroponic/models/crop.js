"use strict";

module.exports = function(sequelize, DataTypes) {
  var Crop = sequelize.define('Crop', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    treetype: {
      type: DataTypes.STRING,
      allowNull: false
    },
    startdate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    closedate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    reporttime: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  }, {
    classMethods: {
      createCrop: function(crop, callback){
        Crop.create(crop).then(callback);
      },
      getCropsByDeviceMac: function(deviceMac, callback){
        var query = {
          where: {
            DeviceMac: deviceMac
          }
        };
        Crop.findAll(query).then(callback);
      },
      getCropById: function(id, callback){
        Crop.findById(id).then(callback);
      },
      associate: function(models){
        Crop.hasMany(models.Schedule);
        Crop.hasMany(models.Threshold);
        Crop.hasMany(models.Data);
      }
    },
    tableName: 'Crop'
  });
  return Crop;
};
