import * as L from "../locale/locales.mjs";
import { createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnection, AudioPlayerStatus, NoSubscriberBehavior, VoiceConnectionStatus, entersState, StreamType } from "@discordjs/voice";
import Discord from "discord.js";
import ffmpeg from "ffmpeg";
import fs from "fs";
let radioURL, voiceChannel, dispatcher, player;
import * as radio from "../utils/radio.mjs";

export default {
    name: "join",
    aliases: ["j", "play", "start"],
    description: L._U("en", "desc_join"),
    execute: async(client, guildData, message, ...args) => {
        console.log("Join command executed");
        if (message === "botHomeRoom") {
            radioURL = guildData.url;
            voiceChannel = guildData.home;

            let channel = client.channels.cache.get(guildData.home);
            if (!channel) return;

            // Get currently connected members
            let humanMembers = channel.members.filter(member => !member.user.bot);
            
            // If no human members are left, destroy the connection
            if (humanMembers.size === 0) {
                console.log(`Did not join ${channel.name} as it is empty.`);
                return;
            }
            
            try {
                radio.playRadio(message, radioURL, channel, channel.guild);
            } catch (e) {
                try {
                    console.log(e);
                    message.channel.send(L._U(guildData.locale, "stream_error"));
                } catch (e) {
                    if (guildData.home) {
                        let s = client.channels.cache.get(guildData.home)
                        if (s) s.guild.channels.cache.filter((c) => c.type === Discord.ChannelType.GuildText)
                            .find((x) => x.position == 0)
                            .send(L._U(guildData.locale, "stream_error"));
                    }
                }
            }
            return;
        }

        if (!message.guild)
            return message.channel.send(L._U(guildData.locale, "server_only"));
        if (!guildData.url)
            return message.channel.send(L._U(guildData.locale, "no_radio_url"));

        if (args[0][0] === "home") {
            if (!guildData.home)
                return message.channel.send(L._U(guildData.locale, "no_home_room"));

            let channel = client.channels.cache.get(guildData.home);

            if (!channel)
                return message.channel.send(L._U(guildData.locale, "no_find_voice"));

            // Get currently connected members
            let humanMembers = channel.members.filter(member => !member.user.bot);
            
            // If no human members are left, destroy the connection
            if (humanMembers.size === 0) {
                console.log(`Did not join ${channel.name} as it is empty.`);
                return;
            }

            radioURL = guildData.url;
            voiceChannel = channel;
        } else if (args[0][0] === "test") {
            if (!message.member.voice.channel)
                return message.channel.send(L._U(guildData.locale, "no_find_voice"));

            message.channel.send("Playing testing audio!");

            radioURL = "./audio/template.mp3";
            voiceChannel = message.member.voice.channel;
        } else {
            if (!message.member.voice.channel)
                return message.channel.send(L._U(guildData.locale, "no_find_voice"));

            radioURL = guildData.url;
            voiceChannel = message.member.voice.channel;
        }

        try {
            radio.playRadio(message, radioURL, voiceChannel);
        } catch (e) {
            console.log(e);
            message.channel.send(L._U(guildData.locale, "stream_error"));
        }
    },
};
