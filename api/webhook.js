import { Telegraf } from 'telegraf';
import 'dotenv/config'; // لتحميل .env
import keyboards from '../keyboards.js'; // حسب ما عندك
import utils from '../utils.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

// أمثلة بسيطة
bot.start((ctx) => {
  ctx.reply('أهلاً بك في بوت الكتب!', keyboards.mainMenu);
});

// أكمل باقي الأوامر حسب ما في bot.js

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error('خطأ:', err);
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('بوت تيليجرام يعمل 🎉');
  }
}
