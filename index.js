require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// خادم وهمي لإبقاء البوت شغال 24/7 على الاستضافات المجانية
app.get('/', (req, res) => {
    res.send('5obzeh Bot is alive and running 24/7!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// الأيدي المحددة
const STAFF_ROLES = [
    "1488159288718393465",
    "1508831905087361024",
    "1508831965619425520",
    "1508832017691967699"
];
const HIGHER_MANAGEMENT_ROLE = "1466101012866797832";
const TICKET_CATEGORY_ID = "1487487613936996442"; // قسم التذاكر
const APPLY_CHANNEL_ID = "1569291039259230289"; // روم استقبال التقديمات الإدارية
const APPLY_ANNOUNCE_CHANNEL = "1569290442967879740"; // روم إعلان وفتح/قفل التقديم

const warnings = new Map();
const globalWarningsLog = [];

client.once('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
});

function parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    let ms = value * 1000;
    if (unit === 'm') ms = value * 60 * 1000;
    if (unit === 'h') ms = value * 60 * 60 * 1000;
    if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;
    return ms;
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim();
    const args = content.split(/ +/);
    const command = args[0];

    const isStaff = STAFF_ROLES.some(r => message.member.roles.cache.has(r)) || message.member.roles.cache.has(HIGHER_MANAGEMENT_ROLE) || message.member.permissions.has(PermissionFlagsBits.Administrator);

    // 1. نظام فتح وإغلاق تقديم الإدارة
    if (content === 'فتح تقديم الادارة') {
        if (!isStaff) return message.reply('❌ هذا الأمر مخصص للإداريين فقط.');
        if (message.channel.id !== APPLY_ANNOUNCE_CHANNEL && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply(`❌ هذا الأمر مخصص فقط في روم الإعلانات المحدد.`);
        }

        const serverIcon = message.guild.iconURL({ dynamic: true }) || null;
        const embed = new EmbedBuilder()
            .setTitle('📌 التقديم على الإدارة - سيرفر 5obzeh')
            .setDescription(
                'أهلاً بك عزيزي العضو في سيرفر 5obzeh!\n' +
                'نحن نبحث دائماً عن أشخاص مميزين للانضمام إلى طاقم الإدارة ومساعدة المجتمع.\n\n' +
                'إذا كنت ترى في نفسك الكفاءة وتبي تقدم، اضغط على الزر أدناه وأجب عن الأسئلة بكل إتقان وصراحة. بالتوفيق!'
            )
            .setColor(0x5865F2);

        if (serverIcon) embed.setThumbnail(serverIcon);

        const applyButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_apply_modal')
                .setLabel('قدم الآن')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );

        await message.delete().catch(() => {});
        await message.channel.send({ content: '@everyone 🚀 **تم فتح باب التقديم على الإدارة!**', embeds: [embed], components: [applyButton] });
        return;
    }

    if (content === 'قفل تقديم الادارة') {
        if (!isStaff) return message.reply('❌ هذا الأمر مخصص للإداريين فقط.');
        if (message.channel.id !== APPLY_ANNOUNCE_CHANNEL && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply(`❌ هذا الأمر مخصص فقط في روم الإعلانات المحدد.`);
        }

        const closedEmbed = new EmbedBuilder()
            .setTitle('🔒 تم إغلاق تقديم الإدارة')
            .setDescription('نعتذر منكم، تم إغلاق باب استقبال التقديمات الإدارية حالياً. شكراً لكل من تقدم، ونتمنى لكم حظاً أوفر في المرات القادمة.')
            .setColor(0xED4245);

        await message.delete().catch(() => {});
        await message.channel.send({ content: '@everyone ⚠️ **تم قفل تقديم الإدارة.**', embeds: [closedEmbed] });
        return;
    }

    // 2. أمر مسح / م [العدد]
    if (command === 'مسح' || command === 'م') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ ليس لديك صلاحية إدارة الرسائل (حذف الرسائل).');
        }

        const count = parseInt(args[1]);
        if (isNaN(count) || count < 1 || count > 100) {
            return message.reply('❌ يرجى تحديد عدد صحيح للرسايل المراد حذفها بين 1 و 100 (مثال: `مسح 5` أو `م 5`).');
        }

        try {
            await message.delete().catch(() => {});
            const deleted = await message.channel.bulkDelete(count, true);
            const replyMsg = await message.channel.send(`✅ تم مسح **${deleted.size}** رسالة بنجاح.`);
            setTimeout(() => replyMsg.delete().catch(() => {}), 3000);
        } catch (err) {
            await message.reply('❌ لا يمكنني حذف الرسائل القديمة التي تجاوزت 14 يوماً.');
        }
        return;
    }

    // 3. أمر إرسال لوحة التذاكر !تكت
    if (command === '!تكت') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: '❌ هذا الأمر مخصص للمسؤولين فقط.', ephemeral: true });
        }

        const serverIcon = message.guild.iconURL({ dynamic: true }) || null;
        const embed = new EmbedBuilder()
            .setTitle('🎫 نظام التذاكر والدعم الفني')
            .setDescription(
                '- اختر من الخيارات أدناه نوع التذكرة المناسب لك.\n' +
                '- سيتم تحويلك إلى القسم المختص لمساعدتك في طلبك.\n' +
                '- يرجى توضيح طلبك بشكل واضح وانتظار رد الإدارة بكل احترام.'
            )
            .setColor(0x2f3136);

        if (serverIcon) embed.setThumbnail(serverIcon);

        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_menu')
            .setPlaceholder('اضغط هنا لاختيار نوع التذكرة...')
            .addOptions([
                { label: 'استفسار', description: 'للاستفسارات العامة والأسئلة', value: 'ticket_inquiry', emoji: '🟢' },
                { label: 'طلب إدارة عليا', description: 'للتواصل مع الإدارة العليا حصراً', value: 'ticket_management', emoji: '⬛' },
                { label: 'شكوى', description: 'لتقديم شكوى أو ملاحظة', value: 'ticket_complaint', emoji: '🔴' },
                { label: 'دعم فني', description: 'لحل المشاكل التقنية والبوتات', value: 'ticket_support', emoji: '🔵' }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);
        await message.delete().catch(() => {});
        await message.channel.send({ embeds: [embed], components: [row] });
        return;
    }

    // 4. نظام التحذيرات والإشراف
    if (command === 'تحذير') {
        if (!isStaff && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ليس لديك صلاحية لإعطاء تحذيرات.');
        }

        const target = message.mentions.members.first();
        const reason = args.slice(2).join(' ') || 'بدون سبب';
        if (!target) return message.reply('❌ يرجى منشن الشخص المراد تحذيره.');

        const userId = target.id;
        if (!warnings.has(userId)) warnings.set(userId, []);
        
        const timestamp = new Date().toLocaleString();
        const userWarnings = warnings.get(userId);
        userWarnings.push({ reason, time: timestamp, moderator: message.author.tag });

        globalWarningsLog.unshift({ user: target.user.tag, reason, time: timestamp, moderator: message.author.tag });
        if (globalWarningsLog.length > 10) globalWarningsLog.pop();

        try {
            await target.send(`⚠️ **تم تحذيرك في سيرفر ${message.guild.name}**\n• **السبب:** ${reason}\n• **عدد تحذيراتك الحالية:** ${userWarnings.length}`);
        } catch (e) {}

        await message.channel.send(`✅ تم تحذير العضو **${target.user.tag}**. (إجمالي التحذيرات: ${userWarnings.length})`);

        if (userWarnings.length >= 3) {
            try {
                await target.timeout(60 * 60 * 1000, 'تجاوز الحد الأقص للتحذيرات (3 تحذيرات)');
                await message.channel.send(`⏰ العضو ${target} وصل إلى 3 تحذيرات وتم إعطاؤه تايم أوت تلقائي لمدة ساعة.`);
            } catch (err) {}
        }
        return;
    }

    if (command === 'وارن') {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى منشن الشخص لعرض تحذيراته.');

        const userWarnings = warnings.get(target.id) || [];
        if (userWarnings.length === 0) {
            return message.reply(`✅ العضو ${target.user.tag} ليس لديه أي تحذيرات.`);
        }

        let desc = userWarnings.map((w, index) => `**${index + 1}.** السبب: ${w.reason}\n   ⏱️ الوقت: ${w.time}\n   🛡️ بواسطة: ${w.moderator}`).join('\n\n');
        const embed = new EmbedBuilder().setTitle(`سجل تحذيرات العضو: ${target.user.tag}`).setDescription(desc).setColor(0xffcc00);
        await message.reply({ embeds: [embed] });
        return;
    }

    if (content === 'بس وارن') {
        if (globalWarningsLog.length === 0) {
            return message.reply('📂 لا توجد أي تحذيرات مسجلة حتى الآن.');
        }

        let desc = globalWarningsLog.map((w, index) => `**${index + 1}.** العضو: **${w.user}**\n   📌 السبب: ${w.reason}\n   ⏱️ الوقت: ${w.time}\n   🛡️ بواسطة: ${w.moderator}`).join('\n\n');
        const embed = new EmbedBuilder().setTitle('📋 سجل آخر التحذيرات في السيرفر').setDescription(desc).setColor(0x0099ff);
        await message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'كيك' || command === 'هش') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ ليس لديك صلاحية طرد الأعضاء.');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى منشن الشخص المراد طرده.');
        
        try {
            await target.kick();
            await message.channel.send(`👢 تم طرد العضو **${target.user.tag}** بنجاح.`);
        } catch (err) {
            await message.reply('❌ لا يمكنني طرد هذا العضو.');
        }
        return;
    }

    if (command === 'بان' || command === 'تف') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ ليس لديك صلاحية حظر الأعضاء.');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ يرجى منشن الشخص المراد حظره.');

        try {
            await target.ban();
            await message.channel.send(`🔨 تم حظر العضو **${target.user.tag}** بنجاح.`);
        } catch (err) {
            await message.reply('❌ لا يمكنني حظر هذا العضو.');
        }
        return;
    }

    if (command === 'تايم') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ليس لديك صلاحية إعطاء تايم أوت.');
        }
        const target = message.mentions.members.first();
        const durationStr = args[2];
        if (!target || !durationStr) {
            return message.reply('❌ الاستخدام الصحيح: `تايم @الشخص 1h`');
        }

        const ms = parseDuration(durationStr);
        if (!ms) return message.reply('❌ صيغة الوقت غير صحيحة.');

        try {
            await target.timeout(ms, `بواسطة ${message.author.tag}`);
            await message.channel.send(`⏳ تم إعطاء تايم أوت للعضو **${target.user.tag}** لمدة **${durationStr}**.`);
        } catch (err) {
            await message.reply('❌ فشل تنفيذ التايم أوت.');
        }
        return;
    }
});

// التفاعلات والأزرار
client.on('interactionCreate', async interaction => {
    
    // زر "قدم الآن" (5 أسئلة)
    if (interaction.isButton() && interaction.customId === 'open_apply_modal') {
        const modal = new ModalBuilder()
            .setCustomId('apply_modal_main')
            .setTitle('نموذج التقديم للإدارة - 5obzeh');

        const q1 = new TextInputBuilder().setCustomId('q1_name').setLabel('1. اسمك').setStyle(TextInputStyle.Short).setRequired(true);
        const q2 = new TextInputBuilder().setCustomId('q2_age').setLabel('2. عمرك').setStyle(TextInputStyle.Short).setRequired(true);
        const q3 = new TextInputBuilder().setCustomId('q3_other').setLabel('3. هل انت اداري في سيرفر ثاني؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q4 = new TextInputBuilder().setCustomId('q4_exp').setLabel('4. خبراتك السابقة').setStyle(TextInputStyle.Paragraph).setRequired(true);
        const q5 = new TextInputBuilder().setCustomId('q5_desc').setLabel('5. اوصف نفسك بثلاث كلمات').setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(q1),
            new ActionRowBuilder().addComponents(q2),
            new ActionRowBuilder().addComponents(q3),
            new ActionRowBuilder().addComponents(q4),
            new ActionRowBuilder().addComponents(q5)
        );

        return await interaction.showModal(modal);
    }

    // إرسال نموذج التقديم لروم الإدارة
    if (interaction.isModalSubmit() && interaction.customId === 'apply_modal_main') {
        const name = interaction.fields.getTextInputValue('q1_name');
        const age = interaction.fields.getTextInputValue('q2_age');
        const other = interaction.fields.getTextInputValue('q3_other');
        const exp = interaction.fields.getTextInputValue('q4_exp');
        const desc = interaction.fields.getTextInputValue('q5_desc');

        await interaction.reply({ content: '✅ تم إرسال تقديمك بنجاح إلى الإدارة!', ephemeral: true });

        const applyChannel = interaction.guild.channels.cache.get(APPLY_CHANNEL_ID);
        if (applyChannel) {
            const embed = new EmbedBuilder()
                .setTitle(`📥 طلب تقديم إداري جديد من: ${interaction.user.tag}`)
                .addFields(
                    { name: '1. الاسم', value: name, inline: true },
                    { name: '2. العمر', value: age, inline: true },
                    { name: '3. إداري بسيرفر ثاني', value: other, inline: true },
                    { name: '4. الخبرات السابقة', value: exp },
                    { name: '5. وصف النفس', value: desc, inline: true }
                )
                .setColor(0x00AE86)
                .setTimestamp();

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`accept_apply_${interaction.user.id}`).setLabel('قبول').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId(`reject_apply_${interaction.user.id}`).setLabel('رفض').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            await applyChannel.send({ embeds: [embed], components: [buttons] });
        }
        return;
    }

    // أزرار قبول أو رفض التقديم
    if (interaction.isButton()) {
        const member = interaction.member;
        const isStaff = STAFF_ROLES.some(r => member.roles.cache.has(r)) || member.roles.cache.has(HIGHER_MANAGEMENT_ROLE) || member.permissions.has(PermissionFlagsBits.Administrator);

        if (interaction.customId.startsWith('accept_apply_') || interaction.customId.startsWith('reject_apply_')) {
            if (!isStaff) {
                return interaction.reply({ content: '❌ هذه الأزرار مخصصة للإداريين فقط!', ephemeral: true });
            }

            const targetUserId = interaction.customId.split('_')[2];
            const targetUser = await interaction.guild.members.fetch(targetUserId).catch(() => null);

            if (interaction.customId.startsWith('accept_apply_')) {
                await interaction.reply({ content: `✅ تم قبول العضو بنجاح.` });
                
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('accepted').setLabel('تم القبول ✅').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('rejected').setLabel('رفض').setStyle(ButtonStyle.Danger).setDisabled(true)
                );
                await interaction.message.edit({ components: [disabledRow] });

                if (targetUser) {
                    try {
                        await targetUser.send('🎉 **مبروك! تم الموافقة على كونك إداري في سيرفر 5obzeh.**');
                    } catch (e) {}
                }
            } 
            else if (interaction.customId.startsWith('reject_apply_')) {
                await interaction.reply({ content: `❌ تم رفض العضو.` });

                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('accepted').setLabel('قبول').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('rejected').setLabel('تم الرفض ❌').setStyle(ButtonStyle.Danger).setDisabled(true)
                );
                await interaction.message.edit({ components: [disabledRow] });

                if (targetUser) {
                    try {
                        await targetUser.send('❌ عذراً، تم رفض طلبك كإداري في سيرفر 5obzeh. نتمنى لك حظاً أوفر في المرات القادمة.');
                    } catch (e) {}
                }
            }
        }
    }

    // التذاكر
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_menu') {
            const guild = interaction.guild;
            const member = interaction.member;
            const selectedValue = interaction.values[0];

            let ticketName = 'ticket';
            if (selectedValue === 'ticket_inquiry') ticketName = `استفسار-${member.user.username}`;
            else if (selectedValue === 'ticket_management') ticketName = `إدارة-عليا-${member.user.username}`;
            else if (selectedValue === 'ticket_complaint') ticketName = `شكوى-${member.user.username}`;
            else if (selectedValue === 'ticket_support') ticketName = `دعم-${member.user.username}`;

            await interaction.deferReply({ ephemeral: true });

            try {
                let permissionOverwrites = [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ];

                if (selectedValue === 'ticket_management') {
                    permissionOverwrites.push({
                        id: HIGHER_MANAGEMENT_ROLE,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    });
                } else {
                    STAFF_ROLES.forEach(roleId => {
                        permissionOverwrites.push({
                            id: roleId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                        });
                    });
                }

                const channel = await guild.channels.create({
                    name: ticketName,
                    type: ChannelType.GuildText,
                    parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: permissionOverwrites,
                });

                await interaction.editReply(`✅ تم إنشاء تذكرتك بنجاح! توجه إلى هنا: ${channel}`);

                const rowButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام التذكرة').setStyle(ButtonStyle.Success).setEmoji('✅'),
                    new ButtonBuilder().setCustomId('add_user').setLabel('إضافة شخص').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                const serverIconInside = guild.iconURL({ dynamic: true }) || null;
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('🎫 تفاصيل التذكرة')
                    .setDescription(`مرحباً بك ${member}!\nتم فتح التذكرة بنجاح.\n\n• **نوع التذكرة:** ${selectedValue === 'ticket_management' ? 'طلب إدارة عليا ⬛' : 'دعم/استفسار/شكوى'}\nبانتظار رد أحد أعضاء الفريق أو استلام التذكرة.`)
                    .setColor(0x00AE86);

                if (serverIconInside) welcomeEmbed.setThumbnail(serverIconInside);

                await channel.send({ content: `${member}`, embeds: [welcomeEmbed], components: [rowButtons] });

            } catch (error) {
                console.error(error);
                await interaction.editReply('حدث خطأ أثناء محاولة إنشاء التذكرة.');
            }
        }
    }

    if (interaction.isButton()) {
        const channel = interaction.channel;
        const member = interaction.member;
        const isStaff = STAFF_ROLES.some(r => member.roles.cache.has(r)) || member.roles.cache.has(HIGHER_MANAGEMENT_ROLE) || member.permissions.has(PermissionFlagsBits.Administrator);

        if (interaction.customId === 'claim_ticket') {
            if (!isStaff) return interaction.reply({ content: '❌ هذا الزر مخصص للإداريين فقط!', ephemeral: true });

            await interaction.reply(`✅ قام **${member.user.tag}** باستلام هذه التذكرة.`);
            try {
                await channel.permissionOverwrites.edit(member.id, { SendMessages: true, ViewChannel: true });
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claimed').setLabel(`استلمها: ${member.user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('add_user').setLabel('إضافة شخص').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );
                await interaction.message.edit({ components: [disabledRow] });
            } catch (err) {}
        }
        else if (interaction.customId === 'add_user' || interaction.customId === 'close_ticket') {
            if (!isStaff) return interaction.reply({ content: '❌ هذه الأزرار مخصصة للإداريين ومستلم التذكرة فقط.', ephemeral: true });

            if (interaction.customId === 'add_user') {
                const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('إضافة شخص إلى التذكرة');
                const userIdInput = new TextInputBuilder().setCustomId('user_id_input').setLabel('أدخل آيدي الشخص (User ID)').setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(userIdInput));
                await interaction.showModal(modal);
            } 
            else if (interaction.customId === 'close_ticket') {
                await interaction.reply('🔒 جاري إغلاق وحذف التذكرة خلال 5 ثوانٍ...');
                setTimeout(async () => {
                    try { await channel.delete(); } catch (e) {}
                }, 5000);
            }
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_add_user') {
        const userId = interaction.fields.getTextInputValue('user_id_input').trim();
        const channel = interaction.channel;
        try {
            const userToAdd = await interaction.guild.members.fetch(userId);
            if (!userToAdd) return interaction.reply({ content: '❌ لم يتم العثور على العضو!', ephemeral: true });

            await channel.permissionOverwrites.edit(userToAdd.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
            await interaction.reply(`✅ تم إضافة العضو ${userToAdd} إلى التذكرة.`);
        } catch (err) {
            await interaction.reply({ content: '❌ حدث خطأ، تأكد من الآيدي.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);