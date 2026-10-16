export function isProtectedNil(player) {
    return Boolean(player?.userNumberLocked) || Boolean(player?.IsNIL) && !player?.nilRenumberAllowed;
}

