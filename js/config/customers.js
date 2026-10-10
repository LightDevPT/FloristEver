// ========================================================
// FloristEver - Configuração de Clientes e Comportamento
// ========================================================

export const CUSTOMER_CONFIG = {
  baseSpawnInterval: 8.0, // segundos entre novos clientes
  minSpawnInterval: 3.5,  // limite mínimo de intervalo
  patienceTime: 16.0,     // tempo que espera ao balcão antes de desistir
  walkSpeed: 110,         // velocidade de caminhada dos clientes

  names: [
    'Beatriz', 'Lucas', 'Mariana', 'Tiago', 'Clara',
    'Gonçalo', 'Sofia', 'Rodrigo', 'Inês', 'Duarte',
    'Matilde', 'Afonso', 'Leonor', 'Gabriel', 'Francisca'
  ],

  dialogues: {
    greeting: [
      'Olá! Que flores lindas!',
      'Bom dia! O jardim cheira tão bem.',
      'Olá, florista! Vim buscar algo especial.'
    ],
    waiting: [
      'Gostaria de uma flor do teu jardim...',
      'Estou à espera pacientemente...'
    ],
    success: [
      'Obrigado! É exatamente o que precisava!',
      'Que perfume maravilhoso, adorei!',
      'Perfeito! Vou recomendar a tua loja a todos!'
    ],
    leaveNoStock: [
      'Hoje não há em stock, volto amanhã com certeza!',
      'Sem problema, passarei cá mais tarde!',
      'Obrigado na mesma, adoro este jardim!'
    ]
  },

  specialVisitors: [
    {
      id: 'elena-botanist',
      name: 'Helena, a botânica',
      introduction: 'Veio comparar as variedades do teu herbário.',
      thanks: 'A tua coleção está a florescer. Vou guardar esta visita no meu caderno.'
    },
    {
      id: 'tomas-photographer',
      name: 'Tomás, o fotógrafo',
      introduction: 'Procura uma composição colorida para a sua próxima fotografia.',
      thanks: 'Encontrei a luz perfeita entre estas flores. Obrigado por me receberes.'
    },
    {
      id: 'ines-poet',
      name: 'Inês, a poeta',
      introduction: 'Veio procurar inspiração para um poema sobre jardins.',
      thanks: 'Levo comigo o perfume desta visita e um verso novo.'
    }
  ]
};
