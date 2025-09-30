import { useMemo } from 'react';
import { BetaProgramService, BetaFeedback, BetaMetrics, BetaCohort } from '../services/beta/beta-program.service';

const serviceCache: { instance?: BetaProgramService } = {};

const getService = () => {
  if (!serviceCache.instance) {
    serviceCache.instance = new BetaProgramService();
  }
  return serviceCache.instance;
};

export const useBetaProgram = () => {
  const service = useMemo(() => getService(), []);

  return {
    inviteBetaUser: service.inviteBetaUser.bind(service),
    activateBetaAccess: service.activateBetaAccess.bind(service),
    getBetaCohorts: service.getBetaCohorts.bind(service),
    enableBetaFeature: service.enableBetaFeature.bind(service),
    getBetaFeatures: service.getBetaFeatures.bind(service),
    submitFeedback: service.submitFeedback.bind(service),
    getFeedbackSummary: service.getFeedbackSummary.bind(service),
    trackBetaEvent: service.trackBetaEvent.bind(service),
    getBetaMetrics: service.getBetaMetrics.bind(service),
    service,
  };
};

export type { BetaProgramService };
export type { BetaFeedback };
export type { BetaMetrics, BetaCohort };
