import {isOriginalEaPlayer} from '../../../services/originalEaPlayers.js';
export function isProtectedPlayer(player) {
    return Boolean(player?.userNumberLocked) || isOriginalEaPlayer(player) && !player?.eaRenumberAllowed;
}

