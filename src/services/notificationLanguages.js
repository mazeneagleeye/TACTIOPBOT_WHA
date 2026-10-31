// Notification language translations for TACTIOPBOT_WHA.
// Ported from the Discord notification language source (cmNotificationLanguages.js).
// All 22 language identifiers are preserved exactly as in the source.
// Only subscription/status messages are stored here; notification title/message/footer
// are omitted because no automatic delivery is active in this chapter.
// Falls back to English for any missing translation.

const LANGUAGES = {
  English: {
    subscribed: 'Subscribed to Clan Mission notifications.',
    updated: 'Notification settings updated.',
    unsubscribed: 'Unsubscribed from Clan Mission notifications.',
    noSubscription: 'You are not subscribed to Clan Mission notifications.',
    subscribedEnabled: 'Subscribed — notifications enabled.',
    subscribedDisabled: 'Subscribed — notifications disabled.',
    deliveryNotActive: 'Automatic delivery is not yet active. It will activate after WhatsApp template approval and scheduler setup.',
    languageCurrent: 'Current language: English',
    languageChanged: 'Language changed to English.',
    invalidLanguage: 'Unsupported language. Supported: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Arabic: {
    subscribed: 'لقد تم الاشتراك في إشعارات مهام العشيرة.',
    updated: 'تم تحديث إعدادات الإشعارات.',
    unsubscribed: 'تم إلغاء الاشتراك في إشعارات مهام العشيرة.',
    noSubscription: 'أنت غير مشترك في إشعارات مهام العشيرة.',
    subscribedEnabled: 'مشترك — الإشعارات مفعلة.',
    subscribedDisabled: 'مشترك — الإشعارات معطلة.',
    deliveryNotActive: 'التسليم التلقائي غير نشط بعد. سيتم تفعيله بعد موافقة قالب واتساب وإعداد المجدول.',
    languageCurrent: 'اللغة الحالية: العربية',
    languageChanged: 'تم تغيير اللغة إلى العربية.',
    invalidLanguage: 'لغة غير مدعومة. اللغات المدعومة: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Spanish: {
    subscribed: 'Suscrito a las notificaciones de misiones del clan.',
    updated: 'Configuración de notificaciones actualizada.',
    unsubscribed: 'Dado de baja de las notificaciones de misiones del clan.',
    noSubscription: 'No estás suscrito a las notificaciones de misiones del clan.',
    subscribedEnabled: 'Suscrito — notificaciones habilitadas.',
    subscribedDisabled: 'Suscrito — notificaciones deshabilitadas.',
    deliveryNotActive: 'La entrega automática aún no está activa. Se activará tras la aprobación de la plantilla de WhatsApp y la configuración del programador.',
    languageCurrent: 'Idioma actual: Español',
    languageChanged: 'Idioma cambiado a Español.',
    invalidLanguage: 'Idioma no admitido. Idiomas admitidos: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Portuguese: {
    subscribed: 'Inscrito nas notificações de missões do clã.',
    updated: 'Configurações de notificação atualizadas.',
    unsubscribed: 'Cancelado a inscrição nas notificações de missões do clã.',
    noSubscription: 'Você não está inscrito nas notificações de missões do clã.',
    subscribedEnabled: 'Inscrito — notificações ativadas.',
    subscribedDisabled: 'Inscrito — notificações desativadas.',
    deliveryNotActive: 'A entrega automática ainda não está ativa. Será ativada após a aprovação do modelo do WhatsApp e a configuração do agendador.',
    languageCurrent: 'Idioma atual: Português',
    languageChanged: 'Idioma alterado para Português.',
    invalidLanguage: 'Idioma não suportado. Idiomas suportados: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Russian: {
    subscribed: 'Подписка на уведомления о миссиях клана оформлена.',
    updated: 'Настройки уведомлений обновлены.',
    unsubscribed: 'Отписка от уведомлений о миссиях клана.',
    noSubscription: 'Вы не подписаны на уведомления о миссиях клана.',
    subscribedEnabled: 'Подписан — уведомления включены.',
    subscribedDisabled: 'Подписан — уведомления выключены.',
    deliveryNotActive: 'Автоматическая доставка еще не активна. Активируется после одобрения шаблона WhatsApp и настройки планировщика.',
    languageCurrent: 'Текущий язык: Русский',
    languageChanged: 'Язык изменен на Русский.',
    invalidLanguage: 'Язык не поддерживается. Поддерживаемые языки: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  French: {
    subscribed: 'Abonné aux notifications de missions de clan.',
    updated: 'Paramètres de notification mis à jour.',
    unsubscribed: 'Désabonné des notifications de missions de clan.',
    noSubscription: 'Vous n\'êtes pas abonné aux notifications de missions de clan.',
    subscribedEnabled: 'Abonné — notifications activées.',
    subscribedDisabled: 'Abonné — notifications désactivées.',
    deliveryNotActive: 'La livraison automatique n\'est pas encore active. Elle s\'activera après l\'approbation du modèle WhatsApp et la configuration du planificateur.',
    languageCurrent: 'Langue actuelle : Français',
    languageChanged: 'Langue changée en Français.',
    invalidLanguage: 'Langue non prise en charge. Langues prises en charge : English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  German: {
    subscribed: 'Abonniert für Clan-Missions-Benachrichtigungen.',
    updated: 'Benachrichtigungseinstellungen aktualisiert.',
    unsubscribed: 'Abgemeldet von Clan-Missions-Benachrichtigungen.',
    noSubscription: 'Sie sind nicht für Clan-Missions-Benachrichtigungen abonniert.',
    subscribedEnabled: 'Abonniert — Benachrichtigungen aktiviert.',
    subscribedDisabled: 'Abonniert — Benachrichtigungen deaktiviert.',
    deliveryNotActive: 'Automatische Zustellung ist noch nicht aktiv. Sie wird aktiviert nach WhatsApp-Vorlagenfreigabe und Scheduler-Einrichtung.',
    languageCurrent: 'Aktuelle Sprache: Deutsch',
    languageChanged: 'Sprache geändert auf Deutsch.',
    invalidLanguage: 'Nicht unterstützte Sprache. Unterstützte Sprachen: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Turkish: {
    subscribed: 'Klan görev bildirimlerine abone oldunuz.',
    updated: 'Bildirim ayarları güncellendi.',
    unsubscribed: 'Klan görev bildirimlerinden abonelik iptal edildi.',
    noSubscription: 'Klan görev bildirimlerine abone değilsiniz.',
    subscribedEnabled: 'Abonelik etkin — bildirimler açık.',
    subscribedDisabled: 'Abonelik etkin — bildirimler kapalı.',
    deliveryNotActive: 'Otomatik teslimat henüz etkin değil. WhatsApp şablon onayı ve zamanlayıcı kurulumundan sonra etkinleştirilecek.',
    languageCurrent: 'Geçerli dil: Türkçe',
    languageChanged: 'Dil Türkçe olarak değiştirildi.',
    invalidLanguage: 'Desteklenmeyen dil. Desteklenen diller: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Indonesian: {
    subscribed: 'Terkelola notifikasi misi klan.',
    updated: 'Pengaturan notifikasi diperbarui.',
    unsubscribed: 'Berhenti menerima notifikasi misi klan.',
    noSubscription: 'Anda tidak menerima notifikasi misi klan.',
    subscribedEnabled: 'Terkelola — notifikasi diaktifkan.',
    subscribedDisabled: 'Terkelola — notifikasi dinonaktifkan.',
    deliveryNotActive: 'Pengiriman otomatis belum aktif. Akan aktif setelah persetujuan template WhatsApp dan pengaturan jadwal.',
    languageCurrent: 'Bahasa saat ini: Bahasa Indonesia',
    languageChanged: 'Bahasa diubah ke Bahasa Indonesia.',
    invalidLanguage: 'Bahasa tidak didukung. Bahasa yang didukung: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Polish: {
    subscribed: 'Zapisano na powiadomienia o misjach klanu.',
    updated: 'Ustawienia powiadomień zaktualizowane.',
    unsubscribed: 'Wypisano z powiadomień o misjach klanu.',
    noSubscription: 'Nie jesteś zapisany na powiadomienia o misjach klanu.',
    subscribedEnabled: 'Zapisany — powiadomienia włączone.',
    subscribedDisabled: 'Zapisany — powiadomienia wyłączone.',
    deliveryNotActive: 'Automatyczna dostawa jeszcze nie jest aktywna. Zostanie aktywowana po zatwierdzeniu szablonu WhatsApp i skonfigurowaniu harmonogramu.',
    languageCurrent: 'Bieżący język: Polski',
    languageChanged: 'Język zmieniony na Polski.',
    invalidLanguage: 'Nieobsługiwany język. Obsługiwane języki: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Italian: {
    subscribed: 'Abbonato alle notifiche delle missioni del clan.',
    updated: 'Impostazioni notifiche aggiornate.',
    unsubscribed: 'Disiscritto dalle notifiche delle missioni del clan.',
    noSubscription: 'Non sei abbonato alle notifiche delle missioni del clan.',
    subscribedEnabled: 'Abbonato — notifiche attive.',
    subscribedDisabled: 'Abbonato — notifiche disattive.',
    deliveryNotActive: 'Consegna automatica non ancora attiva. Si attiverà dopo l\'approvazione del modello WhatsApp e la configurazione del programmatore.',
    languageCurrent: 'Lingua attuale: Italiano',
    languageChanged: 'Lingua cambiata in Italiano.',
    invalidLanguage: 'Lingua non supportata. Lingue supportate: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Ukrainian: {
    subscribed: 'Підписано на повідомлення про місії клану.',
    updated: 'Налаштування сповіщень оновлено.',
    unsubscribed: 'Відписано від повідомлень про місії клану.',
    noSubscription: 'Ви не підписані на повідомлення про місії клану.',
    subscribedEnabled: 'Підписано — сповіщення увімкнено.',
    subscribedDisabled: 'Підписано — сповіщення вимкнено.',
    deliveryNotActive: 'Автоматична доставка ще не активна. Активується після схвалення шаблону WhatsApp та налаштування планувальника.',
    languageCurrent: 'Поточна мова: Українська',
    languageChanged: 'Мову змінено на Українську.',
    invalidLanguage: 'Мова не підтримується. Підтримувані мови: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Japanese: {
    subscribed: 'クランミッション通知を購読しました。',
    updated: '通知設定が更新されました。',
    unsubscribed: 'クランミッション通知の購読を解除しました。',
    noSubscription: 'クランミッション通知を購読していません。',
    subscribedEnabled: '購読中 — 通知有効。',
    subscribedDisabled: '購読中 — 通知無効。',
    deliveryNotActive: '自動配信はまだ有効ではありません。WhatsAppテンプレート承認とスケジューラ設定後に有効になります。',
    languageCurrent: '現在の言語: 日本語',
    languageChanged: '言語を日本語に変更しました。',
    invalidLanguage: 'サポートされていない言語です。サポートされている言語: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Korean: {
    subscribed: '클랜 미션 알림을 구독했습니다.',
    updated: '알림 설정이 업데이트되었습니다.',
    unsubscribed: '클랜 미션 알림 구독을 해지했습니다.',
    noSubscription: '클랜 미션 알림을 구독하지 않았습니다.',
    subscribedEnabled: '구독 중 — 알림 사용.',
    subscribedDisabled: '구독 중 — 알림 사용 안 함.',
    deliveryNotActive: '자동 배송은 아직 활성화되지 않았습니다. WhatsApp 템플릿 승인과 스케줄러 설정 후 활성화됩니다.',
    languageCurrent: '현재 언어: 한국어',
    languageChanged: '언어가 한국어로 변경되었습니다.',
    invalidLanguage: '지원되지 않는 언어입니다. 지원 언어: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Vietnamese: {
    subscribed: 'Đã đăng ký nhận thông báo nhiệm vụ bang hội.',
    updated: 'Cài đặt thông báo đã được cập nhật.',
    unsubscribed: 'Đã hủy đăng ký nhận thông báo nhiệm vụ bang hội.',
    noSubscription: 'Bạn chưa đăng ký nhận thông báo nhiệm vụ bang hội.',
    subscribedEnabled: 'Đã đăng ký — thông báo đã bật.',
    subscribedDisabled: 'Đã đăng ký — thông báo đã tắt.',
    deliveryNotActive: 'Giao hàng tự động chưa được kích hoạt. Sẽ được kích hoạt sau khi duyệt mẫu WhatsApp và cài đặt trình theo dõi.',
    languageCurrent: 'Ngôn ngữ hiện tại: Tiếng Việt',
    languageChanged: 'Ngôn ngữ đã được thay đổi thành Tiếng Việt.',
    invalidLanguage: 'Ngôn ngữ không được hỗ trợ. Ngôn ngữ được hỗ trợ: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Thai: {
    subscribed: 'สมัครรับข่าวสารภารกิจแคลนแล้ว.',
    updated: 'อัปเดตการตั้งค่าการแจ้งเตือนแล้ว.',
    unsubscribed: 'ยกเลิกการสมัครรับข่าวสารภารกิจแคลนแล้ว.',
    noSubscription: 'คุณยังไม่ได้สมัครรับข่าวสารภารกิจแคลน.',
    subscribedEnabled: 'สมัครแล้ว — เปิดใช้การแจ้งเตือน.',
    subscribedDisabled: 'สมัครแล้ว — ปิดใช้การแจ้งเตือน.',
    deliveryNotActive: 'การจัดส่งอัตโนมัติยังไม่เปิดใช้งาน. จะเปิดใช้งานหลังจากได้รับการอนุมัติเทมเพลต WhatsApp และตั้งค่าตัวกำหนดเวลา.',
    languageCurrent: 'ภาษาปัจจุบัน: ภาษาไทย',
    languageChanged: 'เปลี่ยนภาษาเป็นภาษาไทยแล้ว.',
    invalidLanguage: 'ภาษาไม่รองรับ. ภาษาที่รองรับ: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Chinese: {
    subscribed: '已订阅战队任务通知。',
    updated: '通知设置已更新。',
    unsubscribed: '已取消订阅战队任务通知。',
    noSubscription: '你尚未订阅战队任务通知。',
    subscribedEnabled: '已订阅 — 通知已启用。',
    subscribedDisabled: '已订阅 — 通知已禁用。',
    deliveryNotActive: '自动投递尚未激活。将在 WhatsApp 模板批准和调度程序设置完成后激活。',
    languageCurrent: '当前语言: 中文',
    languageChanged: '语言已更改为中文。',
    invalidLanguage: '不支持的语言。支持的语言: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Hindi: {
    subscribed: 'क्लैन मिशन सूचनाओं की सदस्यता ली गई।',
    updated: 'सूचना सेटिंग्स अपडेट कर दी गईं।',
    unsubscribed: 'क्लैन मिशन सूचनाओं की सदस्यता रद्द कर दी गई।',
    noSubscription: 'आप क्लैन मिशन सूचनाओं की सदस्यता नहीं ले रहे हैं।',
    subscribedEnabled: 'सदस्यता ली गई — सूचनाएं सक्षम।',
    subscribedDisabled: 'सदस्यता ली गई — सूचनाएं अक्षम।',
    deliveryNotActive: 'स्वचालित वितरण अभी तक सक्रिय नहीं है। व्हाट्सएप टेम्पलेट अनुमोदन और शेड्यूलर सेटअप के बाद सक्रिय होगा।',
    languageCurrent: 'वर्तमान भाषा: हिंदी',
    languageChanged: 'भाषा हिंदी में बदल दी गई है।',
    invalidLanguage: 'समर्थित भाषा नहीं। समर्थित भाषाएं: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Dutch: {
    subscribed: 'Abonneerd op Clan Missie meldingen.',
    updated: 'Meldingsinstellingen bijgewerkt.',
    unsubscribed: 'Afgemeld van Clan Missie meldingen.',
    noSubscription: 'Je bent niet geabonneerd op Clan Missie meldingen.',
    subscribedEnabled: 'Abonneerd — meldingen ingeschakeld.',
    subscribedDisabled: 'Abonneerd — meldingen uitgeschakeld.',
    deliveryNotActive: 'Automatische bezorging is nog niet actief. Wordt geactiveerd na WhatsApp-sjabloon goedkeuring en planner instelling.',
    languageCurrent: 'Huidige taal: Nederlands',
    languageChanged: 'Taal gewijzigd naar Nederlands.',
    invalidLanguage: 'Niet ondersteunde taal. Ondersteunde talen: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Swedish: {
    subscribed: 'Prenumererad på klanuppdragsmeddelanden.',
    updated: 'Meddelandeinställningar uppdaterade.',
    unsubscribed: 'Avprenumererad från klanuppdragsmeddelanden.',
    noSubscription: 'Du är inte prenumererad på klanuppdragsmeddelanden.',
    subscribedEnabled: 'Prenumererad — meddelanden aktiverade.',
    subscribedDisabled: 'Prenumererad — meddelanden inaktiverade.',
    deliveryNotActive: 'Automatisk leverans är inte ännu aktiv. Aktiveras efter WhatsApp-mallgodkännande och schemainställning.',
    languageCurrent: 'Nuvarande språk: Svenska',
    languageChanged: 'Språk ändrat till Svenska.',
    invalidLanguage: 'Ej stöttat språk. Stödda språk: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Czech: {
    subscribed: 'Přihlášen k odběru oznámení o klanových misích.',
    updated: 'Nastavení oznámení aktualizováno.',
    unsubscribed: 'Odhlášen z odběru oznámení o klanových misích.',
    noSubscription: 'K odběru oznámení o klanových misích nejste přihlášen.',
    subscribedEnabled: 'Přihlášen — oznámení zapnuta.',
    subscribedDisabled: 'Přihlášen — oznámení vypnuta.',
    deliveryNotActive: 'Automatické doručení zatím není aktivní. Aktivuje se po schválení šablony WhatsApp a nastavení plánovače.',
    languageCurrent: 'Aktuální jazyk: Čeština',
    languageChanged: 'Jazyk změněn na Češtinu.',
    invalidLanguage: 'Nepodporovaný jazyk. Podporované jazyky: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Hungarian: {
    subscribed: 'Feliratkoztál a klánküldetési értesítésekre.',
    updated: 'Értesítési beállítások frissítve.',
    unsubscribed: 'Leiratkoztál a klánküldetési értesítésekről.',
    noSubscription: 'Nincs feliratkozás a klánküldetési értesítésekre.',
    subscribedEnabled: 'Feliratkozva — értesítések bekapcsolva.',
    subscribedDisabled: 'Feliratkozva — értesítések kikapcsolva.',
    deliveryNotActive: 'Az automatikus kézbesítés még nem aktív. A WhatsApp sablon jóváhagyása és az üzemterv beállítása után aktívvá válik.',
    languageCurrent: 'Jelenlegi nyelv: Magyar',
    languageChanged: 'A nyelvet Magyarra változtattuk.',
    invalidLanguage: 'Nem támogatott nyelv. Támogatott nyelvek: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  },
  Romanian: {
    subscribed: 'Abonat la notificările despre misiunile clanului.',
    updated: 'Setările de notificare actualizate.',
    unsubscribed: 'Dezabonat de la notificările despre misiunile clanului.',
    noSubscription: 'Nu sunteți abonat la notificările despre misiunile clanului.',
    subscribedEnabled: 'Abonat — notificări activate.',
    subscribedDisabled: 'Abonat — notificări dezactivate.',
    deliveryNotActive: 'Livrarea automată nu este încă activă. Se va activa după aprobarea șablonului WhatsApp și configurarea programatorului.',
    languageCurrent: 'Limba curentă: Română',
    languageChanged: 'Limba schimbată în Română.',
    invalidLanguage: 'Limba nu este suportată. Limbile suportate: English, Arabic, Spanish, Portuguese, Russian, French, German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean, Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian.'
  }
};

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES);
const DEFAULT_LANGUAGE = 'English';

/** Get a language entry by identifier, falling back to English if missing. */
function getLanguage(language) {
  return LANGUAGES[language] || LANGUAGES.English;
}

/** Get the list of supported language identifiers. */
function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.slice();
}

/** Check whether a language identifier is supported. */
function isSupportedLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language);
}

module.exports = { LANGUAGES, getLanguage, getSupportedLanguages, isSupportedLanguage, DEFAULT_LANGUAGE };
