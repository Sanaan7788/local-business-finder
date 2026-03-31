import { getRepository } from '../../data/repository.factory';
import { Business, LeadStatus, UpdateBusiness } from '../../types/business.types';
import { BusinessFilter } from '../../data/repository.interface';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// LeadService
//
// Business logic for CRM pipeline management.
// All status transitions, note updates, and stats go through here.
// ---------------------------------------------------------------------------

// Valid forward transitions — prevents nonsensical moves
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new:        ['qualified', 'rejected'],
  qualified:  ['new', 'contacted', 'rejected'],
  contacted:  ['interested', 'rejected', 'qualified'],
  interested: ['closed', 'rejected', 'contacted'],
  closed:     [],
  rejected:   ['new'],  // allow re-opening a rejected lead
};

export interface PipelineStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  byPriority: Record<'high' | 'medium' | 'low', number>;
  noWebsite: number;
  deployed: number;
}

export const LeadService = {

  async updateStatus(id: string, newStatus: LeadStatus): Promise<Business> {
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) throw new Error(`Business not found: ${id}`);

    const allowed = ALLOWED_TRANSITIONS[business.leadStatus];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid transition: ${business.leadStatus} → ${newStatus}. ` +
        `Allowed: ${allowed.length > 0 ? allowed.join(', ') : 'none'}`
      );
    }

    const payload: UpdateBusiness = { leadStatus: newStatus };

    // Auto-set lastContactedAt when moving to contacted
    if (newStatus === 'contacted') {
      payload.lastContactedAt = new Date().toISOString();
    }

    logger.info('LeadService: status updated', {
      id,
      name: business.name,
      from: business.leadStatus,
      to: newStatus,
    });

    return repo.updateLead(id, payload);
  },

  async updateNotes(id: string, notes: string | null): Promise<Business> {
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) throw new Error(`Business not found: ${id}`);

    logger.debug('LeadService: notes updated', { id });
    return repo.updateLead(id, { notes });
  },

  async updateLastContacted(id: string, date: string | null): Promise<Business> {
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) throw new Error(`Business not found: ${id}`);

    return repo.updateLead(id, { lastContactedAt: date });
  },

  async getStats(filter?: BusinessFilter): Promise<PipelineStats> {
    const repo = getRepository();
    const { items } = await repo.findAll({ filter, pageSize: 10000 });

    const byStatus: Record<LeadStatus, number> = {
      new: 0, qualified: 0, contacted: 0, interested: 0, closed: 0, rejected: 0,
    };
    const byPriority = { high: 0, medium: 0, low: 0 };
    let noWebsite = 0;
    let deployed = 0;

    for (const b of items) {
      byStatus[b.leadStatus]++;
      byPriority[b.priority]++;
      if (!b.website) noWebsite++;
      if (b.deployedUrl) deployed++;
    }

    return {
      total: items.length,
      byStatus,
      byPriority,
      noWebsite,
      deployed,
    };
  },
};
