var moves = require('./move-types.js'),
    Q = require('q');

var prefix = 'slackpkmn:';

var redisConfig = {
    
};

var redis,
    rtg;

/* For using RedisToGo on Heroku. If you're not using RedisToGo or Heroku,
* feel free to remove this part and just use
* redis = require("redis").createClient();
*/ 
if(process.env.REDISTOGO_URL) {
  rtg   = require("url").parse(process.env.REDISTOGO_URL);
  redis = require("redis").createClient(rtg.port, rtg.hostname);

  redis.auth(rtg.auth.split(":")[1]);
} else {
  //then we're running locally
  redis = require("redis").createClient(redisConfig);
}

/* Turn Redis Methods Into Promise-returning Ones */

QRedis = {};

QRedis.sadd = Q.nbind(redis.sadd, redis);
QRedis.hmset = Q.nbind(redis.hmset, redis);
QRedis.hgetall = Q.nbind(redis.hgetall, redis);
QRedis.exists = Q.nbind(redis.exists, redis);
QRedis.del = Q.nbind(redis.del, redis);
QRedis.set = Q.nbind(redis.set, redis);
QRedis.get = Q.nbind(redis.get, redis);
QRedis.decrby = Q.nbind(redis.decrby, redis);
QRedis.smembers = Q.nbind(redis.smembers, redis);

module.exports = {};

module.exports.newBattle = function(playerName, channel) {
  return QRedis.exists(prefix + "currentBattle")
    .then(function(exists){
      if(!exists) {
        return QRedis.hmset(prefix + "currentBattle", {
          "playerName": playerName,
          "channel": channel
        })
      } else {
        throw new Error("Battle exists");
      }
    })
}

module.exports.getBattle = function() {
  return QRedis.hgetall(prefix + "currentBattle");
}

module.exports.endBattle = function() {
  return QRedis.del([
    prefix + "currentBattle",
    prefix + "user:allowedMoves",
    prefix + "npc:allowedMoves",
    prefix + "npc:hp",
    prefix + "user:hp",
    prefix + "user:pkmnTypes",
    prefix + "npc:pkmnTypes"
  ])
}

module.exports.addMove = function(data) {
  return QRedis.sadd(prefix + "user:allowedMoves", data.name.toLowerCase())
    .then(function(addReturned){
      return QRedis.hmset(prefix + "move:"+data.name.toLowerCase(),{
        "power": data.power,
        "type": moves.getMoveType(data.name.toLowerCase())
      })
    });
}

module.exports.addMoveNPC = function(data) {
  return QRedis.sadd(prefix + "npc:allowedMoves", data.name.toLowerCase())
    .then(function(addReturned){
      return QRedis.hmset(prefix + "move:"+data.name.toLowerCase(),{
        "power": data.power,
        "type": moves.getMoveType(data.name.toLowerCase())
      })
    });
}

module.exports.setUserPkmnTypes = function(typesArray) {
  //TODO: use apply (or Q's version of it)
  if(typesArray[1]) {
    return QRedis.sadd(prefix + "user:pkmnTypes", typesArray[0], typesArray[1]);
  } else {
    return QRedis.sadd(prefix + "user:pkmnTypes", typesArray[0]);
  }
}

module.exports.setNpcPkmnTypes = function(typesArray) {
  //TODO: use apply (or Q's version of it)
  if(typesArray[1]) {
    return QRedis.sadd(prefix + "npc:pkmnTypes", typesArray[0], typesArray[1]);
  } else {
    return QRedis.sadd(prefix + "npc:pkmnTypes", typesArray[0]);
  }
}

module.exports.getUserPkmnTypes = function() {
  return QRedis.smembers(prefix + "user:pkmnTypes");
}

module.exports.getNpcPkmnTypes = function() {
  return QRedis.smembers(prefix + "npc:pkmnTypes");
}

module.exports.getUserAllowedMoves = function() {
  return QRedis.smembers(prefix + "user:allowedMoves");
}
module.exports.getNpcAllowedMoves = function() {
  return QRedis.smembers(prefix + "npc:allowedMoves");
}

module.exports.getSingleMove = function(moveName) {
  return QRedis.hgetall(prefix + "move:"+moveName.toLowerCase());
}

module.exports.setNpcHP = function(hp) {
  return QRedis.set(prefix + "npc:hp", hp);
}
module.exports.getNpcHP = function() {
  return QRedis.get(prefix + "npc:hp");
}

module.exports.setUserHP = function(hp) {
  return QRedis.set(prefix + "user:hp", hp);
}
module.exports.getUserHP = function() {
  return QRedis.get(prefix + "user:hp");
}
module.exports.doDamageToUser = function(damage) {
  return QRedis.decrby(prefix + "user:hp", damage);
}
module.exports.doDamageToNpc = function(damage) {
  return QRedis.decrby(prefix + "npc:hp", damage);
}
