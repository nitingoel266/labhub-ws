import { deviceStatus } from './status';
import { ClientType } from '../types/common';

export const getClientType =  (clientId: string | undefined): ClientType => {
  if (!clientId) return null;
  const leaderSelected = deviceStatus.value?.leaderSelected;
  const membersJoined = deviceStatus.value?.membersJoined;
  if (leaderSelected === clientId) {
    return 'leader';
  } else if (membersJoined && membersJoined.includes(clientId)) {
    return 'member';
  } else {
    return null;
  }
};
