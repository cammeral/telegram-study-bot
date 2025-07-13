const moment = require('moment-timezone');
const { escape } = require('html-escaper');

// تعيين المنطقة الزمنية
const TIMEZONE = process.env.TIMEZONE || 'Asia/Riyadh';
moment.tz.setDefault(TIMEZONE);
moment.locale('ar');

// تنسيق التاريخ العربي
exports.formatDate = (date) => {
  return moment(date).format('dddd، D MMMM YYYY [في] HH:mm');
};

// تنسيق الجدول الأسبوعي
exports.formatSchedule = (schedule) => {
  if (!schedule || Object.keys(schedule).length === 0) {
    return "📭 لا يوجد جدول مسجل بعد";
  }
  
  let message = "📅 *جدولك الأسبوعي:*\n\n";
  const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  
  days.forEach(day => {
    if (schedule[day]) {
      message += `📌 *يوم ${day}:*\n`;
      schedule[day].forEach((subject, index) => {
        message += `  ${index + 1}\\. ${subject}\n`;
      });
      message += "\n";
    }
  });
  
  return message;
};

// تنسيق قائمة الواجبات
exports.formatHomework = (homework) => {
  if (homework.length === 0) {
    return "📭 لا يوجد واجبات مسجلة بعد";
  }
  
  let message = "📚 *قائمة الواجبات:*\n\n";
  homework.forEach((hw, index) => {
    message += `🔸 *${index + 1}\\. ${hw.text}*\n`;
    message += `   ⏰ *تاريخ الإضافة:* ${this.formatDate(hw.date)}\n`;
    
    if (hw.reminder) {
      message += `   ⏰ *موعد التذكير:* ${this.formatDate(hw.reminder)}\n`;
    }
    
    if (hw.dueDate) {
      message += `   📅 *موعد التسليم:* ${this.formatDate(hw.dueDate)}\n`;
    }
    
    message += "\n";
  });
  
  return message;
};

// تنسيق قائمة الدرجات
exports.formatGrades = (grades) => {
  if (grades.length === 0) {
    return "📭 لا يوجد درجات مسجلة بعد";
  }
  
  let message = "📊 *قائمة الدرجات:*\n\n";
  grades.forEach((grade, index) => {
    message += `🔹 *${index + 1}\\. ${grade.subject}: ${grade.score}*\n`;
    message += `   ⏰ *تاريخ الإضافة:* ${this.formatDate(grade.date)}\n\n`;
  });
  
  return message;
};

// تنسيق قائمة التذكيرات
exports.formatReminders = (homework) => {
  const activeReminders = homework.filter(hw => hw.reminder);
  
  if (activeReminders.length === 0) {
    return "📭 لا يوجد تذكيرات نشطة";
  }
  
  let message = "⏰ *قائمة التذكيرات:*\n\n";
  activeReminders.forEach((hw, index) => {
    message += `🔔 *${index + 1}\\. ${hw.text}*\n`;
    message += `   ⏰ *موعد التذكير:* ${this.formatDate(hw.reminder)}\n\n`;
  });
  
  return message;
};

// دالة للهروب من الأحخاص الخاصة في MarkdownV2
exports.escapeMarkdown = (text) => {
  return text.replace(/[_[\]()~>#+=|{}.!-]/g, '\\$&');
};

// التحقق من صيغة التاريخ
exports.isValidDate = (dateString) => {
  return moment(dateString, 'YYYY-MM-DD HH:mm', true).isValid();
};

// إضافة وقت إلى التاريخ
exports.addTimeToDate = (date, value, unit) => {
  return moment(date).add(value, unit).toDate();
};