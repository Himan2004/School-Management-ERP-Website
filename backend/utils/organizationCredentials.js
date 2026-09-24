import crypto from 'crypto';
import Organization from '../models/organization/Organization.js';

const buildPrefix = (name, maxLen = 5, minLen = 3) => {
    return name
        .replace(/[^a-zA-Z\s]/g, '')
        .trim()
        .split(/\s+/)
        .map(w => w[0] ?? '')
        .join('')
        .toUpperCase()
        .substring(0, maxLen)
        .padEnd(minLen, 'X');
};

const generateOrganizationId = async (orgName) => {
    const prefix = buildPrefix(orgName);

    let organizationId;
    let exists = true;

    while (exists) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        organizationId = `ORG-${prefix}${suffix}`;
        exists = await Organization.exists({ organizationId });
    }

    return organizationId;
};

export const generateBranchCreationId = async () => {
    let branchCreationId;
    let exists = true;

    while (exists) {
        branchCreationId = `BRN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        exists = await Organization.exists({ branchCreationId });
    }

    return branchCreationId;
};

export const generateOrganizationCredentials = async (orgName) => {
    const organizationId = await generateOrganizationId(orgName);
    const plainPassword = `Org@${Math.floor(100000 + Math.random() * 900000)}`;
    return { organizationId, plainPassword };
};