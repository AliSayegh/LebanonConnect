function containsBlockedContact(text = "") {
  const raw = String(text);
  const s = raw.toLowerCase();

  // Emails
  const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  if (emailRegex.test(raw)) return true;

  // URLs (also catches wa.me)
  const urlRegex = /(https?:\/\/|www\.)\S+/i;
  if (urlRegex.test(raw)) return true;

  // Social keywords
  const socialWords = [
    "whatsapp", "wa.me", "واتساب", "واتس", "واتسآب",
    "instagram", "insta", "ig", "انستغرام", "انستا",
    "telegram", "tg", "t.me", "تلغرام"
  ];
  if (socialWords.some(w => s.includes(w))) return true;

  // Handles like @username (common for IG/TG)
  // allow if it's just "@me"?? -> no, block all handles to be safe
  const handleRegex = /(^|\s)@[a-z0-9._]{3,}(\s|$)/i;
  if (handleRegex.test(raw)) return true;

  // Phone numbers:
  // strip all non-digits and detect digit length
  const digitsOnly = s.replace(/[^\d]/g, "");

  // Block if message has 7+ digits total (Lebanon local + general)
  if (digitsOnly.length >= 7) return true;

  // Also block separated digit groups that add up to >=7 (e.g. 70 123 456)
  const groups = raw.match(/\d+/g);
  if (groups) {
    const total = groups.reduce((sum, g) => sum + g.length, 0);
    if (total >= 7 && groups.length >= 2) return true;
  }

  return false;
}

module.exports = { containsBlockedContact };
