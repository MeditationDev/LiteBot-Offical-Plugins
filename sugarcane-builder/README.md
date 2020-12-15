# Sugarcane Farm Builder
## use
### Litebot
Run code below as a macro after install plugin.
~~~js
const vec3 = require('vec3')
var builder=macro.requirePlugin("sugarcane-builder");
macro.bot.on('chat', async (username, message) => {
    if (username === bot.username) return
    switch (message){
        case "build":{
            new builder.builder(macro.bot,new vec3(-171,90,244),new vec3(-151,90,224),new vec3(-171,90,246),{dirt:new vec3(-174,93,247),reeds:new vec3(-174,92,247),torch:new vec3(-174,91,247),bucket:new vec3(-174,91,247)},['bucket','water_bucket'],macro.logger)
            break
        }
    }
})
~~~
### Mineflayer
~~~js
//create a bot
//var bot=XXXXXX
const vec3 = require('vec3')
var builder=require("./sugarcane-builder/index.js");
var logger={
    log:function (msg){console.log(msg)},
    warn:function (msg){console.warn(msg)}
}
bot.on('chat', async (username, message) => {
    if (username === bot.username) return
    switch (message){
        case "build":{
            new builder.builder(bot,new vec3(-171,90,244),new vec3(-151,90,224),new vec3(-171,90,246),{dirt:new vec3(-174,93,247),reeds:new vec3(-174,92,247),torch:new vec3(-174,91,247),bucket:new vec3(-174,91,247)},['bucket','water_bucket'],logger)
            break
        }
    }
})
~~~