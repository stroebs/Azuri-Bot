import dotenv from "dotenv";
import { Client, Intents, Discord } from "discord.js";
import { getVoiceConnection } from '@discordjs/voice';
import fs from "fs";
import * as Utils from "./utils/utils.mjs";
import * as GuildUtils from "./utils/guilds.mjs";
import voiceCtl from "./commands/join.mjs";

dotenv.config();
import { Client, GatewayIntentBits } from "discord.js";
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
});
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".mjs"));

commandFiles.forEach(async (file) => {
    let commandObj = await
        import(`./commands/${file}`);
    let command = commandObj.default;

    client.commands.set(command.name, command);
    console.log(`Registered Command - ${command.name}`);

    if (command.aliases) {
        command.aliases.forEach((alias) => {
            client.aliases.set(alias, command);
        });
    }
});

client.on("ready", async () => {
    console.log(`Bot has Started`);

    var prefix = process.env.DEFAULT_PREFIX;
    var activityMessage = process.env.STATUS_MESSAGE.replace("{prefix}", prefix);
    var activityType = process.env.ACTIVITY_TYPE;
    var statusType = process.env.STATUS_TYPE;
    client.user.setPresence({ activities: [{ name: activityMessage, type: Discord.ActivityType[activityType] }], status: statusType });

    if (statusType) client.user.setStatus(statusType);

    let guildData = GuildUtils.loadGuildData();

    guildData.forEach((serverData) => {
        if (!serverData.home) return;

        voiceCtl.execute(client, serverData, "botHomeRoom");
    });
});

client.on("guildDelete", (guild) => {
    console.log(`The bot was removed from guild: ${guild.name} (${guild.id})`);
});

client.on("guildCreate", (guild) => {
    GuildUtils.getForGuild(guild);

    return console.log(`The bot was added to: ${guild.name} (${guild.id})`);
});

client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    if (!message.guild)
        return message.channel.send("⚠ - Sorry my DM's are closed!");

    let serverData = GuildUtils.getForGuild(message.guild);

    var prefix = process.env.DEFAULT_PREFIX;
    if (serverData.prefix) prefix = serverData.prefix;
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName) && !client.aliases.has(commandName)) {
        return;
    } else {
        const cmd =
            client.commands.get(commandName) ||
            client.commands.find(
                (cmd) => cmd.aliases && cmd.aliases.includes(commandName)
            );

        try {
            var serverCommands = serverData.commands;

            if (serverCommands[commandName]) {
                var command = serverCommands[commandName];

                if (!message.channel.permissionsFor(message.member).has(Discord.PermissionFlagsBits.ManageGuild) ||
                    !message.channel.permissionsFor(message.member).has(Discord.PermissionFlagsBits.Administrator)
                ) {
                    if (command.private !== true) {
                        if (command.enabled === false)
                            return message.channel.send("❌ - This command is disabled.");
                        if (command.type === "role") {
                            if (!message.member.roles.cache.has(command.id))
                                return message.channel.send(
                                    "❌ - Oh No! You've not got permission to use that!"
                                );
                        } else if (command.type === "user") {
                            if (message.author.id !== command.id)
                                return message.channel.send(
                                    "❌ - Oh No! You've not got permission to use that!"
                                );
                        } else if (command.type === "permission") {
                            console.log(
                                message.channel
                                    .permissionsFor(message.member)
                                    .has(command.permission)
                            );
                            console.log(command.permission);
                            if (
                                message.channel
                                    .permissionsFor(message.member)
                                    .has(command.permission)
                            )
                                return message.channel.send(
                                    "❌ - Oh No! You've not got permission to use that!"
                                );
                        }
                    }
                }
            }

            cmd.execute(client, serverData, message, args);
        } catch (error) {
            Utils.logError(new Date(), error);
            message.channel.send(
                `🚫 - Oops! Something went wrong. Please contact Ninja#4321 with reference \`${new Date()}\``
            );
        }
    }
});

global.sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

client.on('voiceStateUpdate', (oldState, newState) => {
  // Get the current voice connection for the guild
  const connection = getVoiceConnection(oldState.guild.id);
  if (!connection) return; // The bot is not connected to a voice channel

  // Get the ID of the voice channel the bot is connected to
  const botChannelId = connection.joinConfig.channelId;

  // Fetch the voice channel the bot is connected to
  const botVoiceChannel = oldState.guild.channels.cache.get(botChannelId);
  if (!botVoiceChannel) return; // Voice channel not found

  // Filter out bots from the member list
  const humanMembers = botVoiceChannel.members.filter(member => !member.user.bot);

  // If no human members are left, destroy the connection
  if (humanMembers.size === 0) {
    connection.destroy();
    console.log(`Disconnected from voice channel ${botVoiceChannel.name} as it is now empty.`);
  }
});


client.login(process.env.BOT_TOKEN);
