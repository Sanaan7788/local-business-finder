import { getRepository } from '../../data/repository.factory';
import { Business, BusinessUpdate, LeadStatus } from '../../types/business.types';
import { BusinessFilter, PipelineStats } from '../../data/repository.interface';
import { NotFoundError, UnprocessableError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export type { PipelineStats };

// ---------------------------------------------------------------------------
// LeadService — CRM pipeline rules (status transitions, notes, stats).
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

export const LeadService = {

  async updateStatus(id: string, newStatus: LeadStatus): Promise<Business> {
    const repo = getRepository();
    const business = await repo.findById(id);
    if (!business) throw new NotFoundError('Business', id);

    const allowed = ALLOWED_TRANSITIONS[business.leadStatus];
    if (!allowed.includes(newStatus)) {
      throw new UnprocessableError(
        `Invalid transition: ${business.leadStatus} → ${newStatus}. ` +
        `Allowed: ${allowed.length > 0 ? allowed.join(', ') : 'none'}`,
      );
    }

    const payload: BusinessUpdate = { leadStatus: newStatus };
    if (newStatus === 'contacted') payload.lastContactedAt = new Date().toISOString();

    logger.info('LeadService: status updated', {
      id,
      name: business.name,
      from: business.leadStatus,
      to: newStatus,
    });

    return repo.update(id, payload);
  },

  async updateNotes(id: string, notes: string | null): Promise<Business> {
    return getRepository().update(id, { notes }); // throws NotFoundError
  },

  getStats(filter?: BusinessFilter): Promise<PipelineStats> {
    return getRepository().getStats(filter);
  },
};
