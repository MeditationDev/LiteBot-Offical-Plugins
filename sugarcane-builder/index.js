const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow } = require('mineflayer-pathfinder').goals
const vec3 = require('vec3')
const logger=require('../../../src/utils/logger')
var blockFaces=[vec3(0, 1, 0),vec3(0, -1, 0),vec3(1, 0, 0),vec3(-1, 0, 0),vec3(0, 0, 1),vec3(0, 0, -1)]
class Builder {
    constructor (bot,pos1,pos2,pos3,chests,expensiveNames) {
        const mcData = require('minecraft-data')(bot.version)
        var eventManager={goal_reached:function(){}};
        function once_event(name,cb){
            eventManager[name]=cb;
        }
        bot.on("goal_reached",goal_reached_handler);
        function goal_reached_handler(goal){
            eventManager.goal_reached(goal);
            eventManager.goal_reached=function (){}
        }
        bot.on('windowOpen', (window) => {
            window.on('windowUpdate', (slot, oldItem, newItem) => {
                if(window) {
                    if (slot >= window.inventoryStart && slot < window.inventoryEnd) {
                        slot -= window.inventoryStart - 9
                        if (newItem) newItem.slot = slot
                        bot.inventory.updateSlot(slot, newItem);
                    }
                }
            })
        })
        var blockNeedPlace={};
        blockNeedPlace.stage=0;
        blockNeedPlace.need="dirt";
        blockNeedPlace.dirt=[];
        blockNeedPlace.river=[];
        blockNeedPlace.riverCount=2;
        blockNeedPlace.water=[];
        blockNeedPlace.waterCount=0;
        blockNeedPlace.plank=[];
        blockNeedPlace.plankCount=0;
        blockNeedPlace.plankLCount=0;
        blockNeedPlace.reeds=[];
        blockNeedPlace.reedsCount=0;
        blockNeedPlace.torch=[];
        blockNeedPlace.torchCount=0;
        var x1,x2,y=pos1.y,z1,z2;
        if(pos1.x<pos2.x){
            x1=pos1.x;
            x2=pos2.x;
        }else{
            x1=pos2.x;
            x2=pos1.x;
        }
        if(pos1.z<pos2.z){
            z1=pos1.z;
            z2=pos2.z;
        }else{
            z1=pos2.z;
            z2=pos1.z;
        }
        for(var x=x1;x<(x2+1);x++){
            var plankCache=0;
            for(var z=z1;z<(z2+1);z++){
                var pos=new vec3(x,y,z);
                if(bot.blockAt(pos).type===0){
                    blockNeedPlace.dirt.push(pos);
                }
                pos=new vec3(x,y+1,z)
                if(bot.blockAt(pos).type===0&&blockNeedPlace.riverCount!==0){
                    blockNeedPlace.river.push(pos);
                }
                if((!(z===z1||z===z2))&&blockNeedPlace.riverCount!==0){
                    var RPos=new vec3(x,y+2,z)
                    if(bot.blockAt(RPos).type===0) {
                        blockNeedPlace.reeds.push(RPos);
                    }
                }
                if(blockNeedPlace.riverCount===0) {
                    blockNeedPlace.waterCount++;
                    if (blockNeedPlace.waterCount === 6) {
                        if(bot.blockAt(pos).type===0) {
                            blockNeedPlace.water.push(pos);
                        }

                        if(bot.blockAt(pos.offset(0,2,0)).type===0) {
                            blockNeedPlace.torch.push(pos.offset(0,2,0));
                        }
                        blockNeedPlace.waterCount=0;
                    }
                    if(!(z===z1||z===z2)){
                        var RPos=new vec3(x,y+2,z)
                        if(bot.blockAt(RPos).type===0) {
                            plankCache++;
                        }
                    }
                }
            }
            if(blockNeedPlace.riverCount===0){
                if(plankCache!==0) {
                    blockNeedPlace.plank.push(new vec3(x, y + 2, z1));
                }
                var pos=new vec3(x,y+1,z2);
                var RPos=new vec3(x,y+2,z2);
                if(bot.blockAt(pos).type===0){
                    blockNeedPlace.river.push(pos);
                }
                if(bot.blockAt(RPos).type===0) {
                    blockNeedPlace.reeds.push(RPos);
                }
                pos=new vec3(x,y+1,z1);
                RPos=new vec3(x,y+2,z1);
                if(bot.blockAt(pos).type===0){
                    blockNeedPlace.river.push(pos);
                }
                if(bot.blockAt(RPos).type===0) {
                    blockNeedPlace.reeds.push(RPos);
                }
            }
            blockNeedPlace.riverCount++;
            if(blockNeedPlace.riverCount===3){
                blockNeedPlace.riverCount=0;
                blockNeedPlace.waterCount=0;
            }
        }
        blockNeedPlace.waterCount=0;
        doBuild();
        function placeWater(){
            if(blockNeedPlace.water.length===blockNeedPlace.waterCount){
                blockNeedPlace.stage=3;
                blockNeedPlace.need="dirt";
                doBuild();
                return;
            }
            bot.pathfinder.setGoal(new GoalNear(pos3.x,pos3.y,pos3.z,1.5))
            once_event('goal_reached',function (){
                equipItem("bucket");
                setTimeout(function () {
                    waterInteract(pos3, vec3(0, 1, 0), function () {
                        bot.pathfinder.setGoal(new GoalNear(blockNeedPlace.water[blockNeedPlace.waterCount].x, blockNeedPlace.water[blockNeedPlace.waterCount].y, blockNeedPlace.water[blockNeedPlace.waterCount].z, 1.5))
                        once_event('goal_reached', function () {
                            equipItem("water_bucket");
                            setTimeout(function () {
                                waterInteract(blockNeedPlace.water[blockNeedPlace.waterCount], vec3(0, -1, 0),function (){
                                    blockNeedPlace.waterCount++;
                                    doBuild();
                                })
                            }, 500)
                        })
                    })
                },500)
            })
        }
        function placePlanks() {
            if (blockNeedPlace.plank.length === blockNeedPlace.plankCount) {
                blockNeedPlace.stage = 4;
                blockNeedPlace.need="reeds";
                doBuild();
                return;
            }
            equipBlock("dirt");
            if (blockNeedPlace.plankLCount === (z2 - z1)) {
                bot.pathfinder.setGoal(new GoalNear(blockNeedPlace.plank[blockNeedPlace.plankCount].x, blockNeedPlace.plank[blockNeedPlace.plankCount].y, blockNeedPlace.plank[blockNeedPlace.plankCount].z, 2.5))
            }else {
                bot.pathfinder.setGoal(new GoalNear(blockNeedPlace.plank[blockNeedPlace.plankCount].x, blockNeedPlace.plank[blockNeedPlace.plankCount].y, blockNeedPlace.plank[blockNeedPlace.plankCount].z + blockNeedPlace.plankLCount, 2.5))
            }
            once_event('goal_reached', function () {
                if(blockNeedPlace.plankLCount===(z2-z1)){
                    bot.dig(bot.blockAt(blockNeedPlace.plank[blockNeedPlace.plankCount]),function (err){
                        if (bot.blockAt(blockNeedPlace.plank[blockNeedPlace.plankCount]).type === 0) {
                            blockNeedPlace.plankLCount=0;
                            blockNeedPlace.plankCount++;
                            doBuild();
                        }
                    })
                }else {
                    safePlaceBlock(bot.blockAt(blockNeedPlace.plank[blockNeedPlace.plankCount].offset(0, 0, blockNeedPlace.plankLCount)), (err) => {
                        setTimeout(function () {
                            if (bot.blockAt(blockNeedPlace.plank[blockNeedPlace.plankCount].offset(0, 0, blockNeedPlace.plankLCount)).type !== 0) {
                                blockNeedPlace.plankLCount++;
                            }
                            doBuild();
                        }, 100)
                    })
                }
            })
        }
        function placeTorch(){
            if(blockNeedPlace.torch.length===blockNeedPlace.torchCount){
                blockNeedPlace.stage=6;
                doBuild();
                return;
            }
            bot.pathfinder.setGoal(new GoalNear(blockNeedPlace.torch[blockNeedPlace.torchCount].x, blockNeedPlace.torch[blockNeedPlace.torchCount].y, blockNeedPlace.torch[blockNeedPlace.torchCount].z, 2.5))
            equipItem("torch");
            once_event('goal_reached', function () {
                safePlaceBlock(bot.blockAt(blockNeedPlace.torch[blockNeedPlace.torchCount]),(err) => {
                    setTimeout(function (){
                        if(bot.blockAt(blockNeedPlace.torch[blockNeedPlace.torchCount]).type!==0){
                            blockNeedPlace.torchCount++;
                        }
                        doBuild();
                    },100)
                })
            })
        }
        function placeReeds(){
            if(blockNeedPlace.reeds.length===blockNeedPlace.reedsCount){
                blockNeedPlace.stage=5;
                blockNeedPlace.need="torch";
                doBuild();
                return;
            }
            bot.pathfinder.setGoal(new GoalNear(blockNeedPlace.reeds[blockNeedPlace.reedsCount].x, blockNeedPlace.reeds[blockNeedPlace.reedsCount].y, blockNeedPlace.reeds[blockNeedPlace.reedsCount].z, 2.5))
            equipItem("reeds");
            once_event('goal_reached', function () {
                safePlaceBlock(bot.blockAt(blockNeedPlace.reeds[blockNeedPlace.reedsCount]),(err) => {
                    setTimeout(function (){
                        if(bot.blockAt(blockNeedPlace.reeds[blockNeedPlace.reedsCount]).type!==0){
                            blockNeedPlace.reedsCount++;
                        }
                        doBuild();
                    },100)
                })
            })
        }
        function placeDirt(){
            var pos=getNearestBlock();
            if(blockNeedPlace.dirt.length===1){
                pos=blockNeedPlace.dirt[0];
                blockNeedPlace.dirt=[]
            }
            if(pos==="NO_MORE"){
                return
            }
            bot.pathfinder.setGoal(new GoalNear(pos.x,pos.y,pos.z,1.5))
            once_event('goal_reached',function(){
                equipBlock('dirt');
                safePlaceBlock(bot.blockAt(pos),(err) => {
                    setTimeout(function (){
                        if(bot.blockAt(pos).type!==0){
                            var c=-1
                            if(pos.c!=null){
                                c=pos.c;
                            }
                            blockNeedPlace.dirt.splice(c,1);
                        }
                        doBuild();
                    },100)
                })
            })
        }
        function getNearestBlock(){
            if(blockNeedPlace.dirt.length===0){
                if(blockNeedPlace.stage===0) {
                    blockNeedPlace.stage = 1;
                    blockNeedPlace.dirt=blockNeedPlace.river;
                }else{
                    blockNeedPlace.stage = 2;
                    blockNeedPlace.need="bucket";
                }
                doBuild();
                return "NO_MORE";
            }
            var pos=bot.entity.position,count=0,rmCount=0,near=null,dist=10000;
            blockNeedPlace.dirt.forEach(function (vec){
                var dis=vec.distanceTo(pos);
                if(dis<dist){
                    rmCount=count;
                    near=vec;
                    dist=dis;
                }
                count++;
            })
            near.c=rmCount;
            return near;
        }
        function doBuild(){
            if(blockNeedPlace.need!="unknown"&&chests[blockNeedPlace.need]!=undefined){
                var BlockId=mcData['itemsByName'][blockNeedPlace.need].id;
                if(BlockId==0){
                    BlockId=mcData['blocksByName'][blockNeedPlace.need].id;
                }
                if(expensiveNames!=="NO") {
                    var moreItemList = hasMoreItem(BlockId);
                    if (moreItemList.length !== 0) {
                        var slCount = 0;
                        for (var s in moreItemList) {
                            var sl = moreItemList[s];
                            setTimeout(function (sl) {
                                dropItem(sl);
                            }, slCount * 500, sl)
                            slCount++;
                        }
                        setTimeout(function () {
                            doBuild()
                        }, (slCount + 1) * 500)
                        return;
                    }
                }
                if(hasItem(BlockId)<1){
                    bot.pathfinder.setGoal(new GoalNear(chests[blockNeedPlace.need].x,chests[blockNeedPlace.need].y,chests[blockNeedPlace.need].z,4))
                    once_event('goal_reached', function () {
                        var chest = bot.openChest(bot.blockAt(chests[blockNeedPlace.need]))
                        chest.on('open', () => {
                            setTimeout(function (){
                                var BlockCount=chest.count(BlockId);
                                if(BlockCount>640){
                                    BlockCount=640;
                                }
                                chest.withdraw(BlockId, null, BlockCount,function (){
                                    setTimeout(function (){
                                        chest.close();
                                        setTimeout(function (){
                                            doBuild();
                                        },500)
                                    },5000)
                                })
                            },1000)
                        })
                    })
                    return;
                }
            }
            switch (blockNeedPlace.stage){
                case 0:{
                    placeDirt();
                    break
                }
                case 1:{
                    placeDirt();
                    break
                }
                case 2:{
                    placeWater();
                    break
                }
                case 3:{
                    placePlanks();
                    break
                }
                case 4:{
                    placeReeds();
                    break
                }
                case 5:{
                    placeTorch();
                    break
                }
                case 6:{
                    break
                }
            }
        }
        function waterInteract(pos,vec,cb){
            bot.pathfinder.setGoal(new GoalNear(pos.x,pos.y,pos.z,2));
            once_event('goal_reached',function (){
                var bl=bot.blockAt(pos);
                bot.placeBlock(bl,vec, (err) => {
                    bot.activateItem()
                    setTimeout(function (){
                        bot.deactivateItem();
                        cb();
                    },10)
                })
            })
        }
        function equipItem (name) {
            bot.equip(mcData['itemsByName'][name].id, 'hand', (err) => {
                if (err) {
                    logger.warn(`unable to equip ${name}: ${err.message}`)
                }
            })
        }
        function equipBlock (name) {
            bot.equip(mcData['blocksByName'][name].id, 'hand', (err) => {
                if (err) {
                    logger.warn(`unable to equip ${name}: ${err.message}`)
                }
            })
        }
        function hasItem(id){
            const items = bot.inventory.itemsRange(0, bot.inventory.inventoryEnd)
            var count=0;
            for (const iIndex in items) {
                if(items[iIndex].type===id){
                    count+=items[iIndex].count
                }
            }
            return count;
        }
        function hasMoreItem(id){
            const items = bot.inventory.itemsRange(0, bot.inventory.inventoryEnd)
            var more=[];
            for (const iIndex in items) {
                if(items[iIndex].type!==id&&items[iIndex].type!==0&&!expensiveNames.includes(items[iIndex].name)){
                    more.push(items[iIndex]);
                }
            }
            return more;
        }
        function safePlaceBlock(block,callback){
            if(block.type!==0){
                callback();
            }
            if(Math.floor(block.position.y)===Math.floor(bot.entity.position.y)&&Math.floor(block.position.x/2)===Math.floor(bot.entity.position.x/2)&&Math.floor(block.position.z/2)===Math.floor(bot.entity.position.z/2)){
                const jumpY = Math.floor(bot.entity.position.y) + 1.0
                bot.setControlState('jump', true)
                bot.on('move', placeIfHighEnough)
                function placeIfHighEnough () {
                    if (bot.entity.position.y > jumpY) {
                        bot.placeBlock(block, vec3(0, -1, 0), callback)
                        bot.setControlState('jump', false)
                        bot.removeListener('move', placeIfHighEnough)
                    }
                }
            }else {
                var blockface = vec3(0, -1, 0), dist = 0;
                for (var i = 0; i < blockFaces.length; i++) {
                    var blockTmp = bot.blockAt(block.position.offset(blockFaces[i].x, blockFaces[i].y, blockFaces[i].z));
                    if (blockTmp.type !== 0) {
                        if (bot.entity.position.distanceTo(blockTmp.position) > dist && bot.canSeeBlock(blockTmp)) {
                            dist = bot.entity.position.distanceTo(blockTmp.position)
                            blockface = blockFaces[i];
                        }
                    }
                }
                bot.placeBlock(block, blockface, callback);
            }
        }
        function dropItem(item){
            bot._client.write('window_click', {
                windowId: 0,
                slot:item.slot,
                mouseButton:1,
                action: 1,
                mode:4,
                item: item
            })
            bot.inventory.updateSlot(item.slot,null);
            bot.closeWindow(bot.inventory)
        }
    }
}
module.exports= {
    onLoad: function () {},
    builder:Builder,
    data: {
        name:"Sugarcane Builder",
        id:"sugarcane-builder",
        version:"1.0"
    }
}