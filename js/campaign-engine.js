import { compareGameVersions, isValidGameVersion } from './config/game-version.js';

const CLAIM_LEASE_MS = 30_000;
const MAX_CAMPAIGN_REWARD = 1_000_000;
const CAMPAIGN_ID_PATTERN = /^[A-Za-z0-9._-]{1,80}$/;
const REWARD_ID_PATTERN = /^[A-Za-z0-9._-]{1,80}$/;
const RESERVED_CAMPAIGN_IDS = new Set(['__proto__', 'constructor', 'prototype']);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])])
  );
}

export function serializeCampaignForSignature(campaign) {
  const { signature, ...payload } = campaign;
  return JSON.stringify(stableValue(payload));
}

function decodeBase64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new TypeError('A assinatura da campanha não está em Base64 válido.');
  }
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function verifyCampaignSignature(campaign, trustedKeys, cryptoApi = globalThis.crypto) {
  const signature = campaign?.signature;
  if (
    !signature
    || signature.algorithm !== 'RSA-PSS-SHA256'
    || typeof signature.keyId !== 'string'
    || typeof signature.value !== 'string'
  ) return false;

  const publicKey = Object.prototype.hasOwnProperty.call(trustedKeys || {}, signature.keyId)
    ? trustedKeys[signature.keyId]
    : null;
  if (!publicKey || !cryptoApi?.subtle) return false;

  const importedKey = await cryptoApi.subtle.importKey(
    'jwk',
    publicKey,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const payload = new TextEncoder().encode(serializeCampaignForSignature(campaign));
  return cryptoApi.subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    importedKey,
    decodeBase64(signature.value),
    payload
  );
}

function normalizePlayerId(id) {
  return typeof id === 'string' ? id.replace(/^FE-/i, '').replace(/-/g, '').toUpperCase() : '';
}

function compareIdRange(profileId, min, max) {
  const normalized = normalizePlayerId(profileId);
  const lower = normalizePlayerId(min);
  const upper = normalizePlayerId(max);
  return Boolean(normalized && lower && upper && normalized >= lower && normalized <= upper);
}

function compareVersionCondition(version, condition) {
  if (!isValidGameVersion(version)) return false;
  const operator = condition.operator;
  if (operator === 'between') {
    return isValidGameVersion(condition.min)
      && isValidGameVersion(condition.max)
      && compareGameVersions(version, condition.min) >= 0
      && compareGameVersions(version, condition.max) <= 0;
  }
  if (!isValidGameVersion(condition.value)) return false;
  const comparison = compareGameVersions(version, condition.value);
  switch (operator) {
    case 'eq': return comparison === 0;
    case 'gt': return comparison > 0;
    case 'gte': return comparison >= 0;
    case 'lt': return comparison < 0;
    case 'lte': return comparison <= 0;
    default: return false;
  }
}

function evaluateLeafRule(rule, profile, versionHistory, now) {
  switch (rule.type) {
    case 'allPlayers':
      return true;
    case 'playerId': {
      const id = normalizePlayerId(profile.id);
      if (rule.match === 'exact') return id !== '' && id === normalizePlayerId(rule.value);
      if (rule.match === 'prefix') {
        const prefix = normalizePlayerId(rule.value);
        return prefix !== '' && id.startsWith(prefix);
      }
      if (rule.match === 'range') return compareIdRange(profile.id, rule.min, rule.max);
      return false;
    }
    case 'createdVersion':
      return compareVersionCondition(profile.createdVersion, rule);
    case 'playedVersion':
      return versionHistory.some((entry) => (
        Number.isFinite(entry.registeredAt)
        && compareVersionCondition(entry.version, rule)
      ));
    case 'accountCreatedAt': {
      const createdAt = profile.createdAt;
      if (!Number.isFinite(createdAt)) return false;
      if (rule.operator === 'between') {
        const min = Date.parse(rule.min);
        const max = Date.parse(rule.max);
        return Number.isFinite(min) && Number.isFinite(max) && createdAt >= min && createdAt <= max;
      }
      const value = Date.parse(rule.value);
      if (!Number.isFinite(value)) return false;
      if (rule.operator === 'gte') return createdAt >= value;
      if (rule.operator === 'lte') return createdAt <= value;
      return false;
    }
    case 'now':
      return Number.isFinite(Date.parse(rule.value)) && now >= Date.parse(rule.value);
    default:
      return false;
  }
}

export function evaluateCampaignRule(rule, profile, versionHistory, now = Date.now()) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return false;
  if (rule.operator === 'AND' || rule.operator === 'OR') {
    if (!Array.isArray(rule.rules) || rule.rules.length === 0) return false;
    const results = rule.rules.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
      return entry.operator === 'AND' || entry.operator === 'OR'
        ? evaluateCampaignRule(entry, profile, versionHistory, now)
        : evaluateLeafRule(entry, profile, versionHistory, now);
    });
    return rule.operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }
  return evaluateLeafRule(rule, profile, versionHistory, now);
}

function validateCampaign(campaign) {
  return Boolean(
    campaign
    && typeof campaign === 'object'
    && CAMPAIGN_ID_PATTERN.test(campaign.id)
    && !RESERVED_CAMPAIGN_IDS.has(campaign.id)
    && typeof campaign.name === 'string'
    && typeof campaign.description === 'string'
    && (campaign.retroactive === true || campaign.retroactive === false)
    && campaign.eligibility
    && Array.isArray(campaign.rewards)
    && campaign.rewards.length > 0
    && campaign.rewards.every((reward) => (
      reward
      && typeof reward === 'object'
      && REWARD_ID_PATTERN.test(reward.id)
      && !RESERVED_CAMPAIGN_IDS.has(reward.id)
      && Number.isSafeInteger(reward.amount)
      && reward.amount > 0
      && reward.amount <= MAX_CAMPAIGN_REWARD
      && ['coins', 'reputation', 'flower_stock', 'subsolo_product'].includes(reward.type)
      && ['manual', 'automatic'].includes(reward.claimMode)
    ))
  );
}

export class CampaignEngine {
  constructor({
    store,
    gameState,
    campaigns = [],
    trustedKeys = {},
    crypto = globalThis.crypto,
    now = () => Date.now()
  }) {
    this.store = store;
    this.gameState = gameState;
    this.campaigns = campaigns;
    this.trustedKeys = trustedKeys;
    this.crypto = crypto;
    this.now = now;
  }

  async getVerifiedCampaigns() {
    const verified = [];
    for (const campaign of this.campaigns) {
      if (!validateCampaign(campaign)) {
        console.error(`Campanha inválida ignorada: ${campaign?.id || '(sem ID)'}.`);
        continue;
      }
      try {
        if (await verifyCampaignSignature(campaign, this.trustedKeys, this.crypto)) {
          verified.push(campaign);
        } else {
          console.error(`Campanha sem assinatura confiável ignorada: ${campaign.id}.`);
        }
      } catch (error) {
        console.error(`Não foi possível validar a assinatura da campanha ${campaign.id}:`, error);
      }
    }
    return verified;
  }

  isCampaignAvailable(campaign, profile, versionHistory, now = this.now()) {
    const startsAt = campaign.startsAt ? Date.parse(campaign.startsAt) : null;
    const endsAt = campaign.endsAt ? Date.parse(campaign.endsAt) : null;
    if (startsAt !== null && (!Number.isFinite(startsAt) || now < startsAt)) return false;
    if (endsAt !== null && (!Number.isFinite(endsAt) || now > endsAt)) return false;
    if (campaign.retroactive === false) {
      const publishedAt = startsAt ?? Date.parse(campaign.publishedAt);
      if (!Number.isFinite(publishedAt) || profile.createdAt < publishedAt) return false;
    }
    return evaluateCampaignRule(campaign.eligibility, profile, versionHistory, now);
  }

  async refresh() {
    const record = await this.store.readRecord();
    if (!record.profile) return [];
    const verifiedCampaigns = await this.getVerifiedCampaigns();
    const now = this.now();
    const eligibility = new Map();

    for (const campaign of verifiedCampaigns) {
      const eligible = this.isCampaignAvailable(
        campaign,
        record.profile,
        record.versionHistory,
        now
      );
      eligibility.set(campaign.id, eligible);
      await this.store.mutateRecord((current) => {
        const previous = current.campaignLedger[campaign.id] || {};
        const rewards = previous.rewards && typeof previous.rewards === 'object'
          ? previous.rewards
          : {};
        current.campaignLedger[campaign.id] = {
          campaignId: campaign.id,
          eligible,
          updatedAt: now,
          rewards
        };
        return true;
      });

      for (const reward of campaign.rewards) {
        const status = record.campaignLedger[campaign.id]?.rewards?.[reward.id]?.status;
        const claimId = `${campaign.id}:${reward.id}`;
        if (status === 'processing') {
          if (this.gameState.hasCampaignRewardApplied(claimId)) {
            await this.finalizeClaim(campaign.id, reward.id);
          } else if (eligible) {
            await this.claimReward(campaign, reward);
          } else {
            await this.store.mutateRecord((current) => {
              const entry = current.campaignLedger[campaign.id]?.rewards?.[reward.id];
              if (entry?.status === 'processing') {
                current.campaignLedger[campaign.id].rewards[reward.id] = { status: 'expired' };
              }
              return true;
            });
          }
        } else if (eligible && reward.claimMode === 'automatic' && status !== 'claimed') {
          const result = await this.claimReward(campaign, reward);
          if (!result.success) {
            console.error(
              `A recompensa automática ${claimId} não foi aplicada (${result.status || 'falha'}).`
            );
          }
        }
      }
    }

    const refreshedRecord = await this.store.readRecord();
    return verifiedCampaigns.map((campaign) => {
      const campaignState = refreshedRecord.campaignLedger[campaign.id] || { rewards: {} };
      const eligible = eligibility.get(campaign.id) === true;
      return {
        campaign,
        eligible,
        rewards: campaign.rewards.map((reward) => ({
          ...reward,
          status: campaignState.rewards?.[reward.id]?.status
            || (eligible ? 'available' : 'locked')
        }))
      };
    });
  }

  async claimReward(campaign, reward) {
    const trustedCampaign = (await this.getVerifiedCampaigns())
      .find((entry) => entry.id === campaign?.id);
    const trustedReward = trustedCampaign?.rewards.find((entry) => entry.id === reward?.id);
    if (
      !trustedReward
      || serializeCampaignForSignature(trustedCampaign) !== serializeCampaignForSignature(campaign)
      || JSON.stringify(stableValue(trustedReward)) !== JSON.stringify(stableValue(reward))
    ) {
      return { success: false, status: 'untrusted' };
    }
    campaign = trustedCampaign;
    reward = trustedReward;
    const claimId = `${campaign.id}:${reward.id}`;
    if (this.gameState.hasCampaignRewardApplied(claimId)) {
      await this.finalizeClaim(campaign.id, reward.id);
      return { success: true, alreadyApplied: true };
    }

    const now = this.now();
    const reservation = await this.store.mutateRecord((record) => {
      const campaignState = record.campaignLedger[campaign.id];
      if (!campaignState?.eligible) return { reserved: false, status: 'locked' };
      campaignState.rewards ||= {};
      const current = campaignState.rewards[reward.id];
      if (current?.status === 'claimed') return { reserved: false, status: 'claimed' };
      if (
        current?.status === 'processing'
        && Number.isFinite(current.leaseUntil)
        && now < current.leaseUntil
      ) return { reserved: false, status: 'processing' };
      campaignState.rewards[reward.id] = {
        status: 'processing',
        leaseUntil: now + CLAIM_LEASE_MS
      };
      return { reserved: true, status: 'processing' };
    });
    if (!reservation.reserved) {
      return { success: reservation.status === 'claimed', status: reservation.status };
    }

    if (!this.gameState.applyCampaignReward(reward, claimId)) {
      await this.store.mutateRecord((record) => {
        const entry = record.campaignLedger[campaign.id]?.rewards?.[reward.id];
        if (entry?.status === 'processing') {
          record.campaignLedger[campaign.id].rewards[reward.id] = { status: 'available' };
        }
        return true;
      });
      return { success: false, status: 'save-failed' };
    }

    await this.finalizeClaim(campaign.id, reward.id);
    return { success: true, alreadyApplied: false };
  }

  async finalizeClaim(campaignId, rewardId) {
    return this.store.mutateRecord((record) => {
      const campaign = record.campaignLedger[campaignId] ||= {
        campaignId,
        eligible: false,
        updatedAt: this.now(),
        rewards: {}
      };
      campaign.rewards ||= {};
      campaign.rewards[rewardId] = {
        status: 'claimed',
        claimedAt: this.now()
      };
      return true;
    });
  }
}
