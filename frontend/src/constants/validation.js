export function validateStrongPassword(pw) {
  const v = String(pw || "");
  if (v.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(v)) return "Password must include at least 1 uppercase letter.";
  if (!/[a-z]/.test(v)) return "Password must include at least 1 lowercase letter.";
  if (!/[0-9]/.test(v)) return "Password must include at least 1 number.";
  if (!/[^A-Za-z0-9]/.test(v)) return "Password must include at least 1 special character.";
  return "";
}

export function validateEmail(email) {
  const v = String(email || "").trim();
  if (!v) return "Email is required.";
  // Strict standard email regex
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(v)) return "Please enter a valid email address";
  return "";
}
