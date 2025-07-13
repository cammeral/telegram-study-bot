const { Markup } = require('telegraf');

// لوحة المفاتيح الرئيسية (محسنة)
const mainKeyboard = Markup.keyboard([
  ['➕ إضافة واجب', '📊 إضافة درجة'],
  ['🗓️ إضافة جدول', '📝 عرض الواجبات'],
  ['📈 عرض الدرجات', '📅 عرض الجدول'],
  ['❌ حذف واجب', '❌ حذف درجة', '⏰ إدارة التذكيرات']
]).resize().oneTime();

// لوحة أيام الأسبوع (محسنة)
const daysKeyboard = Markup.keyboard([
  ['السبت', 'الأحد', 'الاثنين'],
  ['الثلاثاء', 'الأربعاء', 'الخميس'],
  ['الجمعة', '🏠 القائمة الرئيسية']
]).resize().oneTime();

// لوحة إدارة التذكيرات
const remindersKeyboard = Markup.keyboard([
  ['⏰ إضافة تذكير', '👁️ عرض التذكيرات'],
  ['❌ حذف تذكير', '🏠 القائمة الرئيسية']
]).resize().oneTime();

// لوحة التأكيد
const confirmKeyboard = Markup.keyboard([
  ['✅ نعم', '❌ لا']
]).resize().oneTime();

// لوحة الرجوع
const backKeyboard = Markup.keyboard([
  ['🏠 القائمة الرئيسية']
]).resize().oneTime();

// لوحة الفترات الزمنية
const timeUnitsKeyboard = Markup.keyboard([
  ['ساعة', 'يوم'],
  ['أسبوع', 'شهر'],
  ['🏠 القائمة الرئيسية']
]).resize().oneTime();

module.exports = {
  mainKeyboard,
  daysKeyboard,
  remindersKeyboard,
  confirmKeyboard,
  backKeyboard,
  timeUnitsKeyboard
};