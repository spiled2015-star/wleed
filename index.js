const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// قاعدة بيانات التحذيرات المؤقتة في الذاكرة
const warnings = {};

// 🛡️ تعريف الرتب والآيديات المهمة
const ROLES = {
    fullAdmin: ['1567133107386318909', '1566920315014090762'],
    midStaff: ['1566918799242829864'],
    basicStaff: ['1566830895439286272', '1566538164577898496'],

    highAdminTicket: '1566920315014090762',
    generalStaffTicket: '1566830895439286272',
    
    // روم استقبال التقديمات الإدارية
    staffAppChannel: '1568180452781592636',

    // الرولات المخصصة لفتح وإغلاق التقديم
    appControlRoles: [
        '1567133107386318909',
        '1566921899223683132',
        '1566922634451624107',
        '1566922377680654356'
    ],

    // روم التحكم المخصص لفتح وإغلاق التقديم
    appControlChannel: '1568032731340869735'
};

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

client.once('ready', () => {
    console.log(`تم تسجيل الدخول بنجاح باسم ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.trim();

    // ==========================================
    // 0. نظام التحكم في فتح وإغلاق التقديم (روم مخصص + رولات مخصصة)
    // ==========================================
    if (content === 'فتح تقديم الادارة' || content === 'قفل تقديم الادارة') {
        // التحقق أن الكتابة تمت في الروم المخصص فقط
        if (message.channel.id === ROLES.appControlChannel) {
            // التحقق من الرولات المخولة
            if (canControlApps(message.member)) {
                try {
                    await message.delete().catch(() => {}); // حذف رسالة الكاتب تلقائياً

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
                            .setDescription('**عُرِضت ونُظِّرت الطلبات، وتم إغلاق باب التقديم الإداري في الوقت الحالي.**\n\nنعتذر لمن تم رفض طلبهم، ونتمنى الحظ الأوفر للجميع في المرات القادمة.')
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

    // ==========================================
    // 1. نظام الرد التلقائي وسوالف البوت "الطفشان"
    // ==========================================
    if (content.includes('السلام عليكم') || content.includes('سلام عليكم') || content.includes('مرحبا')) {
        return message.reply(`𝔴𝔥𝔬𝔶𝔬𝔲𝔰𝔲𝔫- وعليكم السلام... خير، وش عندك جاي تسايرني؟ خلصنا 😒`);
    }

    if (content === 'منشن امونق') {
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

    // ==========================================
    // 2. أمر التكتات
    // ==========================================
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

    // ==========================================
    // 5. نظام المشرفين والصلاحيات المخصصة
    // ==========================================
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
                await target.timeout(60 * 60 * 1000, 'تجاوز الحد الأقصى للتحذيرات (3 تحذيرات)');
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
            return message.reply({ content: '❌ عذراً، هذا الأمر (الكيك) مخصص للإدارة العليا فقط!' });
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
            return message.reply({ content: '❌ عذراً، هذا الأمر (الباند) مخصص للإدارة العليا فقط!' });
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
    
    // 1. تفاعل القائمة المنسدلة للتكتات
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

    // 2. زر التقديم على الإدارة
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

    // 3. استقبال نموذج التقديم وإرساله إلى روم التقديمات المحدد
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

        // أزرار القبول والرفض مع إرفاق آيدي المتقدم داخل الـ customId
        const appRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`accept_app_${member.id}`).setLabel('قبول الطلب').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId(`reject_app_${member.id}`).setLabel('رفض الطلب').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

        await interaction.reply({ content: '✅ تم إرسال تقديمك بنجاح للإدارة! وصلى الله على نبينا محمد.', ephemeral: true });

        // إرسال التقديم للروم المخصص 1568180452781592636
        try {
            const targetChannel = await interaction.guild.channels.fetch(ROLES.staffAppChannel);
            if (targetChannel) {
                await targetChannel.send({ embeds: [resultEmbed], components: [appRow] });
            }
        } catch (err) {
            console.error('خطأ في إرسال التقديم للروم المخصص:', err);
        }
    }

    // 4. معالجة أزرار قبول أو رفض التقديم الإداري
    if (interaction.isButton() && (interaction.customId.startsWith('accept_app_') || interaction.customId.startsWith('reject_app_'))) {
        if (!canModerate(interaction.member)) {
            return interaction.reply({ content: '❌ عذراً، الأزرار مخصصة للمشرفين فقط!', ephemeral: true });
        }

        const isAccept = interaction.customId.startsWith('accept_app_');
        const targetUserId = interaction.customId.replace(isAccept ? 'accept_app_' : 'reject_app_', '');

        try {
            const targetUser = await interaction.guild.members.fetch(targetUserId);
            
            if (isAccept) {
                // رسالة القبول للخاص
                await targetUser.send({
                    content: `🎉 **مبروك! تم الموافقة على كونك إداري في سيرفر whoyousun.**\n⚠️ **تنبيه:** لا تفتح تذكرة أبداً إلا بعد أن يتم الإعلان رسمياً في روم المقبولين!`
                });
                await interaction.update({ content: `✅ تم قبول العضو ${targetUser} وإرسال رسالة القبول لخاصه.`, components: [] });
            } else {
                // رسالة الرفض للخاص
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

    // 5. إنشاء التكت بعد كتابة السبب
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

    // 6. أزرار تحكم المشرفين داخل التكت
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
                await interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true });ر
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

// حط التوكن حقك هنا
client.login('');