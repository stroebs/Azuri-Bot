import * as L from "../locale/locales.mjs";
import { createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnection, AudioPlayerStatus, NoSubscriberBehavior, VoiceConnectionStatus, entersState, StreamType } from "@discordjs/voice";
import Discord from "discord.js";
import ffmpeg from "ffmpeg";
import fs from "fs";
let radioURL, voiceChannel, dispatcher, player;

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

            var connection;
            try {
                connection = await joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });
            } catch (e) {
                try {
                    return message.channel.send(L._U(guildData.locale, "no_join"));
                } catch (e) {
                    if (guildData.home) {
                        let s = client.channels.cache.get(guildData.home)
                        if (s) s.guild.channels.cache.filter((c) => c.type === Discord.ChannelType.GuildText)
                            .find((x) => x.position == 0)
                            .send(L._U(guildData.locale, "no_join"));
                    }
                }
            }
            await entersState(connection, VoiceConnectionStatus.Ready, 5e3).catch(() => { });
            
            try {
                player = createAudioPlayer({
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Play
                    },
                });
                dispatcher = await connection.subscribe(player);
                const resource = createAudioResource(radioURL, {
                    inputType: StreamType.Arbitrary,
                });

                player.play(resource);
                player.on(AudioPlayerStatus.Idle, async() => {
                    const newResource = createAudioResource(radioURL, {
                        inputType: StreamType.Arbitrary,
                    });
                    await sleep(5000)
                    player.play(newResource);
                });
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
            global.connection = await joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                selfMute: false,
                selfDeaf: true,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
        } catch (e) {
            console.log(e);
            return message.channel.send(L._U(guildData.locale, "no_join"));
        }

        try {
            const connection = await getVoiceConnection(message.guild.id);

            await entersState(connection, VoiceConnectionStatus.Ready, 5e3).catch(() => { });

            player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                },
            });
            dispatcher = await connection.subscribe(player);
            const resource = createAudioResource(radioURL, {
                inputType: StreamType.Arbitrary,
            });

            player.play(resource);

            player.on(AudioPlayerStatus.Idle, async () => {
                const newResource = createAudioResource(radioURL, {
                    inputType: StreamType.Arbitrary,
                });
                await entersState(connection, VoiceConnectionStatus.Ready, 5e3).catch(() => { });
                player.play(newResource);
            });
        } catch (e) {
            console.log(e);
            message.channel.send(L._U(guildData.locale, "stream_error"));
        }
    },
};