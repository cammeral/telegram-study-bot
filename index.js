require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// هنا تحط أوامر البوت الأساسية، مثلاً:
bot.start((ctx) => ctx.reply('أهلاً! بوتك شغال بنظام Webhook'));

// إنشاء تطبيق Express
const app = express();

// هذا المسار اللي تيليجرام سيرسل له التحديثات (Webhook endpoint)
app.use(bot.webhookCallback('/bot'));

// ضبط Webhook على تيليجرام بناءً على رابط سيرفرك
(async () => {
  const url = process.env.SERVER_URL; // رابط المشروع على Vercel
  if (!url) {
    console.error('❌ يجب تعيين SERVER_URL في ملف .env');
    process.exit(1);
  }

  await bot.telegram.setWebhook(`${url}/bot`);
  console.log('✅ تم تعيين Webhook بنجاح');
})();

// تشغيل السيرفر على المنفذ المناسب
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
