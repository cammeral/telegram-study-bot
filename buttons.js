const { Markup } = require('telegraf');

exports.main = Markup.keyboard([
    ['➕ إضافة واجب', '🗑️ حذف واجب'],
    ['➕ إضافة درجة', '🗑️ حذف درجة'],
    ['🗓️ إدخال الجدول الأسبوعي', '📋 عرض الجدول الأسبوعي']
]).resize();