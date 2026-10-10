import { env } from '../src/config/env.js';
import { getUserByUsername, insertAudit, updateUser } from '../src/services/store.service.js';

const [action, ...argumentsList] = process.argv.slice(2);
const usernameIndex = argumentsList.indexOf('--username');
const username = usernameIndex >= 0 ? argumentsList[usernameIndex + 1] : '';
const confirmProduction = argumentsList.includes('--confirm-production');

if (!['grant', 'revoke'].includes(action)) {
  console.error('Uso: node scripts/manage-developer-role.js <grant|revoke> --username <nome> [--confirm-production]');
  process.exit(2);
}

if (!username || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,19}$/.test(username)) {
  console.error('Indica um nome de utilizador válido com --username.');
  process.exit(2);
}

if (env.NODE_ENV === 'production' && !confirmProduction) {
  console.error('Em produção, repete o comando com --confirm-production após validares o ambiente e o utilizador.');
  process.exit(2);
}

try {
  const user = await getUserByUsername(username.toLowerCase());
  if (!user) {
    throw new Error('A conta indicada não existe. Cria e verifica a conta pelo fluxo normal antes de atribuir permissões.');
  }
  if (user.status !== 'active') {
    throw new Error('Só podes atribuir permissões a uma conta ativa.');
  }
  if (env.NODE_ENV === 'production' && (!user.email || !user.emailVerified)) {
    throw new Error('Em produção, a conta tem de ter um email verificado antes de receber permissões developer.');
  }

  const roles = new Set(user.roles || ['user']);
  if (action === 'grant') roles.add('developer');
  else roles.delete('developer');
  if (roles.size === 0) roles.add('user');
  await updateUser(user._id, { roles: [...roles] });
  await insertAudit({
    userId: user._id,
    event: action === 'grant' ? 'developer_role_granted' : 'developer_role_revoked',
    meta: { role: 'developer', source: 'operator_cli' }
  });

  console.log(`Permissão developer ${action === 'grant' ? 'atribuída a' : 'removida de'} ${user.username}.`);
} catch (error) {
  console.error(`Não foi possível ${action === 'grant' ? 'atribuir' : 'remover'} a permissão developer: ${error.message}`);
  process.exitCode = 1;
}
