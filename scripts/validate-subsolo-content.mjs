// ========================================================
// FloristEver - Validação de Conteúdo do Subsolo (v2.0.0)
// ========================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID_PATTERN = /^[a-z][a-zA-Z0-9_]*$/;

// Lista de palavras proibidas (Linhas vermelhas: sem consumo, sem substâncias reais, sem instruções reais)
const FORBIDDEN_CONTENT_TERMS = [
  'cannabis', 'marijuana', 'weed', 'haxixe', 'thc', 'cbd', 'droga', 'fumar', 'tragar',
  'charro', 'joint', 'drogar', 'intoxicar', 'efeito alucinogénio', 'alta médica'
];

/**
 * Validação de integridade de dados e conteúdo do Subsolo.
 */
export function validateSubsoloContent(config = null) {
  const errors = [];

  // Se ainda não houver ficheiro de configuração ativo do subsolo no jogo, valida a especificação padrão
  const subsoloSpec = config || {
    products: [
      { id: 'ramo', name: 'Ramo', leaves: 2, minQuality: 1, baseMultiplier: 8, unlockS: 1 },
      { id: 'maco', name: 'Maço', leaves: 5, minQuality: 3, baseMultiplier: 25, unlockS: 6 },
      { id: 'reserva', name: 'Reserva da Casa', leaves: 10, minQuality: 4, baseMultiplier: 60, unlockS: 10 }
    ],
    varieties: [
      { id: 'sombra_verde', name: 'Sombra Verde', unlockS: 1, growthTimeMinutes: 20, yieldLeaves: 6, odor: 1 },
      { id: 'luar_roxo', name: 'Luar Roxo', unlockS: 3, growthTimeMinutes: 30, yieldLeaves: 8, odor: 0.5 },
      { id: 'ambar_seco', name: 'Âmbar Seco', unlockS: 8, growthTimeMinutes: 15, yieldLeaves: 5, odor: 1.2 },
      { id: 'raiz_dourada', name: 'Raiz Dourada', unlockS: 15, growthTimeMinutes: 45, yieldLeaves: 12, odor: 2.0 }
    ],
    upgrades: [
      { id: 'canteiros', maxLevel: 12, baseCostH: 0.5, costMultiplier: 1.5 },
      { id: 'secadores', maxLevel: 8, baseCostH: 0.6, costMultiplier: 1.6 },
      { id: 'preparacao', maxLevel: 6, baseCostH: 0.6, costMultiplier: 1.6 },
      { id: 'armazem', maxLevel: 10, baseCostH: 0.4, costMultiplier: 1.5 },
      { id: 'mala', maxLevel: 8, baseCostH: 0.3, costMultiplier: 1.5 },
      { id: 'cofre', maxLevel: 6, baseCostH: 0.5, costMultiplier: 1.6 },
      { id: 'filtros', maxLevel: 6, baseCostH: 0.8, costMultiplier: 1.65 },
      { id: 'mensageiro', maxLevel: 3, baseCostH: 3.0, costMultiplier: 2.0 }
    ],
    dictionary: [
      { phrase: 'Uma tulipa de domingo', productId: 'ramo', quantity: 1 },
      { phrase: 'O buquê do avô', productId: 'maco', quantity: 1 },
      { phrase: 'Algo do jardim da cave', productId: 'reserva', quantity: 1 },
      { phrase: 'Meia dúzia de pétalas', quantity: 6 },
      { phrase: 'Bem regada', minQuality: 3 },
      { phrase: 'Ainda com orvalho', urgent: true },
      { phrase: 'Sem espinhos', varietyId: 'luar_roxo' }
    ]
  };

  const seenIds = new Set();

  // Validar Produtos
  for (const prod of subsoloSpec.products) {
    if (!ID_PATTERN.test(prod.id)) errors.push(`Produto: ID inválido "${prod.id}".`);
    if (seenIds.has(prod.id)) errors.push(`Produto: ID duplicado "${prod.id}".`);
    seenIds.add(prod.id);

    if (!Number.isSafeInteger(prod.leaves) || prod.leaves <= 0) {
      errors.push(`Produto "${prod.id}": número de folhas inválido.`);
    }
    if (!Number.isFinite(prod.baseMultiplier) || prod.baseMultiplier <= 0) {
      errors.push(`Produto "${prod.id}": multiplicador base inválido.`);
    }
  }

  // Validar Variedades
  for (const varItem of subsoloSpec.varieties) {
    if (!ID_PATTERN.test(varItem.id)) errors.push(`Variedade: ID inválido "${varItem.id}".`);
    if (seenIds.has(varItem.id)) errors.push(`Variedade: ID duplicado "${varItem.id}".`);
    seenIds.add(varItem.id);

    if (!Number.isFinite(varItem.growthTimeMinutes) || varItem.growthTimeMinutes <= 0) {
      errors.push(`Variedade "${varItem.id}": tempo de crescimento inválido.`);
    }
  }

  // Validar Melhorias
  for (const upg of subsoloSpec.upgrades) {
    if (!ID_PATTERN.test(upg.id)) errors.push(`Melhoria: ID inválido "${upg.id}".`);
    if (seenIds.has(upg.id)) errors.push(`Melhoria: ID duplicado "${upg.id}".`);
    seenIds.add(upg.id);

    if (!Number.isSafeInteger(upg.maxLevel) || upg.maxLevel <= 0) {
      errors.push(`Melhoria "${upg.id}": maxLevel inválido.`);
    }
  }

  // Validar Dicionário e Linhas Vermelhas de Conteúdo
  const allTexts = [
    ...subsoloSpec.products.map(p => p.name),
    ...subsoloSpec.varieties.map(v => v.name),
    ...subsoloSpec.dictionary.map(d => d.phrase)
  ].join(' ').toLowerCase();

  for (const term of FORBIDDEN_CONTENT_TERMS) {
    if (allTexts.includes(term)) {
      errors.push(`VIOLAÇÃO DE LINHA VERMELHA: termo proibido detetado no conteúdo: "${term}".`);
    }
  }

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateSubsoloContent();
  if (errors.length > 0) {
    console.error('ERROS NA VALIDAÇÃO DO CONTEÚDO DO SUBSOLO:');
    errors.forEach(e => console.error(` - ${e}`));
    process.exitCode = 1;
  } else {
    console.log('Validação de conteúdo do Subsolo concluída com sucesso: todos os IDs, regras e restrições éticas verificados ✅');
  }
}
