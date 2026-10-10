export const COMMON_PASSWORDS = new Set([
  '123456', '123456789', 'qwerty', 'password', '12345', '12345678', '111111',
  '123123', 'abc123', '1234567', 'password1', 'admin', 'letmein', 'welcome',
  'monkey', 'dragon', 'football', 'iloveyou', 'princess', 'sunshine', 'flower',
  'floristever', 'lightgroup', 'qwerty123', 'passw0rd', 'senha', 'password123',
  'password123!', 'password1!', 'qwerty123!', 'admin123!', 'welcome123!',
  'changeme', 'default', 'user123', 'login123', 'master', 'shadow', 'azerty',
  'zaq12wsx', 'trustno1', 'baseball', 'superman', 'michael', 'jennifer',
  'charlie', 'jessica', 'hunter2', 'lovely', 'whatever', 'nicole', 'daniel',
  'babygirl', 'secret', 'freedom', 'flower123!', 'florist123!', 'light123!'
]);

export function simpleCommonVariants(password) {
  const lower = password.toLowerCase();
  const stripped = lower.replace(/[!?.#@$%^&*()[\]{}_\-=+;:,/\\|`~]/g, '');
  const noLeet = stripped.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
  return [lower, stripped, noLeet, noLeet.replace(/\d+$/g, '')];
}
