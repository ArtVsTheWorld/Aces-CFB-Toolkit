export function isProtectedNil(player) {
    return Boolean(player?.IsNIL) && !player?.nilRenumberAllowed;
}
