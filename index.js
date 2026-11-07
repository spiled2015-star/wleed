const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AuditLogEvent } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// قاعدة بيانات التحذيرات المؤقتة في الذاكرة
const warnings = {};

// 🛡️ تعريف الرتب والآيديات المهمة ورومات السجلات (Logs)
const ROLES = {
    fullAdmin: ['1567133107386318909', '1566920315014090762'],
    midStaff: ['1566918799242829864'],
    basicStaff: ['1566830895439286272', '1566538164577898496'],

    highAdminTicket: '1566920315014090762',
    generalStaffTicket: '1566830895439286272',
    
    staffAppChannel: '1568180452781592636',

    appControlRoles: [
        '1567133107386318909',
        '1566921899223683132',
        '1566922634451624107',
        '1566922377680654356'
    ],

    appControlChannel: '1568032731340869735',

    // 📋 رومات السجلات (Logs Channels)
    logs: {
        ban: '1568551884845752402',
        timeout: '1568551943276855317',
        kick: '1568551995122524191',
        unban: '1568552067050508378',
        memberAdd: '1568552118002917447',
        memberRemove: '1568552176505192521',
        nicknameUpdate: '1568552247061774476',
        roleAdd: '1568552274064703589',
        roleRemove: '1568552329815392278',
        messageDelete: '1568552383359877272',
        bulkDelete: '1568558676313120768',
        messageUpdate: '1568558756986359910',
        channelCreate: '1568558937475915886',
        channelUpdate: '1568558975186899065',
        channelDelete: '1568559056011141312',
        roleCreate: '1568559367312252959',
        roleUpdate: '1566414661656587', // (تم تصحيحها لـ 1568566414661656587)
        roleDelete: '1568566493011116133',
        voiceMove: '1568566734489657434',
        voiceDisconnect: '1568566856401420309'
    }
};

// تصحيح آيدي تحديث الرتبة بدقة
ROLES.logs.roleUpdate = '1568566414661656587';

function hasRole(member, roleList) {
    if (!member) return false;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    return roleList.some(roleId => member.roles.cache.has(roleId));
}

function canModerate(member) {
    return hasRole(member, [...ROLES.fullAdmin, ...ROLES.midStaff, ...ROLES.basicStaff]);
}

function canKickOrBan(member) {
    return hasRole(member, ROLES.fullAdmin);
}

function canControlApps(member) {
    return hasRole(member, ROLES.appControlRoles);
}

// دالة مساعدة لإرسال السجلات بروم محدد
async function sendLog(guild, channelId, embed) {
    try {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('خطأ في إرسال السجل:', err);
    }
}

client.once('ready', () => {
    console.log(`تم تسجيل الدخول بنجاح باسم ${client.user.tag}!`);
});

// ==========================================
// 📋 نظام السجلات الشامل (Audit Logs & Events)
// ==========================================

// 1. دخول عضو
client.on('guildMemberAdd', member => {
    const embed = new EmbedBuilder()
        .setTitle('📥 انضمام عضو جديد')
        .setDescription(`العضو: ${member} (\`${member.user.tag}\`)`)
        .setColor('#2ecc71')
        .setTimestamp();
    sendLog(member.guild, ROLES.logs.memberAdd, embed);
});

// 2. خروج عضو
client.on('guildMemberRemove', member => {
    const embed = new EmbedBuilder()
        .setTitle('📤 مغادرة عضو')
        .setDescription(`العضو: \`${member.user.tag}\``)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(member.guild, ROLES.logs.memberRemove, embed);
});

// 3. تعديل النيك نيم
client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
            .setTitle('✏️ تحديث اللقب (Nickname)')
            .setDescription(`العضو: ${newMember}\n**القديم:** \`${oldMember.nickname || oldMember.user.username}\`\n**الجديد:** \`${newMember.nickname || newMember.user.username}\``)
            .setColor('#3498db')
            .setTimestamp();
        sendLog(newMember.guild, ROLES.logs.nicknameUpdate, embed);
    }
});

// 4 & 5. إعطاء أو إزالة رتبة
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    if (addedRoles.size > 0) {
        const rolesStr = addedRoles.map(r => r.name).join(', ');
        const embed = new EmbedBuilder()
            .setTitle('➕🛡️ إعطاء رتبة لعضو')
            .setDescription(`العضو: ${newMember}\n**الرتبة المضافة:** \`${rolesStr}\``)
            .setColor('#2ecc71')
            .setTimestamp();
        sendLog(newMember.guild, ROLES.logs.roleAdd, embed);
    }

    if (removedRoles.size > 0) {
        const rolesStr = removedRoles.map(r => r.name).join(', ');
        const embed = new EmbedBuilder()
            .setTitle('➖🛡️ إزالة رتبة من عضو')
            .setDescription(`العضو: ${newMember}\n**الرتبة المزالة:** \`${rolesStr}\``)
            .setColor('#e74c3c')
            .setTimestamp();
        sendLog(newMember.guild, ROLES.logs.roleRemove, embed);
    }
});

// 6. حذف رسالة
client.on('messageDelete', message => {
    if (!message.guild || message.author?.bot) return;
    const embed = new EmbedBuilder()
        .setTitle('🗑️ حذف رسالة')
        .setDescription(`الكاتب: ${message.author}\nالروم: ${message.channel}\n**المحتوى:**\n${message.content || '*[رسالة فارغة أو تحتوي على وسائط]*'}`)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(message.guild, ROLES.logs.messageDelete, embed);
});

// 7. حذف دفعة رسائل (Bulk Delete)
client.on('messageDeleteBulk', messages => {
    const firstMsg = messages.first();
    if (!firstMsg || !firstMsg.guild) return;
    const embed = new EmbedBuilder()
        .setTitle('🗑️📦 حذف دفعة رسائل')
        .setDescription(`تم حذف **${messages.size}** رسالة في الروم ${firstMsg.channel}`)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(firstMsg.guild, ROLES.logs.bulkDelete, embed);
});

// 8. تعديل رسالة
client.on('messageUpdate', (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    const embed = new EmbedBuilder()
        .setTitle('✏️💬 تعديل رسالة')
        .setDescription(`الكاتب: ${newMessage.author}\nالروم: ${newMessage.channel}\n**قبل التعديل:**\n${oldMessage.content || '*[فارغ]*'}\n\n**بعد التعديل:**\n${newMessage.content || '*[فارغ]*'}`)
        .setColor('#f1c40f')
        .setTimestamp();
    sendLog(newMessage.guild, ROLES.logs.messageUpdate, embed);
});

// 9. إنشاء روم
client.on('channelCreate', channel => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle('➕📢 إنشاء روم جديد')
        .setDescription(`الروم: ${channel} (\`${channel.name}\`)\nالنوع: \`${channel.type}\``)
        .setColor('#2ecc71')
        .setTimestamp();
    sendLog(channel.guild, ROLES.logs.channelCreate, embed);
});

// 10. تعديل روم أو صلاحياته
client.on('channelUpdate', (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle('⚙️📢 تعديل روم أو صلاحيات')
        .setDescription(`الروم: ${newChannel} (\`${newChannel.name}\`)`)
        .setColor('#3498db')
        .setTimestamp();
    sendLog(newChannel.guild, ROLES.logs.channelUpdate, embed);
});

// 11. حذف روم
client.on('channelDelete', channel => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle('❌📢 حذف روم')
        .setDescription(`اسم الروم المحذوف: \`${channel.name}\``)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(channel.guild, ROLES.logs.channelDelete, embed);
});

// 12. إنشاء رتبة
client.on('roleCreate', role => {
    const embed = new EmbedBuilder()
        .setTitle('➕🛡️ إنشاء رتبة جديدة')
        .setDescription(`الرتبة: ${role} (\`${role.name}\`)`)
        .setColor('#2ecc71')
        .setTimestamp();
    sendLog(role.guild, ROLES.logs.roleCreate, embed);
});

// 13. تعديل رتبة
client.on('roleUpdate', (oldRole, newRole) => {
    const embed = new EmbedBuilder()
        .setTitle('⚙️🛡️ تعديل رتبة')
        .setDescription(`الرتبة: ${newRole} (\`${newRole.name}\`)`)
        .setColor('#3498db')
        .setTimestamp();
    sendLog(newRole.guild, ROLES.logs.roleUpdate, embed);
});

// 14. حذف رتبة
client.on('roleDelete', role => {
    const embed = new EmbedBuilder()
        .setTitle('❌🛡️ حذف رتبة')
        .setDescription(`اسم الرتبة المحذوفة: \`${role.name}\``)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(role.guild, ROLES.logs.roleDelete, embed);
});

// 15, 16 & 17. أحداث البان، الكيك، التايم آウト، والفك عن البان (عبر Audit Logs)
client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    const { action, executor, target } = entry;

    if (action === AuditLogEvent.MemberBanAdd) {
        const embed = new EmbedBuilder()
            .setTitle('🔨 حظر عضو (Ban)')
            .setDescription(`العضو: \`${target?.tag || 'غير معروف'}\`\nبواسطة المشرف: ${executor}`)
            .setColor('#e74c3c')
            .setTimestamp();
        sendLog(guild, ROLES.logs.ban, embed);
    }

    if (action === AuditLogEvent.MemberBanRemove) {
        const embed = new EmbedBuilder()
            .setTitle('🔓 إزالة الحظر (Unban)')
            .setDescription(`العضو: \`${target?.tag || 'غير معروف'}\`\nبواسطة المشرف: ${executor}`)
            .setColor('#2ecc71')
            .setTimestamp();
        sendLog(guild, ROLES.logs.unban, embed);
    }

    if (action === AuditLogEvent.MemberKick) {
        const embed = new EmbedBuilder()
            .setTitle('👢 طرد عضو (Kick)')
            .setDescription(`العضو: \`${target?.tag || 'غير معروف'}\`\nبواسطة المشرف: ${executor}`)
            .setColor('#e74c3c')
            .setTimestamp();
        sendLog(guild, ROLES.logs.kick, embed);
    }

    if (action === AuditLogEvent.MemberUpdate) {
        // التحقق من التايم آウト (CommunicationDisabledUntil)
        const typedTarget = target;
        if (entry.changes?.some(c => c.key === 'communication_disabled_until')) {
            const embed = new EmbedBuilder()
                .setTitle('⏳ إعطاء تايم آウト (Timeout)')
                .setDescription(`العضو: <@${typedTarget?.id}>\nبواسطة المشرف: ${executor}`)
                .setColor('#f1c40f')
                .setTimestamp();
            sendLog(guild, ROLES.logs.timeout, embed);
        }
    }
});

// 18 & 19. السجلات الصوتية (نقل صوتي أو خروج/ديسكونت)
client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    if (!member) return;

    // ديسكونت أو خروج من الصوت
    if (oldState.channelId && !newState.channelId) {
        const embed = new EmbedBuilder()
            .setTitle('🔌 خروج من الروم الصوتي (Disconnect)')
            .setDescription(`العضو: ${member} خرج من روم: \`${oldState.channel.name}\``)
            .setColor('#e74c3c')
            .setTimestamp();
        sendLog(member.guild, ROLES.logs.voiceDisconnect, embed);
    }

    // نقل صوتي من روم لآخر
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const embed = new EmbedBuilder()
            .setTitle('🔊 نقل صوتي (Voice Move)')
            .setDescription(`العضو: ${member}\nمن روم: \`${oldState.channel.name}\`\nإلى روم: \`${newState.channel.name}\``)
            .setColor('#3498db')
            .setTimestamp();
        sendLog(member.guild, ROLES.logs.voiceMove, embed);
    }
});


// ==========================================
// الأوامر النصية وتفاعلات الأزرار والتذاكر
// ==========================================

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.trim();

    // 0. نظام التحكم في فتح وإغلاق التقديم
    if (content === 'فتح تقديم الادارة' || content === 'قفل تقديم الادارة') {
        if (message.channel.id === ROLES.appControlChannel) {
            if (canControlApps(message.member)) {
                try {
                    await message.delete().catch(() => {});

                    if (content === 'فتح تقديم الادارة') {
                        const openEmbed = new EmbedBuilder()
                            .setTitle('🟢 فتح التقديم الإداري - سيرفر whoyousun')
                            .setDescription('**أيها الأعضاء الأفاضل، تم فتح باب التقديم للانضمام إلى طاقم الإدارة!**\n\nإذا كنت ترى في نفسك الكفاءة، توجه واكتب أمر تقديم أو اضغط على الأزرار المخصصة للتقديم. بالتوفيق للجميع! ✨')
                            .setColor('#2ecc71')
                            .setTimestamp();
                    
                        await message.channel.send({ embeds: [openEmbed] });
                    } else if (content === 'قفل تقديم الادارة') {
                        const closeEmbed = new EmbedBuilder()
                            .setTitle('🔴 إغلاق التقديم الإداري - سيرفر whoyousun')
                            .setDescription('**عُرِضت ونُظِّرت الطلبات، وتم إغلاق باب التقديم الإداري في الوقت الحالي.**\n\nنعتذر لمن تم رفض طلبهم، ونتمنى الحظ الأوفر للجميع في المرات القادمة.')
                            .setColor('#e74c3c')
                            .setTimestamp();

                        await message.channel.send({ embeds: [closeEmbed] });
                    }
                } catch (err) {
                    console.error('خطأ في تنفيذ أمر التحكم بالتقديم:', err);
                }
            } else {
                await message.reply({ content: '❌ عذراً، لا تمتلك الرتبة المخصصة للتحكم بفتح وإغلاق التقديم.', ephemeral: true }).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 4000));
            }
        }
        return;
    }

    // 1. نظام الرد التلقائي وسوالف البوت
    if (content.includes('السلام عليكم') || content.includes('سلام عليكم') || content.includes('مرحبا')) {
        return message.reply(`𝔴𝔥𝔬𝔶𝔬𝔲𝔰𝔲𝔫- وعليكم السلام... خير، وش عندك جاي تسايرني؟ خلصنا 😒`);
    }

    if (content === 'منشن امونق') {
        const allowedUsers = [
            '1566833802527899750',
            '1566918799242829864',
            '1566920315014090762',
            '1567133107386318909'
        ];

        const isAllowed = allowedUsers.includes(message.author.id) || message.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isAllowed) {
            return message.reply({ content: '❌ عذراً، أمر "منشن امونق" مخصص للأشخاص المصرح لهم فقط!', ephemeral: true });
        }

        return message.channel.send(`# **منشن امونق صار**\n\n@everyone @here\n\nhttps://discord.com/channels/1564728682134900859/1568267973528002761`);
    }

    if (content.includes('spiled')) {
        return message.reply(`ياليل مالقيت تمنشن الا ذا 🙄😂`);
    }

    if (message.mentions.has(client.user)) {
        const replies = [
            "يا أخي وش تبي؟ قاعد أطالع الحيط لحالي لا تقاطعي 🙄",
            "أوووف، وش عندك منسدح بوجهي؟ خلصنا تكلم بسرعة",
            "مدري عنك... اسأل غيري، راسي مصدع من كثرة الأسئلة 🥱",
            "يا ليل البشر... ما تنعطون وجه نهائياً",
            "تتوقع فاضي لك أنا؟ وراي سيرفر كامل أديره وأنت جالس تسولف 😒"
        ];
        return message.reply(replies[Math.floor(Math.random() * replies.length)]);
    }

    // 2. أمر التكتات
    if (content === '!تكت') {
        const embed = new EmbedBuilder()
            .setTitle('🎫 نظام التذاكر والدعم الفني')
            .setDescription('أهلاً بك عزيزي العضو في نظام التذاكر.\nيرجى اختيار القسم المناسب لطلبك من القائمة أدناه، وسيتم خدمتك في أقرب وقت ممكن من قبل الإدارة.')
            .setColor('#5865F2');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_menu')
            .setPlaceholder('اختر نوع التذكرة المطلوبة هنا...')
            .addOptions([
                { label: 'استفسار', description: 'للاستفسارات العامة', value: 'ticket_inquiry', emoji: '🟢' },
                { label: 'شكوى', description: 'لتقديم الشكاوي', value: 'ticket_complaint', emoji: '🔴' },
                { label: 'طلب إداري عليا', description: 'خاص بالإدارة العليا', value: 'ticket_high_admin', emoji: '⚫' },
                { label: 'دعم فني', description: 'لحل المشاكل التقنية', value: 'ticket_support', emoji: '🔵' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await message.channel.send({ embeds: [embed], components: [row] });
    }

    // 3. أمر التقديم على الإدارة
    if (content === '!تقديم') {
        const embed = new EmbedBuilder()
            .setTitle('🌟 التقديم على الإدارة - سيرفر whoyousun')
            .setDescription('أهلاً بك عزيزي العضو في سيرفر **whoyousun**!\nنحن نبحث دائماً عن أشخاص مميزين للانضمام إلى طاقم الإدارة ومساعدة المجتمع.\n\nإذا كنت ترى في نفسك الكفاءة وتبي تقدم، اضغط على الزر أدناه وأجب عن الأسئلة بكل إتقان وصراحة.')
            .setColor('#FFFFFF')
            .setFooter({ text: 'whoyousun Management System' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_staff_application')
                    .setLabel('قدم الان')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );

        await message.channel.send({ embeds: [embed], components: [row] });
    }

    // 4. أمر مسح الرسائل
    if (content.startsWith('!مسح') || content.startsWith('!م')) {
        if (!canModerate(message.member)) {
            return message.reply({ content: '❌ عذراً، لا تمتلك الرتبة المخصصة لاستخدام هذا الأمر.', ephemeral: true });
        }
        const args = content.split(' ');
        const count = parseInt(args[1]);
        if (isNaN(count) || count <= 0 || count > 100) {
            return message.reply({ content: '⚠️ يرجى تحديد عدد صحيح بين 1 و 100 (مثال: `!مسح 10` أو `!م 10`).' });
        }
        try {
            await message.channel.bulkDelete(count + 1, true);
            const reply = await message.channel.send(`✅ تم مسح **${count}** رسالة بنجاح!`);
            setTimeout(() => reply.delete().catch(() => {}), 3000);
        } catch (err) {
            console.error(err);
            message.reply({ content: '❌ حدث خطأ أثناء مسح الرسائل.' });
        }
    }

    // 5. نظام المشرفين والتحذيرات
    if (content.startsWith('!تحذير')) {
        if (!canModerate(message.member)) {
            return message.reply({ content: '❌ عذراً، لا تمتلك صلاحية تحذير الأعضاء.' });
        }

        const args = content.split(' ').slice(1);
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ');

        if (!target) return message.reply({ content: '⚠️ يرجى منشن الشخص المراد تحذيره.' });
        if (!reason) return message.reply({ content: '⚠️ يرجى كتابة سبب التحذير.' });

        if (!warnings[target.id]) warnings[target.id] = [];

        const warningData = {
            reason: reason,
            moderator: message.author.tag,
            date: new Date().toLocaleDateString('ar-SA')
        };

        warnings[target.id].push(warningData);
        const totalWarnings = warnings[target.id].length;

        try {
            await target.send({
                content: `⚠️ **تنبيه إداري من سيرفر whoyousun**\nلقد تم تحذيرك بواسطة المشرف: **${message.author.tag}**\n**السبب:** ${reason}\n**عدد تحذيراتك الحالية:** ${totalWarnings}`
            });
        } catch (err) {}

        let replyText = `✅ تم تحذير العضو ${target} بنجاح.\n📌 **السبب:** ${reason}\n📊 **إجمالي تحذيراته:** ${totalWarnings}`;

        if (totalWarnings >= 3) {
            try {
                await target.timeout(60 * 60 * 1000, 'تجاوز الحد الأقص للتحذيرات (3 تحذيرات)');
                replyText += `\n🚨 **تم إعطاء العضو تايم آウト (Timeout) تلقائي لمدة ساعة لتجاوز 3 تحذيرات!**`;
            } catch (err) {}
        }

        await message.reply({ content: replyText });
    }

    if (content.startsWith('!تصفير') || content.startsWith('!صفر')) {
        if (!canModerate(message.member)) {
            return message.reply({ content: '❌ عذراً، لا تمتلك صلاحية تصفير التحذيرات.' });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ content: '⚠️ يرجى منشن الشخص المراد تصفير تحذيراته.' });

        if (!warnings[target.id] || warnings[target.id].length === 0) {
            return message.reply({ content: `ℹ️ العضو ${target} ليس لديه أي تحذيرات مسجلة!` });
        }

        warnings[target.id] = [];
        await message.reply({ content: `🔄 تم تصفير وإزالة جميع تحذيرات العضو ${target} بنجاح!` });
    }

    if (content.startsWith('!ازالة-تحذير')) {
        if (!canModerate(message.member)) {
            return message.reply({ content: '❌ عذراً، لا تمتلك صلاحية إزالة التحذيرات.' });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ content: '⚠️ يرجى منشن الشخص المراد إزالة تحذيره.' });

        if (!warnings[target.id] || warnings[target.id].length === 0) {
            return message.reply({ content: `❌ العضو ${target} ليس لديه أي تحذيرات لحذفها!` });
        }

        warnings[target.id].pop();
        const remainingWarnings = warnings[target.id].length;

        await message.reply({ content: `✅ تم إزالة آخر تحذير للعضو ${target} بنجاح!\n📊 **التحذيرات المتبقية له:** ${remainingWarnings}` });
    }

    if (content.startsWith('!وارن')) {
        if (!canModerate(message.member)) {
            return message.reply({ content: '❌ عذراً، أمر السجلات مخصص للإدارة.' });
        }

        const target = message.mentions.members.first();

        if (!target) {
            let desc = '';
            let count = 1;
            for (const userId in warnings) {
                const userWarns = warnings[userId];
                userWarns.forEach(w => {
                    desc += `**${count}.** العضو ID: \`${userId}\` | المشرف: **${w.moderator}**\nالسبب: ${w.reason} (${w.date})\n\n`;
                    count++;
                });
            }

            if (!desc) return message.reply({ content: '📂 لا توجد أي تحذيرات مسجلة حتى الآن.' });

            const embed = new EmbedBuilder().setTitle('📋 سجل آخر التحذيرات في السيرفر').setDescription(desc.slice(0, 4000)).setColor('#FFCC00');
            return message.reply({ embeds: [embed] });
        } else {
            const userWarns = warnings[target.id];
            if (!userWarns || userWarns.length === 0) {
                return message.reply({ content: `✅ العضو ${target} ليس لديه أي تحذيرات مسجلة!` });
            }

            let desc = `سجل تحذيرات العضو ${target}:\n\n`;
            userWarns.forEach((w, index) => {
                desc += `**التحذير رقم ${index + 1}:**\n📌 **السبب:** ${w.reason}\n🛡️ **بواسطة المشرف:** ${w.moderator}\n📅 **التاريخ:** ${w.date}\n------------------\n`;
            });

            const embed = new EmbedBuilder().setTitle(`📊 سجل تحذيرات: ${target.user.tag}`).setDescription(desc).setColor('#FF0000');
            return message.reply({ embeds: [embed] });
        }
    }

    if (content.startsWith('!كيك') || content.startsWith('!هش')) {
        if (!canKickOrBan(message.member)) {
            return message.reply({ content: '❌ عذراً، هذا الأمر مخصص للإدارة العليا فقط!' });
        }

        const args = content.split(' ').slice(1);
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'بدون سبب مدون';

        if (!target) return message.reply({ content: '⚠️ يرجى منشن الشخص المراد طرده.' });
        if (!target.kickable) return message.reply({ content: '❌ لا يمكنني طرد هذا العضو.' });

        try {
            await target.kick(reason);
            await message.reply({ content: `👢 تم طرد العضو ${target.user.tag} بنجاح.\n📌 **السبب:** ${reason}` });
        } catch (err) {
            await message.reply({ content: '❌ حدث خطأ أثناء محاولة طرد العضو.' });
        }
    }

    if (content.startsWith('!بان') || content.startsWith('!تف')) {
        if (!canKickOrBan(message.member)) {
            return message.reply({ content: '❌ عذراً، هذا الأمر مخصص للإدارة العليا فقط!' });
        }

        const args = content.split(' ').slice(1);
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'بدون سبب مدون';

        if (!target) return message.reply({ content: '⚠️ يرجى منشن الشخص المراد تبنيده.' });
        if (!target.bannable) return message.reply({ content: '❌ لا يمكنني حظر هذا العضو.' });

        try {
            await target.ban({ reason: reason });
            await message.reply({ content: `🔨 تم حظر العضو ${target.user.tag} بنجاح.\n📌 **السبب:** ${reason}` });
        } catch (err) {
            await message.reply({ content: '❌ حدث خطأ أثناء محاولة حظر العضو.' });
        }
    }
});

// التعامل مع التفاعلات (الأزرار، القوائم، النوافذ)
client.on('interactionCreate', async interaction => {
    
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
        const selectedValue = interaction.values[0];
        const modal = new ModalBuilder()
            .setCustomId(`modal_${selectedValue}`)
            .setTitle('سبب فتح التذكرة');

        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason')
            .setLabel('الرجاء كتابة سبب فتح التذكرة بالتفصيل:')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('اكتب مشكلتك أو استفسارك هنا...');

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    }

    if (interaction.isButton() && interaction.customId === 'open_staff_application') {
        const modal = new ModalBuilder()
            .setCustomId('staff_app_modal')
            .setTitle('whoyousun - تقديم الإدارة');

        const q1 = new TextInputBuilder().setCustomId('app_q1').setLabel('1. ما هو اسمك؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q2 = new TextInputBuilder().setCustomId('app_q2').setLabel('2. كم عمرك؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q3 = new TextInputBuilder().setCustomId('app_q3').setLabel('3. هل كنت إداري في سيرفر سابق؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q4 = new TextInputBuilder().setCustomId('app_q4').setLabel('4. إذا نعم، ما هي أعلى رتبة أخذتها؟').setStyle(TextInputStyle.Short).setRequired(false);
        const q5 = new TextInputBuilder().setCustomId('app_q5').setLabel('5. اوصف نفسك بثلاث كلمات:').setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(q1),
            new ActionRowBuilder().addComponents(q2),
            new ActionRowBuilder().addComponents(q3),
            new ActionRowBuilder().addComponents(q4),
            new ActionRowBuilder().addComponents(q5)
        );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'staff_app_modal') {
        const name = interaction.fields.getTextInputValue('app_q1');
        const age = interaction.fields.getTextInputValue('app_q2');
        const prevAdmin = interaction.fields.getTextInputValue('app_q3');
        const highestRank = interaction.fields.getTextInputValue('app_q4') || 'لا يوجد';
        const description = interaction.fields.getTextInputValue('app_q5');
        const member = interaction.member;

        const resultEmbed = new EmbedBuilder()
            .setTitle('📥 تقديم إداري جديد - whoyousun')
            .setDescription(`تم استلام تقديم من العضو: ${member} (<@${member.id}>)`)
            .addFields(
                { name: '1. الاسم:', value: name, inline: true },
                { name: '2. العمر:', value: age, inline: true },
                { name: '3. إداري سابق؟', value: prevAdmin, inline: true },
                { name: '4. أعلى رتبة:', value: highestRank, inline: true },
                { name: '5. الوصف بثلاث كلمات:', value: description, inline: false },
                { name: '6. الصلاة على النبي:', value: 'اللهم صل وسلم على نبينا محمد ﷺ (تم الالتزام)', inline: false }
            )
            .setColor('#00FF00')
            .setTimestamp();

        const appRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`accept_app_${member.id}`).setLabel('قبول الطلب').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId(`reject_app_${member.id}`).setLabel('رفض الطلب').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

        await interaction.reply({ content: '✅ تم إرسال تقديمك بنجاح للإدارة! وصلى الله على نبينا محمد.', ephemeral: true });

        try {
            const targetChannel = await interaction.guild.channels.fetch(ROLES.staffAppChannel);
            if (targetChannel) {
                await targetChannel.send({ embeds: [resultEmbed], components: [appRow] });
            }
        } catch (err) {
            console.error('خطأ في إرسال التقديم للروم المخصص:', err);
        }
    }

    if (interaction.isButton() && (interaction.customId.startsWith('accept_app_') || interaction.customId.startsWith('reject_app_'))) {
        if (!canModerate(interaction.member)) {
            return interaction.reply({ content: '❌ عذراً، الأزرار مخصصة للمشرفين فقط!', ephemeral: true });
        }

        const isAccept = interaction.customId.startsWith('accept_app_');
        const targetUserId = interaction.customId.replace(isAccept ? 'accept_app_' : 'reject_app_', '');

        try {
            const targetUser = await interaction.guild.members.fetch(targetUserId);
            
            if (isAccept) {
                await targetUser.send({
                    content: `🎉 **مبروك! تم الموافقة على كونك إداري في سيرفر whoyousun.**\n⚠️ **تنبيه:** لا تفتح تذكرة أبداً إلا بعد أن يتم الإعلان رسمياً في روم المقبولين!`
                });
                await interaction.update({ content: `✅ تم قبول العضو ${targetUser} وإرسال رسالة القبول لخاصه.`, components: [] });
            } else {
                await targetUser.send({
                    content: `❌ عذراً، تم رفض طلبك كإداري في سيرفر whoyousun. نتمنى لك حظاً أوفر في المرات القادمة.`
                });
                await interaction.update({ content: `❌ تم رفض العضو ${targetUser} وإرسال رسالة الرفض لخاصه.`, components: [] });
            }
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: '⚠️ حدث خطأ، قد يكون العضو غادر السيرفر أو أغلق الخاص.', ephemeral: true });
        }
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
        const ticketType = interaction.customId.replace('modal_', '');
        const reason = interaction.fields.getTextInputValue('ticket_reason');
        const guild = interaction.guild;
        const member = interaction.member;

        let typeName = 'تذكرة';
        let color = '#5865F2';
        let targetRoleId = ROLES.generalStaffTicket; 

        if (ticketType === 'ticket_inquiry') { typeName = 'استفسار'; color = '#2ecc71'; }
        else if (ticketType === 'ticket_complaint') { typeName = 'شكوى'; color = '#e74c3c'; }
        else if (ticketType === 'ticket_high_admin') { typeName = 'إدارة-عليا'; color = '#2c3e50'; targetRoleId = ROLES.highAdminTicket; }
        else if (ticketType === 'ticket_support') { typeName = 'دعم-فني'; color = '#3498db'; }

        await interaction.deferReply({ ephemeral: true });

        try {
            const ticketChannel = await guild.channels.create({
                name: `${typeName}-${member.user.username}`,
                type: ChannelType.GuildText,
                parent: '1566525288421261442',
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: targetRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embed = new EmbedBuilder()
                .setTitle(`تذكرة جديدة: ${typeName}`)
                .setDescription(`أهلاً بك ${member}!\n\n**السبب:**\n${reason}\n\n*يرجى انتظار رد الإدارة.*`)
                .setColor(color);

            const staffRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('📥 استلام التكت').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('🔓 ترك التكت').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 إغلاق التكت').setStyle(ButtonStyle.Danger)
                );

            await ticketChannel.send({
                content: `${member} | <@&${targetRoleId}> | تم فتح تذكرتك بنجاح!`,
                embeds: [embed],
                components: [staffRow]
            });

            await interaction.editReply({ content: `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ حدث خطأ أثناء إنشاء التكت.' });
        }
    }

    if (interaction.isButton()) {
        const channel = interaction.channel;
        const member = interaction.member;

        if (interaction.customId === 'claim_ticket') {
            try {
                const roleId = channel.permissionOverwrites.cache.has(ROLES.highAdminTicket) ? ROLES.highAdminTicket : ROLES.generalStaffTicket;
                await channel.permissionOverwrites.edit(roleId, { SendMessages: false });
                await channel.permissionOverwrites.edit(member.id, { SendMessages: true });
                await interaction.reply({ content: `📥 تم استلام التكت بواسطة المشرف ${member}.` });
            } catch (err) {
                await interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true });
            }
        }

        if (interaction.customId === 'unclaim_ticket') {
            try {
                const roleId = channel.permissionOverwrites.cache.has(ROLES.highAdminTicket) ? ROLES.highAdminTicket : ROLES.generalStaffTicket;
                await channel.permissionOverwrites.edit(roleId, { SendMessages: true });
                await interaction.reply({ content: `🔓 تم ترك التكت بواسطة المشرف ${member}.` });
            } catch (err) {
                await interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true });
            }
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: '🔒 جاري إغلاق وحذف التكت خلال 5 ثوانٍ...' });
            setTimeout(async () => {
                try { await channel.delete(); } catch (error) {}
            }, 5000);
        }
    }
});

// تسجيل الدخول الآمن
client.login(process.env.TOKEN);
