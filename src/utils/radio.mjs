import { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnectionStatus, getVoiceConnection, AudioPlayerStatus, entersState } from "@discordjs/voice";

export function playRadio(message, url, channel, guild){
    if (getVoiceConnection(guild ?? message.guild.id)) {
        getVoiceConnection(guild ?? message.guild.id).destroy();
    }

    const connection = joinVoiceChannel({
        channelId: channel ? channel.id : message.member.voice.channel.id,
        guildId: guild ? guild.id : message.guild.id,
        adapterCreator: channel ? channel.guild.voiceAdapterCreator : message.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        stopPlaying(message.guild.id);
    });

    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
        },
    });

    connection.subscribe(player);

    const resource = createAudioResource(url, {
        inputType: StreamType.Arbitrary,
    });

    player.play(resource);

    player.on(AudioPlayerStatus.Idle, async () => {
        const newResource = createAudioResource(url, {
            inputType: StreamType.Arbitrary,
        });
        await entersState(connection, VoiceConnectionStatus.Ready, 5e3).catch(() => { });
        player.play(newResource);
    });

    return player;
}