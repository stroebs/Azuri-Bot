import dotenv from 'dotenv';
import { ShardingManager } from 'discord.js';
import fs from 'fs';
import * as Utils from './utils/utils.mjs';

dotenv.config();

/*if (!fs.existsSync('./persist/guilds.json')) {
    fs.copyFile('./persist/guilds.json.example', './persist/guilds.json', (err) => { 
        if (err) { 
          console.log("Error Found:", err); 
        }
    });
}*/

const manager = new ShardingManager('./index.mjs', { token: process.env.BOT_TOKEN });
manager.on('shardCreate', shard => console.log(`Starting Shard: ${shard.id}`));
manager.spawn();

process.on('unhandledRejection', error => {
  try {
    Utils.logError(new Date(), error);
  } catch (error) {
    console.error(error);
  }
});

process.on('warning', warn => {
  try {
    Utils.logError(new Date(), warn);
  } catch (error) {
    console.error(error);
  }
});
