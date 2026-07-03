import type { LanguageCode } from "../domain.ts";

// ---------------------------------------------------------------------------
// Vernacular journey copy. Engagement for the next 400M has to speak their
// language. Hindi for all 5 journeys; Odia for First SIP (covers every hero
// persona). Falls back to the English copy in definitions.ts when absent.
// Placeholders {name} and {growth} are preserved.
// ---------------------------------------------------------------------------

interface Tr { title: string; body: string; opts?: Record<string, string> }
type JourneyTr = Record<string, Tr>; // stepId → translation

const HI: Record<string, JourneyTr> = {
  first_sip: {
    insight: { title: "अपनी बढ़ी आय को काम पर लगाएँ 💪", body: "नमस्ते {name}, हाल ही में आपकी आय बढ़ी है — बधाई हो! थोड़ा हिस्सा SIP में लगाइए, वह चुपचाप बढ़ता रहेगा।", opts: { start_500: "₹500 की SIP शुरू करें", learn: "यह कैसे काम करता है?", later: "अभी नहीं" } },
    educate: { title: "एक लाइन में SIP", body: "यह हर महीने एक तय रकम अपने-आप निवेश करता है। छोटी शुरुआत करें, कभी भी रोकें। कोई लॉक-इन नहीं।", opts: { start_500: "ठीक है, ₹500 शुरू करें", later: "शायद बाद में" } },
    smaller: { title: "कोई जल्दी नहीं 🌱", body: "महीने के ₹100 भी आदत बना देते हैं — क्या यह आज़माएँ?", opts: { start_100: "₹100 शुरू करें", later: "अभी नहीं" } },
    celebrate: { title: "आपने निवेश शुरू किया! 🎉", body: "आपकी ₹500/माह SIP सेट हो गई है। हर सैलरी पर मैं हौसला बढ़ाऊँगा।" },
    celebrate_small: { title: "बढ़िया पहला कदम! 🌱", body: "₹100/माह SIP शुरू। छोटा और लगातार ही जीतता है।" },
    later: { title: "कोई बात नहीं 👍", body: "अगली सैलरी पर हल्का-सा याद दिला दूँगा। कोई दबाव नहीं।" },
  },
  overspend_rescue: {
    alert: { title: "एक छोटी-सी बात 👀", body: "नमस्ते {name}, आपके शौक-मौज के खर्चे हाल ही में करीब {growth}% बढ़ गए हैं। साथ में एक नज़र डालें?", opts: { show: "दिखाइए", cap: "एक हल्की सीमा लगाएँ", dismiss: "मैं ठीक हूँ" } },
    breakdown: { title: "पैसा कहाँ जा रहा है", body: "ज़्यादातर बढ़ोतरी खाने-पीने, शॉपिंग और मनोरंजन में है। एक हल्की मासिक सीमा मज़े बनाए रखती है — बिना महीने के आख़िर की चिंता के।", opts: { cap: "सीमा लगाएँ", dismiss: "अभी नहीं" } },
    cap: { title: "सीमा तय हो गई 🎯", body: "मैं हफ़्ते में बताता रहूँगा कि आप कैसा कर रहे हैं। कोई ताना नहीं — बस साफ़ तस्वीर।" },
    dismiss: { title: "आप संभाल लेंगे 🙂", body: "जब भी मदद चाहिए, मैं यहीं हूँ। तंग नहीं करूँगा, वादा।" },
  },
  dormant_revival: {
    reintro: { title: "आपकी याद आई 👋", body: "नमस्ते {name}, काफ़ी समय हो गया! एक टैप में कोई ज़रूरी काम निपटाएँ?", opts: { bill: "बिल भरें", upi: "UPI से पैसे भेजें", close: "अभी नहीं" } },
    action_bill: { title: "एक-टैप बिल भुगतान", body: "आपका बिजली बिल जल्द देय है। सेट कर दूँ?", opts: { done: "अभी भरें", close: "बाद में" } },
    action_upi: { title: "झटपट UPI", body: "सेव किए संपर्क को सेकंडों में पैसे भेजें — आज़माएँ?", opts: { done: "करें", close: "बाद में" } },
    streak: { title: "🔥 आप लौट आए!", body: "पहला दिन शुरू। छोटी जीतें जुड़ती जाती हैं — कल मिलें?" },
    close: { title: "कभी भी 🙏", body: "जब तैयार हों, मैं बस एक मैसेज दूर हूँ।" },
  },
  stress_shield: {
    care_intro: { title: "हम आपके साथ हैं 🤝", body: "नमस्ते {name}, इस महीने थोड़ा तंग लग रहा है। कोई दबाव नहीं — क्या थोड़ी मदद से आसानी होगी?", opts: { yes: "हाँ, कीजिए", no: "मैं संभाल रहा हूँ" } },
    options: { title: "कुछ तरीके जिनसे मदद कर सकता हूँ", body: "मैं आपकी EMI हल्की कर सकता हूँ, या एक आसान बजट-साथी सेट कर सकता हूँ — जो ज़्यादा मदद करे।", opts: { restructure: "मेरी EMI हल्की करें", coach: "बजट-साथी", no: "बस हाल पूछ रहा था" } },
    restructure: { title: "बोझ हल्का करते हैं", body: "मैं आपको एक रिलेशनशिप मैनेजर से जोड़ता हूँ जो आपकी EMI दोबारा सेट करेंगे — बात करना मुफ़्त है।" },
    coach: { title: "बजट-साथी चालू 📊", body: "मैं हफ़्ते में मदद करूँगा और आसान बचत ढूँढूँगा। हम इससे निकल आएँगे।" },
    close_care: { title: "अपना ध्यान रखें 🙏", body: "जब भी ज़रूरत हो, मैं यहीं हूँ।" },
  },
  new_baby_nest: {
    congrats: { title: "बधाई हो! 👶", body: "नमस्ते {name}, ख़ुशी का समय! नन्हे के लिए एक छोटी योजना शुरू करें?", opts: { goal: "बच्चे का लक्ष्य शुरू करें", protection: "सुरक्षा देखें", later: "शायद बाद में" } },
    goal: { title: "बचत शुरू 🎓", body: "बच्चे की शिक्षा RD सेट हो गई। छोटे मासिक कदम, बड़ा भविष्य।" },
    protection: { title: "उनकी सुरक्षा", body: "एक टर्म प्लान उन्हें सुरक्षित रखता है। मैं एक रिलेशनशिप मैनेजर से समझाने को कहता हूँ।" },
    close: { title: "ठीक है 👍", body: "मैं थोड़ी देर बाद फिर पूछूँगा।" },
  },
};

const OR: Record<string, JourneyTr> = {
  first_sip: {
    insight: { title: "ଆପଣଙ୍କ ବଢ଼ିଲା ଆୟକୁ କାମରେ ଲଗାନ୍ତୁ 💪", body: "ନମସ୍କାର {name}, ନିକଟରେ ଆପଣଙ୍କ ଆୟ ବଢ଼ିଛି — ଅଭିନନ୍ଦନ! ଅଳ୍ପ ଅଂଶ SIP ରେ ଲଗାନ୍ତୁ, ତାହା ନିରବରେ ବଢ଼ିବ।", opts: { start_500: "₹500 SIP ଆରମ୍ଭ କରନ୍ତୁ", learn: "ଏହା କିପରି କାମ କରେ?", later: "ବର୍ତ୍ତମାନ ନୁହେଁ" } },
    educate: { title: "ଗୋଟିଏ ଧାଡ଼ିରେ SIP", body: "ଏହା ପ୍ରତି ମାସ ଏକ ନିର୍ଦ୍ଦିଷ୍ଟ ରାଶି ସ୍ୱୟଂ ନିବେଶ କରେ। ଛୋଟରୁ ଆରମ୍ଭ କରନ୍ତୁ, ଯେକୌଣସି ସମୟରେ ବନ୍ଦ କରନ୍ତୁ।", opts: { start_500: "ଠିକ୍ ଅଛି, ₹500 ଆରମ୍ଭ", later: "ପରେ ହୁଏତ" } },
    smaller: { title: "କୌଣସି ତରବର ନାହିଁ 🌱", body: "ମାସିକ ₹100 ମଧ୍ୟ ଅଭ୍ୟାସ ଗଢ଼େ — ଏହା ଚେଷ୍ଟା କରିବେ?", opts: { start_100: "₹100 ଆରମ୍ଭ", later: "ବର୍ତ୍ତମାନ ନୁହେଁ" } },
    celebrate: { title: "ଆପଣ ନିବେଶ ଆରମ୍ଭ କଲେ! 🎉", body: "ଆପଣଙ୍କ ₹500/ମାସ SIP ସେଟ୍ ହୋଇଗଲା। ପ୍ରତି ଦରମାରେ ମୁଁ ଉତ୍ସାହ ଦେବି।" },
    celebrate_small: { title: "ଉତ୍ତମ ପ୍ରଥମ ପାଦ! 🌱", body: "₹100/ମାସ SIP ଆରମ୍ଭ। ଛୋଟ ଓ ସ୍ଥିର ହିଁ ଜିତେ।" },
    later: { title: "କୌଣସି ଅସୁବିଧା ନାହିଁ 👍", body: "ପରବର୍ତ୍ତୀ ଦରମାରେ ମୁଁ ଧୀରେ ମନେ ପକାଇବି।" },
  },
};

const TABLES: Partial<Record<LanguageCode, Record<string, JourneyTr>>> = { hi: HI, or: OR };

/** Look up translated copy for a step; returns null to signal English fallback. */
export function translate(lang: LanguageCode, journeyId: string, stepId: string): Tr | null {
  return TABLES[lang]?.[journeyId]?.[stepId] ?? null;
}
