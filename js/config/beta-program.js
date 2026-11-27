export const BETA_PROGRAM = Object.freeze({
  enabled: true,
  eligibleVersions: Object.freeze(['2.6.0', '3.0.0'])
});

export function isBetaProgramVersionEligible(version, program = BETA_PROGRAM) {
  return program?.enabled === true
    && Array.isArray(program.eligibleVersions)
    && program.eligibleVersions.includes(version);
}
