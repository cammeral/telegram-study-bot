require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const { 
  formatSchedule, 
  formatHomework, 
  formatGrades, 
  formatReminders,
  formatDate,
  escapeMarkdown,
  isValidDate,
  addTimeToDate
} = require('./utils');
const { 
  mainKeyboard, 
  daysKeyboard, 
  remindersKeyboard,
  confirmKeyboard,
  backKeyboard,
  timeUnitsKeyboard,
  adminKeyboard
} = require('./keyboards');

const bot = new Telegraf(process.env.BOT_TOKEN);

// تخزين الوظائف المجدولة
const scheduledJobs = {};

// تخزين معلومات المستخدمين
const users = {};
const questions = {};

// تهيئة الجلسة
bot.use(session());

// تهيئة تخزين الجلسة
bot.use((ctx, next) => {
  if (!ctx.session) {
    ctx.session = {
      homework: [],
      grades: [],
      schedule: {},
      tempData: {}
    };
  }
  
  // تسجيل المستخدم
  if (ctx.from) {
    const userId = ctx.from.id;
    if (!users[userId]) {
      users[userId] = {
        id: userId,
        username: ctx.from.username || 'بدون معرف',
        firstName: ctx.from.first_name || 'بدون اسم',
        lastName: ctx.from.last_name || '',
        joined: new Date()
      };
      
      // إرسال إشعار للمشرف
      const adminMessage = `👤 *مستخدم جديد انضم إلى البوت!*\n\n` +
                          `🆔 *المعرف:* ${userId}\n` +
                          `👤 *الاسم:* ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
                          `🔖 *المعرف:* @${ctx.from.username || 'غير متوفر'}\n` +
                          `⏰ *الوقت:* ${formatDate(new Date())}`;
      
      if (process.env.ADMIN_CHAT_ID) {
        ctx.telegram.sendMessage(
          process.env.ADMIN_CHAT_ID, 
          escapeMarkdown(adminMessage),
          { parse_mode: 'MarkdownV2' }
        );
      }
    }
  }
  
  return next();
});

// بدء البوت (محسن)
bot.start((ctx) => {
  const welcomeMessage = `
🎓 *مرحباً بك في بوت تنظيم الدراسة المتقدم!*

📚 هذا البوت سيساعدك على:
• إدارة واجباتك المدرسية
• تتبع درجاتك
• تنظيم جدولك الأسبوعي
• تذكيرك بالمواعيد المهمة
• التواصل مع المشرف

⚙️ اختر أحد الخيارات من القائمة أدناه للبدء:
  `;
  
  ctx.replyWithMarkdownV2(escapeMarkdown(welcomeMessage), mainKeyboard);
  
  // تسجيل بدء المحادثة للمشرف
  logActionToAdmin(ctx, `بدأ المستخدم المحادثة`);
});

// دالة لتسجيل الإجراءات للمشرف
function logActionToAdmin(ctx, action) {
  if (!process.env.ADMIN_CHAT_ID) return;
  
  const userId = ctx.from.id;
  const userInfo = users[userId] || {};
  
  const message = `📝 *إجراء جديد من المستخدم:*\n\n` +
                 `👤 *المستخدم:* ${userInfo.firstName} ${userInfo.lastName}\n` +
                 `🆔 *المعرف:* ${userId}\n` +
                 `🔖 *المعرف:* @${userInfo.username}\n\n` +
                 `⚡ *الإجراء:*\n${action}\n\n` +
                 `⏰ *الوقت:* ${formatDate(new Date())}`;
  
  ctx.telegram.sendMessage(
    process.env.ADMIN_CHAT_ID, 
    escapeMarkdown(message),
    { parse_mode: 'MarkdownV2' }
  );
}

// دالة لإعادة توجيه الرسالة للمشرف
function forwardToAdmin(ctx, message) {
  if (!process.env.ADMIN_CHAT_ID) return null;
  
  return ctx.telegram.sendMessage(
    process.env.ADMIN_CHAT_ID, 
    escapeMarkdown(message),
    { parse_mode: 'MarkdownV2' }
  );
}

// معالجة الأوامر الرئيسية
bot.hears('➕ إضافة واجب', (ctx) => {
  ctx.reply('📝 رجاءً اكتب الواجب الذي تريد إضافته:', backKeyboard);
  ctx.session.inputMode = 'ADD_HOMEWORK';
  logActionToAdmin(ctx, 'بدأ إضافة واجب');
});

bot.hears('📊 إضافة درجة', (ctx) => {
  ctx.reply('🎯 رجاءً اكتب الدرجة على الصورة: "المادة:الدرجة"\nمثال: الرياضيات:90', backKeyboard);
  ctx.session.inputMode = 'ADD_GRADE';
  logActionToAdmin(ctx, 'بدأ إضافة درجة');
});

bot.hears('🗓️ إضافة جدول', (ctx) => {
  ctx.reply('📅 اختر اليوم الذي تريد إضافة جدوله:', daysKeyboard);
  logActionToAdmin(ctx, 'بدأ إضافة جدول');
});

bot.hears('📝 عرض الواجبات', (ctx) => {
  ctx.replyWithMarkdownV2(formatHomework(ctx.session.homework), mainKeyboard);
  logActionToAdmin(ctx, 'عرض الواجبات');
});

bot.hears('📈 عرض الدرجات', (ctx) => {
  ctx.replyWithMarkdownV2(formatGrades(ctx.session.grades), mainKeyboard);
  logActionToAdmin(ctx, 'عرض الدرجات');
});

bot.hears('📅 عرض الجدول', (ctx) => {
  ctx.replyWithMarkdownV2(formatSchedule(ctx.session.schedule), mainKeyboard);
  logActionToAdmin(ctx, 'عرض الجدول');
});

bot.hears('❌ حذف واجب', (ctx) => {
  if (ctx.session.homework.length === 0) {
    ctx.reply('📭 لا يوجد واجبات لحذفها.', mainKeyboard);
    return;
  }
  
  ctx.replyWithMarkdownV2(`🗑️ اختر رقم الواجب الذي تريد حذفه:\n\n${formatHomework(ctx.session.homework)}`, backKeyboard);
  ctx.session.inputMode = 'DELETE_HOMEWORK';
  logActionToAdmin(ctx, 'بدأ حذف واجب');
});

bot.hears('❌ حذف درجة', (ctx) => {
  if (ctx.session.grades.length === 0) {
    ctx.reply('📭 لا يوجد درجات لحذفها.', mainKeyboard);
    return;
  }
  
  ctx.replyWithMarkdownV2(`🗑️ اختر رقم الدرجة التي تريد حذفها:\n\n${formatGrades(ctx.session.grades)}`, backKeyboard);
  ctx.session.inputMode = 'DELETE_GRADE';
  logActionToAdmin(ctx, 'بدأ حذف درجة');
});

bot.hears('⏰ إدارة التذكيرات', (ctx) => {
  ctx.reply('⏰ إدارة تذكيرات الواجبات:', remindersKeyboard);
  logActionToAdmin(ctx, 'فتح إدارة التذكيرات');
});

bot.hears('❓ طرح سؤال للمشرف', (ctx) => {
  ctx.reply('📩 اكتب سؤالك للمشرف وسأقوم بإرساله:', backKeyboard);
  ctx.session.inputMode = 'ASK_QUESTION';
  logActionToAdmin(ctx, 'بدأ طرح سؤال للمشرف');
});

// معالجة أيام الأسبوع
const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
days.forEach(day => {
  bot.hears(day, (ctx) => {
    ctx.session.tempData.day = day;
    ctx.reply(`📝 اكتب المواد ليوم ${day} (مفصولة بفاصلة):\nمثال: رياضيات, لغة عربية, علوم`, backKeyboard);
    ctx.session.inputMode = 'ADD_SCHEDULE';
    logActionToAdmin(ctx, `بدأ إضافة جدول ليوم ${day}`);
  });
});

// معالجة إدارة التذكيرات
bot.hears('⏰ إضافة تذكير', (ctx) => {
  if (ctx.session.homework.length === 0) {
    ctx.reply('📭 لا يوجد واجبات لإضافة تذكير لها.', mainKeyboard);
    return;
  }
  
  ctx.replyWithMarkdownV2(`🔔 اختر رقم الواجب الذي تريد إضافة تذكير له:\n\n${formatHomework(ctx.session.homework)}`, backKeyboard);
  ctx.session.inputMode = 'SELECT_HOMEWORK_FOR_REMINDER';
  logActionToAdmin(ctx, 'بدأ إضافة تذكير');
});

bot.hears('👁️ عرض التذكيرات', (ctx) => {
  ctx.replyWithMarkdownV2(formatReminders(ctx.session.homework), remindersKeyboard);
  logActionToAdmin(ctx, 'عرض التذكيرات');
});

bot.hears('❌ حذف تذكير', (ctx) => {
  const reminders = ctx.session.homework.filter(hw => hw.reminder);
  
  if (reminders.length === 0) {
    ctx.reply('📭 لا يوجد تذكيرات لحذفها.', remindersKeyboard);
    return;
  }
  
  ctx.replyWithMarkdownV2(`🗑️ اختر رقم التذكير الذي تريد حذفه:\n\n${formatReminders(ctx.session.homework)}`, backKeyboard);
  ctx.session.inputMode = 'DELETE_REMINDER';
  logActionToAdmin(ctx, 'بدأ حذف تذكير');
});

// معالجة الرجوع للقائمة الرئيسية
bot.hears('🏠 القائمة الرئيسية', (ctx) => {
  ctx.session.inputMode = null;
  ctx.reply('🏠 الرجوع للقائمة الرئيسية:', mainKeyboard);
});

// معالجة الرسائل النصية
bot.on('text', (ctx) => {
  const text = ctx.message.text;
  
  // تسجيل كل رسالة للمشرف
  logActionToAdmin(ctx, `أرسل رسالة: ${text}`);
  
  switch (ctx.session.inputMode) {
    case 'ADD_HOMEWORK':
      ctx.session.tempData.homework = {
        text: text,
        date: new Date()
      };
      ctx.reply('⏰ هل ترغب في إضافة موعد تسليم للواجب؟ (مثال: 2025-07-20 14:30)', confirmKeyboard);
      ctx.session.inputMode = 'ADD_HOMEWORK_DUEDATE';
      break;
      
    case 'ADD_HOMEWORK_DUEDATE':
      if (text === '✅ نعم') {
        ctx.reply('📅 الرجاء إدخال موعد التسليم (YYYY-MM-DD HH:mm):\nمثال: 2025-07-20 14:30', backKeyboard);
        ctx.session.inputMode = 'SET_HOMEWORK_DUEDATE';
      } else {
        ctx.session.homework.push(ctx.session.tempData.homework);
        ctx.session.inputMode = null;
        ctx.reply('✅ تم إضافة الواجب بنجاح!', mainKeyboard);
        
        // إرسال إشعار للمشرف
        forwardToAdmin(ctx, `📝 *تمت إضافة واجب جديد:*\n\n${ctx.session.tempData.homework.text}`);
      }
      break;
      
    case 'SET_HOMEWORK_DUEDATE':
      if (isValidDate(text)) {
        ctx.session.tempData.homework.dueDate = new Date(text);
        ctx.reply('⏰ هل ترغب في إضافة تذكير قبل الموعد؟', confirmKeyboard);
        ctx.session.inputMode = 'ADD_HOMEWORK_REMINDER';
      } else {
        ctx.reply('❌ صيغة التاريخ غير صحيحة. الرجاء استخدام الصيغة: YYYY-MM-DD HH:mm');
      }
      break;
      
    case 'ADD_HOMEWORK_REMINDER':
      if (text === '✅ نعم') {
        ctx.reply('⏱️ اختر الفترة الزمنية للتذكير:', timeUnitsKeyboard);
        ctx.session.inputMode = 'SELECT_REMINDER_TIME_UNIT';
      } else {
        ctx.session.homework.push(ctx.session.tempData.homework);
        ctx.session.inputMode = null;
        ctx.reply('✅ تم إضافة الواجب بنجاح!', mainKeyboard);
        
        // إرسال إشعار للمشرف
        forwardToAdmin(ctx, `📝 *تمت إضافة واجب جديد:*\n\n${ctx.session.tempData.homework.text}`);
      }
      break;
      
    case 'SELECT_REMINDER_TIME_UNIT':
      if (['ساعة', 'يوم', 'أسبوع', 'شهر'].includes(text)) {
        ctx.session.tempData.reminderUnit = text;
        ctx.reply('🔢 الرجاء إدخال الرقم (كم ساعة/يوم/إلخ قبل الموعد):\nمثال: 1', backKeyboard);
        ctx.session.inputMode = 'SET_REMINDER_TIME_VALUE';
      } else {
        ctx.reply('❌ الرجاء اختيار وحدة زمنية صحيحة');
      }
      break;
      
    case 'SET_REMINDER_TIME_VALUE':
      const value = parseInt(text);
      if (!isNaN(value) && value > 0) {
        const unit = ctx.session.tempData.reminderUnit;
        const dueDate = ctx.session.tempData.homework.dueDate;
        
        // تحويل الوحدة الزمنية
        let momentUnit;
        switch(unit) {
          case 'ساعة': momentUnit = 'hours'; break;
          case 'يوم': momentUnit = 'days'; break;
          case 'أسبوع': momentUnit = 'weeks'; break;
          case 'شهر': momentUnit = 'months'; break;
        }
        
        // حساب وقت التذكير
        const reminderTime = addTimeToDate(dueDate, -value, momentUnit);
        ctx.session.tempData.homework.reminder = reminderTime;
        
        // إضافة الواجب
        ctx.session.homework.push(ctx.session.tempData.homework);
        ctx.session.inputMode = null;
        
        // جدولة التذكير
        scheduleReminder(ctx, ctx.session.tempData.homework);
        
        ctx.reply(`✅ تم إضافة الواجب مع تذكير قبل ${value} ${unit} من الموعد!`, mainKeyboard);
        
        // إرسال إشعار للمشرف
        forwardToAdmin(ctx, `📝 *تمت إضافة واجب جديد مع تذكير:*\n\n` +
                           `${ctx.session.tempData.homework.text}\n\n` +
                           `⏰ *التذكير:* ${formatDate(reminderTime)}`);
      } else {
        ctx.reply('❌ الرجاء إدخال رقم صحيح موجب');
      }
      break;
      
    case 'ADD_GRADE':
      const parts = text.split(':');
      if (parts.length < 2) {
        ctx.reply('❌ الصيغة غير صحيحة. الرجاء استخدام الصيغة: "المادة:الدرجة"');
        return;
      }
      
      const subject = parts[0].trim();
      const score = parts[1].trim();
      
      ctx.session.grades.push({
        id: Date.now(),
        subject: subject,
        score: score,
        date: new Date()
      });
      ctx.session.inputMode = null;
      ctx.reply('✅ تم إضافة الدرجة بنجاح!', mainKeyboard);
      
      // إرسال إشعار للمشرف
      forwardToAdmin(ctx, `🎯 *تمت إضافة درجة جديدة:*\n\n` +
                         `📚 المادة: ${subject}\n` +
                         `⭐ الدرجة: ${score}`);
      break;
      
    case 'ADD_SCHEDULE':
      const day = ctx.session.tempData.day;
      const subjects = text.split(',').map(s => s.trim()).filter(s => s !== '');
      
      if (!ctx.session.schedule) {
        ctx.session.schedule = {};
      }
      
      ctx.session.schedule[day] = subjects;
      ctx.session.inputMode = null;
      ctx.reply(`✅ تم تحديث جدول يوم ${day} بنجاح!`, mainKeyboard);
      
      // إرسال إشعار للمشرف
      forwardToAdmin(ctx, `🗓️ *تم تحديث جدول يوم ${day}:*\n\n` +
                         subjects.map((s, i) => `${i+1}. ${s}`).join('\n'));
      break;
      
    case 'DELETE_HOMEWORK':
      const hwIndex = parseInt(text) - 1;
      if (isNaN(hwIndex)) {
        ctx.reply('❌ الرجاء إدخال رقم صحيح');
        return;
      }
      
      if (hwIndex >= 0 && hwIndex < ctx.session.homework.length) {
        const deleted = ctx.session.homework.splice(hwIndex, 1);
        ctx.session.inputMode = null;
        
        // إلغاء التذكير إذا كان موجوداً
        if (deleted[0].id && scheduledJobs[deleted[0].id]) {
          scheduledJobs[deleted[0].id].stop();
          delete scheduledJobs[deleted[0].id];
        }
        
        ctx.reply(`✅ تم حذف الواجب:\n${deleted[0].text}`, mainKeyboard);
        
        // إرسال إشعار للمشرف
        forwardToAdmin(ctx, `🗑️ *تم حذف واجب:*\n\n${deleted[0].text}`);
      } else {
        ctx.reply('❌ رقم غير صالح. الرجاء اختيار رقم من القائمة');
      }
      break;
      
    case 'DELETE_GRADE':
      const gradeIndex = parseInt(text) - 1;
      if (isNaN(gradeIndex)) {
        ctx.reply('❌ الرجاء إدخال رقم صحيح');
        return;
      }
      
      if (gradeIndex >= 0 && gradeIndex < ctx.session.grades.length) {
        const deleted = ctx.session.grades.splice(gradeIndex, 1);
        ctx.session.inputMode = null;
        ctx.reply(`✅ تم حذف الدرجة:\n${deleted[0].subject}: ${deleted[0].score}`, mainKeyboard);
        
        // إرسال إشعار للمشرف
        forwardToAdmin(ctx, `🗑️ *تم حذف درجة:*\n\n` +
                           `📚 المادة: ${deleted[0].subject}\n` +
                           `⭐ الدرجة: ${deleted[0].score}`);
      } else {
        ctx.reply('❌ رقم غير صالح. الرجاء اختيار رقم من القائمة');
      }
      break;
      
    case 'SELECT_HOMEWORK_FOR_REMINDER':
      const hwIdx = parseInt(text) - 1;
      if (isNaN(hwIdx) || hwIdx < 0 || hwIdx >= ctx.session.homework.length) {
        ctx.reply('❌ الرجاء إدخال رقم صحيح من القائمة');
        return;
      }
      
      ctx.session.tempData.selectedHomework = ctx.session.homework[hwIdx];
      ctx.reply('⏱️ اختر الفترة الزمنية للتذكير:', timeUnitsKeyboard);
      ctx.session.inputMode = 'SELECT_REMINDER_TIME_UNIT_EXISTING';
      break;
      
    case 'SELECT_REMINDER_TIME_UNIT_EXISTING':
      if (['ساعة', 'يوم', 'أسبوع', 'شهر'].includes(text)) {
        ctx.session.tempData.reminderUnit = text;
        ctx.reply('🔢 الرجاء إدخال الرقم (كم ساعة/يوم/إلخ قبل الموعد):\nمثال: 1', backKeyboard);
        ctx.session.inputMode = 'SET_REMINDER_TIME_VALUE_EXISTING';
      } else {
        ctx.reply('❌ الرجاء اختيار وحدة زمنية صحيحة');
      }
      break;
      
    case 'SET_REMINDER_TIME_VALUE_EXISTING':
      const val = parseInt(text);
      if (!isNaN(val) && val > 0) {
        const unit = ctx.session.tempData.reminderUnit;
        const homework = ctx.session.tempData.selectedHomework;
        
        if (!homework.dueDate) {
          ctx.reply('❌ هذا الواجب ليس له موعد تسليم', mainKeyboard);
          ctx.session.inputMode = null;
          return;
        }
        
        // تحويل الوحدة الزمنية
        let momentUnit;
        switch(unit) {
          case 'ساعة': momentUnit = 'hours'; break;
          case 'يوم': momentUnit = 'days'; break;
          case 'أسبوع': momentUnit = 'weeks'; break;
          case 'شهر': momentUnit = 'months'; break;
        }
        
        // حساب وقت التذكير
        const reminderTime = addTimeToDate(homework.dueDate, -val, momentUnit);
        
        // تحديث التذكير في الواجب
        const hwIndex = ctx.session.homework.findIndex(hw => hw.id === homework.id);
        if (hwIndex !== -1) {
          ctx.session.homework[hwIndex].reminder = reminderTime;
          
          // إلغاء التذكير القديم إذا كان موجوداً
          if (scheduledJobs[homework.id]) {
            scheduledJobs[homework.id].stop();
          }
          
          // جدولة التذكير الجديد
          scheduleReminder(ctx, ctx.session.homework[hwIndex]);
          
          ctx.reply(`✅ تم إضافة التذكير قبل ${val} ${unit} من الموعد!`, mainKeyboard);
          
          // إرسال إشعار للمشرف
          forwardToAdmin(ctx, `⏰ *تمت إضافة تذكير للواجب:*\n\n` +
                             `${homework.text}\n\n` +
                             `📅 الموعد: ${formatDate(reminderTime)}`);
        }
      } else {
        ctx.reply('❌ الرجاء إدخال رقم صحيح موجب');
      }
      ctx.session.inputMode = null;
      break;
      
    case 'DELETE_REMINDER':
      const remIndex = parseInt(text) - 1;
      const reminders = ctx.session.homework.filter(hw => hw.reminder);
      
      if (isNaN(remIndex) || remIndex < 0 || remIndex >= reminders.length) {
        ctx.reply('❌ الرجاء إدخال رقم صحيح من القائمة');
        return;
      }
      
      const reminderToDelete = reminders[remIndex];
      const hwIndexToUpdate = ctx.session.homework.findIndex(hw => hw.id === reminderToDelete.id);
      
      if (hwIndexToUpdate !== -1) {
        // إلغاء التذكير
        if (scheduledJobs[reminderToDelete.id]) {
          scheduledJobs[reminderToDelete.id].stop();
          delete scheduledJobs[reminderToDelete.id];
        }
        
        // حذف التذكير من الواجب
        ctx.session.homework[hwIndexToUpdate].reminder = null;
        ctx.session.inputMode = null;
        ctx.reply('✅ تم حذف التذكير بنجاح!', mainKeyboard);
        
        // إرسال إشعار للمشرف
        forwardToAdmin(ctx, `🗑️ *تم حذف تذكير للواجب:*\n\n${reminderToDelete.text}`);
      }
      break;
      
    case 'ASK_QUESTION':
      const userId = ctx.from.id;
      const question = text;
      
      // تسجيل السؤال
      questions[userId] = {
        question: question,
        date: new Date(),
        answered: false
      };
      
      // إرسال السؤال للمشرف
      const questionMessage = `❓ *سؤال جديد من المستخدم:*\n\n` +
                             `👤 *المستخدم:* ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
                             `🆔 *المعرف:* ${userId}\n` +
                             `🔖 *المعرف:* @${ctx.from.username || 'غير متوفر'}\n\n` +
                             `📝 *السؤال:*\n${question}\n\n` +
                             `⏰ *الوقت:* ${formatDate(new Date())}`;
      
      ctx.reply('✅ تم إرسال سؤالك للمشرف. سيتم الرد عليك قريباً.', mainKeyboard);
      
      if (process.env.ADMIN_CHAT_ID) {
        ctx.telegram.sendMessage(
          process.env.ADMIN_CHAT_ID, 
          escapeMarkdown(questionMessage),
          { 
            parse_mode: 'MarkdownV2',
            reply_markup: {
              inline_keyboard: [
                [
                  { 
                    text: 'الرد على السؤال', 
                    callback_data: `reply_${userId}` 
                  }
                ]
              ]
            }
          }
        );
      }
      
      ctx.session.inputMode = null;
      break;
      
    // معالجة الردود من المشرف
    default:
      if (ctx.message.reply_to_message && ctx.message.reply_to_message.text) {
        const originalMessage = ctx.message.reply_to_message.text;
        
        // إذا كان الرد على رسالة تحتوي على سؤال
        if (originalMessage.includes('❓ سؤال جديد من المستخدم')) {
          const userIdMatch = originalMessage.match(/🆔 \*المعرف:\* (\d+)/);
          if (userIdMatch && userIdMatch[1]) {
            const targetUserId = userIdMatch[1];
            
            // إرسال الرد للمستخدم
            ctx.telegram.sendMessage(
              targetUserId,
              `📬 *رد من المشرف على سؤالك:*\n\n` +
              `❓ *سؤالك:*\n${questions[targetUserId]?.question || 'غير معروف'}\n\n` +
              `💬 *الرد:*\n${text}\n\n` +
              `⏰ *الوقت:* ${formatDate(new Date())}`,
              { parse_mode: 'MarkdownV2' }
            );
            
            // تحديث حالة السؤال
            if (questions[targetUserId]) {
              questions[targetUserId].answered = true;
              questions[targetUserId].answer = text;
              questions[targetUserId].answerDate = new Date();
            }
            
            ctx.reply('✅ تم إرسال الرد للمستخدم بنجاح!');
          }
        }
      }
      break;
  }
});

// معالجة ردود المشرف عبر زر callback
bot.action(/reply_(\d+)/, (ctx) => {
  const userId = ctx.match[1];
  ctx.reply(`📝 الرجاء الرد على هذه الرسالة بجوابك للمستخدم ${userId}:`);
  ctx.session.replyToUserId = userId;
});

// دالة لجدولة التذكيرات
function scheduleReminder(ctx, homework) {
  if (!homework.reminder || homework.reminder < new Date()) {
    return;
  }
  
  const job = setTimeout(() => {
    const message = `
⏰ *تذكير بالواجب!*
      
📝 *الواجب:*
${escapeMarkdown(homework.text)}

📅 *موعد التسليم:*
${formatDate(homework.dueDate)}

⏳ *الوقت المتبقي:* 
${calculateTimeRemaining(homework.dueDate)}
    `;
    
    ctx.telegram.sendMessage(
      ctx.chat.id, 
      escapeMarkdown(message),
      { parse_mode: 'MarkdownV2' }
    );
    
    // حذف التذكير بعد إرساله
    const hwIndex = ctx.session.homework.findIndex(hw => hw.id === homework.id);
    if (hwIndex !== -1) {
      ctx.session.homework[hwIndex].reminder = null;
    }
    
    // حذف المهمة المجدولة
    if (scheduledJobs[homework.id]) {
      delete scheduledJobs[homework.id];
    }
    
    // إرسال إشعار للمشرف
    forwardToAdmin(ctx, `🔔 *تم إرسال تذكير للواجب:*\n\n${homework.text}`);
  }, homework.reminder - new Date());

  scheduledJobs[homework.id] = job;
}

// حساب الوقت المتبقي (وظيفة مساعدة)
function calculateTimeRemaining(dueDate) {
  const now = new Date();
  const diff = dueDate - now;
  
  if (diff <= 0) {
    return 'انتهى الوقت!';
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  
  let result = '';
  if (days > 0) result += `${days} يوم `;
  if (remainingHours > 0) result += `${remainingHours} ساعة `;
  if (remainingMinutes > 0) result += `${remainingMinutes} دقيقة `;
  if (days === 0 && remainingHours === 0) result += `${remainingSeconds} ثانية`;
  
  return result.trim();
}

// بدء تشغيل البوت
const PORT = process.env.PORT || 3000;
const URL = process.env.SERVER_URL;https://telegram-study-bot2.vercel.app

bot.telegram.setWebhook(`${URL}/bot${process.env.BOT_TOKEN}`);

bot.startWebhook(`/bot${process.env.BOT_TOKEN}`, null, PORT);

console.log(`✅ Webhook is running on ${URL}/bot${process.env.BOT_TOKEN}`);

// إدارة عملية الإغلاق
process.once('SIGINT', () => {
  // مسح جميع المؤقتات
  Object.values(scheduledJobs).forEach(timeoutId => {
    clearTimeout(timeoutId);
  });
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  // مسح جميع المؤقتات
  Object.values(scheduledJobs).forEach(timeoutId => {
    clearTimeout(timeoutId);
  });
  bot.stop('SIGTERM');
});
