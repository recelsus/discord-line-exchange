require("dotenv").config();
const express = require("express");
const line = require("@line/bot-sdk");
const { env } = require("process");
const { Client, Intents } = require('discord.js');
const exchanges = require("./exchanges.js");

const PORT = process.env.PORT || 65000;

const line_config = {
  channelAccessToken: process.env.line_access_token,
  channelSecret: process.env.line_secret_token
};

const express_client = express();

express_client.get('/', (req, res) => res.send('express listening "OK"'));
express_client.post('/', line.middleware(line_config), (req, res) => {
  Promise
    .all(req.body.events.map(LINE_handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

express_client.listen(PORT, () => {
  console.log(`Listening start {PORT} on LINE`);
});

const line_client = new line.Client(line_config);

const discord_client = new Client({ intents: Object.keys(Intents.FLAGS) });

discord_client.on('ready', () => {
  console.log(`${discord_client.user.tag} SUCCESS on Discord`);
});

discord_client.on('messageCreate', async discord_event => {
  if (discord_event.author.tag !== discord_client.user.tag) {
    send_to_LINE(discord_event);
  }
});

discord_client.login(process.env.discord_Token);

async function LINE_handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const line_message = event.message.text;
  const line_groupID = event.source.groupId;

  const profile = await line_client.getProfile(event.source.userId);
  const line_userName = profile.displayName;

  const discord_groupID = (exchanges.group[line_groupID] !== undefined) ? exchanges.group[line_groupID] : process.env.default_discordchannel;
  let discord_userName = (exchanges.name[line_userName] !== undefined) ? exchanges.name[line_userName] : line_userName;

  if (exchanges.group[line_groupID] == undefined) {
    discord_userName = line_groupID + " / " + discord_userName;
  }

  const forDiscord = { "discord_channel_id": discord_groupID, "send_Message": discord_userName + " : [ " + line_message + " ]" };

  discord_client.channels.cache.get(forDiscord.discord_channel_id).send(forDiscord.send_Message);
}

async function send_to_LINE(discord_event) {

  const forLINE = {
    "type": "text",
    "text": discord_event.author.username + "[ " + discord_event.content + " ]"
  };

  const discord_channelID = discord_event.channel.id;
  const line_groupID = (exchanges.group[discord_channelID] !== undefined) ? exchanges.group[discord_channelID] : process.env.default_discordchannel;

  line_client.pushMessage(line_groupID, forLINE).then(() => { }).catch((err) => { console.log(err); });
}




