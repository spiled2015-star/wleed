const http = require('http');
http.createServer((req, res) => { res.write("Bot is alive!"); res.end(); }).listen(process.env.PORT || 3000);
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

// تخزين بيانات الجيف أوي النشطة في الذاكرة
const activeGiveaways = {};

// 🛡️ تعريف الرتب والآيديات المهمة ورومات السجلات (Logs)
const ROLES = {
    fullAdmin: ['1567133107386318909', '1566920315014090762'],
    midStaff: ['1566918799242829864'],
    basicStaff: ['1566830895439286272', '1566538164577898496'],

    highAdminTicket: '1566920315014090762',
    generalStaffTicket: '1566830895439286272',
    
    staffAppChannel: '1568180452781592636',
    welcomeChannel: '1566542604768649237',

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
        roleUpdate: '1568566414661656587',
        roleDelete: '1568566493011116133',
        voiceMove: '1568566734489657434',
        voiceDisconnect: '1568566856401420309'
    }
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
// 🌟 نظام الترحيب المطور (الروم المحدد + رسالة خاصة DM)
// ==========================================
client.on('guildMemberAdd', async member => {
    try {
        const welcomeChannel = member.guild.channels.cache.get(ROLES.welcomeChannel);
        if (welcomeChannel) {
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🎉 أهلاً بك في سيرفر whoyousun!')
                .setDescription(`نورنا انضمامك يا ${member}!\n\nنتمنى لك أوقاتاً ممتعة معنا. لا تنسَ قراءة القوانين والالتزام بها لتجنب العقوبات. ✨`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setColor('#2ecc71')
                .setTimestamp()
                .setFooter({ text: 'whoyousun Welcome System' });

            await welcomeChannel.send({ embeds: [welcomeEmbed] });
        }

        try {
            await member.send({
                content: `مرحباً بك يا **${member.user.username}** في سيرفر **whoyousun**! 🌟\nيسعدنا انضمامك إلينا، ونتمنى لك وقتاً ممتعاً. إذا احتجت لأي مساعدة، تفضل بفتح تذكرة في السيرفر.`
            });
        } catch (err) {}

        const logEmbed = new EmbedBuilder()
            .setTitle('📥 انضمام عضو جديد')
            .setDescription(`العضو: ${member} (\`${member.user.tag}\`)`)
            .setColor('#2ecc71')
            .setTimestamp();
        sendLog(member.guild, ROLES.logs.memberAdd, logEmbed);

    } catch (error) {
        console.error('خطأ في نظام الترحيب:', error);
    }
});


// ==========================================
// 📋 نظام السجلات المفصل والشامل (Audit Logs & Events)
// ==========================================
client.on('guildMemberRemove', member => {
    const embed = new EmbedBuilder()
        .setTitle('📤 مغادرة عضو')
        .setDescription(`العضو: \`${member.user.tag}\``)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(member.guild, ROLES.logs.memberRemove, embed);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
            .setTitle('✏️ تحديث اللقب (Nickname)')
            .setDescription(`العضو: ${newMember}\n**القديم:** \`${oldMember.nickname || oldMember.user.username}\`\n**الجديد:** \`${newMember.nickname || newMember.user.username}\``)
            .setColor('#3498db')
            .setTimestamp();
        sendLog(newMember.guild, ROLES.logs.nicknameUpdate, embed);
    }

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

client.on('messageDelete', message => {
    if (!message.guild || message.author?.bot) return;
    const embed = new EmbedBuilder()
        .setTitle('🗑️ حذف رسالة')
        .setDescription(`الكاتب: ${message.author}\nالروم: ${message.channel}\n**المحتوى:**\n${message.content || '*[رسالة فارغة أو تحتوي على وسائط]*'}`)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(message.guild, ROLES.logs.messageDelete, embed);
});

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

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    const embed = new EmbedBuilder()
        .setTitle('✏️💬 تعديل رسالة')
        .setDescription(`الكاتب: ${newMessage.author}\nالروم: ${newMessage.channel}\n**قبل التعديل:**\n${oldMessage.content || '*[فارغ]*'}\n\n**بعد التعديل:**\n${newMessage.content || '*[فارغ]*'}`)
        .setColor('#f1c40f')
        .setTimestamp();
    sendLog(newMessage.guild, ROLES.logs.messageUpdate, embed);
});

client.on('channelCreate', channel => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle('➕📢 إنشاء روم جديد')
        .setDescription(`الروم: ${channel} (\`${channel.name}\`)\nالنوع: \`${channel.type}\``)
        .setColor('#2ecc71')
        .setTimestamp();
    sendLog(channel.guild, ROLES.logs.channelCreate, embed);
});

client.on('channelDelete', channel => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle('❌📢 حذف روم')
        .setDescription(`اسم الروم المحذوف: \`${channel.name}\``)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(channel.guild, ROLES.logs.channelDelete, embed);
});

client.on('roleCreate', role => {
    const embed = new EmbedBuilder()
        .setTitle('➕🛡️ إنشاء رتبة جديدة')
        .setDescription(`الرتبة: ${role} (\`${role.name}\`)`)
        .setColor('#2ecc71')
        .setTimestamp();
    sendLog(role.guild, ROLES.logs.roleCreate, embed);
});

client.on('roleDelete', role => {
    const embed = new EmbedBuilder()
        .setTitle('❌🛡️ حذف رتبة')
        .setDescription(`اسم الرتبة المحذوفة: \`${role.name}\``)
        .setColor('#e74c3c')
        .setTimestamp();
    sendLog(role.guild, ROLES.logs.roleDelete, embed);
});

client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    const { action, executor, target, changes } = entry;

    if (action === AuditLogEvent.ChannelUpdate) {
        let changesDesc = '';
        if (changes) {
            changes.forEach(c => {
                changesDesc += `• الخاصية **${c.key}**: من \`${c.old ?? 'لايوجد'}\` إلى \`${c.new ?? 'لايوجد'}\`\n`;
            });
        }
        const embed = new EmbedBuilder()
            .setTitle('⚙️📢 تعديل روم')
            .setDescription(`الروم: ${target} (\`${target?.name || 'غير معروف'}\`)\nبواسطة المشرف: ${executor || 'غير معروف'}\n\n**التعديلات التي صارت:**\n${changesDesc || 'تعديل في الصلاحيات أو الإعدادات'}`)
            .setColor('#3498db')
            .setTimestamp();
        sendLog(guild, ROLES.logs.channelUpdate, embed);
    }

    if (action === AuditLogEvent.RoleUpdate) {
        let changesDesc = '';
        if (changes) {
            changes.forEach(c => {
                changesDesc += `• الخاصية **${c.key}**: من \`${c.old ?? 'لايوجد'}\` إلى \`${c.new ?? 'لايوجد'}\`\n`;
            });
        }
        const embed = new EmbedBuilder()
            .setTitle('⚙️🛡️ تعديل رتبة')
            .setDescription(`الرتبة: ${target} (\`${target?.name || 'غير معروف'}\`)\nبواسطة المشرف: ${executor || 'غير معروف'}\n\n**التعديلات التي صارت:**\n${changesDesc || 'تعديل في إعدادات الرتبة'}`)
            .setColor('#3498db')
            .setTimestamp();
        sendLog(guild, ROLES.logs.roleUpdate, embed);
    }

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
        if (changes?.some(c => c.key === 'communication_disabled_until')) {
            const embed = new EmbedBuilder()
                .setTitle('⏳ إعطاء تايم آウト (Timeout)')
                .setDescription(`العضو: <@${target?.id}>\nبواسطة المشرف: ${executor}`)
                .setColor('#f1c40f')
                .setTimestamp();
            sendLog(guild, ROLES.logs.timeout, embed);
        }
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    if (!member) return;

    if (oldState.channelId && !newState.channelId) {
        const embed = new EmbedBuilder()
            .setTitle('🔌 خروج من الروم الصوتي (Disconnect)')
            .setDescription(`العضو: ${member} خرج من روم: \`${oldState.channel.name}\``)
            .setColor('#e74c3c')
            .setTimestamp();
        sendLog(member.guild, ROLES.logs.voiceDisconnect, embed);
    }

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
// الأوامر النصية وتفاعلات الأزرار والتذاكر والجيف أوي
// ==========================================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const content = message.content.trim();

    // 0. أمر فتح نافذة الجيف أوي التفاعلية
    if (content === '!جيف-اوي' || content === '!giveaway') {
        if (!canModerate(message.member)) {
            return message.reply({ content: '❌ عذراً، هذا الأمر مخصص للمشرفين فقط.', ephemeral: true });
        }

        try {
            await message.delete().catch(() => {});

            const modal = new ModalBuilder()
                .setCustomId('giveaway_setup_modal')
                .setTitle('🎉 إنشاء مسابقة جيف أوي جديدة');

            const titleInput = new TextInputBuilder()
                .setCustomId('gw_title')
                .setLabel('عنوان الجيف أوي (مثال: سحب على رتبة بريميم)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const durationInput = new TextInputBuilder()
                .setCustomId('gw_duration')
                .setLabel('المدة بالدقائق (مثال: 5 أو 10)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const winnersInput = new TextInputBuilder()
                .setCustomId('gw_winners')
                .setLabel('عدد الفائزين (مثال: 1 أو 3)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const prizeInput = new TextInputBuilder()
                .setCustomId('gw_prize')
                .setLabel('الجائزة بالتفصيل')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(durationInput),
                new ActionRowBuilder().addComponents(winnersInput),
                new ActionRowBuilder().addComponents(prizeInput)
            );

            await message.showModal(modal);
        } catch (err) {
            console.error('خطأ في إظهار نافذة الجيف أوي:', err);
        }
        return;
    }

    // التحكم في التقديم
    if (content === 'فتح تقديم الادارة' || content === 'قفل تقديم الادارة') {
        if (message.channel.id === ROLES.appControlChannel) {
            if (canControlApps(message.member)) {
                try {
                    await message.delete().catch(() => {});
                    if (content === 'فتح تقديم الادارة') {
                        const openEmbed = new EmbedBuilder()
                            .setTitle('🟢 فتح التقديم الإداري - سيرفر whoyousun')
                            .setDescription('**أيها الأعضاء الأفاضل، تم فتح باب التقديم للانضمام إلى طاقم الإدارة!**\n\nاضغط على الأزرار المخصصة للتقديم بالأسفل. بالتوفيق للجميع! ✨')
                            .setColor('#2ecc71')
                            .setTimestamp();
                        await message.channel.send({ embeds: [openEmbed] });
                    } else {
                        const closeEmbed = new EmbedBuilder()
                            .setTitle('🔴 إغلاق التقديم الإداري - سيرفر whoyousun')
                            .setDescription('**تم إغلاق باب التقديم الإداري في الوقت الحالي.**')
                            .setColor('#e74c3c')
                            .setTimestamp();
                        await message.channel.send({ embeds: [closeEmbed] });
                    }
                } catch (err) {}
            }
        }
        return;
    }

    if (content.includes('السلام عليكم') || content.includes('سلام عليكم') || content.includes('مرحبا')) {
        return message.reply(`𝔴𝔥𝔬𝔶𝔬𝔲𝔰𝔲𝔫- وعليكم السلام... خير، وش عندك جاي تسايرني؟ خلصنا 😒`);
    }

    if (content === '!تكت') {
        const embed = new EmbedBuilder()
            .setTitle('🎫 نظام التذاكر والدعم الفني')
            .setDescription('أهلاً بك عزيزي العضو في نظام التذاكر.\nيرجى اختيار القسم المناسب لطلبك من القائمة أدناه.')
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

    if (content === '!تقديم') {
        const embed = new EmbedBuilder()
            .setTitle('🌟 التقديم على الإدارة - سيرفر whoyousun')
            .setDescription('اضغط على الزر أدناه وأجب عن الأسئلة للتقديم على الإدارة.')
            .setColor('#FFFFFF');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('open_staff_application').setLabel('قدم الان').setStyle(ButtonStyle.Secondary).setEmoji('📋')
            );
        await message.channel.send({ embeds: [embed], components: [row] });
    }

    if (content.startsWith('!مسح') || content.startsWith('!م')) {
        if (!canModerate(message.member)) return message.reply({ content: '❌ عذراً، لا تمتلك الصلاحية.', ephemeral: true });
        const args = content.split(' ');
        const count = parseInt(args[1]);
        if (isNaN(count) || count <= 0 || count > 100) return message.reply({ content: '⚠️ حدد عدد بين 1 و 100.' });
        try {
            await message.channel.bulkDelete(count + 1, true);
            const reply = await message.channel.send(`✅ تم مسح **${count}** رسالة.`);
            setTimeout(() => reply.delete().catch(() => {}), 3000);
        } catch (err) {}
    }
});

// التعامل مع التفاعلات (الأزرار، القوائم، النافذة التفاعلية للجيف أوي)
client.on('interactionCreate', async interaction => {
    // 1. تسليم نافذة الجيف أوي
    if (interaction.isModalSubmit() && interaction.customId === 'giveaway_setup_modal') {
        const gwTitle = interaction.fields.getTextInputValue('gw_title');
        const durationMinutes = parseInt(interaction.fields.getTextInputValue('gw_duration'));
        const winnersCount = parseInt(interaction.fields.getTextInputValue('gw_winners'));
        const prize = interaction.fields.getTextInputValue('gw_prize');

        if (isNaN(durationMinutes) || durationMinutes <= 0 || isNaN(winnersCount) || winnersCount <= 0) {
            return interaction.reply({ content: '❌ يرجى إدخال أرقام صحيحة للمدة وعدد الفائزين!', ephemeral: true });
        }

        await interaction.reply({ content: '✅ جاري إطلاق الجيف أوي في الروم...', ephemeral: true });

        const endTime = Date.now() + (durationMinutes * 60 * 1000);

        const giveawayEmbed = new EmbedBuilder()
            .setTitle(`🎉 **${gwTitle}** 🎉`)
            .setDescription(`🎁 **الجائزة:** **${prize}**\n👑 **عدد الفائزين:** \`${winnersCount}\`\n👤 **المشرف المنظم:** ${interaction.user}\n⏳ **ينتهي خلال:** \`${durationMinutes} دقائق\`\n👥 **المشاركون (joined):** \`0\`\n\nاضغط على زر **شارك** أدناه للمشاركة! 👇`)
            .setColor('#f1c40f')
            .setTimestamp(endTime)
            .setFooter({ text: 'whoyousun Giveaway System' });

        const joinButton = new ButtonBuilder()
            .setCustomId('join_giveaway')
            .setLabel('شارك')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎉');

        const row = new ActionRowBuilder().addComponents(joinButton);

        const sentMsg = await interaction.channel.send({ embeds: [giveawayEmbed], components: [row] });

        activeGiveaways[sentMsg.id] = {
            title: gwTitle,
            prize: prize,
            winnersCount: winnersCount,
            participants: [],
            endTime: endTime,
            hostTag: interaction.user.tag,
            channelId: interaction.channel.id
        };

        setTimeout(async () => {
            const giveawayData = activeGiveaways[sentMsg.id];
            if (!giveawayData) return;

            const fetchedMsg = await interaction.channel.messages.fetch(sentMsg.id).catch(() => null);

            if (giveawayData.participants.length === 0) {
                if (fetchedMsg) {
                    const endedEmbed = new EmbedBuilder()
                        .setTitle(`🎉 **${gwTitle} (انتهى السحب)** 🎉`)
                        .setDescription(`🎁 **الجائزة:** **${prize}**\n\n❌ **للأسف، لم يشارك أي شخص في هذا السحب!**`)
                        .setColor('#e74c3c');
                    await fetchedMsg.edit({ embeds: [endedEmbed], components: [] }).catch(() => {});
                }
            } else {
                const shuffled = [...giveawayData.participants].sort(() => 0.5 - Math.random());
                const winners = shuffled.slice(0, giveawayData.winnersCount);
                const winnersMentions = winners.map(id => `<@${id}>`).join(', ');

                if (fetchedMsg) {
                    const winnerEmbed = new EmbedBuilder()
                        .setTitle(`🏆 **${gwTitle} - الفائزون!** 🏆`)
                        .setDescription(`🎁 **الجائزة:** **${prize}**\n\n👑 **الفائزون المحظوظون:** ${winnersMentions}\n🎉 ألف مبروك!`)
                        .setColor('#2ecc71');
                    await fetchedMsg.edit({ embeds: [winnerEmbed], components: [] }).catch(() => {});
                }

                await interaction.channel.send({ content: `🎊 ألف مبروك لـ ${winnersMentions} لقد فزتم بـ **${prize}**!` });
            }

            delete activeGiveaways[sentMsg.id];
        }, durationMinutes * 60 * 1000);
    }

    // 2. زر المشاركة في الجيف أوي (شارك / joined)
    if (interaction.isButton() && interaction.customId === 'join_giveaway') {
        const messageId = interaction.message.id;
        const giveaway = activeGiveaways[messageId];

        if (!giveaway) {
            return interaction.reply({ content: '❌ عذراً، هذا السحب انتهى أو غير موجود.', ephemeral: true });
        }

        const userId = interaction.user.id;
        if (giveaway.participants.includes(userId)) {
            return interaction.reply({ content: '⚠️ أنت مشارك بالفعل في هذا السحب، بالتوفيق! 🍀', ephemeral: true });
        }

        giveaway.participants.push(userId);

        try {
            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setDescription(`🎁 **الجائزة:** **${giveaway.prize}**\n👑 **عدد الفائزين:** \`${giveaway.winnersCount}\`\n👤 **المشرف المنظم:** ${giveaway.hostTag}\n⏳ **الحالة:** جاري السحب...\n👥 **المشاركون (joined):** \`${giveaway.participants.length}\`\n\nاضغط على زر **شارك** أدناه للمشاركة! 👇`);

            await interaction.message.edit({ embeds: [updatedEmbed] });
            await interaction.reply({ content: '✅ تم تسجيك في الجيف أوي بنجاح! بالتوفيق 🍀', ephemeral: true });
        } catch (err) {}
    }

    // التذاكر والتقديمات
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
        const selectedValue = interaction.values[0];
        const modal = new ModalBuilder()
            .setCustomId(`modal_${selectedValue}`)
            .setTitle('سبب فتح التذكرة');

        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason')
            .setLabel('الراجء كتابة سبب فتح التذكرة بالتفصيل:')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    }

    if (interaction.isButton() && interaction.customId === 'open_staff_application') {
        const modal = new ModalBuilder()
            .setCustomId('staff_app_modal')
            .setTitle('whoyousun - تقديم الإدارة');

        const q1 = new TextInputBuilder().setCustomId('app_q1').setLabel('1. ما هو اسمك؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q2 = new TextInputBuilder().setCustomId('app_q2').setLabel('2. كم عمرك؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q3 = new TextInputBuilder().setCustomId('app_q3').setLabel('3. هل كنت إداري سابقاً؟').setStyle(TextInputStyle.Short).setRequired(true);
        const q4 = new TextInputBuilder().setCustomId('app_q4').setLabel('4. أعلى رتبة أخذتها؟').setStyle(TextInputStyle.Short).setRequired(false);
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
            .setDescription(`تم استلام تقديم من العضو: ${member}`)
            .addFields(
                { name: '1. الاسم:', value: name, inline: true },
                { name: '2. العمر:', value: age, inline: true },
                { name: '3. إداري سابق؟', value: prevAdmin, inline: true },
                { name: '4. أعلى رتبة:', value: highestRank, inline: true },
                { name: '5. الوصف:', value: description, inline: false }
            )
            .setColor('#00FF00')
            .setTimestamp();

        const appRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`accept_app_${member.id}`).setLabel('قبول الطلب').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId(`reject_app_${member.id}`).setLabel('رفض الطلب').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

        await interaction.reply({ content: '✅ تم إرسال تقديمك بنجاح للإدارة!', ephemeral: true });

        try {
            const targetChannel = await interaction.guild.channels.fetch(ROLES.staffAppChannel);
            if (targetChannel) {
                await targetChannel.send({ embeds: [resultEmbed], components: [appRow] });
            }
        } catch (err) {}
    }
});

client.login(process.env.DISCORD_TOKEN);
