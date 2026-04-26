type DemoUserAvatarInput = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const FEMALE_HINTS = [
  "mary",
  "sarah",
  "jessica",
  "lisa",
  "anna",
  "maria",
  "emily",
  "emma",
  "olivia",
  "ava",
  "mia",
  "sofia",
  "isabella",
  "amanda",
  "ashley",
  "lauren",
  "nicole",
  "hannah",
  "grace",
  "ella",
  "chloe",
  "zoe",
  "victoria",
  "sophia",
  "julia",
  "rachel",
  "megan",
  "kayla",
  "brittany",
  "courtney",
  "samantha",
  "madison",
  "abigail",
  "morgan",
  "susan",
  "jennifer",
  "melissa",
  "patricia",
  "linda",
  "barbara",
  "elizabeth",
  "rebekah",
  "rebecca",
  "michelle",
  "danielle",
  "stephanie",
  "heather",
];

const MALE_PORTRAITS = [12, 15, 18, 22, 24, 28, 31, 36, 41, 45, 52, 57, 61, 66, 71, 75, 81, 84];
const FEMALE_PORTRAITS = [11, 14, 19, 23, 26, 29, 33, 38, 42, 47, 51, 56, 63, 68, 72, 77, 82, 87];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function looksFemale(name: string, email: string, role: string) {
  const haystack = `${name} ${email}`.toLowerCase();
  if (FEMALE_HINTS.some((hint) => haystack.includes(hint))) {
    return true;
  }

  if (role === "CLIENT" && /(hoa|office|support|desk)/i.test(haystack)) {
    return true;
  }

  return false;
}

export function isDemoPortraitUrl(value: string | null | undefined) {
  return typeof value === "string" && /^https:\/\/randomuser\.me\/api\/portraits\//i.test(value.trim());
}

export function getDemoUserAvatar(user: DemoUserAvatarInput) {
  const female = looksFemale(user.name, user.email, user.role);
  const portraits = female ? FEMALE_PORTRAITS : MALE_PORTRAITS;
  const index = hashString(`${user.id}:${user.email}:${user.role}`) % portraits.length;
  const bucket = female ? "women" : "men";
  return `https://randomuser.me/api/portraits/${bucket}/${portraits[index]}.jpg`;
}
