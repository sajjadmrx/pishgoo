// get rid of NodeTelegramBotApi deprecation warning
process.env.NTBA_FIX_319 = 1;

const TelegramBot = require('node-telegram-bot-api');

const { getConfigs } = require('./configs');
const Statistics = require('./models/statistics');

const configs = getConfigs();

const messages = require('./data/messages');

const getMessageRes = require('./utils/getMessageRes');
const { QuoteApi } = require('./services/quoteApi');
const createPredictionQuoteRes = require('./utils/createPredictionQuoteRes');

let bot;
if (configs.useTorProxy === 'true') {
	bot = new TelegramBot(configs.botToken, {
		polling: !configs.isProduction,
		request: { proxy: 'http://127.0.0.1:8118', url: 'http://google.com' },
	});
} else {
	bot = new TelegramBot(configs.botToken, { polling: !configs.isProduction });
}

bot.onText(/\/start/, (message) => {
	if (!message.entities) return;
	if (
		message.entities.length !== 1 ||
		message.entities[0].type !== 'bot_command' ||
		message.entities[0].offset !== 0 ||
		message.entities[0].length !== message.text.length
	)
		return;
	bot.sendMessage(message.chat.id, messages.welcome, {
		reply_to_message_id: message.message_id,
		parse_mode: 'HTML',
	});
});

bot.on('message', (message) => {
	if (!message.dice) return;
	const { emoji, value } = message.dice;

	if (message.from?.id) {
		Statistics.create({
			userId: message.from.id,
			chat: {
				id: message.chat.id,
			},
		});
	}

	bot.sendMessage(message.chat.id, getMessageRes(emoji, value), {
		reply_to_message_id: message.message_id,
	});
});

bot.onText(/\/predict/, async (message) => {
	if (!message.entities) return;
	if (
		message.entities.length !== 1 ||
		message.entities[0].type !== 'bot_command' ||
		message.entities[0].offset !== 0 ||
		message.entities[0].length !== message.text.length
	)
		return;
	const quoteData = await QuoteApi.getRandomQuote('future-prediction');
	bot.sendMessage(message.chat.id, createPredictionQuoteRes(quoteData), {
		reply_to_message_id: message.message_id,
	});
});

bot.onText(/when am i (going to|gonna) die/i, (message) => {
	bot.sendMessage(
		message.chat.id,
		'<pre language="javascript">> Uncaught TypeError: God.getDeathDateOf is not a function</pre>',
		{
			reply_to_message_id: message.message_id,
			parse_mode: 'HTML',
		},
	);
});

module.exports = bot;
